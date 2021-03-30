export const HELP = [
  {
    header: 'Options',
    optionList: [
      {
        name: 'tail',
        description: 'Real-time query log',
        alias: 't',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'startTime',
        description: 'Query log start time',
        alias: 's',
        defaultOption: false,
        type: Number,
      },
      {
        name: 'endTime',
        description: 'Query log end time',
        alias: 'e',
        defaultOption: false,
        type: Number,
      },
      {
        name: 'keyword',
        description: 'Keyword query',
        alias: 'k',
        defaultOption: false,
        type: String,
      },
      {
        name: 'requestId',
        description: 'Query according to requestId within the time interval',
        alias: 'r',
        defaultOption: false,
        type: String,
      },
      {
        name: 'type',
        description: 'Log type query, value: failed',
        defaultOption: false,
        type: String,
      },
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
        desc: '使用: logs -s <startTime> -e <endTime> -r <requestId>',
        example: '$ logs -s 1611823690000 -e 1611827290000 -k *** --type failed -r ********',
      },
    ],
  },
];

export const CONTEXT = 'FC_LOGS';
