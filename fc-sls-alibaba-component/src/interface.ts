export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  regionId: string;
  logstore: string;
  project: string;
  description?: string;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
