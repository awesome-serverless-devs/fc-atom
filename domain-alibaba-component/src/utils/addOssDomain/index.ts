import { HLogger, ILogger, request } from '@serverless-devs/core';
import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import constant from '../../constant';
import Oss from './oss';
import Cdn from './cdn';
import { checkRs } from '../utils';
import { IOSSTOKEN } from '../../interface';
/**
 * VerifyDomainOwner  验证域名归属权
 * DescribeVerifyContent   异常获取Content值
 * VerifyDomainOwner 再次校验
 */

export default class AddOssDomain {
  @HLogger(constant.CONTEXT) logger: ILogger;

  async domain(params: IOSSTOKEN, credential: any) {
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

    const { bucket, region } = params;
    const token = tokenRs.Body.Token;
    const domain = `${bucket}.oss.devsapp.cn`;
    const savePath = path.join(process.cwd(), '.s', `${bucket}-token`);

    this.logger.debug(`Save file path is: ${savePath}, token is: ${token}.`);
    await fs.outputFile(savePath, token);

    this.logger.debug('Put file to oss start...');
    const ossCredential = {
      region: `oss-${region}`,
      bucket,
      accessKeyId: credential.AccessKeyID,
      accessKeySecret: credential.AccessKeySecret,
    };
    await Oss.put(ossCredential, savePath);
    this.logger.debug('Put file to oss end.');

    const cdn = new Cdn(credential);
    await cdn.makeOwner(bucket, region, token);
    this.logger.debug(`Add cdn domain start, domain is: ${domain}`);
    const cname = await cdn.addCdnDomain(domain, bucket, `oss-${region}`);
    this.logger.debug('Add cdn domain end.');

    this.logger.debug(
      `The request ${constant.DOMAIN}/domain parameter is: { bucket: ${bucket}, region: ${region}, cname: ${cname}, token: ${token} }`,
    );
    const dRs = await request(`${constant.DOMAIN}/domain`, {
      method: 'post',
      body: { bucket, region, token, type: 'oss', cname },
      form: true,
      hint: { ...constant.HINT, loading: 'Get domain....' },
    });
    this.logger.debug(
      `The request ${constant.DOMAIN}/verify response is: \n ${JSON.stringify(dRs, null, '  ')}`,
    );

    await fs.remove(savePath);

    return domain;
  }
}
