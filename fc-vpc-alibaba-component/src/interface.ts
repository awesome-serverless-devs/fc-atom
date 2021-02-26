export class Credentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  regionId: string;
  vpcName: string;
  vswitchName: string;
  securityGroupName: string;
  zoneId: string;
  vpcDescription?: string;
  vswitchDescription?: string;
  cidrBlock?: string;
  securityGroupDescription?: string;
}

export interface IVpcConfig {
  vpcId: string;
  vSwitchId: string;
  securityGroupId: string;
}
