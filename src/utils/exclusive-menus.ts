import { ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { panelApi } from '@/utils/api';

export type ExclusiveMenuRule = { menuRule: string; clusterTypes: Array<'main' | 'child'> };
export type ExclusiveMenus = { rules: ExclusiveMenuRule[]; resourceVersion: string };

export const exclusiveMenus = ref<ExclusiveMenus | null>(null);

export type ExclusiveMenuRow = { title: string; route: string; depth: number; fixedClusterType?: 'main' | 'child' };

export function buildExclusiveMenuRows(routes: RouteRecordRaw[]): ExclusiveMenuRow[] {
  const rows: ExclusiveMenuRow[] = [];
  const visit = (items: RouteRecordRaw[], parentPath = '', depth = 0, inheritedClusterType?: 'main' | 'child') => {
    items.forEach(route => {
      if (route.meta?.hideInMenu) return;
      const path = route.path.startsWith('/') ? route.path : `${parentPath.replace(/\/$/, '')}/${route.path}`;
      const locale = route.meta?.locale;
      const title = typeof locale === 'string' ? locale : String(locale?.['zh-CN'] || locale?.['en-US'] || route.name || '');
      const fixedClusterType = inheritedClusterType || (route.meta?.clusterTypes?.length === 1
        ? route.meta.clusterTypes[0] as 'main' | 'child' : undefined);
      if (title) rows.push({ title, route: path.replace(/^\/+/, ''), depth, fixedClusterType });
      (route.meta?.permissionItems || []).forEach(item => rows.push({
        title: item.title, route: item.route, depth: depth + 1, fixedClusterType,
      }));
      if (!route.meta?.hideChildrenInMenu) visit(route.children || [], path, depth + 1, fixedClusterType);
    });
  };
  visit(routes);
  return rows;
}

export async function loadExclusiveMenus(): Promise<ExclusiveMenus> {
  try {
    const response = await panelApi.get('/auth/exclusive-menus', { noAlert: true });
    const policy = response?.data?.data || response?.data;
    if (!Array.isArray(policy?.rules)) throw new Error('专属菜单数据无效');
    exclusiveMenus.value = policy;
    return policy;
  } catch (error) {
    exclusiveMenus.value = null;
    throw error;
  }
}

export function allowsExclusiveMenu(policy: ExclusiveMenus, clusterType: 'main' | 'child', path: string): boolean {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  return policy.rules.every(rule =>
    !(normalized === rule.menuRule || normalized.startsWith(`${rule.menuRule}/`))
    || rule.clusterTypes.includes(clusterType));
}
