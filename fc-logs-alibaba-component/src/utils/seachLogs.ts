import { HLogger, ILogger } from '@serverless-devs/core';
import _ from 'lodash';
import moment from 'moment';
import Client from './client';
import { CONTEXT } from '../constant';
import { sleep } from './utils';

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
  @HLogger(CONTEXT) logger: ILogger;

  printLogs(historyLogs: any[]) {
    let requestId: string = '';

    for (const item of historyLogs) {
      if (requestId !== item.requestId) {
        this.logger.log('\n');
        requestId = item.requestId;
      }
      this.logger.log(item.message);
    }
  }

  /**
   * 过滤日志信息
   */
  private filterByKeywords(logsList = [], { requestId = '', keyword = '', queryErrorLog }) {
    let logsClone = _.cloneDeep(logsList);

    if (requestId) {
      logsClone = _.filter(logsClone, (value) => value.requestId === requestId);
    }

    if (keyword) {
      const requestIds: string[] = [];
      _.forEach(logsClone, (value) => {
        const curRequestId = value.requestId;
        if (value.message.includes(keyword) && curRequestId && !requestIds.includes(curRequestId)) {
          requestIds.push(curRequestId);
        }
      });
      logsClone = _.filter(logsClone, (value) => requestIds.includes(value.requestId));
    }

    if (queryErrorLog) {
      const requestIds: string[] = [];
      _.forEach(logsClone, (value) => {
        const curRequestId = value.requestId;
        const curMessage = value.message;
        const isError = curMessage.includes(' [ERROR] ') || curMessage.includes('Error: ');

        if (isError && curRequestId && !requestIds.includes(curRequestId)) {
          requestIds.push(curRequestId);
        }
      });
      logsClone = _.filter(logsClone, (value) => requestIds.includes(value.requestId));
    }

    return logsClone;
  }

  /**
   * 获取日志
   */
  async getLogs(requestParams: IGetLogs, tabReplaceStr = '') {
    this.logger.debug(`get logs params: ${JSON.stringify(requestParams)}`)
    let count;
    let xLogCount;
    let xLogProgress = 'Complete';

    let result = [];

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
      result = _.concat(result, _.values(body).map(cur => {
        const currentMessage = cur.message;
        const found = currentMessage.match('(\\w{8}(-\\w{4}){3}-\\w{12}?)');

        if (!_.isEmpty(found)) {
          requestId = found[0];
        }

        if (currentMessage.includes('FC Invoke Start')) {
          requestId = currentMessage.replace('FC Invoke Start RequestId: ', '');
        }

        if (requestId) {
          requestId = _.trim(requestId);
        }

        return {
          requestId,
          timestamp: cur.__time__,
          time: moment.unix(cur.__time__).format('YYYY-MM-DD H:mm:ss'),
          message: currentMessage.replace(new RegExp(/(\r)/g), tabReplaceStr)
        };
      }, {}));
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

    return this.filterByKeywords(logsList, { keyword, requestId, queryErrorLog });
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

    /**
     * 日志接口最小区间10s，查询间隔为 1s
     * 实现：将 10s 的数据全都请求回来，然后记录输出的时间戳，同一时间戳的输出，输出过的时间戳则过滤掉
     */
    const consumedTimeStamps = [];
    while (times > 0) {
      await sleep(1000);
      times = times - 1;

      timeStart = moment().subtract(10, 'seconds').unix();
      timeEnd = moment().unix();
      this.logger.debug(`realtime: ${times}, start: ${timeStart}, end: ${timeEnd}`);

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

      let showTimestamp: string = '';

      const notConsumedLogs = _.filter(pulledlogs, (data) => {
        const { timestamp } = data;
        if (consumedTimeStamps.includes(timestamp)) {
          return showTimestamp === timestamp;
        }

        showTimestamp = data.timestamp;
        consumedTimeStamps.push(data.timestamp);
        return true;
      });

      this.printLogs(notConsumedLogs);
    }
  }
}
