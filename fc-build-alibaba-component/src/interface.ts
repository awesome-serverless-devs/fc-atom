export interface IBuildInput {
  serviceName: string;
  functionName: string;
  serviceProps?: IServiceProps;
  functionProps?: IFunctionProps;
  verbose?: boolean;
  region?: string;
  credentials?: ICredentials;
  [key: string]: any;
}

interface ILogConfig {
  Project: string;
  LogStore: string;
  EnableRequestMetrics?: boolean;
}

export interface IServiceProps {
  Name: string;
  LogConfig?: string | ILogConfig;
  [key: string]: any;
}

export interface IFunctionProps {
  Name: string;
  Runtime: string;
  CodeUri: string | ICodeUri;
  [key: string]: any;
}

export interface ICodeUri {
  Src?: string;
  Bucket?: string;
  Object?: string;
  Excludes?: string[];
  Includes?: string[];
}

export interface IBuildDir {
  baseDir: string;
  serviceName: string;
  functionName: string;
}

export interface IObject {
  [key: string]: any;
}

export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}
