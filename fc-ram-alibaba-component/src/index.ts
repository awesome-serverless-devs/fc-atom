import { HLogger, ILogger, HComponent, IComponent } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { ICredentials, IProperties } from './interface';

export default class RamCompoent {
  @HLogger(CONTEXT) logger: ILogger;
  @HComponent() component: IComponent;

  async getCredentials(credentials: {} | ICredentials): Promise<ICredentials> {
    let c: ICredentials;

    this.logger.debug(
      `Obtain the key configuration, whether the key needs to be obtained separately: ${_.isEmpty(
        credentials,
      )}`,
    );
    if (_.isEmpty(credentials)) {
      const errorMess = "Please configure key 'Access'.";
      throw new Error(errorMess);
    } else {
      // @ts-ignore: 动态变量
      c = credentials;
    }

    return c;
  }

  async create(inputs) {
    this.logger.debug('Create ram start...');

    const projectName = inputs.Project.ProjectName;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    // const ram = new Ram(properties.regionId, credentials);
    // await ram.create(properties);

    this.logger.debug('Create ram success.');
  }

  async delete(inputs) {
    this.logger.debug('Delete ram start...');

    this.logger.debug(`[${inputs.Project.ProjectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials);
    const properties: IProperties = inputs.Properties;
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    // const ram = new Ram(properties.regionId, credentials);
    // await ram.deleteProject(properties.project);

    this.logger.debug('Delete ram success.');
  }
}
