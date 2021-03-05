import { HLogger, ILogger, IV1Inputs, IInputs, load, zip } from '@serverless-devs/core';
import _ from 'lodash';
import path from 'path';
import { fcClient } from '../client';
import { CONTEXT } from '../../constant';
import { ICredentials, IProperties } from '../../interface';
import { IFcConfig } from './interface';
import { sleep } from '../utils';
// import retry from 'promise-retry';

const ENSURENASDIREXISTSERVICE = 'ensure-nas-dir-exist-service';
const ENSURENASDIREXISTFUNCTION = 'nas_dir_checker';
const ENSURENASDIREXISTFILENAME = path.join(__dirname, 'ensure-nas-dir-exist.zip');

const NASSERVER = 'nas-server';
const NASSERVERFILENAME = path.join(__dirname, 'nas-server.zip');

export default class Resources {
  @HLogger(CONTEXT) logger: ILogger;
  fcClient: any;
  profile: ICredentials;

  constructor(regionId: string, profile: ICredentials) {
    this.fcClient = fcClient(regionId, profile);
    this.profile = profile;
  }

  async init(inputs: IV1Inputs, mountPointDomain: string) {
    const fcBase = await load('fc-base', 'alibaba');

    await this.ensureNasDir(fcBase, inputs, mountPointDomain);

    await this.deployNasService();
  }

  deployNasService() {}

  async ensureNasDir(fcBase: any, inputs: IV1Inputs, mountPointDomain: string) {
    const ensureNasDirInputs = this.transformYamlConfigToFcbaseConfig(
      inputs,
      mountPointDomain,
      true,
    );

    await fcBase.deploy(ensureNasDirInputs);
    await sleep(1000);

    const f = ensureNasDirInputs.properties.function;
    const { mountDir, nasDir } = inputs.Properties;

    this.logger.debug(
      `Invoke fc function, service name is: ${f.service}, function name is: ${
        f.name
      }, event is: ${JSON.stringify([nasDir])}`,
    );
    await this.invokeFcUtilsFunction(
      f.service,
      f.name,
      JSON.stringify([path.join(mountDir, nasDir)]),
    );
  }

  transformYamlConfigToFcbaseConfig(
    inputs,
    mountPointDomain: string,
    isEnsureNasDirExist: boolean,
  ): IInputs {
    const output: IInputs = {};

    const {
      regionId,
      serviceName,
      functionName,
      roleName,
      // vpcId,
      vSwitchId,
      securityGroupId,
      mountDir,
      nasDir,
      userId = 10003,
      groupId = 10003,
    } = inputs?.properties || inputs?.Properties;

    const service = `${serviceName}-${isEnsureNasDirExist ? ENSURENASDIREXISTSERVICE : NASSERVER}`;

    const properties: IFcConfig = {
      region: regionId,
      service: {
        name: service,
        role: roleName,
        vpcConfig: {
          // vpcId,
          securityGroupId,
          vswitchIds: [vSwitchId],
        },
        nasConfig: {
          userId,
          groupId,
          mountPoints: [
            {
              serverAddr: `${mountPointDomain}:/${isEnsureNasDirExist ? '' : nasDir}`,
              mountDir,
            },
          ],
        },
      },
      function: {
        service,
        name: isEnsureNasDirExist ? ENSURENASDIREXISTFUNCTION : functionName,
        handler: 'index.handler',
        filename: isEnsureNasDirExist ? ENSURENASDIREXISTFILENAME : NASSERVERFILENAME,
        runtime: 'nodejs8',
      },
    };

    _.forEach(inputs, (value, key) => {
      const k = _.lowerFirst(key);
      if (k === 'properties' || !_.isObject(value)) {
        output[k] = value;
      } else {
        output[k] = _.mapKeys(value, (v, k) => _.lowerFirst(k));
      }
    });

    output.credentials = this.profile;
    output.project.component = 'fc-base';
    output.properties = properties;
    output.command = 'deploy';
    output.args = '-y';
    return output;
  }

  async invokeFcUtilsFunction(serviceName: string, functionName: string, event: string) {
    const rs = await this.fcClient.invokeFunction(serviceName, functionName, event, {
      'X-Fc-Log-Type': 'Tail',
    });

    if (rs.data !== 'OK') {
      const log = rs.headers['x-fc-log-result'];

      if (log) {
        const decodedLog = Buffer.from(log, 'base64');
        this.logger.warn(
          `Invoke fc function ${serviceName}/${functionName} response is: ${decodedLog}`,
        );
        if (decodedLog.toString().toLowerCase().includes('permission denied')) {
          throw new Error(
            `fc utils function ${functionName} invoke error, error message is: ${decodedLog}`,
          );
        }
        throw new Error(
          `fc utils function ${functionName} invoke error, error message is: ${decodedLog}`,
        );
      }
    }
  }
}
