export interface IFcConfig {
  region: string;
  service: IServiceConfig;
  function: IFunctionConfig;
  triggers?: ITriggerConfig[];
}

export interface IServiceConfig {
  name: string;
  description?: string;
  internetAccess?: boolean;
  logConfig?: ILogConfig;
  role?: string;
  vpcConfig?: IVpcConfig;
  nasConfig?: INasConfig;
}

export interface IFunctionConfig {
  name: string;
  service: string;
  description?: string;
  filename?: string;
  caPort?: number;
  customContainerConfig?: ICustomContainerConfig;
  handler: string;
  memorySize?: number;
  runtime: string;
  timeout?: number;
  environmentVariables?: {
    [key: string]: any;
  };
  initializationTimeout?: number;
  initializer?: string;
  // Triggers?: TriggerConfig[];
  instanceConcurrency?: number;
  instanceType?: string;
  ossBucket?: string;
  ossKey?: string;
}

export interface ICustomContainerConfig {
  image: string;
  command?: string;
  args?: string;
}

export interface ITriggerConfig {
  name: string;
  function: string;
  service: string;
  type: string;
  config: IHttpTriggerConfig;
}

export interface IHttpTriggerConfig {
  authType: string;
  methods: string[];
}

export interface ILogConfig {
  project: string;
  logstore: string;
}

export interface IVpcConfig {
  securityGroupId: string;
  vswitchIds: string[];
  vpcId?: string;
}

export interface INasConfig {
  userId?: number;
  groupId?: number;
  mountPoints: IMountPoint[];
}

export interface IMountPoint {
  serverAddr: string;
  mountDir: string;
}
