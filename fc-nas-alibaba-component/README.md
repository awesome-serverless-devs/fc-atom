## 发布

````
$ npm i

$ npm run build:ts

$ npm run package-zip

# copy package.json & package-lock.json to dist dir

$ s platform publish

````

## 字段描述

mountDir 字段移除，不再支持配置，有组件生成， 生成规则， {fileSystemId}-{挂载点ID}-{region}-{nasDir}

## 指令执行

````
$ cd examples

$ s deploy

$ s cp -r -n ./folder nas:///folder

$ s ls -a nas:///folder

$ s cp -r -n nas:///folder ./folder-1

$ s cp nas:///folder/demo-1.txt ./folder-2

# 如果想将根目录下所有的文件cp到本地， 使用指令 s cp -r nas:///. ./folder

$ s rm -r nas:///folder/README.md
$ s rm -r nas:///folder

s delete
````