import treeData from '@/config/treedata.json';

type MenuNode = {
  key?: string;
  route?: string;
  children?: MenuNode[];
};

const LEGACY_ROUTE_OVERRIDES: Record<string, string> = {
  'cluster-nodes-gpu': 'cluster/nodes/gpu',
  'cluster-nodes-memory': 'cluster/nodes/memory',
  'system-whitelist': 'usermanage/usermanage-whitedomain',
  'system-usergroup': 'usermanage/usergroup',
  'system-quota': 'usermanage/quota',
  'person-order-center': 'person/order-center',
  'person-cost-center': 'person/cost-center',
};

const KEY_TO_ROUTE: Record<string, string> = {};
const ROUTE_TO_KEY: Record<string, string> = {};

function addMapping(key?: string, route?: string) {
  const normalizedKey = normalizePermissionPath(key);
  const normalizedRoute = normalizePermissionPath(route);
  if (!normalizedKey || !normalizedRoute) return;
  KEY_TO_ROUTE[normalizedKey] = normalizedRoute;
  if (!ROUTE_TO_KEY[normalizedRoute]) {
    ROUTE_TO_KEY[normalizedRoute] = normalizedKey;
  }
}

function collectMenuRoutes(nodes: MenuNode[] = []) {
  nodes.forEach((node) => {
    addMapping(node.key, node.route);
    if (node.children?.length) collectMenuRoutes(node.children);
  });
}

collectMenuRoutes(treeData as MenuNode[]);
Object.entries(LEGACY_ROUTE_OVERRIDES).forEach(([key, route]) => addMapping(key, route));

export function normalizePermissionPath(path?: string) {
  return String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
}

export function keyToPermissionPath(key: string) {
  const normalized = normalizePermissionPath(key);
  return KEY_TO_ROUTE[normalized] || normalized;
}

export function permissionPathToKey(path: string) {
  const normalized = normalizePermissionPath(path);
  return ROUTE_TO_KEY[normalized] || normalized;
}

export function toPermissionPaths(values: string[] = []) {
  return Array.from(new Set(values.map((item) => keyToPermissionPath(item))));
}

export function toTreeKeys(values: string[] = []) {
  return Array.from(new Set(values.map((item) => permissionPathToKey(item))));
}

export function expandPermissionValues(values: string[] = []) {
  const expanded = new Set<string>();
  const knownEntries = Object.entries(KEY_TO_ROUTE);

  values.forEach((value) => {
    const normalized = normalizePermissionPath(value);
    const routePath = normalizePermissionPath(keyToPermissionPath(normalized));
    const legacyKey = permissionPathToKey(routePath);

    if (!normalized) return;
    expanded.add(normalized);
    expanded.add(routePath);
    expanded.add(legacyKey);

    if (normalized === '*' || routePath === '*') {
      expanded.add('*');
      return;
    }

    const wildcardBase = routePath.endsWith('/*') ? routePath.slice(0, -2) : '';
    if (!wildcardBase) return;

    knownEntries.forEach(([key, route]) => {
      const currentRoute = normalizePermissionPath(route);
      if (currentRoute === wildcardBase || currentRoute.startsWith(`${wildcardBase}/`)) {
        expanded.add(key);
        expanded.add(currentRoute);
      }
    });
  });

  return Array.from(expanded);
}

export function hasPermission(values: string[] = [], path?: string, legacyKey?: string) {
  const permissions = expandPermissionValues(values);
  if (!permissions?.length) return false;
  if (permissions.includes('*')) return true;
  const normalizedPath = normalizePermissionPath(path);
  const normalizedLegacyKey = normalizePermissionPath(legacyKey);
  const candidates = new Set([
    normalizedPath,
    keyToPermissionPath(normalizedPath),
  ]);
  if (normalizedLegacyKey) {
    candidates.add(normalizedLegacyKey);
    candidates.add(keyToPermissionPath(normalizedLegacyKey));
  }
  return permissions.some((permission) => {
    const current = normalizePermissionPath(permission);
    if (current === '*') return true;
    if (candidates.has(current)) return true;
    if (current.endsWith('/*')) {
      const prefix = current.slice(0, -2);
      return Array.from(candidates).some((candidate) => candidate === prefix || candidate.startsWith(`${prefix}/`));
    }
    return false;
  });
}
