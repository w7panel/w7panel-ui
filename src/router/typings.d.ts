import 'vue-router';

declare module 'vue-router' {
  type MenuGroup = 'cloudserver' | 'system' | 'usermanage' | 'person' | 'topapp';

  interface RouteMeta {
    roles?: string[]; // Controls roles that have access to the page
    requiresAuth: boolean; // Whether login is required to access the current page (every route must declare)
    icon?: string; // The icon show in the side menu
    locale?: string | Record<string, any>; // The locale name show in side menu and breadcrumb
    hideInMenu?: boolean; // If true, it is not displayed in the side menu
    hideChildrenInMenu?: boolean; // if set true, the children are not displayed in the side menu
    activeMenu?: string; // if set name, the menu will be highlighted according to the name you set
    order?: number; // Sort routing menu items. If set key, the higher the value, the more forward it is
    noAffix?: boolean; // if set true, the tag will not affix in the tab-bar
    ignoreCache?: boolean; // if set true, the page will not be cached
    key?: string; // Permission key used by the project menu/button filtering
    linkIcon?: boolean; // Whether to show the launch-style icon in the menu
    routekey?: string; // Internal tab/menu key used by some detail pages
    menuGroup?: MenuGroup; // Top-level menu grouping used by navbar and side menu filtering
  }
}
