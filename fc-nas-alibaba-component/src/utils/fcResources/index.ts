import { HLogger, ILogger, IV1Inputs, IInputs, load } from '@serverless-devs/core';
import _ from 'lodash';
import { fcClient } from '../client';
import { CONTEXT } from '../../constant';
import { ICredentials, IProperties } from '../../interface';
import { IFcConfig } from './interface';
// import retry from 'promise-retry';

const ENSURENASDIREXISTSERVICE = 'ensure-nas-dir-exist-service';
const ENSURENASDIREXISTFUNCTION = 'nas_dir_checker';
const ENSURENASDIREXISTFILENAME = './ensureNasDirExist.js';

const NASSERVER = 'nas-server';
const NASSERVERFILENAME = './nas-server.zip';

export default class Resources {
  @HLogger(CONTEXT) logger: ILogger;
  fcClient: any;
  profile: ICredentials;

  constructor(regionId: string, profile: ICredentials) {
    this.fcClient = fcClient(regionId, profile);
    this.profile = profile;
  }

  async init(inputs: IV1Inputs, mountPointDomain: string) {
    const ensureNasDirInputs = this.transformYamlConfigToFcbaseConfig(
      inputs,
      mountPointDomain,
      true,
    );

    console.log(ensureNasDirInputs);
    console.log(JSON.stringify(ensureNasDirInputs, null, '    '));

    const fcBase = await load('fc-base', 'alibaba');
    await fcBase.deploy(ensureNasDirInputs);
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
      vpcId,
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
          vpcId,
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
        handler: 'index.hanlder',
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
}
