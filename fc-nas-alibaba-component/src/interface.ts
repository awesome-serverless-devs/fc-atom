export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  regionId: string;
  serviceName: string;
  functionName?: string;
  vpcId: string;
  vSwitchId: string;
  securityGroupId: string;
  role: string;
  description?: string;

  groupId: number;
  userId: number;
  nasName?: string;
  mountPointDomain?: string;
  zoneId: string;
  storageType?: string;
  fileSystemId?: string;
  excludes?: string[];
  nasDir: string;
}

export interface INasInitResponse {
  fileSystemId: string;
  mountTargetDomain: string;
}

export interface ICommandParse {
  rawData?: string;
  data?: ICommandData;
}

export interface ICommandData {
  [key: string]: any;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
