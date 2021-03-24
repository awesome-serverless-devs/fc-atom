FROM node:14.5.0-alpine3.11

# Create app directory
WORKDIR /usr/src/app

COPY . .

ENTRYPOINT ["node", "index.js"]

# sudo docker login --username={username} registry.cn-hongkong.aliyuncs.com
# docker build -t registry.cn-hongkong.aliyuncs.com/test-wss/nodejs14:v0.6 .
# docker push registry.cn-hongkong.aliyuncs.com/test-wss/nodejs14:v0.6