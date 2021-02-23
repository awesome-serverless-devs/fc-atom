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
  policys: Array<string | IPOLICY>;
}

export interface IPOLICY {
  name: string;
  statement: any;
}
