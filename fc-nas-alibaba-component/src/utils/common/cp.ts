import path from 'path';
import fs from 'fs-extra';
import async from 'async';
import rimraf from 'rimraf';
import md5File from 'md5-file';
import { HLogger, ILogger, zip, spinner, unzip, Logger } from '@serverless-devs/core';
import { fcClient } from '../client';
import { ICredentials } from '../../interface';
import {
  getHttpTriggerPath,
  commandsPath,
  fileChunkUpload,
  cleanPath,
  fileCheck,
  statsPath,
  pathExsit,
  downloadPath,
} from './generatePath';
import * as constant from '../../constant';
import * as utils from './utils';

interface ICp {
  srcPath: string;
  targetPath: string;
  recursive: boolean;
  noClobber: boolean;
  serviceName: string;
  functionName: string;
  noTargetDirectory: boolean;
  mountDir: string;
  nasDirYmlInput: string;
  excludes: undefined | string[];
}

interface INasId {
  UserId: number;
  GroupId: number;
}

interface IDstStats {
  dstPath: string;
  resolvedDst: string;
  dstPathEndWithSlash: boolean;
  dstPathExists: boolean;
  parentDirOfDstPathExists: boolean;
  dstPathIsDir: boolean;
  dstPathIsFile: boolean;
}

export default class Cp {
  fcClient: any;
  @HLogger(constant.CONTEXT) logger: ILogger;

  constructor(regionId: string, credentials: ICredentials) {
    this.fcClient = fcClient(regionId, credentials);
  }

  async cp(options: ICp) {
    const { srcPath, targetPath, mountDir, nasDirYmlInput } = options;
    if (!srcPath || !targetPath) {
      this.logger.error('Input path empty error, please input again!');
      return;
    }

    if (this.isCpFromLocalToNas(srcPath, targetPath)) {
      await this.cpFromLocalToNas(options);
    } else if (this.isCpFromNasToLocal(srcPath, targetPath)) {
      await this.cpFromNasToLocal(
        srcPath,
        targetPath,
        options.serviceName,
        options.functionName,
        mountDir,
        nasDirYmlInput,
      );
    } else {
      throw new Error('Format of path not support');
    }
  }

