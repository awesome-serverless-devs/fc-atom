export interface ICredentials {
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
}
