import * as core from '@serverless-devs/core';
import _ from 'lodash';
import { CONTEXT } from '../../constant';

export default class Component {
  @core.HLogger(CONTEXT) static logger: core.ILogger;

  static getRole(roleInput) {
    const { name, statement, policys } = _.cloneDeep(roleInput);

    if (!name) {
      throw new Error(`service/role configuration error.`);
    }

    const rolePolicyAttachments = [];
    const rolePolicy = [];
    if (!_.isEmpty(policys)) {
      for (const policyAttachment of policys) {
        policyAttachment.roleName = name;

        if (policyAttachment.policyType) {
          rolePolicyAttachments.push(policyAttachment);
        } else if (!_.isEmpty(policyAttachment.statement)) {
          const policyDocument = JSON.stringify({
            Version: '1',
            Statement: policyAttachment.statement,
          });

          rolePolicy.push({
            roleName: name,
            policyName: policyAttachment.policyName,
            policyDocument
          });
        } else {
          throw new Error(`service/role/policys configuration error.`)
        }
      }
    }

    let document:string;
    if (statement) {
      document = JSON.stringify({
        Statement: JSON.stringify(document),
        Version: '1',
      });
    }

    return {
      role: {
        name,
        document
      },
      rolePolicyAttachments,
      rolePolicy
    }
  }
  
  static genAutoRole(autoName: string): any {
    const rolePolicyAttachments = [
      {
        roleName: autoName,
        policyType: 'System',
        policyName: 'AliyunECSNetworkInterfaceManagementAccess',
      },
      {
        roleName: autoName,
        policyType: 'System',
        policyName: 'AliyunContainerRegistryReadOnlyAccess',
      },
      {
        roleName: autoName,
        policyType: 'System',
        policyName: 'AliyunLogFullAccess',
      }
    ];

    return {
      role: {
        name: autoName,
        document: JSON.stringify({
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: ['fc.aliyuncs.com'],
              },
            },
          ],
          Version: '1',
        }),
      },
      rolePolicyAttachments,
    };
  }
}