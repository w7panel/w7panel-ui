export const BOTTOM_MENU_LOCATION = 'back';
export const MICRO_APP_ORDER_LABEL = 'w7.cc/order';

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
