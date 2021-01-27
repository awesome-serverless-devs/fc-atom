import { Component } from '@serverless-devs/s-core';
// import { log } from '@pulumi/alicloud';

export default class Logs extends Component {
  async test(inputs) {
    // 返回结果
    return {
      Result: 'hello world',
      Args: inputs,
    };
  }

  async logs(inputs) {
    console.log(inputs);

    return {
      Result: '233',
    };
  }
}
