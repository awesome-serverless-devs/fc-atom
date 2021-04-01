import * as Interface from '../../interface/inputs';

export default class Component {
  static tarnsform(inputs) {
    inputs.Project.Component = 'fc-metrics';

    const properties: Interface.IProperties = inputs.Properties;

    const { region, service, function: functionConfig } = properties;
    const serviceName = service.name;
    const functionName = functionConfig.name || serviceName;

    inputs.Properties = {
      regionId: region,
      serviceName,
      functionName
    };

    return inputs;
  }
}
