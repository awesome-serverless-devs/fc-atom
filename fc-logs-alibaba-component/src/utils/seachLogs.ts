import Client from './client';
import { sleep, replaceLineBreak } from './utils';
import _ from 'lodash';
import moment from 'moment';

interface IGetLogs {
  projectName: string;
  logStoreName: string;
  from: string | number;
  to: string | number;
  topic: string;
  query: string;
}

export default class SeachLogs extends Client {
  slsClient = this.buildSlsClient();
  logger = console;

  printLogs(historyLogs: object) {
    _.values(historyLogs).forEach((data) => {
      this.logger.info(`\n${data.message}`);
    });
  }

  /**
   * 过滤日志信息
   */
  private filterByKeywords(logsList = {}, { requestId, keyword, queryErrorLog = false }) {
    let logsClone = _.cloneDeep(logsList);
    if (requestId) {
      logsClone = _.pick(logsClone, [`${requestId}\r`, requestId]);
    }

    if (keyword) {
      logsClone = _.pickBy(logsClone, (value) => {
        const replaceLog = value.message.replace(new RegExp(/(\r)/g), '\n');
        return replaceLog.indexOf(keyword) !== -1;
      });
    }

    if (queryErrorLog) {
      logsClone = _.pickBy(logsClone, (value) => {
        const replaceLog = value.message.replace(new RegExp(/(\r)/g), '\n');
        return replaceLog.indexOf(' [ERROR] ') !== -1 || replaceLog.indexOf('Error: ') !== -1;
      });
    }

    return logsClone;
  }

  /**
   * 获取日志
   */
  async getLogs(requestParams: IGetLogs) {
    let count;
    let xLogCount;
    let xLogProgress = 'Complete';

    let result;

    do {
      const response: any = await new Promise((resolve, reject) => {
        this.slsClient.getLogs(requestParams, (error, data) => {
          if (error) {
            reject(error);
          }
          resolve(data);
        });
      });
      const body = response.body;

      if (_.isEmpty(body)) {
        continue;
      }

      count = _.keys(body).length;

      xLogCount = response.headers['x-log-count'];
      xLogProgress = response.headers['x-log-progress'];

      let requestId;
      result = _.values(body).reduce((acc, cur) => {
        const currentMessage = cur.message;
        const found = currentMessage.match('(\\w{8}(-\\w{4}){3}-\\w{12}?)');

        if (!_.isEmpty(found)) {
          requestId = found[0];
        }

        if (currentMessage.includes('FC Invoke Start')) {
          requestId = currentMessage.replace('FC Invoke Start RequestId: ', '');
        }

        if (requestId) {
          if (!_.has(acc, requestId)) {
            acc[requestId] = {
              timestamp: cur.__time__,
              time: moment.unix(cur.__time__).format('YYYY-MM-DD H:mm:ss'),
              message: '',
            };
          }
          acc[requestId].message = acc[requestId].message + currentMessage;
        }

        return acc;
      }, {});
    } while (xLogCount !== count && xLogProgress !== 'Complete');

    return result;
  }

  /**
   * 获取历史日志
   * @param {*} projectName
   * @param {*} logStoreName
   * @param {*} from
   * @param {*} to
   * @param {*} topic
   * @param {*} query
   * @param {*} keyword 关键字过滤
   * @param {*} queryErrorLog
   * @param {*} requestId
   */
  async history(
    projectName: string,
    logStoreName: string,
    from: string | number,
    to: string | number,
    topic: string,
    query: string,
    keyword?: string,
    queryErrorLog?: boolean,
    requestId?: string,
  ) {
    const logsList = await this.getLogs({
      from,
      to,
      projectName,
      logStoreName,
      topic,
      query,
    });

    return this.filterByKeywords(replaceLineBreak(logsList), { keyword, requestId, queryErrorLog });
  }

  /**
   * 获取实时日志
   * @param {*} projectName
   * @param {*} logStoreName
   * @param {*} topic
   * @param {*} query
   */
  async realtime(projectName: string, logStoreName: string, topic: string, query: string) {
    let timeStart;
    let timeEnd;
    let times = 1800;

    const consumedTimeStamps = [];

    while (times > 0) {
      await sleep(1000);
      times = times - 1;

      timeStart = moment().subtract(10, 'seconds').unix();
      timeEnd = moment().unix();

      const pulledlogs = await this.getLogs({
        projectName,
        logStoreName,
        topic,
        query,
        from: timeStart,
        to: timeEnd,
      });

      if (_.isEmpty(pulledlogs)) {
        continue;
      }

      const notConsumedLogs = _.pickBy(pulledlogs, (data) => {
        return !_.includes(consumedTimeStamps, data.timestamp);
      });

      if (_.isEmpty(notConsumedLogs)) {
        continue;
      }

      const replaceLogs = replaceLineBreak(notConsumedLogs);

      this.printLogs(replaceLogs);

      const pulledTimeStamps = _.values(replaceLogs).map((data) => {
        return data.timestamp;
      });

      consumedTimeStamps.push(...pulledTimeStamps);
    }
  }
}
