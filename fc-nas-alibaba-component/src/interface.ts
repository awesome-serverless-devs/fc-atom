export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  regionId: string;
  serviceName: string;
  functionName: string;
  vpcId: string;
  vSwitchId: string;
  securityGroupId: string;
  roleName: string;
  description?: string;

  groupId: number;
  userId: number;
  nasName?: string;
  mountPointDomain?: string;
  zoneId: string;
  mountDir: string;
  nasDir: string;
}

export interface IFcConfig {
  serviceName: string;
  functionName?: string;
  description?: string;
  vpcConfig: object;
  nasConfig: object;
  roleName: string;
}

export interface INasInitResponse {
  fileSystemId: string;
  mountTargetDomain: string;
}

export function isCredentials(arg: any): arg is ICredentials {
  return arg.AccessKeyID !== undefined;
}
