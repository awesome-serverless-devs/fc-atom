import { HLogger, ILogger, request, spinner } from '@serverless-devs/core';
import _ from 'lodash';
import { sleep, checkRs } from '../utils';
import constant from '../../constant';
import Fc from './fc';
import { IFCTOKEN } from '../../interface';

export default class AddFcDomain {
  @HLogger(constant.CONTEXT) static logger: ILogger;

  static async domain(params: IFCTOKEN, credential): Promise<string> {
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

    const vm = spinner('Deploy helper function.');
    await Fc.deploy(credential, params.region, token);
    await sleep(1500);
    vm.succeed('Deployed.');

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
    await Fc.remove(credential, params.region);
    checkRs(domainRs);
    return `${params.function}.${params.service}.${params.region}.${params.user}.fc.devsapp.cn`.toLocaleLowerCase();
  }
}
