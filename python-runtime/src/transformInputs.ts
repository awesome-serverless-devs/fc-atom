import * as Interface from './interface';

export default function transformInputs(inputs) {
  inputs.Project.Component = 'web-framework';

  const properties: Interface.IProperties = inputs.Properties;

  const { region, service, function: functionConfig, trigger, domain } = properties;
  const serviceName = service.name;

  inputs.Properties = {
    region,
    service,
    function: genFunctionConfig(serviceName, functionConfig),
    trigger: getTriggerConfig(serviceName, functionConfig.name, trigger),
    domain: domain || 'auto',
  };

  return inputs;
}

function genFunctionConfig(
  serviceName: string,
  functionConfig: Interface.IFunctionConfig,
): IFunctionConfig {
  functionConfig.caPort = functionConfig.caPort || 9000;

  return {
    ...functionConfig,
    customContainerConfig: {
      command: functionConfig.command,
      image: 'registry.cn-shenzhen.aliyuncs.com/test-wss/python3:v0.2', // 公有的启动镜像
      args: `["--port", "${functionConfig.caPort}"]`,
    },
    service: serviceName,
  };
}

const defaultTriggerConfig = {
  name: 'httpTrigger',
  authType: 'anonymous',
  methods: ['GET', 'POST', 'PUT'],
};

function getTriggerConfig(
  serviceName: string,
  functionName: string,
  trigger: undefined | Interface.ITriggerConfig = defaultTriggerConfig,
): ITriggerConfig {
  return {
    name: trigger.name || 'httpTrigger',
    function: functionName,
    service: serviceName,
    type: 'http',
    config: {
      authType: trigger.authType || 'anonymous',
      methods: trigger.methods || ['GET', 'POST', 'PUT'],
    },
  };
}

interface IFunctionConfig {
  name: string;
  service: string;
  description?: string;
  runtime?: 'custom-container';
  customContainerConfig: {
    image: string;
    command: string;
    args: string;
  };
  code: {
    src: string;
    excludes?: string[];
  };
  handler?: string;
  filename?: string;
  memorySize?: number;
  timeout?: number;
  environmentVariables?: {
    [key: string]: any;
  };
  instanceConcurrency?: number;
  instanceType?: 'e1' | 'c1';
}

interface ITriggerConfig {
  name: string;
  function: string;
  service: string;
  type: 'http';
  config: {
    authType: string;
    methods: string[];
  };
}
