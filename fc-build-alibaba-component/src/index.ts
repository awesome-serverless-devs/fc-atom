import { HLogger, ILogger, HComponent, IComponent, report } from '@serverless-devs/core';
import _ from 'lodash';
// import HELP from './utils/help';
import Builder from './utils/builder';
import { IBuildInput } from './interface';
import { CONTEXT } from './utils/constant';
import { checkCommands, saveBuildYaml } from './utils/utils';

interface IOutput {
  Properties: any;
  image?: string;
  buildSaveUri?: string;
}

export default class Build {
  @HLogger(CONTEXT) logger: ILogger;
  @HComponent() component: IComponent;

  async build(inputs) {
    // this.help(inputs, HELP);

    this.logger.info('Build artifact start...');
    const projectName = inputs.Project.ProjectName;
    this.logger.debug(`[${projectName}] inputs params: ${JSON.stringify(inputs)}`);

    // @ts-ignore: core 组件暂不支持 args 解析
    // const { Commands: commands = [], Parameters: parameters } = this.component.args(inputs.Args);
    const commands: string[] = inputs.Args.includes('local') ? ['local'] : ['docker'];
    const parameters = {};
    if (inputs.Args.includes('-d')) {
      throw '暂不支持指定参数功能';
    }

    const { Region: region, Service: serviceProps, Function: functionProps } = inputs.Properties;
    const runtime = functionProps.Runtime;

    try {
      checkCommands(commands, runtime);
    } catch (e) {
      await report(e, {
        type: 'error',
        context: CONTEXT,
      });
      throw e;
    }

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

    const builder = new Builder(projectName, commands, parameters);

    const output: IOutput = {
      Properties: inputs.Properties,
    };

    const buildOutput = await builder.build(params);
    this.logger.debug(`[${projectName}] Build output: ${JSON.stringify(buildOutput)}`);
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

    this.logger.info('Build artifact successfully.');
    return output;
  }
}
