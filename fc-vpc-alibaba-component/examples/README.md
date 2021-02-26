## 命令执行
````
s create

s delete
````

## 字段描述

#### s create
regionId 和 zoneId 是必填字段，如果不填写会输出异常

vpcName、vSwitchName、securityGroupName 如果不填写会自动生成:FC-VPC-generate-resources

vpcDescription、vpcCidrBlock、vSwitchDescription、vSwitchCidrBlock、securityGroupDescription 仅在第一次创建的时候生效

#### s delete

regionId、vpcId、vSwitchId、securityGroupId 必填