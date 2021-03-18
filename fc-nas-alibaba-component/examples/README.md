本组件支持指令
````
s deploy



s cp -r -n ./folder nas:///WSS-NasTest/f

s ls -a nas:///WSS-NasTest/f

s cp -r -n nas:///WSS-NasTest/f ./folder-1

s cp nas:///WSS-NasTest/f/demo-1.txt ./folder-2

# 如果想将根目录下所有的文件cp到本地， 使用指令 s cp -r nas:///WSS-NasTest/. ./folder

s rm -r nas:///WSS-NasTest/f/README.md
s rm -r nas:///WSS-NasTest/f
# 删除所有的文件
s rm -r nas:///WSS-NasTest/.

s delete
````