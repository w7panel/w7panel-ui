import { computed, onMounted, ref } from 'vue';
import { panelApi } from '@/utils/api';
import { RouteRecordRaw, RouteRecordNormalized } from 'vue-router';
import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import appClientMenus from '@/router/app-menus';
import { cloneDeep } from 'lodash';
import { allowsExclusiveMenu, loadExclusivePolicy, type ExclusivePolicy } from '@/utils/permission-exclusives';

export default function useMenuTree() {
  const permission = usePermission();

  const appStore = useAppStore();
  const isSubCluster = ref<boolean | null>(null);
  const exclusivePolicy = ref<ExclusivePolicy | null>(null);
  onMounted(() => {
    panelApi.get('/microapp/global-frontprops', { noAlert: true }).then((res) => {
      isSubCluster.value = res.data?.is_sub_cluster === true;
    }).catch(() => {});
    loadExclusivePolicy().then(policy => { exclusivePolicy.value = policy; }).catch(() => { exclusivePolicy.value = null; });
  });
  const appRoute = computed(() => {
    if (appStore.menuFromServer) {
      return appStore.appAsyncMenus;
    }
    return appClientMenus;
  });
  const menuTree = computed(() => {
    const copyRouter = cloneDeep(appRoute.value) as RouteRecordNormalized[];
    copyRouter.sort((a: RouteRecordNormalized, b: RouteRecordNormalized) => {
      return (a.meta.order || 0) - (b.meta.order || 0);
    });
    function joinRoutePath(parentPath: string, path: string) {
      if (!parentPath) return path;
      if (path.startsWith('/')) return path;
      return `${parentPath.replace(/\/$/, '')}/${path}`;
    }

    function travel(_routes: RouteRecordRaw[], layer: number, parentPath = '') {
      if (!_routes) return null;

      const collector: any = _routes.map((element) => {
        if (element.name === 'app-lightweight-vms' && isSubCluster.value !== false) return null;
        const currentPath = joinRoutePath(parentPath, element.path);
        if (!exclusivePolicy.value || !allowsExclusiveMenu(exclusivePolicy.value.rules, exclusivePolicy.value.clusterType, currentPath, String(element.meta?.key || ''))) return null;
        // no access
        if (!permission.accessRouter(element, currentPath)) {
          return null;
        }

        // leaf node
        if (element.meta?.hideChildrenInMenu || !element.children) {
          element.children = [];
          return element;
        }

        // route filter hideInMenu true
        element.children = element.children.filter(
          (x) => x.meta?.hideInMenu !== true
        );

        // Associated child node
        const subItem = travel(element.children, layer + 1, currentPath);

        if (subItem.length) {
          element.children = subItem;
          return element;
        }
        // the else logic
        if (layer > 1) {
          element.children = subItem;
          return element;
        }

        if (element.meta?.hideInMenu === false) {
          return element;
        }

        return null;
      });
      return collector.filter(Boolean);
    }
    return travel(copyRouter, 0);
  });

  return {
    menuTree,
  };
}
