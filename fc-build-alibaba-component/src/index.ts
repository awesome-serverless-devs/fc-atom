import { Component } from '@serverless-devs/s-core';
import HELP from './utils/help';

export default class Build extends Component {
  logger = console;

  async build(inputs) {
    this.help(inputs, HELP);

    return {
      Properties: inputs.Properties,
    };
  }
}
