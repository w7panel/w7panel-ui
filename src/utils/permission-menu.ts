import type { RouteRecordRaw } from 'vue-router';

type PermissionMenuNode = {
  title: string;
  key: string;
  route: string;
  exclusiveGroups?: string[];
  children?: PermissionMenuNode[];
};
type PermissionItem = Omit<PermissionMenuNode, 'children'>;

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
    if (route.meta?.hideInMenu === true) return [];
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
    const exclusiveGroups = route.meta?.exclusiveGroups;
    return [{
      title,
      key,
      route: path,
      ...(Array.isArray(exclusiveGroups) && exclusiveGroups.length ? { exclusiveGroups } : {}),
      ...(children.length ? { children } : {}),
    }];
  });
}
