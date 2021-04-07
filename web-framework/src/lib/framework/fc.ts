import * as core from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from '../../constant';
import { ICredentials } from '../../interface/inputs';
import Client from '../client';
import { IProperties } from '../../interface/inputs';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async getZoneId(region: string, profile: ICredentials): Promise<string> {
    const fc = Client.fc(region, profile);

    try {
      const fcRs = await fc.getAccountSettings();
      this.logger.debug(`Get account settings response: ${JSON.stringify(fcRs)}`);
      return fcRs.data.availableAZs[0];
    } catch (ex) {
      throw ex;
    }
  }

  static async tryContainerAcceleration(profile: ICredentials, properties: IProperties) {
    const region = properties.region;
    const serviceName = properties.service?.name;
    const functionName = properties.function?.name || serviceName;
    const customContainerConfig = properties.function?.customContainerConfig;
    if (!serviceName || !customContainerConfig) {
      return;
    }

    const fc = Client.fc(region, profile);
    try {
      await fc.updateFunction(serviceName, functionName, {
        customContainerConfig: {
          accelerationType: 'Default',
          ...customContainerConfig,
        }
      });
    } catch (ex) {
      this.logger.debug(`Try container acceleration error: ${ex}`);
    }
  }
}
