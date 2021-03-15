export interface ICommandParse {
  rawData?: string;
  data?: any;
}

export interface IProperties {}

export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
