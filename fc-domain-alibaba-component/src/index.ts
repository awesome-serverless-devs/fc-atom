import { HLogger, ILogger, request } from '@serverless-devs/core';
import _ from 'lodash';
import constant from './constant';
import AddFcDomain from './utils/addFcDomain';
import { IFCTOKEN, IOSSTOKEN, isFcToken } from './interface';

export default class Compoent {
  @HLogger(constant.CONTEXT) logger: ILogger;

  async get(inputs) {
    const {
      ProjectName: projectName,
    } = inputs.Project;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    const params: IFCTOKEN | IOSSTOKEN = inputs.Properties;

    if (isFcToken(params)) {
      return await AddFcDomain.domain(params, inputs);
    }
    
    const tokenRs = await request(`${constant.DOMAIN}/token`, { method: 'post', body: params, form: true, hint: constant.HINT });
    this.logger.debug(`Get token response is: ${JSON.stringify(tokenRs, null, '  ')}`);

    console.log(tokenRs);
  }
}
