import { HLogger, ILogger, HComponent, IComponent } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { Credentials, IProperties } from './interface';
import HandlerService from './utils/HandlerService';

export default class SlsCompoent {
  @HLogger(CONTEXT) logger: ILogger;
  @HComponent() component: IComponent;

  async getCredentials(credentials: {} | Credentials, inputs): Promise<Credentials> {
    this.logger.debug(
      `Obtain the key configuration, whether the key needs to be obtained separately: ${_.isEmpty(
        credentials,
      )}`,
    );

    if (credentials instanceof Credentials) {
      return credentials;
    } else {
      return await this.component.credentials(inputs);
    }
  }

  async create(inputs) {
    this.logger.debug('Create vpc start...');

    const projectName = inputs.Project.ProjectName;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, inputs);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);
    const client = new HandlerService(credentials);
    const vpcConfig = await client.create(properties);

    this.logger.debug(`Create vpc success, config is: ${JSON.stringify(vpcConfig)}.`);
    return vpcConfig;
  }

  async delete(inputs) {
    this.logger.debug('Delete vpc start...');

    this.logger.debug(`[${inputs.Project.ProjectName}] inputs params: ${JSON.stringify(inputs)}`);

    // const credentials = await this.getCredentials(inputs.Credentials, inputs);
    // const properties: IProperties = inputs.Properties;
    // this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    // const sls = new Sls(properties.regionId, credentials);
    // await sls.deleteProject(properties.project);

    this.logger.debug('Delete vpc success.');
  }
}
