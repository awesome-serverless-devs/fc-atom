import Logs from '../src/index';

const INPUTS = {
  Properties: {},
  Credentials: {
    AccountID: '1234567890',
    AccessKeyID: 'AccessKeyID',
    AccessKeySecret: 'AccessKeySecret',
  },
  Project: {
    ProjectName: '',
    Component: '',
    Provider: 'alibaba',
    AccessAlias: 'alibaba-access',
  },
  Command: '',
  Args: '',
  Path: {
    ConfigPath: '',
  },
};

describe('test/index.test.ts', () => {
  it('should 返回输入参数', async () => {
    const logs = new Logs();
    const result = await logs.logs(INPUTS);
    expect(result.Properties).toBe(INPUTS.Properties);
  });
});
