import type { RouteRecordRaw } from 'vue-router';
import { k8sproxy } from '@/utils/api';

type PermissionMenuNode = {
  title: string;
  key: string;
  route: string;
  disabled?: boolean;
  children?: PermissionMenuNode[];
};
type PermissionItem = Omit<PermissionMenuNode, 'children'>;

function microAppMenuNodes(menus: any[], prefix: string): PermissionMenuNode[] {
  return menus.map((menu, index) => ({
    title: menu.title || menu.do || '菜单',
    key: `${prefix}:${menu.do || index}`,
    route: '',
    disabled: true,
    ...(menu.children?.length ? { children: microAppMenuNodes(menu.children, `${prefix}:${menu.do || index}`) } : {}),
  }));
}

export async function loadPermissionMicroAppMenus(namespace: string): Promise<PermissionMenuNode[]> {
  const path = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(namespace)}/microapps`;
  const response = await k8sproxy.get(path, { noAlert: true });
  const apps = (response?.data?.items || []).flatMap((app: any) => {
    const name = app?.metadata?.name;
    if (!name || app?.metadata?.deletionTimestamp) return [];
    const bindings = (app?.spec?.bindings || []).filter((binding: any) => binding.support === 'thirdparty_cd' && binding.menu?.length);
    if (!bindings.length) return [];
    return [{
      title: app.spec?.title || name,
      key: `microapp:${name}`,
      route: '',
      disabled: true,
      children: bindings.map((binding: any, index: number) => ({
        title: binding.title || binding.name || '菜单',
        key: `microapp:${name}:${binding.name || index}`,
        route: '',
        disabled: true,
        children: microAppMenuNodes(binding.menu, `microapp:${name}:${binding.name || index}`),
      })),
    }];
  });
  return apps.length ? [{ title: 'MicroApp 菜单（只读）', key: 'microapp:menus', route: '', disabled: true, children: apps }] : [];
}

function joinRoutePath(parentPath: string, path: string) {
  const route = path.startsWith('/') ? path : `${parentPath.replace(/\/$/, '')}/${path}`;
  return route.replace(/^\/+/, '');
}

export function buildPermissionMenuTree(
  routes: RouteRecordRaw[] = [],
  parentPath = '',
  seenKeys = new Set<string>(),
): PermissionMenuNode[] {
  return routes.flatMap((route) => {
    const path = joinRoutePath(parentPath, route.path);
    const key = route.meta?.key;
    if (!key || seenKeys.has(key)) return buildPermissionMenuTree(route.children || [], path, seenKeys);
    seenKeys.add(key);

    const children = [
      ...((route.meta?.permissionItems || []) as PermissionItem[]).filter((item) => {
        if (seenKeys.has(item.key)) return false;
        seenKeys.add(item.key);
        return true;
      }),
      ...buildPermissionMenuTree(route.children || [], path, seenKeys),
    ];

    const locale = route.meta?.locale;
    const title = typeof locale === 'string'
      ? locale
      : String(locale?.['zh-CN'] || locale?.['en-US'] || key);
    return [{
      title,
      key,
      route: path,
      ...(children.length ? { children } : {}),
    }];
  });
}
