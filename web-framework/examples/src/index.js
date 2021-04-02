var express = require('express');

var app = express();

app.get('*', (req, res) => {
  res.header('Content-Type', 'text/html;charset=utf-8')
  console.log('test');

  res.send(JSON.stringify({
    test: '启动成功，皆大欢喜；启动失败，还得再来',
    params: req.params,
    query: req.query
  }, null, '  '))
})

app.listen(9000, () => {
  console.log('启动成功？');
}).on('error', (e) => {
  console.error(e.code, e.message)
})