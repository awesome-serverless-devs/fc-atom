export const getHttpTriggerPath = (serviceName: string, functionName: string): string =>
  `/proxy/${serviceName}/${functionName}/`;

export const commandsPath = (httpTriggerPath: string): string => httpTriggerPath + 'commands';

export const fileChunkUpload = (httpTriggerPath: string): string =>
  httpTriggerPath + 'file/chunk/upload';

export const fileCheck = (httpTriggerPath: string): string => httpTriggerPath + 'file/check';

export const cleanPath = (httpTriggerPath: string): string => httpTriggerPath + 'clean';

export const statsPath = (httpTriggerPath: string): string => httpTriggerPath + 'stats';

export const pathExsit = (httpTriggerPath: string): string => httpTriggerPath + 'path/exsit';

export const downloadPath = (httpTriggerPath: string): string => httpTriggerPath + 'download';

export const versionPath = (httpTriggerPath: string): string => httpTriggerPath + 'version';
