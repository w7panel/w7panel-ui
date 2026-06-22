import { computed } from 'vue';
import { RouteRecordRaw } from 'vue-router';
import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import appClientMenus from '@/router/app-menus';

export default function useMenuTree() {
  const permission = usePermission();

  const appStore = useAppStore();
  const appRoute = computed(() => {
    if (appStore.menuFromServer) {
      return appStore.appAsyncMenus;
    }
    return appClientMenus;
  });
  const menuTree = computed(() => {
    const sortedRoutes = [...(appRoute.value as RouteRecordRaw[])].sort((a, b) => {
      return (a.meta?.order || 0) - (b.meta?.order || 0);
    });
    function travel(_routes: RouteRecordRaw[] = [], layer: number): RouteRecordRaw[] {
      const collector = _routes.map((element) => {
        // no access
        if (!permission.accessRouter(element)) {
          return null;
        }

        // leaf node
        if (element.meta?.hideChildrenInMenu || !element.children) {
          return {
            ...element,
            children: [],
          };
        }

        // route filter hideInMenu true
        const visibleChildren = element.children.filter(
          (x) => x.meta?.hideInMenu !== true
        );

        // Associated child node
        const subItem = travel(visibleChildren as RouteRecordRaw[], layer + 1);

        if (subItem.length) {
          return {
            ...element,
            children: subItem,
          };
        }
        // the else logic
        if (layer > 1) {
          return {
            ...element,
            children: subItem,
          };
        }

        if (element.meta?.hideInMenu === false) {
          return {
            ...element,
            children: subItem,
          };
        }

        return null;
      });
      return collector.filter(Boolean);
    }
    return travel(sortedRoutes, 0);
  });

  return {
    menuTree,
  };
}
