export const HELP = [
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        description: 'Use guide',
        alias: 'h',
        type: Boolean,
      },
    ],
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '使用: deploy',
        example: '$ s deploy',
      },
    ],
  },
];

export const CONTEXT = 'WEB-FRAMEWORK';

export const getAutoName = (accountID: string, region: string, serviceName: string) =>
  `framework-${accountID}-${region}-${serviceName}`;

export const STORENAME = 'logstore';

export const HTTP_CONFIG = "{\"authType\":\"anonymous\",\"methods\":[\"GET\",\"POST\",\"PUT\"]}";
