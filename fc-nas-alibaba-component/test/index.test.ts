import Logs from '../src/index';

const INPUTS = {
  Properties: {
    Region: 'cn-shenzhen',
    LogConfig: {
      Project: 'aliyun-fc-cn-shenzhen-19b4972b-489d-5832-8464-c3a319bb32d1',
      Logstore: 'function-log',
    },
    Topic: 'guide',
    Query: 'guide-hello_world-nodejs12',
  },
  Credentials: {
    AccountID: '1234567890',
    AccessKeyID: 'AccessKeyID',
    AccessKeySecret: 'AccessKeySecret',
  },
  Project: {
    ProjectName: 'LogsApp',
    Component: '',
    Provider: 'alibaba',
    AccessAlias: 'alibaba-access',
  },
  Command: 'logs',
  Args:
    '-s Thu Jan 28 2021 16:48:10 GMT+0800 -e Thu Jan 28 2021 17:48:10 GMT+0800 -r ab35f35a-4876-42a9-8924-18372abaff1d',
  Path: {
    ConfigPath: '',
  },
};

describe('test/index.test.ts', () => {
  it('should 返回输入参数', async () => {
    // const logs = new Logs();
    // const result = await logs.logs(INPUTS);
    // expect(result.Properties).toBe(INPUTS.Properties);
  });
});
