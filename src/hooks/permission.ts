import { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
// import { useUserStore } from '@/store';
import { getPermission } from '@/utils/auth';
import { hasPermission, normalizePermissionPath } from '@/utils/permission-match';

export default function usePermission() {
//   const userStore = useUserStore();
  const permission = getPermission() || [];
  return {
    accessRouter(route: RouteLocationNormalized | RouteRecordRaw, routePath?: string) {
      const metaKey = route.meta?.key as string;
      const path = normalizePermissionPath(routePath || (route as RouteLocationNormalized).fullPath || route.path);
      return (
        !route.meta?.requiresAuth
        || !route.meta?.key
        || hasPermission(permission, path, metaKey)
      );
    },
    findFirstPermissionRoute(_routers: any, role = 'admin') {
      const cloneRouters = [..._routers];
      while (cloneRouters.length) {
        const firstElement = cloneRouters.shift();
        if (
          firstElement?.meta?.roles?.find((el: string[]) => {
            return el.includes('*') || el.includes(role);
          })
        )
          return { name: firstElement.name };
        if (firstElement?.children) {
          cloneRouters.push(...firstElement.children);
        }
      }
      return null;
    },
    // You can add any rules you want
  };
}
