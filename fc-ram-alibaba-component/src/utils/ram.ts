import { HLogger, ILogger } from '@serverless-devs/core';
import _ from 'lodash';
import Ram from '@alicloud/ram';
import retry from 'promise-retry';
import { CONTEXT, RETRYOPTIONS } from '../constant';
import { ICredentials, IProperties, IPOLICY } from '../interface';

export default class R {
  @HLogger(CONTEXT) logger: ILogger;
  ramClient: any;

  constructor(profile: ICredentials) {
    let timeout = 10;
    if (process.env.ALIYUN_RAM_CLIENT_TIMEOUT) {
      timeout = parseInt(process.env.ALIYUN_RAM_CLIENT_TIMEOUT);
    }

    this.ramClient = new Ram({
      accessKeyId: profile.AccessKeyID,
      accessKeySecret: profile.AccessKeySecret,
      securityToken: profile.SecurityToken,
      endpoint: 'https://ram.aliyuncs.com',
      opts: {
        timeout: timeout * 1000,
      },
    });
  }

  async checkPolicyNotExistOrEnsureAvailable(
    policyName: string,
    policyType: string,
    statement?: any,
  ): Promise<boolean> {
    let policyNameAvailable = false;

    await retry(async (retry, times) => {
      try {
        this.logger.info(`Check plicy ${policyName} exist start...`);
        const onlinePolicyConfig = await this.ramClient.getPolicy({
          PolicyType: policyType,
          PolicyName: policyName,
        });

        this.logger.debug(`On-line policy config: ${JSON.stringify(onlinePolicyConfig)}`);
        const onlinePolicyDocument = JSON.parse(
          onlinePolicyConfig.DefaultPolicyVersion.PolicyDocument,
        );
        this.logger.debug(
          `On-line default policy version document: ${JSON.stringify(onlinePolicyDocument)}`,
        );

        policyNameAvailable = true;
        this.logger.info(`Check plicy ${policyName} exist.`);
        if (!statement || _.isEqual(onlinePolicyDocument.Statement, statement)) {
          return;
        }

        await this.updatePolicy(policyName, statement);
      } catch (ex) {
        const exCode = ex.code;

        if (exCode === 'EntityNotExist.Policy') {
          return;
        } else if (exCode === 'NoPermission') {
          throw ex;
        }

        this.logger.debug(`Error when getPolicy, policyName is ${policyName}, error is: ${ex}`);
        this.logger.info(`retry ${times} time`);
        retry(ex);
      }
    }, RETRYOPTIONS);

    return policyNameAvailable;
  }

  async createPolicy(policyName: string, statement: any, description?: string) {
    this.logger.info(`Create plicy ${policyName} start...`);

    await retry(async (retry, times) => {
      try {
        await this.ramClient.createPolicy({
          PolicyName: policyName,
          Description: description || '',
          PolicyDocument: JSON.stringify({
            Version: '1',
            Statement: statement,
          }),
        });
      } catch (ex) {
        if (ex.code === 'NoPermission') {
          throw ex;
        }
        this.logger.debug(`Error when createPolicy, policyName is ${policyName}, error is: ${ex}`);
        this.logger.info(`retry ${times} time`);
        retry(ex);
      }
    }, RETRYOPTIONS);

    this.logger.info(`Create plicy ${policyName} success.`);
  }

  async updatePolicy(policyName: string, statement: any) {
    this.logger.info(`Update plicy ${policyName} start...`);

    await retry(async (retry, times) => {
      try {
        const listResponse = await this.ramClient.listPolicyVersions({
          PolicyType: 'Custom',
          PolicyName: policyName,
        });
        this.logger.info(`Policy listPolicyVersions response: ${JSON.stringify(listResponse)}`);

        const versions = (listResponse.PolicyVersions || {}).PolicyVersion || [];
        if (versions.length >= 5) {
          await this.deletePolicyVersion(policyName, versions);
        }

        await this.ramClient.createPolicyVersion({
          PolicyName: policyName,
          PolicyDocument: JSON.stringify({
            Version: '1',
            Statement: statement,
          }),
          SetAsDefault: true,
        });
      } catch (ex) {
        if (ex.code === 'NoPermission') {
          throw ex;
        }

        this.logger.debug(`Error when updatePolicy, policyName is ${policyName}, error is: ${ex}`);
        this.logger.info(`retry ${times} time`);
        retry(ex);
      }
    }, RETRYOPTIONS);

    this.logger.info(`Update plicy ${policyName} success.`);
  }

  async deletePolicyVersion(policyName: string, versions: any) {
    return await retry(async (retry, times) => {
      try {
        for (let version of versions) {
          if (version.IsDefaultVersion === false) {
            await this.ramClient.deletePolicyVersion({
              PolicyName: policyName,
              VersionId: version.VersionId,
            });
            return;
          }
        }
      } catch (ex) {
        if (ex.code === 'NoPermission') {
          throw ex;
        }

        this.logger.debug(`Error when updatePolicy, policyName is ${policyName}, error is: ${ex}`);
        this.logger.info(`retry ${times} time`);
        retry(ex);
      }
    }, RETRYOPTIONS);
  }

  async mackPlicys(policys: Array<string | IPOLICY>): Promise<string[]> {
    const policyNamesArray: string[] = [];

    for (const policy of policys) {
      if (_.isString(policy)) {
        // @ts-ignore: 动态类型判断，是字符串
        const policyName: string = policy;

        let policyNameAvailable = await this.checkPolicyNotExistOrEnsureAvailable(
          policyName,
          'System',
        );
        if (policyNameAvailable) {
          policyNamesArray.push(policyName);
          continue;
        }

        policyNameAvailable = await this.checkPolicyNotExistOrEnsureAvailable(policyName, 'Custom');
        if (!policyNameAvailable) {
          throw new Error(`Check plicy ${policyName} does not exist.`);
        }
        policyNamesArray.push(policyName);
      } else {
        // @ts-ignore: 动态类型判断，是对象
        const { name, statement, description } = policy;

        // @ts-ignore: 动态类型判断，是对象
        let policyNameAvailable = await this.checkPolicyNotExistOrEnsureAvailable(
          name,
          'Custom',
          statement,
        );

        if (!policyNameAvailable) {
          this.logger.info(`Check plicy ${name} does not exist.`);
          await this.createPolicy(name, statement, description);
        }

        policyNamesArray.push(name);
      }
    }

    return policyNamesArray;
  }

  async create(propertie: IProperties) {
    const { policys = [] } = propertie;
    this.logger.debug(`Ram component policys config: ${policys}`);
    const policyNamesArray = await this.mackPlicys(policys);
    this.logger.debug(`Ram component policys names: ${policyNamesArray}`);
  }
}
