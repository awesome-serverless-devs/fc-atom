export interface IServiceConfig {
  name: string;
  role: string;
  description?: string;
  internetAccess?: boolean;
  logConfig?: 'auto' | 'Auto' | ILogConfig;
  vpcConfig?: IVpcConfig;
  nasConfig?: INasConfig;
}

export interface ILogConfig {
  project: string;
  logstore: string;
}

export interface IVpcConfig {
  securityGroupId: string;
  vswitchIds: string[];
  vpcId?: string;
}

export interface INasConfig {
  userId?: number;
  groupId?: number;
  mountPoints: IMountPoint[];
}

export interface IMountPoint {
  serverAddr: string;
  mountDir: string;
}
