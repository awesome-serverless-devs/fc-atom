import _ from 'lodash';

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function replaceLineBreak(logsList: object = {}) {
  return _.mapValues(logsList, (value) => {
    value.message = value.message.replace(new RegExp(/(\r)/g), '\n');
    return value;
  });
}