  async cpFromNasToLocal(
    nasPath: string,
    localDir: string,
    serviceName: string,
    functionName: string,
    mountDir: string,
    nasDirYmlInput: string,
  ) {
    const nasHttpTriggerPath = getHttpTriggerPath(serviceName, functionName);
    const resolveNasPath = utils.parseNasUri(nasPath, mountDir, nasDirYmlInput);

    await fs.mkdirs(localDir);

    this.logger.debug(`Check nas path ${resolveNasPath} is exsit.`);
    const res = await this.fcClient.get(pathExsit(nasHttpTriggerPath), {
      targetPath: resolveNasPath,
    });
    if (!res.data) {
      throw new Error(`${resolveNasPath} is not exsit.`);
    }

    this.logger.debug('Path is exsit.');

    this.logger.log(`zipping ${resolveNasPath}`);
    const tmpNasZipPath = path.posix.join(path.dirname(resolveNasPath), `.fun-nas-generated.zip`);

    const cmd = `cd ${path.dirname(resolveNasPath)} && zip -r ${tmpNasZipPath} ${path.basename(
      resolveNasPath,
    )}`;
    await this.fcClient.post(commandsPath(nasHttpTriggerPath), { cmd });
    this.logger.log(`'✔' zip done`, 'green');

    this.logger.log('downloading...');
    const localZipDirname = path.join(process.cwd(), '.s', 'nas');
    await fs.mkdirs(localZipDirname);
    const localZipPath = path.join(localZipDirname, '.fun-nas-generated.zip');

    const rs = await this.fcClient.post(
      downloadPath(nasHttpTriggerPath),
      { tmpNasZipPath },
      {},
      {},
      { rawBuf: true },
    );
    this.logger.log(`'✔' download done`, 'green');

    const buf = rs.data;
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(localZipPath);
      ws.write(buf);
      ws.end();
      ws.on('finish', () => {
        resolve('');
      });
      ws.on('error', (error) => {
        this.logger.error(`${localZipPath} write error : ${error}`);
        reject(error);
      });
    });

    this.logger.log('unzipping file');
    await unzip(localZipPath, path.resolve(localDir)).then(() => {
      Logger.log("'✔' unzip done!", 'green');
    });

    this.logger.debug(`fs remove ${localZipPath}`);
    // clean
    await fs.remove(localZipPath);
    // await fs.remove(localZipDirname);
    this.logger.debug(`send clean request ${nasHttpTriggerPath} ${tmpNasZipPath}`);
    await this.sendCleanRequest(nasHttpTriggerPath, tmpNasZipPath);
    this.logger.log("'✔' download completed!", 'green');
  }

  async cpFromLocalToNas(options: ICp) {
    const {
      srcPath,
      targetPath,
      recursive,
      noClobber,
      serviceName,
      functionName,
      noTargetDirectory,
      mountDir,
      nasDirYmlInput,
      excludes,
    } = options;
    const nasPath = utils.parseNasUri(targetPath, mountDir, nasDirYmlInput);
    this.logger.debug(`Paerse nas url is: ${nasPath}`);

    const resolvedSrc = utils.resolveLocalPath(path.resolve(srcPath));
    if (!(await fs.pathExists(resolvedSrc))) {
      throw new Error(`${resolvedSrc} not exist`);
    }

    const { isDir: srcPathIsDir, isFile: srcPathIsFile } = await utils.isDirOrFile(resolvedSrc);
    if (srcPathIsDir && !recursive) {
      throw new Error('Can not copy folder without option -r/--recursive');
    }

    const nasId = await this.getNasConfig(serviceName);
    const nasHttpTriggerPath = getHttpTriggerPath(serviceName, functionName);

    this.logger.debug(`checking dst path ${targetPath}...`);
    const { data: stats } = await this.statsRequest(nasPath, nasHttpTriggerPath);

    const dstStats = {
      dstPath: targetPath,
      resolvedDst: nasPath,
      dstPathEndWithSlash: this.endWithSlash(nasPath),
      dstPathExists: stats.exists,
      parentDirOfDstPathExists: stats.parentDirExists,
      dstPathIsDir: stats.isDir,
      dstPathIsFile: stats.isFile,
    };
    this.logger.debug(`dstStats value is: ${JSON.stringify(dstStats)}`);

    let actualDstPath = await this.checkCpDstPath(
      nasHttpTriggerPath,
      resolvedSrc,
      dstStats,
      recursive,
      noClobber,
      noTargetDirectory,
    );

    const permTip = utils.checkWritePerm(stats, nasId, nasPath);
    if (permTip) {
      this.logger.error(`Warning: ${permTip}`);
    }

    if (srcPathIsDir) {
      await this.uploadFolder(
        resolvedSrc,
        actualDstPath,
        nasHttpTriggerPath,
        srcPath,
        noClobber,
        excludes,
      );
    } else if (srcPathIsFile) {
      await this.uploadFile(resolvedSrc, actualDstPath, nasHttpTriggerPath);
    } else {
      throw new Error(`${srcPath} has the same file stat and folder stat`);
    }
  }

  async uploadFolder(
    resolvedSrc: string,
    actualDstPath: string,
    nasHttpTriggerPath: string,
    srcPath: string,
    noClobber: boolean,
    excludes: string[] = [],
  ) {
    const outputFileName = path.basename(path.resolve(srcPath));
    const outputFilePath = path.join(process.cwd(), '.s', 'zip');

    excludes.push(path.relative(process.cwd(), outputFilePath));
    excludes.push(path.relative(process.cwd(), path.join(process.cwd(), '.s', 'logs')));

    // @ts-ignore
    const { compressedSize } = await zip({
      codeUri: resolvedSrc,
      outputFileName: outputFileName,
      outputFilePath: outputFilePath,
      exclude: excludes,
    });

    this.logger.debug(`Checking NAS tmp dir ${actualDstPath}`);

    const tmpCheck = await this.fcClient.get(nasHttpTriggerPath + 'tmp/check', {
      remoteNasTmpDir: actualDstPath,
    });
    this.logger.debug(`Tmp check response is: ${JSON.stringify(tmpCheck)}`);
    this.logger.debug(`Check done`);

    const nasFile = path.posix.join(actualDstPath, `${outputFileName}.zip`);
    const fileHash = path.posix.join(outputFilePath, `${outputFileName}.zip`);
    await this.uploadFile(fileHash, nasFile, nasHttpTriggerPath);

    this.logger.info('unzipping file');
    const srcPathFiles = await utils.readDirRecursive(srcPath, excludes);

    await this.unzipNasFileParallel(
      nasHttpTriggerPath,
      actualDstPath,
      nasFile,
      utils.chunk(srcPathFiles, 248),
      noClobber,
    );
    this.logger.debug('cleaning');
    await this.sendCleanRequest(nasHttpTriggerPath, nasFile);
    this.logger.debug("'✔' clean done");

    rimraf.sync(fileHash);
    this.logger.debug("'✔'  upload completed!");
  }

  async uploadFile(
    resolvedSrc: string,
    actualDstPath: string,
    nasHttpTriggerPath: string,
    fileHash?: string,
  ) {
    const stat = await fs.lstat(resolvedSrc);

    const urlPath = commandsPath(nasHttpTriggerPath);
    const cmd = `dd if=/dev/zero of=${actualDstPath} count=0 bs=1 seek=${stat.size}`;
    this.logger.debug(`Upload url is ${urlPath}, cmd is '${cmd}'`);

    const fileOffSetCutByChunkSize = utils.splitRangeBySize(
      0,
      stat.size,
      (parseInt(process.env.NAS_CHUNK_SIZE) || 5) * 1024 * 1024,
    );
    if (!fileHash) {
      fileHash = await this.getFileHash(resolvedSrc);
    }
    const filePermission = await this.getFilePermission(resolvedSrc);

    const vm = spinner(`Start uploading file: ${actualDstPath}`);
    const { data } = await this.fcClient.post(urlPath, { cmd });
    console.log();
    this.logger.debug(data);
    if (data.error) {
      throw new Error(data.error);
    }
    vm.succeed(`File uploaded successfully: ${actualDstPath}`);

    await this.uploadFileByChunk(
      nasHttpTriggerPath,
      actualDstPath,
      resolvedSrc,
      fileOffSetCutByChunkSize,
    );

    await this.changeNasFilePermission(nasHttpTriggerPath, actualDstPath, filePermission);

    this.logger.debug(`checking uploaded file ${actualDstPath} hash`);
    const checkRes = await this.checkFileHash(nasHttpTriggerPath, actualDstPath, fileHash);
    this.logger.debug(checkRes.data);

    this.logger.debug("'✔' hash unchanged");
  }

  async sendCleanRequest(nasHttpTriggerPath, nasZipFile) {
    const urlPath = cleanPath(nasHttpTriggerPath);
    const query = { nasZipFile };
    return await this.fcClient.get(urlPath, query);
  }

  async checkFileHash(nasHttpTriggerPath: string, nasFile: string, fileHash: string) {
    const urlPath = fileCheck(nasHttpTriggerPath);
    const query = { nasFile, fileHash };
    return await this.fcClient.get(urlPath, query);
  }

  async changeNasFilePermission(
    nasHttpTriggerPath: string,
    filePath: string,
    filePermission: string,
  ) {
    const cmd = `chmod ${filePermission} ${filePath}`;
    const p = commandsPath(nasHttpTriggerPath);
    return await this.fcClient.post(p, { cmd });
  }

  async readFileChunk(filePath: string, start: number, size: number) {
    const fd = await fs.open(filePath, 'r');
    const chunkBuf = Buffer.alloc(size);
    const { bytesRead } = await fs.read(fd, chunkBuf, 0, size, start);
    if (bytesRead !== size) {
      throw new Error(`ReadChunkFile function bytesRead not equal read size`);
    }
    await fs.close(fd);
    return chunkBuf;
  }

  async getFilePermission(filePath: string) {
    const stat = await fs.lstat(filePath);
    const permission = '0' + (stat.mode & parseInt('777', 8)).toString(8);
    return permission;
  }

  async checkCpDstPath(
    nasHttpTriggerPath: string,
    srcPath: string,
    dstStats: IDstStats,
    recursive: boolean,
    noClobber: boolean,
    noTargetDirectory: boolean,
  ) {
    const {
      resolvedDst,
      dstPath,
      dstPathExists, // 远端已经存在
      parentDirOfDstPathExists, // 远端父级目录存在
      dstPathIsDir, // 远端是个目录
      dstPathIsFile, // 远端是个文件
      dstPathEndWithSlash, // 斜线结尾
    } = dstStats;

    let errorInf: string;

    if (!recursive && dstPathExists) {
      if (dstPathIsFile && !dstPathEndWithSlash) {
        if (!noClobber) {
          return resolvedDst;
        }
        errorInf = `${dstPath} already exists.`;
      }

      if (dstPathIsFile && dstPathEndWithSlash) {
        errorInf = `${dstPath} : Not a directory`;
      }

      if (dstPathIsDir && utils.isNasProtocol(dstPath)) {
        const newDstPath = path.posix.join(resolvedDst, path.basename(srcPath));
        const statsRes = await this.statsRequest(newDstPath, nasHttpTriggerPath);
        const stats = statsRes.data;
        const newDstStats = {
          dstPath: `${dstPath}/${path.basename(srcPath)}`,
          resolvedDst: newDstPath,
          dstPathEndWithSlash: false,
          dstPathExists: stats.exists,
          parentDirOfDstPathExists: stats.parentDirExists,
          dstPathIsDir: stats.isDir,
          dstPathIsFile: stats.isFile,
        };

        return await this.checkCpDstPath(
          nasHttpTriggerPath,
          srcPath,
          newDstStats,
          recursive,
          noClobber,
          noTargetDirectory,
        );
      }

      if (dstPathIsDir && !utils.isNasProtocol(dstPath)) {
        this.logger.debug(
          `dstPathIsDir && !isNasProtocol(dstPath) is: ${
            dstPathIsDir && !utils.isNasProtocol(dstPath)
          }`,
        );
        return path.join(resolvedDst, path.basename(srcPath));
      }
    } else if (!recursive && !dstPathExists) {
      if (dstPathEndWithSlash) {
        errorInf = `nas cp: cannot create regular file ${dstPath}: Not a directory`;
      } else if (parentDirOfDstPathExists) {
        return resolvedDst;
      } else {
        errorInf = `nas cp: cannot create regular file ${dstPath}: No such file or directory`;
      }
    } else if (recursive && dstPathExists) {
      if (dstPathIsDir && utils.isNasProtocol(dstPath)) {
        if (noTargetDirectory) {
          return resolvedDst;
        }
        this.logger.debug(
          `dstPathIsDir && utils.isNasProtocol(dstPath) is: ${
            dstPathIsDir && utils.isNasProtocol(dstPath)
          }`,
        );
        return path.posix.join(resolvedDst, path.basename(srcPath));
      }
      if (dstPathIsDir && !utils.isNasProtocol(dstPath)) {
        this.logger.debug(
          `dstPathIsDir && !utils.isNasProtocol(dstPath) is: ${
            dstPathIsDir && !utils.isNasProtocol(dstPath)
          }`,
        );
        return path.join(resolvedDst, path.basename(srcPath));
      }
      if (dstPathIsFile && dstPathEndWithSlash) {
        errorInf = `nas cp: failed to access ${dstPath}: Not a directory`;
      }
      if (dstPathIsFile && !dstPathEndWithSlash) {
        errorInf = `nas cp: cannot overwrite non-directory ${dstPath} with directory ${srcPath}`;
      }
    } else if (recursive && !dstPathExists) {
      if (parentDirOfDstPathExists) {
        return resolvedDst;
      }
      errorInf = `nas cp: cannot create directory ${dstPath}: No such file or directory`;
    }
    throw new Error(errorInf);
  }

  async statsRequest(dstPath: string, httpTriggerPath: string) {
    const urlPath = statsPath(httpTriggerPath);
    const query = { dstPath };
    return await this.fcClient.get(urlPath, query);
  }

  async getNasConfig(serviceName: string): Promise<INasId> {
    const res = await this.fcClient.getService(serviceName);
    this.logger.debug(`getService response is: ${JSON.stringify(res)}`);
    const { userId, groupId } = res.data.nasConfig;

    return {
      UserId: userId,
      GroupId: groupId,
    };
  }

  async getFileHash(filePath: string): Promise<string> {
    const { isFile } = await utils.isDirOrFile(filePath);

    if (isFile) {
      return await md5File(filePath);
    }
    throw new Error('get file hash error, target is not a file, target path is: ' + isFile);
  }

  uploadFileByChunk(
    nasHttpTriggerPath: string,
    nasZipFile: string,
    zipFilePath: string,
    fileOffSet: any[],
  ) {
    return new Promise((resolve) => {
      const vm = spinner(`uploading`);
      const uploadQueue = async.queue(async (offSet, callback) => {
        try {
          const urlPath = fileChunkUpload(nasHttpTriggerPath);
          const fileStart = offSet.start;
          const fileSize = offSet.size;
          const body = await this.readFileChunk(zipFilePath, fileStart, fileSize);
          const query = {
            nasFile: nasZipFile,
            fileStart: fileStart.toString(),
          };

          const res = await this.fcClient.post(urlPath, body, {}, query);
          this.logger.debug(
            `Call ${urlPath} query is: ${JSON.stringify(query)}, response is: ${JSON.stringify(
              res,
            )}`,
          );
          if (res.data.error) {
            throw new Error(res.data.error);
          }
        } catch (error) {
          this.logger.error(`upload error : ${error.message}`);
          this.logger.debug(error.stack);
          vm.fail();
          return;
          // TO DO：RETRY
        }
        callback();
      }, 5);
      uploadQueue.drain(() => {
        vm.succeed('upload done');
        resolve('');
      });

      uploadQueue.push(fileOffSet);
    });
  }

  unzipNasFileParallel(
    nasHttpTriggerPath: string,
    dstDir: string,
    nasZipFile: string,
    filesArrQueue: any[],
    noClobber: boolean,
  ) {
    return new Promise((resolve) => {
      const unzipQueue = async.queue(async (unzipFiles, next) => {
        try {
          let cmd;
          if (noClobber) {
            cmd = `unzip -q -n ${nasZipFile} -d ${dstDir}`;
          } else {
            cmd = `unzip -q -o ${nasZipFile} -d ${dstDir}`;
          }
          for (const unzipFile of unzipFiles) {
            cmd = cmd + ` '${unzipFile}'`;
          }
          // cmd = cmd + ` '${unzipFile}'`;
          this.logger.debug(`Send unzip request cmd is: ${cmd}.`);
          const res = await this.fcClient.post(nasHttpTriggerPath + 'commands', { cmd });
          this.logger.debug(res);
        } catch (error) {
          // zip 中存在特殊文件名，例如 $data.js
          if (error.message && error.message.includes('filename not matched')) {
            this.logger.error(error);
            return;
          }
          if (error.message && error.message.toLowerCase().includes('permission denied')) {
            // TODO : 权限问题更加详细的提示
            this.logger.error(error);
            return;
          }

          this.logger.debug(`${error.code || ''} ${error.message.toLowerCase()}`);

          // 当解压文件数大于 1 ，默认为解压文件数过多导致 unzip 指令超出指令长度限制导致的解压失败
          // 会将解压文件列表折半拆分后进行重试
          if (unzipFiles.length > 1) {
            this.logger.log('Retry unziping...');
            const retryUnzipFiles = [];
            retryUnzipFiles.push(unzipFiles.slice(0, unzipFiles.length / 2));
            retryUnzipFiles.push(unzipFiles.slice(unzipFiles.length / 2, unzipFiles.length));
            unzipQueue.unshift(retryUnzipFiles);
          } else {
            // 解压文件数小于 1 个时，认为不是解压文件数过多造成的问题
            // 因此提示用户重新 sync
            this.logger.error(error);
            this.logger.error('Unzip error! Please re-sync.');
            return;
          }
        }
        next();
      }, 5);

      unzipQueue.drain(() => {
        Logger.info(constant.CONTEXT, 'unzip done');
        resolve('');
      });
      unzipQueue.push(filesArrQueue);
    });
  }

  endWithSlash(inputPath: string) {
    if (!inputPath) {
      throw new Error('Local path could not be Empty');
    }
    return inputPath.charAt(inputPath.length - 1) === '/';
  }

  isCpFromLocalToNas(srcPath: string, targetPath: string): boolean {
    return !utils.isNasProtocol(srcPath) && utils.isNasProtocol(targetPath);
  }

  isCpFromNasToLocal(srcPath: string, targetPath: string): boolean {
    return utils.isNasProtocol(srcPath) && !utils.isNasProtocol(targetPath);
  }
}
