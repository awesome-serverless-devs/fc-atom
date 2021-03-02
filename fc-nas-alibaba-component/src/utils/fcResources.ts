import { HLogger, ILogger } from '@serverless-devs/core';
import FC from '@alicloud/fc2';
import path from 'path';
import fs from 'fs-extra';
import { getTimeout } from './utils';
import { CONTEXT } from '../constant';
import { IFcConfig, ICredentials } from '../interface';
// import retry from 'promise-retry';

interface ICodeAndVersion {
  version: string;
  zipCodePath: string;
}

export default class FcResources {
  @HLogger(CONTEXT) logger: ILogger;
  fcClient: any;

  constructor(regionId, profile: ICredentials) {
    this.fcClient = new FC(profile.AccountID, {
      accessKeyID: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      region: regionId,
      timeout: getTimeout(),
    });
  }

  async getCodeAndVersion(): Promise<ICodeAndVersion> {
    const zipCodePath = path.resolve(__dirname, '../../files/fc-nas-code.zip');
    if (!(await fs.pathExists(zipCodePath))) {
      throw new Error('Could not find nas-server zip');
    }

    const versionFilePath = path.resolve(__dirname, '../../files/VERSION');
    if (!(await fs.pathExists(versionFilePath))) {
      throw new Error('could not find VERSION file');
    }

    const version = (await fs.readFile(versionFilePath)).toString();

    return {
      version,
      zipCodePath,
    };
  }

  async create(properties: IFcConfig) {
    this.logger.info('Initializing nas component');
    const serviceRs = await this.handlerService(properties);

    const { version, zipCodePath } = await this.getCodeAndVersion();
    const { serviceName, functionName } = properties;
    await this.handlerFunction(serviceName, functionName, version, zipCodePath);

    // console.log(properties);
    // console.log(serviceRs);
  }

  async handlerService(properties: IFcConfig) {
    const { serviceName, description, roleName, functionName, vpcConfig, nasConfig } = properties;
    let serviceRs: any;

    this.logger.info(`Processing ancillary services ${serviceName}.`);
    try {
      serviceRs = await this.fcClient.getService(serviceName);
      this.logger.debug(`Call getService response is: ${JSON.stringify(serviceRs)}`);

      serviceRs = await this.fcClient.updateService(serviceName, {
        description,
        role: roleName,
        vpcConfig,
        nasConfig,
      });

      this.logger.info(
        `Succeeded in modifying the configuration of auxiliary services ${serviceName}.`,
      );
      this.logger.debug(`Call updateService response is: ${JSON.stringify(serviceRs)}`);
      return serviceRs.data;
    } catch (ex) {
      if (ex.code === 'ServiceNotFound') {
        serviceRs = await this.fcClient.createService(serviceName, {
          description,
          role: roleName,
          vpcConfig,
          nasConfig,
        });

        this.logger.info(`Auxiliary services ${serviceName} create success.`);
        this.logger.debug(`Call createService response is: ${JSON.stringify(serviceRs)}`);
        return serviceRs.data;
      }
      throw ex;
    }
  }

  async handlerFunction(
    serviceName: string,
    functionName: string,
    version: string,
    zipCodePath: string,
  ) {
    // 首先需要 checkVersion

    const functionConfig = {
      // Name: constants.NAS_FUNCTION,
      // CodeUri: codePath,
      Handler: 'index.handler',
      MemorySize: 256,
      Runtime: 'nodejs10',
      Environment: [
        {
          PATH: '/code/.fun/root/usr/bin',
        },
      ],
    };
  }
}
