import * as core from '@serverless-devs/core';
import fse from 'fs-extra';
import _ from 'lodash';
import * as IReturn from './interface';
import { CONTEXT } from '../../constant';
import Domain from './domain';
import ZoneId from './zoneId';
import StorageType from './storageType';
import { isFile, writeStrToFile } from '../utils';
import { IProperties } from '../../interface/inputs';

export default class Component {
  @core.HLogger(CONTEXT) logger: core.ILogger;

  readonly properties: IProperties;
  readonly configFile: string;
  readonly domain: string;
  readonly accountID: string;
  readonly autoName: string;

  constructor(properties: IProperties, configFile: string, accountID: string) {
    this.properties = properties;
    this.configFile = configFile;
    this.accountID = accountID;

    this.autoName = `framework-${accountID}-${this.properties.region}-${this.properties.service.name}`;
  }

  async addConfigToJsonFile(assumeYes: boolean, inputs) {
    await this.createConfigFile(inputs, assumeYes);
    // if (await this.configFileExists()) {
    //   // update
    //   await this.addConfig(assumeYes);
    // } else {
    //   // create
    //   await this.createConfigFile();
    // }
  }

  async configFileExists(): Promise<boolean> {
    if ((await fse.pathExists(this.configFile)) && (await isFile(this.configFile))) {
      return true;
    }
    return false;
  }

  async createConfigFile(inputs, assumeYes: boolean): Promise<void> {
    this.logger.debug(`${this.configFile} not exist, creating...`);

    const config: any = {
      service: this.getService(),
      function: this.getFunctonConfig(),
      trigger: this.getTrigger(),
    };

    const { service, domain } = this.properties;

    if (!service.nasConfig) {
      config.vpc = await this.genVpcConfig(inputs);
      config.nas = await this.genNasConfig(inputs, assumeYes);
    }

    if (service.logConfig) {
      config.log = this.genLogConfig();
    }

    if (!service.role) {
      Object.assign(config, this.genRole(service.logConfig));
    }

    if (!domain || domain === 'auto') {
      config.domain = await Domain.get(inputs);
    }

    await writeStrToFile(this.configFile, JSON.stringify(config, null, '  '), 'w', 0o777);
    this.logger.debug(`${this.configFile} created done!`);
  }

  getService() {
    const service = _.cloneDeep(this.properties.service);

    delete service.logConfig;

    return service;
  }

  genRole(logConfig): any {
    const rolePolicyAttachments = [
      {
        roleName: this.autoName,
        policyType: 'System',
        policyName: 'AliyunECSNetworkInterfaceManagementAccess',
      },
    ];

    if (logConfig) {
      rolePolicyAttachments.push({
        roleName: this.autoName,
        policyType: 'System',
        policyName: 'AliyunLogFullAccess',
      });
    }

    return {
      role: {
        name: this.autoName,
        document: JSON.stringify({
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: ['fc.aliyuncs.com'],
              },
            },
          ],
          Version: '1',
        }),
      },
      rolePolicyAttachments,
    };
  }

  getFunctonConfig() {
    const f = _.clone(this.properties.function);
    delete f.code;
    f.handler = 'index.handler';
    f.runtime = 'custom-container';

    return f;
  }

  getTrigger() {
    return {
      ...this.properties.trigger,
      config: JSON.stringify(this.properties.trigger.config),
    };
  }

  async genVpcConfig(inputs) {
    return {
      network: {
        cidrBlock: '10.0.0.0/8',
        name: this.autoName,
      },
      switch: {
        name: this.autoName,
        cidrBlock: '10.0.0.0/16',
        vpcId: '',
        availabilityZone: await ZoneId.get(this.properties.region, inputs.Credentials),
      },
      securityGroup: {
        description: 'web-framework-generate',
        name: this.autoName,
        vpcId: '',
      },
    };
  }

  async genNasConfig(inputs, assumeYes: boolean) {
    const profile = inputs.Credentials;

    return {
      fileSystem: {
        protocolType: 'NFS',
        storageType: await StorageType.get(this.properties.region, profile, assumeYes), // `Capacity` and `Performance`
        description: 'web-framework-generate',
      },
      mountTarget: {
        fileSystemId: '',
        vswitchId: '',
        accessGroupName: 'DEFAULT_VPC_GROUP_NAME',
      },
    };
  }

  genLogConfig(): IReturn.IGensls {
    return {
      project: {
        name: this.autoName,
        description: 'web-framework-generate',
      },
      store: {
        name: 'logstore',
        enableWebTracking: true,
      },
      storeIndex: {
        fullText: {
          token: ', \'";=()[]{}?@&<>/:\n\t\r',
        },
      },
    };
  }
}
