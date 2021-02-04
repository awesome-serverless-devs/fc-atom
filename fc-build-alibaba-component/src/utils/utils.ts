import _ from 'lodash';
import path from 'path';
import readline from 'readline';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import { SUPPORTRUNTIMEBUILDList, BUILDCOMMANDList } from './constant';
import { ICodeUri, IBuildDir, IObject, IServiceProps, IFunctionProps } from '../interface';

const logger = console;

const BUILDARTIFACTS = path.join('.fun', 'build', 'artifacts');

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isCopyCodeBuildRuntime(runtime: string): boolean {
  for (const supportRuntime of SUPPORTRUNTIMEBUILDList) {
    if (runtime.includes(supportRuntime)) {
      return true;
    }
  }
  return false;
}

export function checkCommands(commands, runtime) {
  if (_.isEmpty(commands)) {
    throw new Error("Input error, use 's build --help' for info.");
  }

  const buildCommand = commands[0];
  if (!_.includes(BUILDCOMMANDList, buildCommand)) {
    const errorMessage = `Install command error, unknown subcommand '${buildCommand}', use 's build --help' for info.`;
    throw new Error(errorMessage);
  }

  if (!runtime) {
    throw new Error('runtime required.');
  }

  const notIsUseDocker = buildCommand !== 'docker';
  if (notIsUseDocker && runtime === 'custom-container') {
    const errorMessage = `'${runtime}' needs to pass the 's build docker' command.`;
    throw new Error(errorMessage);
  }
}

export function checkCodeUri(codeUri: string | ICodeUri): string {
  if (!codeUri) {
    return '';
  }

  // @ts-ignore: 多类型动态判断
  const src = _.isString(codeUri) ? codeUri : codeUri.Src;

  if (!src) {
    logger.info('No Src configured, skip building.');
    return '';
  }

  if (_.endsWith(src, '.zip') || _.endsWith(src, '.jar') || _.endsWith(src, '.war')) {
    logger.info('Artifact configured, skip building.');
    return '';
  }
  return src;
}

export function getArtifactPath({ baseDir, serviceName, functionName }: IBuildDir): string {
  const rootArtifact = path.join(baseDir, BUILDARTIFACTS);
  return path.join(rootArtifact, serviceName, functionName);
}

export function readLines(fileName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const lines = [];

    readline
      .createInterface({ input: fs.createReadStream(fileName) })
      .on('line', (line) => lines.push(line))
      .on('close', () => resolve(lines))
      .on('error', reject);
  });
}

async function resolveLibPaths(confdPath: string) {
  if (!fs.existsSync(confdPath)) {
    return [];
  }
  const confLines = await Promise.all(
    fs
      .readdirSync(confdPath, 'utf-8')
      .filter((f) => f.endsWith('.conf'))
      .map(async (f) => await readLines(path.join(confdPath, f))),
  );

  return _.flatten(confLines).reduce((lines, line) => {
    // remove the first and last blanks and leave only the middle
    const found = line.match(/^\s*(\/.*)\s*$/);
    if (found && found[1].startsWith('/')) {
      lines.push(found[1]);
    }
    return lines;
  }, []);
}

export async function resolveLibPathsFromLdConf(
  baseDir: string,
  codeUri: string,
): Promise<IObject> {
  const envs: IObject = {};

  const confdPath = path.resolve(baseDir, codeUri, '.fun/root/etc/ld.so.conf.d');

  if (!(await fs.pathExists(confdPath))) {
    return envs;
  }

  const stats = await fs.lstat(confdPath);

  if (stats.isFile()) {
    return envs;
  }

  const libPaths = await resolveLibPaths(confdPath);

  if (!_.isEmpty(libPaths)) {
    envs.LD_LIBRARY_PATH = libPaths.map((path) => `/code/.fun/root${path}`).join(':');
  }
  return envs;
}

interface ISaveBuild {
  region: string;
  serviceProps: IServiceProps;
  functionProps: IFunctionProps;
  project: IProject;
}

interface IProject {
  [key: string]: any;
}

export async function saveBuildYaml({
  region,
  serviceProps,
  functionProps,
  project,
}: ISaveBuild): Promise<void> {
  const baseDir = process.cwd();
  const rootArtifactsDir = path.join(baseDir, BUILDARTIFACTS);

  try {
    functionProps.CodeUri = path.join(serviceProps.Name, functionProps.Name);

    const projectName = project.ProjectName;
    delete project.ProjectName;
    if (project.AccessAlias) {
      project.Access = project.AccessAlias;
      delete project.AccessAlias;
    }

    await fs.writeFile(
      path.join(rootArtifactsDir, `${projectName}.build.yml`),
      yaml.dump({
        [projectName]: {
          ...project,
          Properties: {
            Region: region,
            Service: serviceProps,
            Function: functionProps,
          },
        },
      }),
    );
  } catch (e) {
    throw e;
  }
}
