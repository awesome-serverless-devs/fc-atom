const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function mkdirPSync(p) {
  try {
    fs.mkdirSync(p);
  } catch (err0) {
    switch (err0.code) {
      case 'ENOENT':
        mkdirPSync(path.dirname(p));
        mkdirPSync(p);
        break;
      case 'EEXIST':
        break;
      default:
        var stat;
        try {
          stat = fs.statSync(p);
        } catch (err1) {
          throw err0;
        }
        if (!stat.isDirectory()) {
          throw err0;
        }
        console.error('error: ', err0);
        break;
    }
  }
}

mkdirPSync('./src/utils/fcResources/nas-server');

exec('npx tsc -w -p tsconfig.json', (error, stdout, stderr) => {
  if (error) {
    console.error(`npx tsc -w -p tsconfig.json error: ${error}`);
    console.error(stderr);
    return;
  }
  console.log(stdout);
});


exec('make -C ./src/utils/fcResources/nas-server package', (error, stdout, stderr) => {
  if (error) {
    console.error(`npx tsc -w -p tsconfig.json error: ${error}`);
    console.error(stderr);
    return;
  }
  console.log(stdout);
});