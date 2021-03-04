import FC from '@alicloud/fc2';
import { ICredentials } from '../interface';
import { getTimeout } from './utils';

export function fcClient(regionId: string, profile: ICredentials) {
  const client = new FC(profile.AccountID, {
    accessKeyID: profile.AccessKeyID,
    accessKeySecret: profile.AccessKeySecret,
    region: regionId,
    timeout: getTimeout(),
  });

  client.get = async (path, query, headers) => {
    const res = await client.request('GET', path, query, null, headers);
    const data = (res && res.data) || {};
    if (data.error) {
      throw new Error(data.error);
    }

    return res;
  };

  client.post = async (path, body, headers, queries, opts = {}) => {
    const res = await client.request('POST', path, queries, body, headers, opts);
    const data = (res && res.data) || {};
    if (data.error) {
      throw new Error(data.error);
    }

    return res;
  };

  return client;
}
