export interface IGensls {
  project: {
    name: string;
    description?: string;
  };
  store: {
    name: string;
    project?: string;
    enableWebTracking?: boolean;
  };
  storeIndex: {
    project?: string;
    logstore?: string;
    fullText?: {
      caseSensitive?: boolean;
      includeChinese?: boolean;
      token?: string;
    };
  };
}

export interface IDomain {
  domainName: string;
  protocol: 'HTTP' | 'HTTP,HTTPS';
  routeConfigs: {
    serviceName: string;
    functionName: string;
    qualifier: string;
    methods: string[];
    path: string;
  }[];
}
