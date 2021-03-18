import fse from 'fs-extra';
import inquirer from 'inquirer';
import { CONTEXT } from '../constant';
import { Logger } from '@serverless-devs/core';

export function genStackId(accountId: string, region: string, serviceName: string): string {
  return `${accountId}-${region}-${serviceName}`;
}

export async function isFile(inputPath: string): Promise<boolean> {
  const stats = await fse.lstat(inputPath);
  return stats.isFile();
}

export async function isDir(inputPath) {
  const stats = await fse.lstat(inputPath);
  return stats.isDirectory();
}

export async function writeStrToFile(
  targetFile: string,
  content: string,
  flags?: string,
  mode?: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = fse.createWriteStream(targetFile, { flags, mode });
    ws.write(content);
    ws.end();
    ws.on('finish', () => resolve());
    ws.on('error', (error) => {
      Logger.error(CONTEXT, `${targetFile} write error: ${error}`);
      reject(error);
    });
  });
}

function isInteractiveEnvironment(): boolean {
  return process.stdin.isTTY;
}

export async function promptForConfirmContinue(message: string): Promise<boolean> {
  if (!isInteractiveEnvironment()) {
    return true;
  }
  // if (detectMocha()) { return true; }

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
    },
  ]);

  if (answers.ok) {
    return true;
  }
  return false;
}
