import inquirer from 'inquirer';

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
