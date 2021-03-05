export const CONTEXT = 'FC-NAS';

export const FUNNAME = 'nas-function';

export const RETRYOPTIONS = {
  retries: 5,
  factor: 2,
  minTimeout: 1 * 1000,
  randomize: true,
};

export const REQUESTOPTION = {
  method: 'POST',
};

export const LSHELP = [
  {
    header: 'Options',
    optionList: [
      {
        name: 'all',
        description: '列出远端 NAS 目录下的所有内容',
        alias: 'a',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'long',
        description: '列出远端 NAS 目录下内容的详细信息',
        alias: 'l',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'help',
        description: '使用引导',
        alias: 'h',
        type: Boolean,
      },
    ],
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '使用: nas ls [options] <fc_dir>',
        example: '$ nas ls nas://<fc_dir>',
      },
    ],
  },
];

export const CPHELP = [
  {
    header: 'Options',
    optionList: [
      {
        name: 'recursive',
        description: '迭代复制文件夹内容',
        alias: 'r',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'no-clobber',
        description: '不覆盖已存在文件',
        alias: 'n',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'help',
        description: '使用引导',
        alias: 'h',
        type: Boolean,
      },
    ],
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '使用: nas cp [options] <src_path> <fc_dir>',
        example: '$ nas cp /home/usr/demo.file nas://<fc_dir>',
      },
    ],
  },
];

export const RMHELP = [
  {
    header: 'Options',
    optionList: [
      {
        name: 'recursive',
        description: '递归删除文件夹',
        alias: 'r',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'force',
        description: '删除文件而不提示您进行确认',
        alias: 'f',
        defaultOption: false,
        type: Boolean,
      },
      {
        name: 'help',
        description: '使用引导',
        alias: 'h',
        type: Boolean,
      },
    ],
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '使用: nas rm [options] <nas_dir>',
        example: '$ nas rm -f -r nas://<fc_dir>',
      },
    ],
  },
];
