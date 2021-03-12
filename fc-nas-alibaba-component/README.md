## 发布

````
$ npm i

$ npm run build:ts

$ npm run package-zip

# copy package.json & package-lock.json to dist dir

$ s platform publish

````

## 字段描述

mountDir 字段移除，不再支持配置，由组件生成，生成规则： /mnt/{fileSystemId}-{挂载点ID}-{region}/{nasDir}

## 指令执行

````
$ cd examples

$ s deploy

$ s cp -r -n ./folder nas:///${nasDir}/f

$ s ls -a nas:///${nasDir}/f

$ s cp -r -n nas:///${nasDir}/f ./folder-1

$ s cp nas:///${nasDir}/f/demo-1.txt ./folder-2

# 如果想将挂载下所有的文件cp到本地， 使用指令 s cp -r nas:///${nasDir}/. ./folder

$ s rm -r nas:///${nasDir}/f/README.md
$ s rm -r nas:///${nasDir}/f

s delete
````
