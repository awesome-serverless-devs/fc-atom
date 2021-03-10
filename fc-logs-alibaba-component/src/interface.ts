export interface ICommandParse {
  rawData?: string;
  data?: any;
}

export interface IProperties{
  region: string;
  logConfig: {
    project: string;
    logStore: string;
  };
  topic: string;
  query: string;
}

export interface IArgs {
  tail: boolean;
  help: boolean;
  requestId: string;
  keyword: string;
  endTime: number;
  startTime: number;
}

export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
