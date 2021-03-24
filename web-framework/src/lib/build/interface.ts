export interface IProperties {
  region: string;
  service: IServiceProps;
  function: IFunctionProps;
}

export interface IServiceProps {
  name: string;
  logConfig?: {
    project: string;
    logstore: string;
    enableRequestMetrics?: boolean;
  };
}

export interface IFunctionProps {
  name: string;
  runtime: string;
  codeUri:
    | string
    | {
        src?: string;
        excludes?: string[];
      };
  handler: string;
  memorySize?: number;
  timeout?: number;
  initializer?: string;
  initializationTimeout: number;
  environmentVariables?: {
    [key: string]: any;
  };
  customContainer?: {
    image: string;
    command?: string;
    args?: string;
  };
}
