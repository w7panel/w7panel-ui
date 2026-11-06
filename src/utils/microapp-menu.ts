export const BOTTOM_MENU_LOCATION = 'back';
export const MICRO_APP_ORDER_LABEL = 'w7.cc/order';

export const isAppMenuDo = (value: unknown): value is string => (
  typeof value === 'string' && /^app:/i.test(value)
);

export function getMicroAppRouteFromQuery(query: Record<string, unknown> = {}) {
  const queryDo = Array.isArray(query.do) ? query.do[0] : query.do;
  // Only borrowed references override the legacy parameter priority.
  const value = isAppMenuDo(queryDo)
    ? queryDo
    : query['app-detail-micro'] || query.do || query.appmicro;
  return Array.isArray(value) ? value[0] : value;
}

// Keep the complete reference in `do`; only resolve it at the runtime boundary.
export function parseAppMenuDo(value: string) {
  if (!isAppMenuDo(value)) return null;
  const match = /^app:([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)#(\/[^\r\n]*)$/i.exec(value);
  if (!match) throw new Error('借用菜单地址格式错误，请使用 app:应用标识#/路由');
  return { appRef: match[1], route: `#${match[2]}` };
}

// Query parameters do not change menu ownership. Require a path boundary so
// /versions-old cannot be mistaken for a child of /versions.
export function getMenuRouteMatchScore(entry: string, route: string) {
  if (entry === route) return Number.MAX_SAFE_INTEGER;
  const entryPath = String(entry || '').split('?')[0].replace(/\/$/, '');
  const routePath = String(route || '').split('?')[0].replace(/\/$/, '');
  if (!entryPath || !routePath) return -1;
  return routePath === entryPath || routePath.startsWith(`${entryPath}/`)
    ? entryPath.length
    : -1;
}

export function getAppMenuMatchScore(entry: string, value: string) {
  try {
    const target = parseAppMenuDo(value);
    const source = parseAppMenuDo(entry);
    if (!target || !source || source.appRef !== target.appRef) return -1;
    return getMenuRouteMatchScore(source.route, target.route);
  } catch {
    return -1;
  }
}

export function resolveAppMenuBinding(microApp: any, role: string, preferred = '') {
  const normalizeRole = (value: string) => value === 'found' ? 'founder' : value;
  const userRole = normalizeRole(role);
  // Roles select runtime configuration only; borrowed routes need no menu declaration.
  const candidates: string[] = [...new Set<string>([
    ...(microApp?.spec?.bindings || [])
      .filter((binding: any) => binding.support === 'thirdparty_cd')
      .map((binding: any) => binding.name),
    ...Object.keys(microApp?.spec?.['config-v2']?.props?.roleConfig || {}),
  ])].filter(name => typeof name === 'string' && Boolean(name));
  const findBinding = (name: string) => candidates.find(candidate => candidate === name)
    || candidates.find(candidate => normalizeRole(candidate) === normalizeRole(name));
  return findBinding(preferred) || findBinding(userRole) || findBinding('founder')
    || candidates[0] || userRole || 'founder';
}

export const getMicroAppOrder = (microApp: any) => {
  const value = microApp?.metadata?.labels?.[MICRO_APP_ORDER_LABEL];
  if (value === undefined || value === null || String(value).trim() === '') {
    return Number.MAX_SAFE_INTEGER;
  }
  const order = Number(value);
  return Number.isSafeInteger(order) && order >= 0 ? order : Number.MAX_SAFE_INTEGER;
};

export const sortMicroAppsByOrder = <T>(microApps: T[] = []) => microApps
  .map((microApp, index) => ({ microApp, index, order: getMicroAppOrder(microApp) }))
  .sort((a, b) => a.order - b.order || a.index - b.index)
  .map(({ microApp }) => microApp);

export interface MicroAppMenu {
  location?: string;
  microAppName?: string;
  microAppTitle?: string;
  [key: string]: unknown;
}

export interface MicroAppMenuRole<T extends MicroAppMenu = MicroAppMenu> {
  key?: string;
  name?: string;
  title?: string;
  microAppName?: string;
  microAppTitle?: string;
  menus?: T[];
  [key: string]: unknown;
}

export interface MicroAppMenuGroup<T extends MicroAppMenu = MicroAppMenu> {
  key: string;
  name: string;
  title: string;
  menus: T[];
}

export type GroupedMicroAppMenuRole<
  T extends MicroAppMenu = MicroAppMenu,
  R extends MicroAppMenuRole<T> = MicroAppMenuRole<T>
> = R & {
  menus: T[];
  microApps: MicroAppMenuGroup<T>[];
  isMultiMicroApp: boolean;
};

const getRoleKey = <T extends MicroAppMenu>(
  role: MicroAppMenuRole<T>,
  roleIndex: number
) => role.name || role.title || role.key || `role-${roleIndex}`;

const groupRolesByMicroApp = <
  T extends MicroAppMenu,
  R extends MicroAppMenuRole<T>
>(
  roles: Array<R & { menus: T[] }>,
  section: 'top' | 'bottom',
  roleMicroAppNames: Map<string, Set<string>>
) => {
  const roleMap = new Map<string, GroupedMicroAppMenuRole<T, R>>();

  roles.forEach((role, roleIndex) => {
    const roleKey = getRoleKey(role, roleIndex);
    let groupedRole = roleMap.get(roleKey);
    if (!groupedRole) {
      groupedRole = {
        ...role,
        key: `role:${section}:${roleKey}`,
        menus: [],
        microApps: [],
        isMultiMicroApp: (roleMicroAppNames.get(roleKey)?.size || 0) > 1,
      };
      roleMap.set(roleKey, groupedRole);
    }

    groupedRole.menus.push(...role.menus);
    const microAppName = role.microAppName
      || role.menus.find((menu) => menu.microAppName)?.microAppName
      || `microapp-${roleIndex}`;
    let microApp = groupedRole.microApps.find((item) => item.name === microAppName);
    if (!microApp) {
      const microAppTitle = role.microAppTitle
        || role.menus.find((menu) => menu.microAppTitle)?.microAppTitle
        || microAppName;
      microApp = {
        key: `microapp:${section}:${roleKey}:${microAppName}`,
        name: microAppName,
        title: microAppTitle,
        menus: [],
      };
      groupedRole.microApps.push(microApp);
    }
    microApp.menus.push(...role.menus);
  });

  return [...roleMap.values()];
};

export const splitMicroAppMenuRoles = <
  T extends MicroAppMenu,
  R extends MicroAppMenuRole<T>
>(roles: R[] = []) => {
  const topRoleItems: Array<R & { menus: T[] }> = [];
  const bottomRoleItems: Array<R & { menus: T[] }> = [];
  const bottomMenus: T[] = [];
  const roleMicroAppNames = new Map<string, Set<string>>();

  roles.forEach((role, roleIndex) => {
    const topMenus: T[] = [];
    const roleBottomMenus: T[] = [];
    const roleKey = getRoleKey(role, roleIndex);
    const roleMicroApps = roleMicroAppNames.get(roleKey) || new Set<string>();
    roleMicroAppNames.set(roleKey, roleMicroApps);
    if (role.microAppName) roleMicroApps.add(role.microAppName);

    (role.menus || []).forEach((menu) => {
      if (menu.microAppName) roleMicroApps.add(menu.microAppName);
      if (menu.location === BOTTOM_MENU_LOCATION) {
        bottomMenus.push(menu);
        roleBottomMenus.push(menu);
        return;
      }
      topMenus.push(menu);
    });

    if (topMenus.length) {
      topRoleItems.push({ ...role, menus: topMenus });
    }
    if (roleBottomMenus.length) {
      bottomRoleItems.push({ ...role, menus: roleBottomMenus });
    }
  });

  const topRoles = groupRolesByMicroApp(topRoleItems, 'top', roleMicroAppNames);
  const bottomRoles = groupRolesByMicroApp(bottomRoleItems, 'bottom', roleMicroAppNames);

  return {
    isMultiMicroApp: [...roleMicroAppNames.values()].some((names) => names.size > 1),
    hasGroupedBottomRoles: bottomRoles.some((role) => role.isMultiMicroApp),
    topRoles,
    bottomRoles,
    bottomMenus,
  };
};
