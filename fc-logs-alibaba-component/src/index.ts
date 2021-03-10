import { HLogger, ILogger, getCredential, help, commandParse } from '@serverless-devs/core';
import moment from 'moment';
import _ from 'lodash';
import SeachLogs from './utils/seachLogs';
import { HELP, CONTEXT } from './constant';
import { ICredentials, isCredentials, ICommandParse, IProperties } from './interface';

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

  async logs(inputs) {
    const apts = {
      boolean: ['tail', 'help'],
      string: ['requestId', 'keyword'],
      // number: ['startTime', 'endTime'],
      alias: { tail: 't', startTime: 's', endTime: 'e', keyword: 'k', requestId: 'r', help: 'h' },
    };
    const comParse: ICommandParse = commandParse({ args: inputs.Args }, apts);
    this.logger.debug(`commandParse response is: ${JSON.stringify(comParse)}`);

    if (comParse.data.help) {
      help(HELP);
      return;
    }

    const { Provider: provider, AccessAlias: accessAlias } = inputs.Project;

    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    const properties: IProperties = inputs.Properties;

    const { region, logConfig, topic, query } = properties;
    const projectName = logConfig.project;
    const logStoreName = logConfig.logStore;

    const cmdParameters = comParse.data || {};

    const logsClient = new SeachLogs(credentials, region);
    if (cmdParameters.tail) {
      await logsClient.realtime(projectName, logStoreName, topic, query);
    } else {
      let from = moment().subtract(20, 'minutes').unix();
      let to = moment().unix();
      let { startTime, endTime } = cmdParameters;

      if (startTime && endTime) {
        // 支持时间戳和其他时间格式
        startTime = /^\d+$/g.test(startTime) ? startTime : startTime;
        endTime = /^\d+$/g.test(endTime) ? endTime : endTime;

        from = new Date(startTime).getTime() / 1000;
        to = new Date(endTime).getTime() / 1000;
      } else {
        // 20 minutes ago
        this.logger.warn('By default, find logs within 20 minutes...\n');
      }

      const { keyword, type, requestId } = cmdParameters;
      const queryErrorLog = type === 'failed';

      const historyLogs = await logsClient.history(
        projectName,
        logStoreName,
        from,
        to,
        topic,
        query,
        keyword,
        queryErrorLog,
        requestId,
      );
      logsClient.printLogs(historyLogs);
    }

    return {
      Properties: inputs.Properties,
    };
  }
}
