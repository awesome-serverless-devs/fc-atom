const { execSync } = require('child_process');

try {
  const { START_OPERATION } = process.env;
  
  if (!START_OPERATION) {
    throw new Error("'START_OPERATION' was not found in environment variables.");
  }
  
  execSync(`cd /mnt/auto && ${START_OPERATION}`);
} catch(ex) {
  throw ex;
}