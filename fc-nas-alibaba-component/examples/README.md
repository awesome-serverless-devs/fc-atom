本组件支持指令
````
s deploy

s cp -r -n ./folder nas:///folder

s ls -a nas:///folder

s cp -r -n nas:///folder ./folder-1

s cp nas:///folder/demo-1.txt ./folder-2

# 如果想将根目录下所有的文件cp到本地， 使用指令 s cp -r nas:///. ./folder

s rm -r nas:///folder/README.md
s rm -r nas:///folder

s delete
````

配置字段描述
  Component: 目前没有发布， 需要指向本地路径