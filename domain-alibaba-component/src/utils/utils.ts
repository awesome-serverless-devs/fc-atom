import { IV1Inputs, IInputs } from '@serverless-devs/core';
import Pop from '@alicloud/pop-core';
import _ from 'lodash';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const tranfromV1InputsToInputs = (inputs: IV1Inputs): IInputs => {
  const output: IInputs = {};

  _.forEach(inputs, (value, key) => {
    const k = _.lowerFirst(key);
    if (k === 'properties' || !_.isObject(value)) {
      output[k] = value;
    } else {
      output[k] = _.mapKeys(value, (v, k) => _.lowerFirst(k));
    }
  });

  return output;
};

export function checkRs(rs: any) {
  if (rs.Status !== 'Success') {
    throw new Error(rs.Body);
  }
}

export const getPopClient = (credentials, endpoint, apiVersion) => {
  return new Pop({
    endpoint: endpoint,
    apiVersion: apiVersion,
    accessKeyId: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    opts: {
      timeout: 10 * 1000,
    },
  });
};
