export default {
  description: 'Usage: s exec -- build docker -d, --dockerfile <Dockerfile>',
  commands: [
    {
      name: 'docker',
      desc: 'Use docker to build dependencies.',
    },
    {
      name: 'local',
      desc: 'Build dependencies directly.',
    },
  ],
};
