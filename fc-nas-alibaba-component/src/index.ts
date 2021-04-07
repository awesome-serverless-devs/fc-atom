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
import { ICredentials, IProperties, isCredentials, ICommandParse } from './interface';
import Nas from './utils/nas';
import Common from './utils/common';
import Version from './utils/version';
import FcResources from './utils/fcResources';
import { getMountDir, nasUriHandler } from './utils/utils';
import { parseNasUri } from './utils/common/utils';

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

  async deploy(inputs: IV1Inputs, isNasServerStale: boolean) {
    this.logger.debug('Create nas start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;

    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const properties: IProperties = _.cloneDeep(inputs.Properties);
    this.logger.debug(`Properties values: ${JSON.stringify(properties)}.`);

    let mountPointDomain: string;
    let fileSystemId = '';
    if (properties.mountPointDomain) {
      mountPointDomain = properties.mountPointDomain;
      this.logger.info(`Specify parameters, reuse configuration.`);
    } else {
      const nas = new Nas(properties.regionId, credentials);
      const nasInitResponse = await nas.init(properties);
      this.logger.debug(`Nas init response is: ${JSON.stringify(nasInitResponse)}`);

      mountPointDomain = nasInitResponse.mountTargetDomain;
      fileSystemId = nasInitResponse.fileSystemId;
    }
    this.logger.debug(`Create nas success, mountPointDomain: ${mountPointDomain}`);

    const mountDir = getMountDir(mountPointDomain, inputs.Properties.nasDir);
    inputs.Properties.nasDir = nasUriHandler(inputs.Properties.nasDir);

    this.logger.debug(`Whether to open the service configuration: ${!isNasServerStale}`);
    if (!isNasServerStale) {
      inputs.Properties.mountDir = mountDir;
      const fc = new FcResources(properties.regionId, credentials);
      await fc.init(inputs, mountPointDomain);
    }

    return { mountPointDomain, fileSystemId, mountDir };
  }

  async remove(inputs: IV1Inputs) {
    this.logger.debug('Remove nas start...');

    const {
      ProjectName: projectName,
      Provider: provider,
      AccessAlias: accessAlias,
    } = inputs.Project;

    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const regionId = inputs.Properties.regionId;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const fc = new FcResources(regionId, credentials);
    await fc.remove(inputs);

    const nas = new Nas(regionId, credentials);
    await nas.remove(inputs.Properties);
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

    const {
      regionId,
      serviceName,
      functionName = constant.FUNNAME,
      nasDir: nasDirYmlInput,
    } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const isNasServerStale = await Version.isNasServerStale(
      credentials,
      regionId,
      serviceName,
      functionName,
    );

    const { mountDir } = await this.deploy(inputs, isNasServerStale);

    const common = new Common.Ls(regionId, credentials);

    const argv_paras = commandData._ || [];
    const nasDirCommonInput: string = argv_paras[0];
    if (!common.checkLsNasDir(nasDirCommonInput)) {
      help(constant.LSHELP);
      return;
    }

    const isAllOpt: boolean = commandData.all;
    const isLongOpt: boolean = commandData.long;

    await common.ls({
      targetPath: parseNasUri(nasDirCommonInput, mountDir, nasDirYmlInput),
      isAllOpt,
      isLongOpt,
      serviceName,
      functionName,
    });
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

    const {
      regionId,
      serviceName,
      functionName = constant.FUNNAME,
      nasDir: nasDirYmlInput,
    } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const isNasServerStale = await Version.isNasServerStale(
      credentials,
      regionId,
      serviceName,
      functionName,
    );
    const { mountDir } = await this.deploy(inputs, isNasServerStale);

    const common = new Common.Rm(regionId, credentials);

    const targetPath = parseNasUri(argv_paras[0], mountDir, nasDirYmlInput);
    const isRootDir = `${mountDir}/.` === targetPath || `${mountDir}/` === targetPath;
    if (isRootDir) {
      this.logger.debug(`Rm root dir, mountDir is ${mountDir}, targetPath is ${targetPath}`);
    }

    await common.rm({
      serviceName,
      functionName,
      isRootDir,
      targetPath: isRootDir ? mountDir : targetPath,
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

    const {
      regionId,
      serviceName,
      functionName = constant.FUNNAME,
      nasDir: nasDirYmlInput,
      excludes,
    } = inputs.Properties;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const isNasServerStale = await Version.isNasServerStale(
      credentials,
      regionId,
      serviceName,
      functionName,
    );
    const { mountDir } = await this.deploy(inputs, isNasServerStale);

    const common = new Common.Cp(regionId, credentials);
    await common.cp({
      srcPath: argv_paras[0],
      targetPath: argv_paras[1],
      recursive: commandData.r,
      noClobber: commandData.n,
      serviceName,
      functionName,
      noTargetDirectory: true,
      mountDir,
      nasDirYmlInput,
      excludes,
    });
  }
}
