import { HLogger, ILogger, getCredential } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { ICredentials, IProperties, isCredentials } from './interface';
import Ram from './utils/ram';

export default class RamCompoent {
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

  async deploy(inputs) {
    this.logger.debug('Create ram start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    if (properties.service && properties.statement) {
      this.logger.warn(
        "The 'service' and 'statement' configurations exist at the same time, and the 'service' configuration is invalid and overwritten by the 'statement'.",
      );
    } else if (!(properties.service || properties.statement)) {
      throw new Error("'service' and 'statement' must have at least one configuration.");
    }

    const ram = new Ram(credentials);
    await ram.deploy(properties);

    this.logger.debug('Create ram success.');
  }

  async delete(inputs) {
    this.logger.debug('Delete ram start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    const ram = new Ram(credentials);
    await ram.deleteRole(properties.name);
    await ram.deletePolicys(properties.policies || []);

    this.logger.debug('Delete ram success.');
  }
}
