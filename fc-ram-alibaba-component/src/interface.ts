export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  name: string;
  service?: string;
  description?: string;
  statement?: any;
  policys: Array<string | IPolicy>;
}

export interface IPolicy {
  name: string;
  statement: any;
}

export interface IRoleDocument {
  Version: string;
  Statement: any;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
