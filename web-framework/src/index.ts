import { HLogger, ILogger, getCredential, help, commandParse } from '@serverless-devs/core';
import moment from 'moment';
import _ from 'lodash';
import { HELP, CONTEXT } from './constant';
import { ICredentials, isCredentials, ICommandParse } from './interface';

export default class Logs {
  @HLogger(CONTEXT) logger: ILogger;

  async getCredentials(
    credentials: {} | ICredentials,
    provider: string,
    accessAlias?: string,
  ): Promise<ICredentials> {
    this.logger.debug(
      `Obtain the key configuration, whether the key needs to be obtained separately: ${_.isEmpty(
        credentials,
      )}`,
    );

    if (isCredentials(credentials)) {
      return credentials;
    }
    return await getCredential(provider, accessAlias);
  }

  async deploy(inputs) {
    const apts = {
      boolean: ['help'],
      alias: { help: 'h' },
    };
    const comParse: ICommandParse = commandParse({ args: inputs.Args }, apts);
    if (comParse.data?.help) {
      help(HELP);
      return;
    }

    const { Provider: provider, AccessAlias: accessAlias } = inputs.Project;
    const credentials = await this.getCredentials(inputs.Credentials, provider, accessAlias);
    console.log(credentials);
  }
}
