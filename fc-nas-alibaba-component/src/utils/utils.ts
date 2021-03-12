import inquirer from 'inquirer';
import _ from 'lodash';

export const getTimeout = (): number => parseInt(process.env.NAS_FUNCTION_TIMEOUT) || 600 * 1000;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function promptForConfirmContinue(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return true;
  }

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

export const nasUriHandler = (nasDirYmlInput: string) =>
  nasDirYmlInput.startsWith('/') ? nasDirYmlInput.substr(1) : nasDirYmlInput;

export function getMountDir(mountPointDomain: string, nasDir: string) {
  // 24e0349ccc-psq48.cn-shenzhen.nas.aliyuncs.com
  const [systemId, region] = mountPointDomain.split('.');
  return `/mnt/${systemId}-${region}/${nasUriHandler(nasDir)}`;
}
