import * as core from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from '../../constant';
import { ICredentials } from '../../interface/inputs';
import Client from '../client';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async get(region: string, profile: ICredentials): Promise<string> {
    const fc = Client.fc(region, profile);

    try {
      const fcRs = await fc.getAccountSettings();
      this.logger.debug(`Get account settings response: ${JSON.stringify(fcRs)}`);
      return fcRs.data.availableAZs[0];
    } catch (ex) {
      throw ex;
    }
  }
}
