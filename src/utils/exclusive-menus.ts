import { ref } from 'vue';
import { panelApi } from '@/utils/api';

export type ExclusiveMenuRule = { menuRule: string; clusterTypes: Array<'main' | 'child'> };
export type ExclusiveMenus = { rules: ExclusiveMenuRule[]; resourceVersion: string };

export const exclusiveMenus = ref<ExclusiveMenus | null>(null);

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
