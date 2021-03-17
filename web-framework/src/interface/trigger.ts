export interface ITriggerConfig {
  name: string;
  function: string;
  service: string;
  type: 'http';
  config: IHttpTriggerConfig;
}

export interface IHttpTriggerConfig {
  authType: string;
  methods: string[];
}
