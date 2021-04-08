import * as core from '@serverless-devs/core';
import _ from 'lodash';
import * as IReturn from './interface';
import { CONTEXT, getAutoName, STORENAME, HTTP_CONFIG } from '../../constant';
import Domain from './domain';
import Role from './role';
import Fc from './fc';
import StorageType from './storageType';
import { writeStrToFile, isAuto } from '../utils';
import { IProperties } from '../../interface/inputs';

export default class Component {
  @core.HLogger(CONTEXT) logger: core.ILogger;

  readonly properties: IProperties;
  readonly configFile: string;
  readonly domain: string;
  readonly accountID: string;
  readonly autoName: string;
  readonly serviceName: string;
  readonly functionName: string;

  constructor(properties: IProperties, configFile: string, accountID: string) {
    const serviceName = properties.service.name;
    const functionName = properties.function.name || serviceName;

    this.properties = properties;
    this.configFile = configFile;
    this.accountID = accountID;
    this.serviceName = serviceName;
    this.functionName = functionName;

    this.autoName = getAutoName(accountID, properties.region, serviceName);
  }

  async createConfigFile(inputs, assumeYes: boolean): Promise<any> {
    this.logger.debug(`${this.configFile} not exist, creating...`);

    const config: any = {
      service: this.getService(),
      function: this.getFunctonConfig(),
      trigger: this.getTrigger(),
    };

    const { service } = this.properties;

    config.vpc = await this.genVpcConfig(inputs);
    config.nas = await this.genNasConfig(inputs, assumeYes);

    if (isAuto(service.logConfig)) {
      config.log = this.genLogConfig();
    }

    // @TODO: 需要重构 pulumi 的 role 模块
    if (!service.role || isAuto(service.role)) {
      Object.assign(config, Role.genAutoRole(this.autoName));
    } else {
      Object.assign(config, Role.getRole(service.role));
    }
    delete service.role;

    config.customDomains = await Domain.get(inputs);

    await writeStrToFile(this.configFile, JSON.stringify(config, null, '  '), 'w', 0o777);
    this.logger.debug(`${this.configFile} created done!`);

    return config;
  }

  getService() {
    const service = _.cloneDeep(this.properties.service);

    if (isAuto(service.logConfig)) {
      delete service.logConfig;
    }

    return service;
  }

  getFunctonConfig() {
    const functionConfig = _.clone(this.properties.function);

    const {
      caPort,
      handler,
      memorySize,
      timeout
    } = functionConfig;

    functionConfig.service = this.serviceName;
    functionConfig.name = this.functionName;
    functionConfig.caPort = caPort || 9000;
    functionConfig.timeout = timeout || 60;
    functionConfig.memorySize = memorySize || 1024;
    functionConfig.handler = handler || 'index.handler';
    functionConfig.runtime = 'custom-container';

    delete functionConfig.code;
    return functionConfig;
  }

  getTrigger() {
    const triggerConfig = this.properties.trigger;

    const {
      serviceName,
      functionName
    } = this;

    if (!triggerConfig) {
      return {
        name: serviceName,
        function: functionName,
        service: serviceName,
        type: 'http',
        config: HTTP_CONFIG
      }
    }

    const { name, type, config } = triggerConfig;
    
    return {
      type,
      name: name || serviceName,
      function: functionName,
      service: serviceName,
      config: JSON.stringify(config),
    };
  }

  async genVpcConfig(inputs) {
    return {
      network: {
        cidrBlock: '10.0.0.0/8',
        vpc_name: this.autoName,
      },
      switch: {
        vswitch_name: this.autoName,
        cidrBlock: '10.0.0.0/16',
        vpcId: '',
        availabilityZone: await Fc.getZoneId(this.properties.region, inputs.Credentials),
      },
      securityGroup: {
        description: 'web-framework-generate',
        name: this.autoName,
        securityGroupType: 'normal',
        InnerAccessPolicy: 'Accept',
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
        name: this.autoName.toLocaleLowerCase().replace(/_/g, '-'),
        description: 'web-framework-generate',
      },
      store: {
        name: STORENAME,
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
