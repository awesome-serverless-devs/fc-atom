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
    if (commands[0] === 'image') {
      output.image = await builder.buildImage(params);
    } else {
      output.buildSaveUri = await builder.build(params);
    }

    await saveBuildYaml({
      region,
      serviceProps,
      functionProps,
      project: _.cloneDeep(inputs.Project),
    });

    this.logger.log('Build artifact successfully.');
    return output;
  }
}
