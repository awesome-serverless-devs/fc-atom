import * as core from '@serverless-devs/core';
import { CONTEXT } from '../../constant';
import { IDomain } from './interface';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async get(inputs): Promise<IDomain> {
    const serviceName = inputs.Properties.service.name;
    const functionName = inputs.Properties.function.name;

    inputs.Properties = {
      type: 'fc',
      user: inputs.Credentials.AccountID,
      region: inputs.Properties.region,
      service: serviceName,
      function: functionName,
    };

    const domainComponent = await core.loadComponent('alibaba/domain');

    const domain = await domainComponent.get(inputs);
    return {
      domainName: domain,
      protocol: 'HTTP',
      routeConfigs: [
        {
          serviceName,
          functionName,
          qualifier: 'LATEST',
          methods: ['GET', 'POST'],
          path: '/',
        },
      ],
    };
  }
}
