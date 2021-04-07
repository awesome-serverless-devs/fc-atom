import { HLogger, ILogger, IV1Inputs, IInputs, loadComponent } from '@serverless-devs/core';
import _ from 'lodash';
import path from 'path';
import Version from '../version';
import { fcClient } from '../client';
import { CONTEXT, FUNNAME } from '../../constant';
import { ICredentials } from '../../interface';
import { IFcConfig } from './interface';
import { sleep } from '../utils';

const ENSURENASDIREXISTSERVICE = 'ensure-nas-dir-exist-service';
const ENSURENASDIREXISTFUNCTION = 'nas_dir_checker';
const ENSURENASDIREXISTFILENAME = path.join(__dirname, 'ensure-nas-dir-exist.zip');

const getNasServerFile = async (): Promise<string> =>
  path.join(__dirname, `nas-server-${await Version.getVersion()}.zip`);

export default class Resources {
  @HLogger(CONTEXT) logger: ILogger;
  fcClient: any;
  profile: ICredentials;
  fcBase: any;

  constructor(regionId: string, profile: ICredentials) {
    this.fcClient = fcClient(regionId, profile);
    this.profile = profile;
  }

  async init(inputs: IV1Inputs, mountPointDomain: string) {
    this.fcBase = await loadComponent('alibaba/fc-base');

    await this.deployEnsureNasDir(inputs, mountPointDomain);

    await this.deployNasService(inputs, mountPointDomain);
  }

  async remove(inputs: IV1Inputs) {
    const fcBase = await loadComponent('alibaba/fc-base');

    const nasServiceInputs = await this.transformYamlConfigToFcbaseConfig(inputs, '', false);
    nasServiceInputs.args = 'service -s -y';
    await fcBase.remove(nasServiceInputs);

    const ensureNasDirInputs = await this.transformYamlConfigToFcbaseConfig(inputs, '', true);
    ensureNasDirInputs.args = 'service -s -y';
    await fcBase.remove(ensureNasDirInputs);
  }

  async deployNasService(inputs: IV1Inputs, mountPointDomain: string) {
    const nasServiceInputs = await this.transformYamlConfigToFcbaseConfig(
      inputs,
      mountPointDomain,
      false,
    );
    this.logger.warn(`deploy nas service`);
    
    await this.fcBase.deploy(nasServiceInputs);
    this.logger.warn(`Waiting for trigger to be up`);
    await sleep(5000);
  }

  async deployEnsureNasDir(inputs: IV1Inputs, mountPointDomain: string) {
    const ensureNasDirInputs = await this.transformYamlConfigToFcbaseConfig(
      inputs,
      mountPointDomain,
      true,
    );

    await this.fcBase.deploy(ensureNasDirInputs);
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

  async transformYamlConfigToFcbaseConfig(
    inputs,
    mountPointDomain: string,
    isEnsureNasDirExist: boolean,
  ) {
    const output: IInputs = {};

    const {
      regionId,
      serviceName,
      functionName = FUNNAME,
      role,
      // vpcId,
      vSwitchId,
      securityGroupId,
      mountDir,
      nasDir,
      userId = 10003,
      groupId = 10003,
    } = inputs?.properties || inputs?.Properties;

    const service = isEnsureNasDirExist
      ? `${serviceName}-${ENSURENASDIREXISTSERVICE}`
      : serviceName;
    const funName = isEnsureNasDirExist ? ENSURENASDIREXISTFUNCTION : functionName;

    const properties: IFcConfig = {
      region: regionId,
      service: {
        name: service,
        role: role,
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
        name: funName,
        handler: 'index.handler',
        timeout: 600,
        filename: isEnsureNasDirExist ? ENSURENASDIREXISTFILENAME : await getNasServerFile(),
        runtime: 'nodejs8',
      },
    };

    if (!isEnsureNasDirExist) {
      properties.triggers = [
        {
          name: 'httpTrigger',
          function: funName,
          service: service,
          type: 'http',
          config: {
            authType: 'function',
            methods: ['POST', 'GET'],
          },
        },
      ];
    }

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
    output.args += ' -s -y';

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
