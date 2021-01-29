export default {
  description: 'Usage: s exec -- build',
  commands: [
    {
      name: 'docker',
      desc: 'Use docker to build dependencies.',
    },
    {
      name: 'local',
      desc: 'Build dependencies directly.',
    },
    {
      name: 'image',
      desc: 'Build image for custom-runtime project.',
    },
  ],
};
