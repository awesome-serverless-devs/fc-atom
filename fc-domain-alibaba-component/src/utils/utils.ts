import { IV1Inputs, IInputs } from '@serverless-devs/core';
import path from 'path';
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
}

export function getFcProperties(
  regionId: string,
  token: string,
) {
  const service = 'serverless-devs-check';
  const funName = 'get-domain';

  const properties = {
    region: regionId,
    service: {
      name: service,
    },
    function: {
      service,
      name: funName,
      handler: 'index.handler',
      filename: path.join(__dirname, 'getToken.zip'),
      runtime: 'nodejs8',
      environmentVariables: { token }
    },
    triggers: [
      {
        name: 'httpTrigger',
        function: funName,
        service: service,
        type: 'http',
        config: {
          authType: 'anonymous',
          methods: ['POST', 'GET'],
        },
      }
    ]
  };
  return properties;
}

export function checkRs(rs: any) {
  if (rs.Status !== 'Success') {
    throw new Error(rs.Body);
  }
}
