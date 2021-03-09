exports.handler = (req, resp, context) => {
  resp.send(process.env.token || '');
}