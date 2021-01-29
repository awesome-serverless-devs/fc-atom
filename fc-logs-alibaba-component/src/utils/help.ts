export default {
  description: 'Usage: s exec -- logs [options]',
  args: [
    {
      name: '-t, --tail',
      desc: 'Real-time query log',
    },
    {
      name: '-s, --startTime',
      desc: 'Query log start time',
    },
    {
      name: '-e, --endTime',
      desc: 'Query log end time',
    },
    {
      name: '-k, --keyword',
      desc: 'Keyword query',
    },
    {
      name: '-r, --requestId',
      desc: 'Query according to requestId within the time interval',
    },
    {
      name: '-t, --type',
      desc: 'Log type query, value: failed',
    },
    {
      name: '-h, --help',
      desc: 'Display help for command',
    },
  ],
};
