import { HLogger, ILogger } from '@serverless-devs/core';
import _ from 'lodash';
import constant from './constant';
import AddFcDomain from './utils/addFcDomain';
import AddOssDomain from './utils/addOssDomain';
import { IFCTOKEN, IOSSTOKEN, isFcToken } from './interface';

export default class Compoent {
  @HLogger(constant.CONTEXT) logger: ILogger;

  async get(inputs) {
    const { ProjectName: projectName } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const params: IFCTOKEN | IOSSTOKEN = inputs.Properties;

    if (isFcToken(params)) {
      return await AddFcDomain.domain(params, inputs);
    }

    const addOssDomain = new AddOssDomain();
    return await addOssDomain.domain(params, inputs);
  }
}
