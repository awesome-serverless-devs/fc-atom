import { IServiceConfig } from './service';
import { IFunctionConfig } from './function';
import { ITriggerConfig } from './trigger';

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
  region: string;
  service: IServiceConfig;
  function: IFunctionConfig;
  trigger: ITriggerConfig;
  domain: string;
}
