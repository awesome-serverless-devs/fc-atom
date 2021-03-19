import { HLogger, ILogger, getCredential, help, commandParse, load } from '@serverless-devs/core';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import _ from 'lodash';
import { HELP, CONTEXT } from './constant';
import { ICredentials, isCredentials, ICommandParse } from './interface/inputs';
import { genStackId } from './lib/utils';
import { cpPulumiCodeFiles, genPulumiInputs } from './lib/pulumi';
import * as shell from 'shelljs';
import NasComponent from './lib/nasComponent';
import Framework from './lib/framework';

const PULUMI_CACHE_DIR: string = path.join(os.homedir(), '.s', 'cache', 'pulumi', 'web-framework');

export default class Logs {
  @HLogger(CONTEXT) logger: ILogger;

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

  async handlerInputs(inputs) {
    const { Provider: provider, AccessAlias: accessAlias } = inputs.Project || inputs.project;

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    inputs.Credentials = credentials;

    const properties = inputs.Properties || inputs.properties;

    const args = inputs.Args || inputs.args;

    return {
      args,
      provider,
      accessAlias,
      credentials,
      properties,
      project: inputs.Project || inputs.project,
    };
  }

  async deploy(inputs) {
    const apts = {
      boolean: ['help', 'assumeYes'],
      alias: { help: 'h', assumeYes: 'y' },
    };
    const comParse: ICommandParse = commandParse({ args: inputs.Args }, apts);
    if (comParse.data?.help) {
      help(HELP);
      return;
    }

    const outputInputs = await this.handlerInputs(inputs);
    const { credentials, properties, project } = outputInputs;

    const assumeYes = comParse.data?.assumeYes;
    const stackId = genStackId(credentials.AccountID, properties.region, properties.service.name);

    const pulumiStackDir = path.join(PULUMI_CACHE_DIR, stackId);
    this.logger.debug(`Ensuring ${pulumiStackDir}...`);
    await fse.ensureDir(pulumiStackDir, 0o777);
    const fcConfigJsonFile = path.join(pulumiStackDir, 'config.json');
    this.logger.debug(`Fc config json file path is: ${fcConfigJsonFile}`);

    const f = new Framework(properties, fcConfigJsonFile, credentials.AccountID);
    await f.addConfigToJsonFile(assumeYes, _.cloneDeep(inputs));

    await cpPulumiCodeFiles(pulumiStackDir);
    shell.exec(`cd ${pulumiStackDir} && npm i`, { silent: true });

    // 部署 fc 资源
    const pulumiComponentIns = await load('pulumi-alibaba', 'alibaba');
    const pulumiInputs = genPulumiInputs(
      credentials,
      project,
      stackId,
      properties.region,
      pulumiStackDir,
    );

    const upRes = await pulumiComponentIns.up(pulumiInputs);
    if (upRes.stderr && upRes.stderr !== '') {
      this.logger.error(`deploy error: ${upRes.stderr}`);
      return;
    }

    await NasComponent.init(properties, _.cloneDeep(inputs));

    // 返回结果
    return '';
  }

  async remove(inputs) {
    const apts = {
      boolean: ['help', 'assumeYes'],
      alias: { help: 'h', assumeYes: 'y' },
    };
    const comParse: ICommandParse = commandParse({ args: inputs.Args }, apts);
    if (comParse.data?.help) {
      help(HELP);
      return;
    }
    const { credentials, properties, project } = await this.handlerInputs(inputs);
    const stackId = genStackId(credentials.AccountID, properties.region, properties.service.name);
    const pulumiStackDir = path.join(PULUMI_CACHE_DIR, stackId);

    try {
      await NasComponent.remove(properties, _.cloneDeep(inputs));
    } catch (ex) {
      this.logger.debug(ex);
    }

    const pulumiComponentIns = await load('pulumi-alibaba', 'alibaba');
    const pulumiInputs = genPulumiInputs(
      credentials,
      project,
      stackId,
      properties.region,
      pulumiStackDir,
    );
    const upRes = await pulumiComponentIns.destroy(pulumiInputs);
    if (upRes.stderr && upRes.stderr !== '') {
      this.logger.error(`destroy error: ${upRes.stderr}`);
      return;
    }
  }
}
