
export default {
  CONTEXT: 'FC-DOMAIN',
  DOMAIN: 'http://domain.devsapp.cn',
  HINT: {
    loading: 'Get token....',
    success: 'End of request',
    error: 'Request failed',
  },
  RETRYOPTIONS: {
    retries: 5,
    factor: 2,
    minTimeout: 1 * 1000,
    randomize: true,
  }
}

