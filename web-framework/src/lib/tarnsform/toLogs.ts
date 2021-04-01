import * as Interface from '../../interface/inputs';
import _ from 'lodash';
import { getAutoName } from '../../constant';
import { getLogConfig } from '../utils'

export default class Component {
  static tarnsform(inputs) {
    inputs.Project.Component = 'fc-logs';

    const properties: Interface.IProperties = inputs.Properties;
    const accountID = inputs.Credentials.AccountID;

    const { region, service, function: functionConfig } = properties;
    const topic = service.name;
    const query = `${functionConfig.name || topic} | with_pack_meta`;

    const autoName = getAutoName(accountID, region, topic);

    inputs.Properties = {
      region,
      topic,
      query,
      logConfig: getLogConfig(service.logConfig, autoName),
    };

    return inputs;
  }
}
