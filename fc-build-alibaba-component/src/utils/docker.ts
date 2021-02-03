import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import Docker from 'dockerode';
import generatePwdFile from './passwd';
import findPathsOutofSharedPaths from './docker-support';
import { resolveLibPathsFromLdConf, checkCodeUri } from './utils';
import { generateDebugEnv, addEnv } from './env';
import { IServiceProps, IFunctionProps, IObject, ICredentials } from '../interface';

const docker = new Docker();
const containers = new Set();
const isWin = process.platform === 'win32';

interface IDockerEnvs {
  baseDir: string;
  region: string;
  serviceName: string;
  functionName: string;
  serviceProps: IServiceProps;
  functionProps: IFunctionProps;
  credentials: ICredentials;
  ishttpTrigger?: boolean;
  debugPort?: string;
  debugIde?: string;
  debugArgs?: any;
  httpParams?: IObject;
}

function generateFunctionEnvs(functionProps: IFunctionProps): IObject {
  const environmentVariables = functionProps.Environment;

  if (!environmentVariables) {
    return {};
  }

  return Object.assign({}, environmentVariables);
}

export function generateRamdomContainerName(): string {
  return `s_local_${new Date().getTime()}_${Math.random().toString(36).substr(2, 7)}`;
}

export async function generateDockerEnvs({
  region,
  baseDir,
  credentials,
  serviceName,
  serviceProps,
  functionName,
  functionProps,
  debugPort,
  httpParams,
  ishttpTrigger,
  debugIde,
  debugArgs,
}: IDockerEnvs) {
  const envs: IObject = {};

  if (httpParams) {
    Object.assign(envs, { FC_HTTP_PARAMS: httpParams });
  }

  const confEnv = await resolveLibPathsFromLdConf(baseDir, checkCodeUri(functionProps.CodeUri));

  Object.assign(envs, confEnv);

  const runtime = functionProps.Runtime;

  if (debugPort && !debugArgs) {
    const debugEnv = generateDebugEnv(runtime, debugPort, debugIde);

    Object.assign(envs, debugEnv);
  } else if (debugArgs) {
    Object.assign(envs, {
      DEBUG_OPTIONS: debugArgs,
    });
  }

  if (ishttpTrigger && runtime === 'java8') {
    envs.fc_enable_new_java_ca = 'true';
  }

  Object.assign(envs, generateFunctionEnvs(functionProps));

  Object.assign(envs, {
    local: true,
    FC_ACCESS_KEY_ID: credentials.AccessKeyID,
    FC_ACCESS_KEY_SECRET: credentials.AccessKeySecret,
    FC_ACCOUND_ID: credentials.AccountID,
    FC_REGION: region,
    FC_FUNCTION_NAME: functionName,
    FC_HANDLER: functionProps.Handler,
    FC_MEMORY_SIZE: functionProps.MemorySize || 128,
    FC_TIMEOUT: functionProps.Timeout || 3,
    FC_INITIALIZER: functionProps.Initializer,
    FC_INITIALIZATIONIMEOUT: functionProps.InitializationTimeout || 3,
    FC_SERVICE_NAME: serviceName,
    // @ts-ignore: 多类型，动态判断
    FC_SERVICE_LOG_PROJECT: ((serviceProps || {}).LogConfig || {}).Project,
    // @ts-ignore: 多类型，动态判断
    FC_SERVICE_LOG_STORE: ((serviceProps || {}).LogConfig || {}).Logstore,
  });

  return addEnv(envs);
}

interface IMount {
  Type: string;
  Source: string;
  Target: string;
  ReadOnly: boolean;
}

// todo: 当前只支持目录以及 jar。 code uri 还可能是 oss 地址、目录、jar、zip?
export async function resolveCodeUriToMount(
  absCodeUri: string,
  readOnly: boolean = true,
): Promise<IMount> {
  let target = null;

  const stats = await fs.lstat(absCodeUri);

  if (stats.isDirectory()) {
    target = '/code';
  } else {
    // could not use path.join('/code', xxx)
    // in windows, it will be translate to \code\xxx, and will not be recorgnized as a valid path in linux container
    target = path.posix.join('/code', path.basename(absCodeUri));
  }

  // Mount the code directory as read only
  return {
    Type: 'bind',
    Source: absCodeUri,
    Target: target,
    ReadOnly: readOnly,
  };
}

export async function resolvePasswdMount(): Promise<any> {
  if (process.platform === 'linux') {
    return {
      Type: 'bind',
      Source: await generatePwdFile(),
      Target: '/etc/passwd',
      ReadOnly: true,
    };
  }

  return null;
}

export async function dockerRun(opts: any): Promise<any> {
  const container = await createContainer(opts);

  const attachOpts = {
    hijack: true,
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
  };

  const stream = await container.attach(attachOpts);

  if (!isWin) {
    container.modem.demuxStream(stream, process.stdout, process.stderr);
  }

  await container.start();

  // dockerode bugs on windows. attach could not receive output and error
  if (isWin) {
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
    });

    container.modem.demuxStream(logStream, process.stdout, process.stderr);
  }

  containers.add(container.id);

  stream.end();

  // exitRs format: {"Error":null,"StatusCode":0}
  // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerWait
  const exitRs = await container.wait();

  containers.delete(container.id);

  return exitRs;
}

async function createContainer(opts): Promise<any> {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (opts && isMac) {
    if (opts.HostConfig) {
      const pathsOutofSharedPaths = await findPathsOutofSharedPaths(opts.HostConfig.Mounts);
      if (isMac && pathsOutofSharedPaths.length > 0) {
        throw new Error(
          `Please add directory '${pathsOutofSharedPaths}' to Docker File sharing list, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`,
        );
      }
    }
  }
  const dockerToolBox = await isDockerToolBoxAndEnsureDockerVersion();

  let container;
  try {
    // see https://github.com/apocas/dockerode/pull/38
    container = await docker.createContainer(opts);
  } catch (ex) {
    if (ex.message.indexOf('invalid mount config for type') !== -1 && dockerToolBox) {
      throw new Error(
        "The default host machine path for docker toolbox is under 'C:\\Users', Please make sure your project is in this directory. If you want to mount other disk paths, please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md .",
      );
    }
    if (ex.message.indexOf('drive is not shared') !== -1 && isWin) {
      throw new Error(
        `${ex.message}More information please refer to https://docs.docker.com/docker-for-windows/#shared-drives`,
      );
    }
    throw ex;
  }
  return container;
}

async function isDockerToolBoxAndEnsureDockerVersion(): Promise<boolean> {
  const dockerInfo = await docker.info();

  await detectDockerVersion(dockerInfo.ServerVersion || '');

  const obj = (dockerInfo.Labels || [])
    .map((e) => _.split(e, '=', 2))
    .filter((e) => e.length === 2)
    .reduce((acc, cur) => {
      acc[cur[0]] = cur[1];
      return acc;
    }, {});

  return process.platform === 'win32' && obj.provider === 'virtualbox';
}

async function detectDockerVersion(serverVersion) {
  const cur = serverVersion.split('.');
  // 1.13.1
  if (Number.parseInt(cur[0]) === 1 && Number.parseInt(cur[1]) <= 13) {
    throw new Error(
      `\nWe detected that your docker version is ${serverVersion}, for a better experience, please upgrade the docker version.`,
    );
  }
}
