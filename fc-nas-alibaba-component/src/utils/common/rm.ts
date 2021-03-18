import { HLogger, ILogger } from '@serverless-devs/core';
import { fcClient } from '../client';
import { ICredentials } from '../../interface';
import { CONTEXT } from '../../constant';
import { checkWritePerm } from './utils';
import { getHttpTriggerPath, commandsPath, statsPath } from './generatePath';

interface IRm {
  targetPath: string;
  recursive: boolean;
  force: boolean;
  isRootDir: boolean;
  serviceName: string;
  functionName: string;
}

interface INasId {
  UserId: number;
  GroupId: number;
}

export default class Ls {
  fcClient: any;
  @HLogger(CONTEXT) logger: ILogger;

  constructor(regionId: string, credentials: ICredentials) {
    this.fcClient = fcClient(regionId, credentials);
  }

  async rm(options: IRm) {
    const { targetPath: fcPath, recursive, force, isRootDir, serviceName, functionName } = options;

    const nasHttpTriggerPath = getHttpTriggerPath(serviceName, functionName);
    const statsRes = await this.statsRequest(fcPath, nasHttpTriggerPath);
    this.logger.debug(`Call ${fcPath} stats is: ${JSON.stringify(statsRes)}`);

    const stats = statsRes.data;

    if (!stats.exists) {
      throw new Error(`${fcPath} not exist`);
    }

    if (stats.isDir && !recursive) {
      throw new Error(
        `nas rm: ${fcPath}: is a directory, use -r/--recursive if you want to delete it`,
      );
    }

    const nasId = await this.getNasConfig(serviceName);

    const permTip = checkWritePerm(stats, nasId, fcPath);
    if (permTip) {
      const warningInfo = `nas rm: ${permTip}`;
      this.logger.error(`Warning: ${warningInfo}`);
    }

    const cmd = isRootDir
      ? `cd ${fcPath} && rm -R ${force ? '-f ' : ''} *`
      : `rm ${recursive ? '-R' : ''} ${force ? '-f ' : ''} ${fcPath}`;
    this.logger.debug(`Rm cmd is ${cmd}`);
    const rmResponse = await this.fcClient.post(commandsPath(nasHttpTriggerPath), { cmd });

    this.logger.log(rmResponse.data.stdout);
    this.logger.log(rmResponse.data.stderr);
    this.logger.log(`'✔' remove ${fcPath} done`, 'green');
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

  async statsRequest(dstPath: string, httpTriggerPath: string) {
    const urlPath = statsPath(httpTriggerPath);
    const query = { dstPath };
    return await this.fcClient.get(urlPath, query);
  }
}
