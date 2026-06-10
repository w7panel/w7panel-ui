const KEY_TO_ROUTE: Record<string, string> = {
  cluster: 'cluster',
  'cluster-panel': 'cluster/panel',
  'cluster-nodes': 'cluster/nodes',
  'cluster-nodes-image-list': 'cluster/nodes-image-list',
  dns: 'cluster/dns',
  'cluster-resource': 'cluster/resource',
  app: 'app',
  'app-apps': 'app/apps',
  'app-config-center': 'app/config-center',
  'app-cronjob': 'app/cronjob',
  'app-rvproxy': 'app/rvproxy',
  'app-dblist': 'app/database',
  'app-gpustack': 'app/gpustack',
  storage: 'storage',
  'storage-node': 'storage/disk',
  'storage-zone': 'storage/zone',
  zpk: 'zpk',
  sitemanage: 'sitemanage',
  system: 'system',
  'system-cloud': 'system/cloud',
  'system-license': 'system/license',
  'system-audit': 'system/audit',
  'system-manage': 'usermanage',
  'system-user': 'usermanage/users',
  'system-permission': 'usermanage/permission',
  'system-white-domain': 'usermanage/usermanage-whitedomain',
  'system-system': 'usermanage/usermanage-system',
};

const ROUTE_TO_KEY = Object.entries(KEY_TO_ROUTE).reduce((acc, [key, route]) => {
  acc[route] = key;
  return acc;
}, {} as Record<string, string>);

export function normalizePermissionPath(path?: string) {
  return String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
}

export function keyToPermissionPath(key: string) {
  return KEY_TO_ROUTE[key] || key;
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
        knownEntries.forEach(([actionKey]) => {
          if (actionKey.startsWith(`${key}-`)) {
            expanded.add(actionKey);
          }
        });
      }
    });
  });

  return Array.from(expanded);
}

export function hasPermission(values: string[] = [], path?: string, legacyKey?: string) {
  const permissions = expandPermissionValues(values);
  if (!permissions?.length) return false;
  if (permissions.includes('*')) return true;
  const normalized = normalizePermissionPath(path || keyToPermissionPath(legacyKey || ''));
  const candidates = new Set([normalized]);
  if (legacyKey) {
    candidates.add(legacyKey);
    candidates.add(keyToPermissionPath(legacyKey));
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
