import * as core from '@serverless-devs/core';
import _ from 'lodash';
import path from 'path';
import fse from 'fs-extra';
import { CONTEXT } from '../constant';
import Client from './client';
import { ICredentials, IProperties } from '../interface/inputs';

interface ISrc {
  src: string;
  excludes?: string[];
}

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async getSrc(code: ISrc, serviceName: string, functionName: string): Promise<string> {
    const buildCodeUri = path.join(
      process.cwd(),
      '.s',
      'build',
      'artifacts',
      serviceName,
      functionName,
    );

    if (await fse.pathExists(buildCodeUri)) {
      return buildCodeUri;
    }

    return code.src;
  }

  static async init(properties: IProperties, v1Inputs) {
    const serviceName = properties.service.name;
    const functionName = properties.function.name || serviceName;
    const src = await this.getSrc(
      properties.function.code,
      serviceName,
      functionName,
    );
    this.logger.log(`nas component get src is: ${src}`);

    const { inputs, nas } = await this.transfromInputs(properties, v1Inputs);

    await nas.deploy(inputs);

    if (src) {
      inputs.Command = 'cp';
      inputs.Args = `-r ${src} nas:///${inputs.Properties.nasDir}`;
      this.logger.debug(`Cp cmd is: ${inputs.Args}`);
      await nas.cp(inputs);
    }

    return inputs.Properties;
  }

  static async remove(properties: IProperties, v1Inputs) {
    const { inputs, nas } = await this.transfromInputs(properties, v1Inputs);

    inputs.Command = 'remove';
    this.logger.debug(`Remove cmd is: ${inputs.Args}`);
    await nas.remove(inputs);
  }

  static async cp(properties: IProperties, v1Inputs) {
    const { inputs, nas } = await this.transfromInputs(properties, v1Inputs);

    inputs.Command = 'cp';
    this.logger.debug(`Cp cmd is: ${inputs.Args}`);

    await nas.cp(inputs);
  }

  static async ls(properties: IProperties, v1Inputs) {
    const { inputs, nas } = await this.transfromInputs(properties, v1Inputs);

    inputs.Command = 'ls';
    this.logger.debug(`Ls cmd is: ${inputs.Args}`);
    await nas.ls(inputs);
  }

  static async rm(properties: IProperties, v1Inputs) {
    const { inputs, nas } = await this.transfromInputs(properties, v1Inputs);

    inputs.Command = 'rm';
    this.logger.debug(`Rm cmd is: ${inputs.Args}`);
    await nas.rm(inputs);
  }

  static async transfromInputs(properties: IProperties, inputs) {
    const region = properties.region;
    const serviceName = properties.service.name;
    const { excludes } = properties.function.code || {};

    const nasProperties = await this.getNasProperties(
      region,
      serviceName,
      inputs.Credentials || inputs.credentials,
      excludes,
    );
    this.logger.debug(`Nas properties is: ${JSON.stringify(nasProperties)}`);

    inputs.Properties = nasProperties;
    inputs.Project.Component = 'fc-nas';

    const nas = await core.loadComponent('alibaba/fc-nas');

    return {
      nas,
      inputs,
    };
  }

  static async getNasProperties(
    regionId: string,
    serviceName: string,
    credentials: ICredentials,
    excludes: undefined | string[],
  ) {
    const fc = Client.fc(regionId, credentials);
    const {
      data: { role, vpcConfig, nasConfig },
    } = await fc.getService(serviceName);

    const { vpcId, vSwitchIds, securityGroupId } = vpcConfig;

    if (!vpcId) {
      throw new Error(`Service ${serviceName} is configured for query to vpc`);
    }

    const { userId, groupId, mountPoints } = nasConfig;
    if (_.isEmpty(mountPoints)) {
      throw new Error(`Service ${serviceName} is configured for query to nas`);
    }
    const [mountPointDomain, nasDir] = mountPoints[0].serverAddr.split(':/');

    return {
      regionId,
      serviceName: `_FRAMEWORK_NAS_${serviceName}`,
      description: `service for fc nas used for service ${serviceName}`,
      vpcId,
      vSwitchId: vSwitchIds[0],
      securityGroupId,
      role,
      userId,
      groupId,
      mountPointDomain: mountPointDomain,
      nasDir,
      excludes,
    };
  }
}
