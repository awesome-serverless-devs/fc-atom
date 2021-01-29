import { SLS } from 'aliyun-sdk';
import { ICredentials } from '../interface';

export default class Client {
  region: string;
  credentials: ICredentials;
  accountId: string;
  accessKeyID: string;
  accessKeySecret: string;
  stsToken: string;

  constructor(credentials: ICredentials, region: string) {
    this.region = region;
    this.credentials = credentials;

    this.accountId = credentials.AccountID;
    this.accessKeyID = credentials.AccessKeyID;
    this.accessKeySecret = credentials.AccessKeySecret;
    this.stsToken = credentials.SecurityToken;
  }

  buildSlsClient() {
    return new SLS({
      accessKeyId: this.accessKeyID,
      secretAccessKey: this.accessKeySecret,
      endpoint: `http://${this.region}.sls.aliyuncs.com`,
      apiVersion: '2015-06-01',
    });
  }
}
