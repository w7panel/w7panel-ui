export const BOTTOM_MENU_LOCATION = 'back';

export interface MicroAppMenu {
  location?: string;
  [key: string]: unknown;
}

export interface MicroAppMenuRole<T extends MicroAppMenu = MicroAppMenu> {
  menus?: T[];
  [key: string]: unknown;
}

export const splitMicroAppMenuRoles = <
  T extends MicroAppMenu,
  R extends MicroAppMenuRole<T>
>(roles: R[] = []) => {
  const topRoles: Array<R & { menus: T[] }> = [];
  const bottomMenus: T[] = [];

  roles.forEach((role) => {
    const topMenus: T[] = [];

    (role.menus || []).forEach((menu) => {
      if (menu.location === BOTTOM_MENU_LOCATION) {
        bottomMenus.push(menu);
        return;
      }
      topMenus.push(menu);
    });

    if (topMenus.length) {
      topRoles.push({ ...role, menus: topMenus });
    }
  });

  return { topRoles, bottomMenus };
};
