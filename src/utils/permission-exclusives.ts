import axios from 'axios';
import { keyToPermissionPath, normalizePermissionPath } from './permission-match';

export interface ExclusiveRule {
  menuRule: string;
  menuKeys?: string[];
  clusterTypes: Array<'main' | 'child'>;
  apiRules?: Array<{ path: string; method: string[] }>;
}

export interface ExclusivePolicy {
  rules: ExclusiveRule[];
  clusterType: 'main' | 'child';
  domainWhiteList?: Array<{ prefix?: string; domain: string; prefixRandom?: boolean; disabled?: boolean }>;
}

export async function loadExclusivePolicy(): Promise<ExclusivePolicy> {
  const response = await axios.get('/panel-api/v1/auth/permission-exclusives', { timeout: 10000 });
  const body = response.data;
  const policy = body?.code === 200 ? body.data : body;
  if ((body?.code && body.code !== 200) || !Array.isArray(policy?.rules)
    || !['main', 'child'].includes(policy?.clusterType)
    || (policy.clusterType === 'child' && !Array.isArray(policy.domainWhiteList))) throw new Error('专属菜单策略加载失败');
  return policy;
}

export function allowsExclusiveMenu(rules: ExclusiveRule[], clusterType: string, menu: string, key = '') {
  const path = normalizePermissionPath(keyToPermissionPath(menu));
  const legacy = normalizePermissionPath(key);
  return rules.every(rule => {
    const restricted = path === normalizePermissionPath(rule.menuRule)
      || (rule.menuKeys || []).includes(legacy)
      || path === '*'
      || (path.endsWith('/*') && normalizePermissionPath(rule.menuRule).startsWith(`${path.slice(0, -2)}/`));
    return !restricted || rule.clusterTypes.includes(clusterType as 'main' | 'child');
  });
}

function apiPatternsOverlap(a: string, b: string) {
  const seen = new Set<string>();
  const visit = (i: number, j: number): boolean => {
    const state = `${i}:${j}`;
    if (seen.has(state)) return false;
    seen.add(state);
    if (i === a.length && j === b.length) return true;
    if (a[i] === '*' && visit(i + 1, j)) return true;
    if (b[j] === '*' && visit(i, j + 1)) return true;
    if (i === a.length || j === b.length) return false;
    if (a[i] === '*') return visit(i, j + 1);
    if (b[j] === '*') return visit(i + 1, j);
    return a[i] === b[j] && visit(i + 1, j + 1);
  };
  return visit(0, 0);
}

export function allowsExclusiveGrant(rules: ExclusiveRule[], clusterType: string, menus: string[], api: Record<string, string[]>) {
  if (menus.some(menu => !allowsExclusiveMenu(rules, clusterType, menu, menu))) return false;
  return rules.every(rule => rule.clusterTypes.includes(clusterType as 'main' | 'child') || !(rule.apiRules || []).some(target =>
    target.method.some(method => Object.entries(api).some(([path, verbs]) =>
      apiPatternsOverlap(path, target.path) && (verbs.includes('*') || (method === 'get' || method === 'list'
        ? verbs.includes('get') || verbs.includes('list') : verbs.includes(method)))))));
}
