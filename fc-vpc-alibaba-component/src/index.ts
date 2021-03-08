import { HLogger, ILogger, getCredential } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { ICredentials, IProperties, IDeleteProperties, isCredentials } from './interface';
import HandlerService from './utils/HandlerService';

export default class SlsCompoent {
  @HLogger(CONTEXT) logger: ILogger;

  async getCredentials(
    credentials: {} | ICredentials,
    provider: string,
    accessAlias?: string,
  ): Promise<ICredentials> {
    this.logger.debug(
      `Obtain the key configuration, whether the key needs to be obtained separately: ${_.isEmpty(
        credentials,
      )}`,
    );
    if (isCredentials(credentials)) {
      return credentials;
    }
    return await getCredential(provider, accessAlias);
  }

  checkPropertiesAndGenerateResourcesName(properties: IProperties): IProperties {
    if (!properties.regionId) {
      throw new Error('RegionId not fount.');
    }
    if (!properties.zoneId) {
      throw new Error('ZoneId not fount.');
    }

    const name = `${CONTEXT}-generate-resources`;
    if (!properties.vpcName) {
      properties.vpcName = name;
      this.logger.info(`Vpc name not fount, generate name is: ${name}.`);
    }

    if (!properties.vSwitchName) {
      properties.vSwitchName = name;
      this.logger.info(`VSwitch name not fount, generate name is: ${name}.`);
    }

    if (!properties.securityGroupName) {
      properties.securityGroupName = name;
      this.logger.info(`SecurityGroup name not fount, generate name is: ${name}.`);
    }

    return properties;
  }

  async create(inputs) {
    this.logger.debug('Create vpc start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties = this.checkPropertiesAndGenerateResourcesName(_.cloneDeep(inputs.Properties));
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);
    const client = new HandlerService(credentials);
    const vpcConfig = await client.create(properties);

    this.logger.debug(`Create vpc success, config is: ${JSON.stringify(vpcConfig)}.`);
    return vpcConfig;
  }

  async delete(inputs) {
    this.logger.debug('Delete vpc start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IDeleteProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    const client = new HandlerService(credentials);
    await client.delete(properties);

    this.logger.debug('Delete vpc success.');
  }
}
