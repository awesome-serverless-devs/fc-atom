import * as Interface from '../../interface/inputs';
import _ from 'lodash'
import { ILogConfig } from '../../interface/service';
import { getAutoName, STORENAME } from '../../constant';
import { isAuto } from '../utils'

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

    if (!isAuto(service.logConfig)) {
      const { project, logstore } = service.logConfig || {};
      if (project && logstore) {
        Object.assign(logConfig, service.logConfig);
      } else {
        throw new Error('service/logConfig configuration error');
      }
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
