import {
  HLogger,
  ILogger,
  getCredential,
  IV1Inputs,
  help,
  commandParse,
} from '@serverless-devs/core';
import _ from 'lodash';
import * as constant from './constant';
import { ICredentials, IProperties, isCredentials, IFcConfig, ICommandParse } from './interface';
import Nas from './utils/nas';
import Common from './utils/common';

export default class NasCompoent {
  @HLogger(constant.CONTEXT) logger: ILogger;

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

    this.logger.debug(`Create nas success, mountPointDomain: ${mountPointDomain}`);
  }

  async ls(inputs: IV1Inputs) {
    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;

    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const apts = { boolean: ['a', 'all', 'l', 'long'], alias: { all: 'a', long: 'l' } };
    const { data: commandData = {} }: ICommandParse = commandParse({ args: inputs.Args }, apts);
    this.logger.debug(`Command data is: ${JSON.stringify(commandData)}`);

    if (commandData.help) {
      help(constant.LSHELP);
      return;
    }

    const { regionId, serviceName, functionName } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const common = new Common.Ls(regionId, credentials);

    const argv_paras = commandData._ || [];
    const nasDir: string = argv_paras[0];
    if (!common.checkLsNasDir(nasDir)) {
      help(constant.LSHELP);
      return;
    }

    const isAllOpt: boolean = commandData.all;
    const isLongOpt: boolean = commandData.long;

    await common.ls({ targetPath: nasDir, isAllOpt, isLongOpt, serviceName, functionName });
  }

  async rm(inputs: IV1Inputs) {
    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;

    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const apts = {
      boolean: ['r', 'recursive', 'f', 'force'],
      alias: { recursive: 'r', force: 'f' },
    };
    const { data: commandData = {} }: ICommandParse = commandParse({ args: inputs.Args }, apts);
    this.logger.debug(`Command data is: ${JSON.stringify(commandData)}`);

    const argv_paras = commandData._ || [];

    if (commandData.help || !argv_paras[0]) {
      help(constant.RMHELP);
      return;
    }

    const { regionId, serviceName, functionName } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const common = new Common.Rm(regionId, credentials);

    await common.rm({
      serviceName,
      functionName,
      targetPath: argv_paras[0],
      recursive: commandData.r,
      force: commandData.f,
    });
  }

  async cp(inputs: IV1Inputs) {
    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const apts = {
      boolean: ['recursive', 'r', 'no-clobber', 'n'],
      alias: { recursive: 'r', 'no-clobber': 'n' },
    };
    const { data: commandData = {} }: ICommandParse = commandParse({ args: inputs.Args }, apts);
    this.logger.debug(`Command data is: ${JSON.stringify(commandData)}`);

    const argv_paras = commandData._ || [];
    if (commandData.help || argv_paras.length !== 2) {
      help(constant.CPHELP);
      return;
    }

    const { regionId, serviceName, functionName } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const common = new Common.Cp(regionId, credentials);

    await common.cp({
      srcPath: argv_paras[0],
      targetPath: argv_paras[1],
      recursive: commandData.r,
      noClobber: commandData.n,
      serviceName,
      functionName,
      noTargetDirectory: true,
    });
  }
}
