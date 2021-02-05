import { Component } from '@serverless-devs/s-core';
import _ from 'lodash';
import HELP from './utils/help';
import Builder from './utils/builder';
import { IBuildInput } from './interface';
import { checkCommands, saveBuildYaml } from './utils/utils';

interface IOutput {
  Properties: any;
  image?: string;
  buildSaveUri?: string;
}

export default class Build extends Component {
  logger = console;

  async build(inputs) {
    this.help(inputs, HELP);

    const { Commands: commands = [], Parameters: parameters } = this.args(inputs.Args);
    const { Region: region, Service: serviceProps, Function: functionProps } = inputs.Properties;
    const runtime = functionProps.Runtime;

    checkCommands(commands, runtime);

    const params: IBuildInput = {
      region,
      serviceProps,
      functionProps,
      credentials: {
        AccountID: '',
        AccessKeyID: '',
        AccessKeySecret: '',
      },
      serviceName: serviceProps.Name,
      functionName: functionProps.Name,
    };

    const builder = new Builder(commands, parameters);

    const output: IOutput = {
      Properties: inputs.Properties,
    };

    const buildOutput = await builder.build(params);
    if (buildOutput.buildSaveUri) {
      output.buildSaveUri = buildOutput.buildSaveUri;
      await saveBuildYaml({
        region,
        serviceProps,
        functionProps,
        project: _.cloneDeep(inputs.Project),
      });
    } else {
      output.image = buildOutput.image;
    }

    this.logger.log('Build artifact successfully.');
    return output;
  }
}
