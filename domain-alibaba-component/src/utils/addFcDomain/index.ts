import { HLogger, ILogger, request, load } from '@serverless-devs/core';
import _ from 'lodash';
import { getFcProperties, sleep, checkRs } from '../utils';
import constant from '../../constant';
import { IFCTOKEN } from '../../interface';

export default class AddFcDomain {
  @HLogger(constant.CONTEXT) static logger: ILogger;

  static async domain(params: IFCTOKEN, inputs): Promise<string> {
    this.logger.debug(
      `The request ${constant.DOMAIN}/token parameter is: \n ${JSON.stringify(
        params,
        null,
        '  ',
      )} `,
    );
    const tokenRs = await request(`${constant.DOMAIN}/token`, {
      method: 'post',
      body: params,
      form: true,
      hint: constant.HINT,
    });
    this.logger.debug(`Get token response is: \n ${JSON.stringify(tokenRs, null, '  ')}`);
    checkRs(tokenRs);

    const token: string = tokenRs.Body.Token;

    inputs.Properties = getFcProperties(params.region, token);
    inputs.args += ' -s -y';
    const fcBase = await load('fc-base', 'alibaba');
    await fcBase.deploy(inputs);
    await sleep(1500);

    this.logger.debug(
      `The request ${constant.DOMAIN}/domain parameter is: \n ${JSON.stringify(
        { ...params, token },
        null,
        '  ',
      )} `,
    );
    const domainRs = await request(`${constant.DOMAIN}/domain`, {
      method: 'post',
      body: { ...params, token },
      form: true,
      hint: { ...constant.HINT, loading: 'Get domain....' },
    });

    this.logger.debug(`Get token response is: \n ${JSON.stringify(domainRs, null, '  ')}`);
    checkRs(domainRs);
    return `${params.function}.${params.service}.${params.region}.${params.user}.fc.devsapp.cn`.toLocaleLowerCase();
  }
}
