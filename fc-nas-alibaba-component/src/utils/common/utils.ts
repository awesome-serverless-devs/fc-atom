import os from 'os';
import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import ignore from 'ignore';
import walkdir from 'walkdir';
import { nasUriHandler } from '../utils';

const USER_HOME = os.homedir();
const NAS_URI_PATTERN = /^nas:\/\/((?:\/[^/]+)*\/?)$/;

export const isNasProtocol = (inputPath: string): boolean => inputPath.indexOf('nas://') === 0;

export function parseNasUri(nasUri: string, mountDir: string, nasDirYmlInput: string): string {
  nasDirYmlInput = nasUriHandler(nasDirYmlInput);

  const startStr = `nas:///${nasDirYmlInput}/`;

  if (!nasUri.startsWith(startStr)) {
    if (nasUri !== `nas:///${nasDirYmlInput}`) {
      throw new Error(`Invalid nas path: ${nasUri}, nas path should start with ${startStr}`);
    }
  }

  const res = nasUri.replace(`/${nasDirYmlInput}`, mountDir).match(NAS_URI_PATTERN);

  if (!res) {
    throw new Error(`Invalid nas path: ${nasUri}`);
  }

  return res[1];
}

export function resolveLocalPath(localPath: string): string {
  if (!localPath) {
    throw new Error('Local path could not be empty');
  }

  const rootDir = path.parse(process.cwd()).root;
  if (localPath.startsWith(rootDir)) {
    return localPath;
  } else if (localPath.startsWith('~')) {
    return localPath.replace(/~/, USER_HOME);
  }
  const currentDir = process.cwd();
  return path.join(currentDir, localPath);
}

interface IDirOrFile {
  isDir: boolean;
  isFile: boolean;
}

export async function isDirOrFile(inputPath: string): Promise<IDirOrFile> {
  const stats = await fs.lstat(inputPath);

  return {
    isDir: stats.isDirectory(),
    isFile: stats.isFile(),
  };
}

function hasWritePerm(num: number, stats: any, nasPath: string): boolean {
  if (stats.isDir && !stats.isFile) {
    // -wx, num | 100 === 7
    return (num | 4) === 7;
  } else if (stats.isFile && !stats.isDir) {
    // -w-, num | 101
    return (num | 5) === 7;
  } else if (stats.isFile && stats.isDir) {
    throw new Error(`isFile and isDir attributes of ${nasPath} are true simultaneously`);
  }
}

interface INasId {
  UserId: number;
  GroupId: number;
}
// 检查nasId 是否有 nasPath 的写权限
// 返回相关字符串信息,undefined 表示有权限，否则无权限且返回相应 tip
export function checkWritePerm(stats: any, nasId: INasId, nasPath: string): string | undefined {
  if (!stats.exists) {
    return undefined;
  }
  const userId = nasId.UserId;
  const groupId = nasId.GroupId;

  const { mode } = stats;
  const nasPathUserId = stats.UserId;
  const nasPathGroupId = stats.GroupId;
  if (nasPathUserId === 0 && nasPathGroupId === 0) {
    return undefined;
  }

  // permStirng 为 ‘777’ 形式的权限形式

  const permString = (mode & parseInt('777', 8)).toString(8);
  const [ownerCanWrite, groupCanWrite, otherCanWrite] = _.map(permString, (perm) =>
    hasWritePerm(parseInt(perm), stats, nasPath),
  );

  if (!ownerCanWrite && !groupCanWrite && !otherCanWrite) {
    return `${nasPath} has no '-w-' or '-wx' permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`;
  } else if (ownerCanWrite && groupCanWrite && otherCanWrite) {
    return undefined;
  } else if (
    userId === nasPathUserId &&
    !ownerCanWrite &&
    groupId === nasPathGroupId &&
    !groupCanWrite &&
    otherCanWrite
  ) {
    return `UserId: ${nasPathUserId} and GroupId: ${nasPathGroupId} have no '-w-' or '-wx' permission to ${nasPath}, which may cause permission problem, \
more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`;
  } else if (
    !((userId === nasPathUserId && ownerCanWrite) || (groupId === nasPathGroupId && groupCanWrite))
  ) {
    return `UserId: ${userId} and GroupId: ${groupId} in your NasConfig are mismatched with UserId: ${nasPathUserId} and GroupId: ${nasPathGroupId} of ${nasPath}, \
which may cause permission problem, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`;
  }
  return undefined;
}

export function splitRangeBySize(start: number, end: number, chunkSize: number): any[] {
  if (chunkSize === 0) {
    throw new Error('chunkSize of function splitRangeBySize should not be 0');
  }
  const res = [];
  while (start < end) {
    const size = Math.min(chunkSize, end - start);
    res.push({
      start,
      size,
    });
    start = start + size;
  }
  return res;
}

function isEmptyDir(targetPath) {
  const lstat = fs.lstatSync(targetPath);
  if (lstat.isDirectory()) {
    const dirs = fs.readdirSync(targetPath);
    if (_.isEmpty(dirs)) {
      return true;
    }
  }
  return false;
}

export function readDirRecursive(rootPath: string, excludes: string[]): Promise<any[]> {
  const ig = ignore().add(excludes);
  return new Promise((resolve) => {
    const relativePaths = [];

    if (isEmptyDir(rootPath)) {
      return resolve(relativePaths);
    }

    walkdir(rootPath, {
      track_inodes: true,
    })
      .on('path', (fullPath, stat) => {
        let relativePath = path.relative(rootPath, fullPath);

        if (ig.ignores(relativePath)) {
          return;
        }

        if (process.platform === 'win32') {
          relativePath = relativePath.split(path.sep).join('/');
        }

        if (stat.isDirectory()) {
          if (!_.isEmpty(fs.readdirSync(fullPath))) {
            return;
          }

          relativePath = `${relativePath}/`;
        }

        relativePaths.push(relativePath);
      })
      .on('end', () => resolve(relativePaths));
  });
}

export function chunk(arr: string[], size: number): any[] {
  if (size < 1) {
    throw new Error('chunk step should not be 0');
  }
  return Array(Math.ceil(arr.length / size))
    .fill(undefined)
    .map((__, i) => arr.slice(i * size, i * size + size));
}
