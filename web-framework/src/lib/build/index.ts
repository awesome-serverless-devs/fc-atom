import * as buildInterface from './interface';
import { IProperties } from '../../interface/inputs';
import { IFunctionConfig } from '../../interface/function';
import { IServiceConfig } from '../../interface/service';
import { getAutoName } from '../../constant';
import { getLogConfig } from '../utils'

function transfromInputs(inputs) {
  const { runtime, region, service, function: functionConfig }: IProperties = inputs.Properties;

  const accountID = inputs.Credentials.AccountID;
  const autoName = getAutoName(accountID, region, service.name);

  const config: buildInterface.IProperties = {
    region,
    service: getService(service, autoName),
    function: getFunction(runtime, functionConfig, service.name),
  };

  inputs.Properties = config;

  return inputs;
}

function getService(service: IServiceConfig, autoName: string): buildInterface.IServiceProps {
  const config: buildInterface.IServiceProps = {
    name: service.name,
  };

  if (service.logConfig) {
    config.logConfig = getLogConfig(service.logConfig, autoName);
  }

  return config;
}

function getFunction(runtime: string, functionConfig: IFunctionConfig, serviceName: string): buildInterface.IFunctionProps {
  const config: buildInterface.IFunctionProps = {
    name: functionConfig.name || serviceName,
    runtime: runtime || 'custom',
    codeUri: functionConfig.code,
    handler: functionConfig.handler || 'index.handler',
    initializationTimeout: functionConfig.initializationTimeout || 3,
    initializer: functionConfig.initializer,
  };

  return config;
}

export default {
  transfromInputs,
};
