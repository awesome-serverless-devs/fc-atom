import * as buildInterface from './interface';
import { IProperties } from '../../interface/inputs';
import { getAutoName, STORENAME } from '../../constant';

function transfromInputs(inputs) {
  const { region, service, function: functionConfig }: IProperties = inputs.Properties;

  if (!functionConfig.runtime) {
    throw new Error('Build not fount runtime.');
  }

  const accountID = inputs.Credentials.AccountID;
  const autoName = getAutoName(accountID, region, service.name);

  const config: buildInterface.IProperties = {
    region,
    service: getService(service, autoName),
    function: getFunction(functionConfig),
  };

  inputs.Properties = config;

  return inputs;
}

function getService(service, autoName: string): buildInterface.IServiceProps {
  const config: buildInterface.IServiceProps = {
    name: service.name,
  };

  if (service.logConfig) {
    config.logConfig = {
      project: service.logConfig?.project || autoName,
      logstore: service.logConfig?.logstore || STORENAME,
    };
  }

  return config;
}

function getFunction(functionConfig): buildInterface.IFunctionProps {
  const config: buildInterface.IFunctionProps = {
    name: functionConfig.name,
    runtime: functionConfig.runtime,
    codeUri: functionConfig.code,
    handler: functionConfig.handler || 'index.handler',
    initializationTimeout: functionConfig.handler || 3,
    initializer: functionConfig.initializer,
  };

  return config;
}

export default {
  transfromInputs,
};
