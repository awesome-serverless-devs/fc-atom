import fs from 'fs-extra';
import { Logger } from '@serverless-devs/core';
import path from 'path';
import { CONTEXT } from '../constant';
import { ICredentials } from '../interface';
import { fcClient } from './client';
import { getHttpTriggerPath, versionPath } from './common/generatePath';

export default class Version {
  static async isNasServerStale(
    profile: ICredentials,
    regionId: string,
    serviceName: string,
    functionName: string,
  ): Promise<boolean> {
    const client = fcClient(regionId, profile);
    const httpPath = getHttpTriggerPath(serviceName, functionName);

    try {
      Logger.debug(CONTEXT, `Get verison path: ${httpPath}`);
      const res = await client.get(versionPath(httpPath));
      Logger.debug(CONTEXT, `Get verison response: ${JSON.stringify(res, null, '  ')}`);
      const curVersionId = res.data.curVersionId;

      const version = await this.getVersion();

      Logger.debug(CONTEXT, `curVersionId is: ${curVersionId}, version is: ${version}.`);

      const isNew = curVersionId === version;
      if (!isNew) {
        Logger.warn(
          CONTEXT,
          'The auxiliary function is not the latest code, the function needs to be updated.',
        );
      }

      return isNew;
    } catch (ex) {
      Logger.debug(CONTEXT, ex);
      Logger.warn(CONTEXT, 'Failed to request version, update function.');
      return false;
    }
  }

  static async getVersion() {
    const versionFile = path.join(__dirname, 'fcResources', 'VERSION');

    return (await fs.readFile(versionFile)).toString();
  }
}
