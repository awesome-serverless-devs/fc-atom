export interface IFunctionConfig {
  name: string;
  service: string;
  description?: string;
  runtime?: 'custom-container';
  customContainerConfig: ICustomContainerConfig;
  code: {
    src: string;
    excludes: string[];
  };
  handler?: string;
  filename?: string;
  memorySize?: number;
  timeout?: number;
  environmentVariables?: {
    [key: string]: any;
  };
  initializationTimeout?: number;
  initializer?: string;
  instanceConcurrency?: number;
  instanceType?: 'e1' | 'c1';
}

export interface ICustomContainerConfig {
  image: string;
  command: string;
  args: string;
}
