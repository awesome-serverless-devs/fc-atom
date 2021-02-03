import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import fcBuilders from '@alicloud/fc-builders';
import { execSync } from 'child_process';
import ncp from './ncp';
import util from 'util';
import {
  checkCodeUri,
  getArtifactPath,
  getBuildCodeAbsPath,
  getBuildCodeRelativePath,
  isCopyCodeBuildRuntime,
} from './utils';
import generateBuildContainerBuildOpts from './build-opts';
import { dockerRun } from './docker';
import { IBuildInput, ICodeUri, IBuildDir } from '../interface';

const ncpAsync = util.promisify(ncp);
interface INeedBuild {
  baseDir: string;
  runtime: string;
  codeUri?: string | ICodeUri;
}

export default class Builder {
  private commands: any;
  // @ts-ignore
  private parameters: any;

  logger = console;

  constructor(commands: any[], parameters: any[]) {
    this.commands = commands;
    this.parameters = parameters;
  }

  buildImage(buildInput: IBuildInput) {
    const { functionProps } = buildInput;

    const customContainer = functionProps.CustomContainer;

    if (!customContainer) {
      const errorMessage = "No 'CustomContainer' configuration found in Function.";
      throw new Error(errorMessage);
    }

    const dockerFileName = customContainer.Dockerfile ? customContainer.Dockerfile : 'Dockerfile';
    if (!fs.existsSync(dockerFileName)) {
      throw new Error('No dockerfile found.');
    }

    const imageName = customContainer.Image;
    if (!imageName) {
      throw new Error('Function/CustomContainer/Image required.');
    }

    try {
      this.logger.info('Building image...');
      execSync(`docker build -t ${imageName} -f ${dockerFileName} .`, {
        stdio: 'inherit',
      });
      this.logger.log(`Build image(${imageName}) successfully`);
      return imageName;
    } catch (e) {
      throw e;
    }
  }

  async build(buildInput: IBuildInput): Promise<void> {
    const useDocker = this.isUseDocker();
    if (useDocker) {
      this.logger.info('Use docker for building.');
    }
    const { serviceName, functionName, functionProps } = buildInput;
    const { CodeUri: codeUri, Runtime: runtime } = functionProps;
    const baseDir = process.cwd();

    if (useDocker && runtime === 'custom-container') {
      await this.buildImage(buildInput);
    }

    const codeSkipBuild = await this.codeSkipBuild({ baseDir, codeUri, runtime });

    if (!codeSkipBuild) {
      return;
    }

    // if (isCopyCodeBuildRuntime(runtime)) {
    //   this.initBuildCodeDir({ baseDir, serviceName, functionName });
    //   await this.copyCodeForBuild(baseDir, checkCodeUri(codeUri), serviceName, functionName);
    // }

    if (useDocker) {
      await this.buildInDocker(buildInput);
    } else {
      await this.buildArtifact(buildInput);
    }

    this.logger.log('Build artifact successfully.');
  }

  async copyCodeForBuild(
    baseDir: string,
    codeUri: string,
    serviceName: string,
    functionName: string,
  ): Promise<void> {
    const absCodeUri = path.resolve(baseDir, codeUri);
    const buildCodePath = getBuildCodeAbsPath({ baseDir, serviceName, functionName });
    try {
      await ncpAsync(absCodeUri, buildCodePath, {
        filter: (source) => {
          if (
            source.endsWith('.s') ||
            source.endsWith('.fc') ||
            source.endsWith('.fun') ||
            source.endsWith('.git') ||
            source === 'vendor' ||
            source === 'node_modules'
          ) {
            return false;
          }
          return true;
        },
      });
    } catch (e) {
      this.logger.error(e.message);
    }
  }

  async buildInDocker({
    region,
    serviceName,
    serviceProps,
    functionName,
    functionProps,
    verbose = true,
    credentials,
  }: IBuildInput): Promise<void> {
    const stages = ['install', 'build'];

    const baseDir = process.cwd();
    // const codeUri = isCopyCodeBuildRuntime(functionProps.Runtime)
    //   ? getBuildCodeRelativePath(serviceName, functionName)
    //   : baseDir;
    const codeUri = baseDir;
    const funcArtifactDir = this.initBuildArtifactDir({ baseDir, serviceName, functionName });

    const opts = await generateBuildContainerBuildOpts({
      region,
      serviceName,
      serviceProps,
      functionName,
      functionProps,
      baseDir,
      codeUri,
      funcArtifactDir,
      verbose,
      credentials,
      stages,
    });

    const usedImage = opts.Image;

    this.logger.info('\nBuild function using image: ' + usedImage);

    const exitRs = await dockerRun(opts);
    if (exitRs.StatusCode !== 0) {
      console.log('exitRs::', exitRs);
      throw new Error(`build function ${serviceName}/${functionName} error`);
    }
  }

  async buildArtifact({
    serviceName,
    functionName,
    functionProps,
    verbose = true,
  }: IBuildInput): Promise<void> {
    const baseDir = process.cwd();
    const runtime = functionProps.Runtime;

    const stages = ['install', 'build'];
    // const codePath = isCopyCodeBuildRuntime(runtime)
    //   ? getBuildCodeAbsPath({ baseDir, serviceName, functionName })
    //   : baseDir;
    const codePath = baseDir;
    const artifactPath = this.initBuildArtifactDir({ baseDir, serviceName, functionName });

    // detect fcfile
    const fcfilePath = path.resolve(codePath, 'fcfile');
    if (fs.existsSync(fcfilePath)) {
      this.logger.warn("Found fcfile in src directory, maybe you want to use 's build docker' ?");
    }

    const builder = new fcBuilders.Builder(
      serviceName,
      functionName,
      codePath,
      runtime,
      artifactPath,
      verbose,
      stages,
    );
    await builder.build();
  }

  async codeSkipBuild({ baseDir, codeUri, runtime }: INeedBuild): Promise<boolean> {
    const src = checkCodeUri(codeUri);
    if (!src) {
      return false;
    }

    const absCodeUri = path.resolve(baseDir, src);
    const taskFlows = await fcBuilders.Builder.detectTaskFlow(runtime, absCodeUri);
    if (_.isEmpty(taskFlows) || this.isOnlyDefaultTaskFlow(taskFlows)) {
      this.logger.info('No need build for this project.');
      return false;
    }

    return true;
  }

  isOnlyDefaultTaskFlow(taskFlows): boolean {
    if (taskFlows.length !== 1) {
      return false;
    }

    return taskFlows[0].name === 'DefaultTaskFlow';
  }

  initBuildCodeDir({ baseDir, serviceName, functionName }: IBuildDir): string {
    const codePath = getBuildCodeAbsPath({ baseDir, serviceName, functionName });
    if (fs.pathExistsSync(codePath)) {
      fs.rmdirSync(codePath, { recursive: true });
    }
    fs.mkdirpSync(codePath);
    return codePath;
  }

  initBuildArtifactDir({ baseDir, serviceName, functionName }: IBuildDir): string {
    const artifactPath = getArtifactPath({ baseDir, serviceName, functionName });
    if (fs.pathExistsSync(artifactPath)) {
      fs.rmdirSync(artifactPath, { recursive: true });
    }
    fs.mkdirpSync(artifactPath);
    return artifactPath;
  }

  isUseDocker(): boolean {
    return this.commands[0] === 'docker';
  }
}
