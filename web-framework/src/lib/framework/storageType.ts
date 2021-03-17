import * as core from '@serverless-devs/core';
import _ from 'lodash';
import Pop from '@alicloud/pop-core';
import { CONTEXT } from '../../constant';
import { promptForConfirmContinue } from '../../utils';
import { ICredentials } from '../../interface/inputs';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static async get(regionId: string, profile: ICredentials, assumeYes: boolean): Promise<string> {
    const nasClient = new Pop({
      endpoint: `http://nas.${regionId}.aliyuncs.com`,
      apiVersion: '2017-06-26',
      accessKeyId: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
    });

    const zones: any = await nasClient.request(
      'DescribeZones',
      { RegionId: regionId },
      { method: 'POST' },
    );

    this.logger.debug(
      `Call DescribeZones RegionId is: ${regionId}, response is: ${JSON.stringify(zones)}`,
    );

    for (const item of zones.Zones.Zone) {
      if (!_.isEmpty(item.Performance.Protocol)) {
        return 'Performance';
      }
    }

    for (const item of zones.Zones.Zone) {
      if (!_.isEmpty(item.Capacity.Protocol)) {
        const msg = `Region ${regionId} only supports capacity NAS. Do you want to create it automatically?`;
        if (assumeYes || (await promptForConfirmContinue(msg))) {
          return 'Capacity';
        }
      }
    }

    throw new Error(`No NAS service available under region ${regionId}.`);
  }
}
