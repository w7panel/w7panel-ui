import axios from 'axios';
import { keyToPermissionPath, normalizePermissionPath } from './permission-match';

export interface ExclusiveRule {
  menuRule: string;
  menuKeys?: string[];
  exclusiveGroups: string[];
  apiRules?: Array<{ path: string; method: string[] }>;
}

export async function loadExclusivePolicy(): Promise<{ rules: ExclusiveRule[]; group: string }> {
  const response = await axios.get('/panel-api/v1/auth/permission-exclusives', { timeout: 10000 });
  const body = response.data;
  const policy = body?.code === 200 ? body.data : body;
  if ((body?.code && body.code !== 200) || !Array.isArray(policy?.rules)) throw new Error('专属菜单策略加载失败');
  return { rules: policy.rules, group: String(policy.group || '') };
}

export async function loadExclusiveRules(): Promise<ExclusiveRule[]> {
  return (await loadExclusivePolicy()).rules;
}

export function allowsExclusiveMenu(rules: ExclusiveRule[], group: string, menu: string, key = '') {
  const path = normalizePermissionPath(keyToPermissionPath(menu));
  const legacy = normalizePermissionPath(key);
  return rules.every(rule => {
    const restricted = path === normalizePermissionPath(rule.menuRule)
      || (rule.menuKeys || []).includes(legacy)
      || path === '*'
      || (path.endsWith('/*') && normalizePermissionPath(rule.menuRule).startsWith(`${path.slice(0, -2)}/`));
    return !restricted || rule.exclusiveGroups.includes(group);
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

export function allowsExclusiveGrant(rules: ExclusiveRule[], group: string, menus: string[], api: Record<string, string[]>) {
  if (menus.some(menu => !allowsExclusiveMenu(rules, group, menu, menu))) return false;
  return rules.every(rule => rule.exclusiveGroups.includes(group) || !(rule.apiRules || []).some(target =>
    target.method.some(method => Object.entries(api).some(([path, verbs]) =>
      apiPatternsOverlap(path, target.path) && (verbs.includes('*') || (method === 'get' || method === 'list'
        ? verbs.includes('get') || verbs.includes('list') : verbs.includes(method)))))));
}
