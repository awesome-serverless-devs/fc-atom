export interface ICredentials {
  AccountID: string;
  AccessKeyID: string;
  AccessKeySecret: string;
  SecurityToken?: string;
}

export interface IProperties {
  regionId: string;
  zoneId: string;
  vpcName: string;
  vSwitchName: string;
  securityGroupName: string;
  vpcDescription?: string;
  vpcCidrBlock?: string;
  vSwitchDescription?: string;
  vSwitchCidrBlock?: string;
  securityGroupDescription?: string;
}

export interface IVpcConfig {
  vpcId: string;
  vSwitchId: string;
  securityGroupId: string;
}

export interface IDeleteProperties {
  regionId: string;
  vpcId: string;
  vSwitchId: string;
  securityGroupId: string;
}
