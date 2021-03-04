import FC from '@alicloud/fc2';
import { getTimeout } from '../utils/utils';
import { ICredentials } from '../interface';

// 需要验证是否存在

export default class Ensure {
  fcClient: any;
  constructor(regionId, profile: ICredentials) {
    this.fcClient = new FC(profile.AccountID, {
      accessKeyID: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      region: regionId,
      timeout: getTimeout(),
    });
  }
}
