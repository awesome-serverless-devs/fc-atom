import * as Interface from '../../interface/inputs';
import { ILogConfig } from '../../interface/service';
import { getAutoName, STORENAME } from '../../constant';
import { isBoolean } from '../utils'

export default class Component {
  static tarnsform(inputs) {
    inputs.Project.Component = 'fc-logs';

    const properties: Interface.IProperties = inputs.Properties;
    const accountID = inputs.Credentials.AccountID;

    const { region, service, function: functionConfig } = properties;
    const topic = service.name;
    const query = `${functionConfig.name} | with_pack_meta`;

    const autoName = getAutoName(accountID, region, topic);
    const logConfig: ILogConfig = {
      project: autoName,
      logstore: STORENAME
    };

    if (!isBoolean(service.logConfig)) {
      Object.assign(logConfig, service.logConfig);
    }

    inputs.Properties = {
      region,
      logConfig,
      topic,
      query
    };

    return inputs;
  }
}
