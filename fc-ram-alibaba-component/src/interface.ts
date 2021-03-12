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
  statement?: IStatement[];
  policies: Array<string | IPolicy>;
}

export interface IPolicy {
  name: string;
  description?: string;
  statement: IStatement[];
}

interface IStatement {
  Effect: 'Allow' | 'Deny';
  Action: string[];
  Resource?: string | string[];
  Condition?: string | string[] | object;
  Principal?: object;
  Permission?: 'Allow' | 'Deny';
}

export interface IRoleDocument {
  Version: string;
  Statement: any;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
