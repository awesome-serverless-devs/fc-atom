import { HLogger, ILogger, getCredential } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { ICredentials, IProperties, isCredentials } from './interface';
import Sls from './utils/sls';

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

  async create(inputs) {
    this.logger.debug('Create sls start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    const sls = new Sls(properties.regionId, credentials);
    await sls.create(properties);

    this.logger.debug('Create sls success.');
  }

  async delete(inputs) {
    this.logger.debug('Delete sls start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    const sls = new Sls(properties.regionId, credentials);
    await sls.deleteProject(properties.project);

    this.logger.debug('Delete sls success.');
  }
}
