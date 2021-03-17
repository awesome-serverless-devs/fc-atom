import * as core from '@serverless-devs/core';
import _ from 'lodash';
import FC from '@alicloud/fc2';
import { CONTEXT } from '../../constant';
import { ICredentials } from '../../interface/inputs';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async get(region: string, profile: ICredentials): Promise<string> {
    FC.prototype.getAccountSettings = function (options = {}, headers = {}) {
      return this.get('/account-settings', options, headers);
    };

    const fc = new FC(profile.AccountID, {
      region,
      accessKeyID: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      endpoint: `https://${profile.AccountID}.${region}.fc.aliyuncs.com`,
    });

    try {
      const fcRs = await fc.getAccountSettings();
      this.logger.debug(`Get account settings response: ${JSON.stringify(fcRs)}`);
      return fcRs.data.availableAZs[0];
    } catch (ex) {
      throw ex;
    }
  }
}
