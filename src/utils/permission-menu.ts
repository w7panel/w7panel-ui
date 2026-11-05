import type { RouteRecordRaw } from 'vue-router';
import { allowsClusterRoute } from '@/utils/cluster-access';

type PermissionMenuNode = {
  title: string;
  key: string;
  route: string;
  disabled?: boolean;
  clusterTypes?: string[];
  children?: PermissionMenuNode[];
};
type PermissionItem = Omit<PermissionMenuNode, 'children'>;

function joinRoutePath(parentPath: string, path: string) {
  const route = path.startsWith('/') ? path : `${parentPath.replace(/\/$/, '')}/${path}`;
  return route.replace(/^\/+/, '');
}

export function buildPermissionMenuTree(
  routes: RouteRecordRaw[] = [],
  isSubCluster: boolean | null | undefined = undefined,
  parentPath = '',
  seenKeys = new Set<string>(),
): PermissionMenuNode[] {
  return routes.flatMap((route) => {
    if (isSubCluster !== undefined && !allowsClusterRoute(route.meta, isSubCluster)) return [];
    const path = joinRoutePath(parentPath, route.path);
    const key = route.meta?.key;
    if (!key || seenKeys.has(key)) return buildPermissionMenuTree(route.children || [], isSubCluster, path, seenKeys);
    seenKeys.add(key);

    const children = [
      ...((route.meta?.permissionItems || []) as PermissionItem[]).filter((item) => {
        if (seenKeys.has(item.key)) return false;
        seenKeys.add(item.key);
        return true;
      }),
      ...buildPermissionMenuTree(route.children || [], isSubCluster, path, seenKeys),
    ];

    const locale = route.meta?.locale;
    const title = typeof locale === 'string'
      ? locale
      : String(locale?.['zh-CN'] || locale?.['en-US'] || key);
    return [{
      title,
      key,
      route: path,
      ...(route.meta?.clusterTypes ? { clusterTypes: route.meta.clusterTypes } : {}),
      ...(children.length ? { children } : {}),
    }];
  });
}
