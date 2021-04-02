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
    customDomains
  } = JSON.parse(fse.readFileSync(configFile, { encoding: 'utf-8' }));

  const dependsOnRam = [];
  const ram = new alicloud.ram.Role(role.name, role);
  dependsOnRam.push(ram);
  for (const rolePolicyAttachment of rolePolicyAttachments) {
    const policy = new alicloud.ram.RolePolicyAttachment(rolePolicyAttachment.policyName, {
      ...rolePolicyAttachment,
      roleName: ram.name
    }, { dependsOn: [ram], parent: ram });

    dependsOnRam.push(policy);
  }

  let logConfig = service.logConfig;

  // 创建 log
  if (log) {
    const { project, store, storeIndex } = log;
    const p = new alicloud.log.Project(project.name, project);
    const s = new alicloud.log.Store(store.name, {
      ...store,
      project: p.name,
    }, { dependsOn: [p, ...dependsOnRam], parent: p });
    new alicloud.log.StoreIndex(store.name, {
      ...storeIndex,
      project: p.name,
      logstore: s.name
    }, { dependsOn: [p, s, ...dependsOnRam], parent: s });
    
    logConfig = {
      project: p.name,
      logstore: s.name,
    }
  }

  // 创建 vpc
  const { network, switch: vswitch, securityGroup } = vpc;
  const v = new alicloud.vpc.Network(network.vpc_name, network);
  const vs = new alicloud.vpc.Switch(vswitch.vswitch_name, {
    ...vswitch,
    vpcId: v.id
  }, { dependsOn: [v, ...dependsOnRam], parent: v });
  const sg = new alicloud.ecs.SecurityGroup(securityGroup.name, {
    ...securityGroup,
    vpcId: v.id
  }, { dependsOn: [v, ...dependsOnRam], parent: v });

  // 创建 nas
  const { fileSystem, mountTarget } = nas;
  const fs = new alicloud.nas.FileSystem(fileSystem.storageType, fileSystem);
  const mt = new alicloud.nas.MountTarget(mountTarget.accessGroupName, {
    ...mountTarget,
    vswitchId: vs.id,
    fileSystemId: fs.id
  }, { dependsOn: [fs, vs, ...dependsOnRam], parent: fs });

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
  }, { dependsOn: [v, vs, sg, fs, mt, ...dependsOnRam] });
  const fcFunc = new alicloud.fc.Function(functionConfig.name, {
    ...functionConfig,
    service: fcService.name,
  }, { dependsOn: [fcService], parent: fcService });
  const fcTrigger = new alicloud.fc.Trigger(trigger.name, {
    ...trigger,
    service: fcService.name,
    function: fcFunc.name,
  }, { dependsOn: [fcService, fcFunc], parent: fcFunc });

  if (customDomains) {
    let domainNames = [];
    customDomains.forEach(customDomain => {
      new alicloud.fc.CustomDomain(customDomain.domainName, customDomain, { dependsOn: [fcService, fcFunc, fcTrigger] });
      domainNames.push(customDomain.domainName);
    })
    return domainNames;
  }
}
