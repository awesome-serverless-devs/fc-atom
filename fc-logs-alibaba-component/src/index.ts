import { Component } from '@serverless-devs/s-core';
import moment from 'moment';
import SeachLogs from './utils/seachLogs';
import HELP from './utils/help';

export default class Logs extends Component {
  logger = console;

  async logs(inputs) {
    this.help(inputs, HELP);

    const { Properties: properties = {}, Credentials: credentials = {} } = inputs;

    const { Region: region, LogConfig: logConfig, Topic: topic, Query: query } = properties;
    const projectName = logConfig.Project;
    const logStoreName = logConfig.LogStore;

    const args = this.args(inputs.Args, undefined, ['s', 'startTime', 'e', 'endTime'], undefined);
    const cmdParameters = args.Parameters || {};
    const { t, tail } = args.Parameters;

    const logsClient = new SeachLogs(credentials, region);
    if (t || tail) {
      await logsClient.realtime(projectName, logStoreName, topic, query);
    } else {
      let from = moment().subtract(20, 'minutes').unix();
      let to = moment().unix();

      let startTime = cmdParameters.s || cmdParameters.startTime;
      let endTime = cmdParameters.e || cmdParameters.endTime;
      if (startTime && endTime) {
        startTime = /^\d+$/g.test(startTime) ? parseInt(startTime) : startTime;
        endTime = /^\d+$/g.test(endTime) ? parseInt(endTime) : endTime;

        from = new Date(startTime).getTime() / 1000;
        to = new Date(endTime).getTime() / 1000;
      } else {
        // 20 minutes ago
        this.logger.warn('By default, find logs within 20 minutes...\n');
      }

      const keyword = cmdParameters.k || cmdParameters.keyword;
      const type = cmdParameters.t || cmdParameters.type;
      const requestId = cmdParameters.r || cmdParameters.requestId;
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
