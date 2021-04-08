import { IServiceConfig } from './service';
import { IFunctionConfig } from './function';
import { ITriggerConfig } from './trigger';
import { ICustomDomain } from './domain';

export interface ICommandParse {
  rawData?: string;
  data?: ICommandData;
}

export interface ICommandData {
  help?: boolean;
  h?: boolean;
  assumeYes?: boolean;
  y?: boolean;
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

export interface IProperties {
  runtime: string;
  region: string;
  service: IServiceConfig;
  function: IFunctionConfig;
  trigger?: ITriggerConfig;
  customDomains?: ICustomDomain[];
}
