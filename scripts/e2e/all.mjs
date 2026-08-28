import { closeBrowserPage, runMenu } from './cdp-menu-test.mjs';

const menus = [
  ['集群管理', '集群管理', '概览', 'cluster/panel'], ['节点管理', '集群管理', '节点管理', 'cluster/nodes'], ['资源对象浏览器', '集群管理', '资源对象浏览器', 'cluster/resource'],
  ['应用管理', '应用管理', '应用列表', 'app/apps'], ['计划任务', '应用管理', '计划任务', 'app/cronjob'], ['集群数据库', '应用管理', '集群数据库', 'app/database'], ['AI应用管理', '应用管理', 'AI应用管理', 'app/gpustack'],
  ['网关管理', '网关管理', '反向代理', 'gateway/rvproxy'], ['AI代理', '网关管理', 'AI代理', 'gateway/aiproxy'], ['私有DNS', '网关管理', '私有DNS', 'gateway/dns'], ['网关插件', '网关管理', '网关插件', 'gateway/plugins'],
  ['存储管理', '存储管理', '存储设备', 'storage/disk'], ['存储分区', '存储管理', '存储分区', 'storage/zone'], ['制品开发', '制品开发', null, 'zpk'], ['站点管理', '站点管理', null, 'sitemanage'],
  ['系统管理', '系统管理', '云端注册', 'system/cloud'], ['授权管理', '系统管理', '授权管理', 'system/license'], ['审计日志', '系统管理', '审计日志', 'system/audit'],
  ['多租户管理', '多租户管理', '用户管理', 'usermanage/users'], ['权限套餐', '多租户管理', '权限套餐', 'usermanage/permission'], ['备案域名', '多租户管理', '备案域名', 'usermanage/usermanage-whitedomain'], ['站点设置', '多租户管理', '站点设置', 'usermanage/site-setting'], ['系统设置', '多租户管理', '系统设置', 'usermanage/usermanage-system'],
];

const failures = [];
for (const [name, parent, child, path] of menus) {
  try {
    await runMenu({ name, parent, child, path, reuse: true });
  } catch (error) {
    failures.push({ menu: name, error: error.message });
    console.error(`[${name}] ${error.message}`);
  }
}
if (failures.length) {
  console.error(`${failures.length} 个菜单测试失败`);
  process.exitCode = 1;
}
closeBrowserPage();
