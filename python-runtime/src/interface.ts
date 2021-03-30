export interface IProperties {
  region: string;
  service: IServiceConfig;
  function: IFunctionConfig;
  trigger?: ITriggerConfig;
  domain?: string;
}

export interface IServiceConfig {
  name: string;
  description?: string;
  logConfig?: 'auto' | 'Auto' | {
    project: string;
    logstore: string;
  };
}

export interface IFunctionConfig {
  name: string;
  service: string;
  command: string;
  code: {
    src: string;
    excludes?: string[];
  };
  environmentVariables?: {
    [key: string]: any;
  };
  description?: string;
  caPort?: number;
  memorySize?: number;
  timeout?: number;
  instanceConcurrency?: number;
  instanceType?: 'e1' | 'c1';
}

export interface ITriggerConfig {
  name: string;
  authType: string;
  methods: string[];
}
