import { HLogger, ILogger } from '@serverless-devs/core';
import { fcClient } from '../client';
import { ICredentials } from '../../interface';
import { CONTEXT } from '../../constant';
import { isNasProtocol } from './utils';
import { getHttpTriggerPath, commandsPath } from './generatePath';

interface ILs {
  targetPath: string;
  isAllOpt: boolean;
  isLongOpt: boolean;
  serviceName: string;
  functionName: string;
}
export default class Ls {
  fcClient: any;
  @HLogger(CONTEXT) logger: ILogger;

  constructor(regionId: string, credentials: ICredentials) {
    this.fcClient = fcClient(regionId, credentials);
  }

  async ls(options: ILs) {
    const { targetPath, isAllOpt, isLongOpt, serviceName, functionName } = options;

    const nasHttpTriggerPath = getHttpTriggerPath(serviceName, functionName);
    const lsCmd = 'ls ' + (isAllOpt ? '-a ' : '') + (isLongOpt ? '-l ' : '') + targetPath;
    const lsResponse = await this.fcClient.post(commandsPath(nasHttpTriggerPath), { cmd: lsCmd });

    this.logger.log(lsResponse.data.stdout);
    this.logger.log(lsResponse.data.stderr);
  }

  checkLsNasDir(targetPath: string): boolean {
    if (targetPath === '' || targetPath === undefined) {
      this.logger.info('Please input nas path!');
      return false;
    }

    if (!isNasProtocol(targetPath)) {
      this.logger.info('Please input correct nas path!');
      return false;
    }
    return true;
  }
}
