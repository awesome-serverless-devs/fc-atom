const path = require('path');
const fse = require('fs-extra');
const alicloud = require('@pulumi/alicloud');

const configFile = path.join(__dirname, 'config.json');

if (fse.pathExistsSync(configFile)) {
  const {
    vpc,
    nas,
    log,
    service,
    function: functionConfig,
    trigger,
    role,
    rolePolicyAttachments,
    domain
  } = JSON.parse(fse.readFileSync(configFile, { encoding: 'utf-8' }));

  let logConfig;

  // 创建 log
  if (log) {
    const { project, store, storeIndex } = log;
    const p = new alicloud.log.Project(project.name, project);
    const s = new alicloud.log.Store(store.name, {
      ...store,
      project: p.name,
    }, { dependsOn: [p], parent: p });
    new alicloud.log.StoreIndex(store.name, {
      ...storeIndex,
      project: p.name,
      logstore: s.name
    }, { dependsOn: [p, s], parent: s });
    
    logConfig = {
      project: p.name,
      logstore: s.name,
    }
  }

  // 创建 vpc
  const { network, switch: vswitch, securityGroup } = vpc;
  const v = new alicloud.vpc.Network(network.name, network);
  const vs = new alicloud.vpc.Switch(vswitch.name, {
    ...vswitch,
    vpcId: v.id
  }, { dependsOn: [v], parent: v });
  const sg = new alicloud.ecs.SecurityGroup(securityGroup.name, {
    ...securityGroup,
    vpcId: v.id
  }, { dependsOn: [v], parent: v });

  // 创建 nas
  const { fileSystem, mountTarget } = nas;
  const fs = new alicloud.nas.FileSystem(fileSystem.storageType, fileSystem);
  const mt = new alicloud.nas.MountTarget(mountTarget.accessGroupName, {
    ...mountTarget,
    vswitchId: vs.id,
    fileSystemId: fs.id
  }, { dependsOn: [fs, vs], parent: fs });

  const ram = new alicloud.ram.Role(role.name, role);
  for (const rolePolicyAttachment of rolePolicyAttachments) {
    new alicloud.ram.RolePolicyAttachment(rolePolicyAttachment.policyName, {
      ...rolePolicyAttachment,
      roleName: ram.name
    }, { dependsOn: [ram], parent: ram });
  }

  const fcService = new alicloud.fc.Service(service.name, {
    ...service,
    logConfig,
    vpcConfig: {
      securityGroupId: sg.id,
      vswitchIds: [vs.id]
    },
    nasConfig: {
      groupId: 10003,
      userId: 10003,
      mountPoints: [
        {
          serverAddr: mt.id.apply(id => `${id.slice(id.indexOf(':') + 1)}:/${service.name}`),
          mountDir: '/mnt/auto'
        }
      ]
    },
    role: ram.arn
  }, { dependsOn: [v, vs, sg, fs, mt, ram] });
  const fcFunc = new alicloud.fc.Function(functionConfig.name, {
    ...functionConfig,
    service: fcService.name,
  }, { dependsOn: [fcService], parent: fcService });
  const fcTrigger = new alicloud.fc.Trigger(trigger.name, {
    ...trigger,
    service: fcService.name,
    function: fcFunc.name,
  }, { dependsOn: [fcService, fcFunc], parent: fcFunc });

  const dm = new alicloud.fc.CustomDomain(domain.domainName, domain, { dependsOn: [fcService, fcFunc, fcTrigger] });

  module.exports = dm;
}

