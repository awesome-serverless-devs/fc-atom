# 用户配置

````
demo-1:
  Component: ram
  Provider: alibaba
  Properties:
    name: string # 必填
    description: ram 描述 # 选填
    service: fc.aliyuns.com # 授权主体
    statement: # 策略配置
    policys: # 选填
      - policy-name
      - name: policy 名称
        description: policy 描述 # 选填
        statement: # 策略配置
          - Effect: Allow
            Action:
              - sts:AssumeRole
            Resource: '*'
````

调用 create 方式时，需要注意
- role 的 service 和 statement 其中一个必填
  1. service 和 statement 都没有填写，抛出异常
  2. 仅 statement 填写，直接使用
  3. service 和 statement 都填写， 使用 statement 信息，service 无效
  4. 仅 service 填写，使用默认值
- 所有的 description 配置仅在初次创建生效