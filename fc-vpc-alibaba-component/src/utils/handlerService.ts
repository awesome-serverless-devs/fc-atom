import { HLogger, ILogger } from '@serverless-devs/core';
import _ from 'lodash';
import inquirer from 'inquirer';
import Pop from '@alicloud/pop-core';
import { CONTEXT } from '../constant';
import { Credentials, IProperties, IVpcConfig } from '../interface';

const requestOption = {
  method: 'POST',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface IMackVpc {
  regionId: string;
  vpcName: string;
  description?: string;
}
interface IMackVswitch {
  regionId: string;
  vpcId: string;
  zoneId: string;
  vswitchName: string;
  description?: string;
  cidrBlock?: string;
}
interface IFindServiceRS {
  total: number;
  list: any[];
}
interface IMackSecurityGroup {
  regionId: string;
  vpcId: string;
  securityGroupName: string;
  description?: string;
}

export default class HandlerService {
  @HLogger(CONTEXT) logger: ILogger;
  vpcClient: Pop;
  ecsClient: Pop;

  constructor(credentials: Credentials) {
    this.vpcClient = this.getPopClient('https://vpc.aliyuncs.com', '2016-04-28', credentials);
    this.ecsClient = this.getPopClient('https://ecs.aliyuncs.com', '2014-05-26', credentials);
  }

  getPopClient(endpoint: string, apiVersion: string, profile: Credentials) {
    let timeout = 10;
    if (process.env.ALIYUN_RAM_CLIENT_TIMEOUT) {
      timeout = parseInt(process.env.ALIYUN_RAM_CLIENT_TIMEOUT);
    }

    return new Pop({
      endpoint: endpoint,
      apiVersion: apiVersion,
      accessKeyId: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      opts: {
        timeout: timeout * 1000,
      },
    });
  }

  async findVpcs(regionId: string, vpcName?: string): Promise<IFindServiceRS> {
    const pageSize = 2; // max value is 50.
    let requestPageNumber = 0;
    let totalCount: number;
    let pageNumber: number;

    let vpcs: any[] = [];
    this.logger.debug(`find vpc start...`);
    do {
      const params = {
        RegionId: regionId,
        PageSize: pageSize,
        VpcName: vpcName,
        PageNumber: ++requestPageNumber,
      };

      this.logger.debug(`find vpc PageNumber: ${params.PageNumber}`);
      try {
        const rs: any = await this.vpcClient.request('DescribeVpcs', params, requestOption);
        this.logger.debug(`find vpc rs: ${JSON.stringify(rs)}`);

        totalCount = rs.TotalCount;
        pageNumber = rs.PageNumber;
        vpcs = vpcs.concat(rs.Vpcs.Vpc);
      } catch (ex) {
        throw ex;
      }
    } while (totalCount && pageNumber && pageNumber * pageSize < totalCount);
    this.logger.debug(`find vpcs end, findVpcs vpcs response: ${JSON.stringify(vpcs)}`);

    return { total: totalCount, list: vpcs };
  }

  async findVSwitches(
    regionId: string,
    vpcId: string,
    vswitchName?: string,
    zoneId?: string,
  ): Promise<IFindServiceRS> {
    const params = {
      RegionId: regionId,
      VpcId: vpcId,
      VSwitchName: vswitchName,
      ZoneId: zoneId,
      PageSize: 50,
    };

    try {
      const rs: any = await this.vpcClient.request('DescribeVSwitches', params, requestOption);
      this.logger.debug(`Call DescribeVSwitches response: ${JSON.stringify(rs)}`);

      return { total: rs.TotalCount, list: rs.VSwitches.VSwitch };
    } catch (ex) {
      throw ex;
    }
  }

  async findSecurityGroups(
    regionId: string,
    vpcId: string,
    securityGroupName: string,
  ): Promise<IFindServiceRS> {
    const params = {
      RegionId: regionId,
      VpcId: vpcId,
      SecurityGroupName: securityGroupName,
    };

    try {
      const rs: any = await this.ecsClient.request('DescribeSecurityGroups', params, requestOption);
      this.logger.debug(`Call DescribeSecurityGroups response: ${JSON.stringify(rs)}`);

      const securityGroup = rs.SecurityGroups.SecurityGroup;

      return { total: rs.TotalCount, list: securityGroup };
    } catch (ex) {
      throw ex;
    }
  }

  async createVSwitch({
    regionId,
    vpcId,
    zoneId,
    vswitchName,
    description,
    cidrBlock,
  }: IMackVswitch): Promise<string> {
    const params = {
      RegionId: regionId,
      VpcId: vpcId,
      ZoneId: zoneId,
      VSwitchName: vswitchName,
      Description: description,
      CidrBlock: cidrBlock || '10.20.0.0/16',
    };
    this.logger.debug(`createVSwitch params is ${JSON.stringify(params)}.`);

    try {
      const createRs: any = await this.vpcClient.request('CreateVSwitch', params, requestOption);
      return createRs.VSwitchId;
    } catch (ex) {
      throw ex;
    }
  }

  async createVpc({ regionId, vpcName, description }: IMackVpc): Promise<string> {
    const createParams = {
      RegionId: regionId,
      CidrBlock: '10.0.0.0/8',
      EnableIpv6: false,
      VpcName: vpcName,
      Description: 'default vpc created by fc fun',
    };

    let createRs: any;

    try {
      this.logger.info(`Create vpc start...`);
      createRs = await this.vpcClient.request('CreateVpc', createParams, requestOption);
      this.logger.debug(`create vpc response is: ${JSON.stringify(createRs)}`);
    } catch (ex) {
      throw ex;
    }
    const vpcId = createRs.VpcId;
    await this.waitVpcUntilAvaliable(regionId, vpcId);
    this.logger.info(`Create vpc success, vpcId is: ${vpcId}`);

    return vpcId;
  }

  async createSecurityGroup({
    regionId,
    vpcId,
    securityGroupName,
    description,
  }: IMackSecurityGroup): Promise<string> {
    const params = {
      RegionId: regionId,
      SecurityGroupName: securityGroupName,
      Description: description,
      VpcId: vpcId,
      SecurityGroupType: 'normal',
    };
    try {
      this.logger.info(`Create securityGroup start...`);
      const createRs: any = await this.ecsClient.request(
        'CreateSecurityGroup',
        params,
        requestOption,
      );
      this.logger.debug(`Call CreateSecurityGroup response is: ${JSON.stringify(createRs)}`);

      const id = createRs.SecurityGroupId;
      this.logger.info(`Create securityGroup success, vpcId is: ${id}`);

      return id;
    } catch (ex) {
      throw ex;
    }
    return '';
  }

  async waitVpcUntilAvaliable(regionId: string, vpcId: string) {
    let count = 0;
    let status;

    do {
      count++;

      const params = {
        RegionId: regionId,
        VpcId: vpcId,
      };

      await sleep(800);

      this.logger.debug(`Call to DescribeVpcs: ${count}.`);
      try {
        const rs: any = await this.vpcClient.request('DescribeVpcs', params, requestOption);
        const vpcs = rs.Vpcs.Vpc;
        if (vpcs && vpcs.length) {
          status = vpcs[0].Status;

          this.logger.info(
            `VPC already created, waiting for status to be 'Available', the status is ${status} currently`,
          );
        }
      } catch (ex) {
        throw ex;
      }
    } while (count < 15 && status !== 'Available');

    if (status !== 'Available') {
      throw new Error(`Timeout while waiting for vpc ${vpcId} status to be 'Available'`);
    }
  }

  async mackVpc({ regionId, vpcName, description }: IMackVpc): Promise<string> {
    const { total, list: filterVpcs } = await this.findVpcs(regionId, vpcName);
    this.logger.debug(`filter vpcs:: ${JSON.stringify(filterVpcs)}`);

    if (total === 1) {
      const vpcId = filterVpcs[0].VpcId;
      this.logger.info(`There is only one vpc, directly reuse the current vpc, vpcId is: ${vpcId}`);
      return vpcId;
    } else if (total > 1) {
      const { vpcId } = await inquirer.prompt({
        type: 'list',
        name: 'vpcId',
        message: 'There are multiple vpcs, please select a vpc:',
        choices: filterVpcs.map(({ VpcId }): string => VpcId),
      });
      this.logger.debug(`vpcId is: ${vpcId}`);

      return vpcId;
    } else {
      this.logger.info('Vpc not found.');
      return await this.createVpc({ regionId, vpcName, description });
    }
  }

  async mackVswitch(mackVswitch: IMackVswitch): Promise<string> {
    const { regionId, vpcId, zoneId, vswitchName } = mackVswitch;

    const { total, list: vSwitches } = await this.findVSwitches(
      regionId,
      vpcId,
      vswitchName,
      zoneId,
    );

    if (total === 1) {
      this.logger.info(`There is only one vSwitch, directly reuse the current vSwitch.`);
      return vSwitches[0].VSwitchId;
    } else if (total === 2) {
      const { vSwitchId } = await inquirer.prompt({
        type: 'list',
        name: 'vSwitchId',
        message: 'There are multiple vSwitch, please select a vSwitch:',
        choices: vSwitches.map(({ VSwitchId }): string => VSwitchId),
      });
      return vSwitchId;
    } else {
      this.logger.info('VSwitch not found.');
      return await this.createVSwitch(mackVswitch);
    }
  }

  async mackSecurityGroup(inputs: IMackSecurityGroup): Promise<string> {
    const { regionId, vpcId, securityGroupName } = inputs;
    const { total, list: securityGroups } = await this.findSecurityGroups(
      regionId,
      vpcId,
      securityGroupName,
    );

    if (total === 1) {
      this.logger.info(
        `There is only one securityGroup, directly reuse the current securityGroups.`,
      );
      return securityGroups[0].SecurityGroupId;
    } else if (total === 2) {
      const { securityGroup } = await inquirer.prompt({
        type: 'list',
        name: 'securityGroup',
        message: 'There are multiple securityGroup, please select a securityGroup:',
        choices: securityGroups.map(({ SecurityGroupId }): string => SecurityGroupId),
      });
      return securityGroup;
    } else {
      this.logger.info('SecurityGroup not found.');
      return await this.createSecurityGroup(inputs);
    }
  }

  async create(properties: IProperties): Promise<IVpcConfig> {
    const {
      regionId,
      vpcName,
      vpcDescription,
      vswitchName,
      vswitchDescription,
      cidrBlock,
      zoneId,
      securityGroupDescription,
      securityGroupName,
    } = properties;

    const vpcId = await this.mackVpc({ regionId, vpcName, description: vpcDescription });

    const vSwitchId = await this.mackVswitch({
      regionId,
      vpcId,
      zoneId,
      vswitchName,
      cidrBlock,
      description: vswitchDescription,
    });
    this.logger.info(`VSwitchId is ${vSwitchId}.`);

    const securityGroupId = await this.mackSecurityGroup({
      regionId,
      vpcId,
      securityGroupName,
      description: securityGroupDescription,
    });
    this.logger.info(`SecurityGroupId is ${securityGroupId}.`);

    return {
      vpcId,
      vSwitchId,
      securityGroupId,
    };
  }
}
