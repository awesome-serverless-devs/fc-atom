import { HLogger, ILogger, request } from '@serverless-devs/core';
import _ from 'lodash';
import constant from '../../constant';
import { sleep, checkRs, getPopClient } from '../utils';
import { ICredentials } from '../../interface';

const POST = { method: 'POST' };
const DOMAIN = 'devsapp.cn';

export default class Cdn {
  @HLogger(constant.CONTEXT) logger: ILogger;
  cdnClient: any;

  constructor(credentials: ICredentials) {
    this.cdnClient = getPopClient(credentials, 'https://cdn.aliyuncs.com', '2018-05-10');
  }

  async makeOwner(bucket: string, region: string, token: string) {
    this.logger.debug('Check verify domain owner start...');
    const isDomainOwner = await this.verifyDomainOwner(DOMAIN);
    this.logger.debug(`Check verify domain owner end, response is: ${isDomainOwner}`);

    if (!isDomainOwner) {
      this.logger.debug('Get describe verify content start...');
      const verify = await this.describeVerifyContent(DOMAIN);
      this.logger.debug(`Get describe verify content end, response is: ${verify}`);

      this.logger.debug(
        `The request ${constant.DOMAIN}/domain parameter is: { bucket: ${bucket}, region: ${region}, token: ${token} }`,
      );
      const dRs = await request(`${constant.DOMAIN}/domain`, {
        method: 'post',
        body: { bucket, region, token, type: 'oss' },
        form: true,
        hint: { ...constant.HINT, loading: 'Get domain....' },
      });
      this.logger.debug(
        `The request ${constant.DOMAIN}/verify response is: \n ${JSON.stringify(dRs, null, '  ')}`,
      );
      checkRs(dRs);

      this.logger.debug(
        `The request ${constant.DOMAIN}/verify parameter is: { bucket: ${bucket}, verify: ${verify} }`,
      );
      const rs = await request(`${constant.DOMAIN}/verify`, {
        method: 'post',
        body: { bucket, verify },
        form: true,
        hint: { ...constant.HINT, loading: 'Request verify....' },
      });
      this.logger.debug(
        `The request ${constant.DOMAIN}/verify response is: \n ${JSON.stringify(rs, null, '  ')}`,
      );
      checkRs(rs);

      await sleep(1000);
      await this.makeOwner(bucket, region, token);
    }
  }

  async verifyDomainOwner(domainName: string): Promise<boolean> {
    try {
      await this.cdnClient.request(
        'VerifyDomainOwner',
        {
          DomainName: domainName,
          VerifyType: 'dnsCheck',
        },
        POST,
      );

      return true;
    } catch (ex) {
      this.logger.debug(`VerifyDomainOwner domain name is ${domainName}, error is: \n ${ex}`);
      if (ex.code !== 'DomainOwnerVerifyFail') {
        throw ex;
      }

      return false;
    }
  }

  async describeVerifyContent(domainName: string): Promise<string> {
    const { Content } = await this.cdnClient.request(
      'DescribeVerifyContent',
      { DomainName: domainName },
      POST,
    );

    return Content;
  }

  async addCdnDomain(domainName: string, bucket: string, region: string) {
    try {
      await this.cdnClient.request(
        'AddCdnDomain',
        {
          DomainName: domainName,
          Scope: 'global',
          CdnType: 'web',
          Sources: JSON.stringify([
            { type: 'oss', port: 80, content: `${bucket}.${region}.aliyuncs.com` },
          ]),
        },
        POST,
      );
    } catch (ex) {
      if (ex.code !== 'DomainAlreadyExist') {
        throw ex;
      }
    }

    const describeCdnDomainDetail = await this.cdnClient.request(
      'DescribeCdnDomainDetail',
      {
        DomainName: domainName,
      },
      POST,
    );
    this.logger.debug(`DescribeCdnDomainDetail respones is: ${JSON.stringify(describeCdnDomainDetail)}`);
    
    return describeCdnDomainDetail.GetDomainDetailModel.Cname;
  }
}
