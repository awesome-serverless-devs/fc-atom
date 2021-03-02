import { HLogger, ILogger, getCredential, IV1Inputs } from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from './constant';
import { ICredentials, IProperties, isCredentials, IFcConfig } from './interface';
import Nas from './utils/nas';
import FcResources from './utils/fcResources';

export default class NasCompoent {
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

  transformYamlConfigToFcNasConfig(properties: IProperties, mountTargetDomain: string): IFcConfig {
    return {
      serviceName: properties.serviceName,
      description: properties.description,
      functionName: properties.functionName,
      roleName: properties.roleName,
      vpcConfig: {
        vpcId: properties.vpcId,
        vSwitchIds: [properties.vSwitchId],
        securityGroupId: properties.securityGroupId,
      },
      nasConfig: {
        UserId: properties.userId || 10003,
        GroupId: properties.groupId || 10003,
        MountPoints: [
          {
            ServerAddr: `${mountTargetDomain}:/${properties.nasDir}`,
            MountDir: properties.mountDir,
          },
        ],
      },
    };
  }

  async create(inputs: IV1Inputs) {
    this.logger.debug('Create nas start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;

    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = _.cloneDeep(inputs.Properties);
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    let mountPointDomain: string;
    if (properties.mountPointDomain) {
      mountPointDomain = properties.mountPointDomain;
      this.logger.info(`Specify parameters, reuse configuration.`);
    } else {
      const nas = new Nas(properties.regionId, credentials);
      const nasInitResponse = await nas.init(properties);
      this.logger.debug(`Nas init response is: ${JSON.stringify(nasInitResponse)}`);
      mountPointDomain = nasInitResponse.mountTargetDomain;
    }

    // const fc = new FcResources(properties.regionId, credentials);
    // await fc.create(this.transformYamlConfigToFcNasConfig(properties, mountPointDomain));

    this.logger.debug('Create nas success.');
  }

  async delete(inputs) {
    this.logger.debug('Delete nas start...');

    this.logger.debug(`[${inputs.Project.ProjectName}] inputs params: ${JSON.stringify(inputs)}`);

    // const credentials = await this.getCredentials(inputs.Credentials, inputs);
    // const properties: IProperties = inputs.Properties;
    // this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    // const sls = new Sls(properties.regionId, credentials);
    // await sls.deleteProject(properties.project);

    this.logger.debug('Delete nas success.');
  }
}
