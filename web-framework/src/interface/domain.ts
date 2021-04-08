export interface ICustomDomain {
  domainName: 'Auto' | 'auto' | string;
  protocol: 'HTTP' | 'HTTP,HTTPS';
  routeConfigs: IRouteConfigs[];
  certConfig?
}

export interface IRouteConfigs {
  path: string;
  serviceName?: string;
  functionName?: string;
  qualifier?: string;
  methods?: string[];
}

export interface ICertConfig {
  certName: string;
  certificate: string;
  privateKey: string;
}