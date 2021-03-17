var express = require('express');

var app = express();

app.get('*', (req, res) => {
  res.header('Content-Type', 'text/html;charset=utf-8')

  res.send(JSON.stringify({
    headers: req.headers,
    params: req.params,
    query: req.query
  }, null, '  '))
})

app.listen(9000, () => {
  console.log('启动成功？');
}).on('error', (e) => {
  console.error(e.code, e.message)
})