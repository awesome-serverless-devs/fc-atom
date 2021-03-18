import FC from '@alicloud/fc2';
import Pop from '@alicloud/pop-core';
import { ICredentials } from '../interface/inputs';

export default class Component {
  static fc(region: string, profile: ICredentials) {
    FC.prototype.getAccountSettings = function (options = {}, headers = {}) {
      return this.get('/account-settings', options, headers);
    };

    return new FC(profile.AccountID, {
      region,
      accessKeyID: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      endpoint: `https://${profile.AccountID}.${region}.fc.aliyuncs.com`,
    });
  }

  static pop(endpoint: string, profile: ICredentials) {
    return new Pop({
      endpoint,
      apiVersion: '2017-06-26',
      accessKeyId: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
    });
  }
}
