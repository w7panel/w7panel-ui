<script lang="tsx">
  import { defineComponent, ref, h, resolveComponent, computed, watch, onBeforeUnmount } from 'vue';
  import { useRoute, useRouter, RouteRecordRaw } from 'vue-router';
  import type { RouteMeta } from 'vue-router';
  import { useAppStore } from '@/store';
  import { openWindow, regexUrl } from '@/utils';
  import useMenuTree from './use-menu-tree';
  import { getK8sinfo } from '@/utils/auth';

  export default defineComponent({
    emit: ['collapse'],
    setup() {
      const appStore = useAppStore();
      const router = useRouter();
      const route = useRoute();
      const { menuTree } = useMenuTree();
      const iconSlots = new Map<string, () => any>();
      const prefetchedRoutes = new Set<string>();
      let idlePrefetchTimer: number | null = null;

      const collapsed = computed(() => {
        if (appStore.device === 'desktop') return appStore.menuCollapse;
        return false;
      });

      const topMenu = computed(() => appStore.topMenu);
      const openKeys = ref<string[]>([]);
      const selectedKey = ref<string[]>([]);
      const isMicroFrontend = computed(() => {
        const win = window as any;
        return !!(win.__POWERED_BY_WUJIE__ || win.__MICRO_APP_ENVIRONMENT__);
      });
      const showMicroBack = computed(() => isMicroFrontend.value && !topMenu.value);

      const syncSelectedKey = () => {
        selectedKey.value = route.name ? [String(route.name)] : [];
      };

      watch(
        () => route.name,
        () => {
          syncSelectedKey();
        },
        { immediate: true }
      );

      const goBackFromMicro = () => {
        const win = window as any;
        const closeSubaccountPanel = win.$wujie?.props?.closeSubaccountPanel;
        if (typeof closeSubaccountPanel === 'function') {
          closeSubaccountPanel();
          return;
        }
        const microBack = win.microApp?.getData?.()?.goBack;
        if (typeof microBack === 'function') {
          microBack();
          return;
        }
        router.back();
      };

      const goto = (item: RouteRecordRaw) => {
        if (regexUrl.test(item.path)) {
          openWindow(item.path);
          selectedKey.value = [item.name as string];
          return;
        }

        const { hideInMenu, activeMenu } = item.meta as RouteMeta;
        if (route.name === item.name && !hideInMenu && !activeMenu) {
          selectedKey.value = [item.name as string];
          return;
        }

        router.push({
          name: item.name,
        });
      };

      const getRouteKey = (item: RouteRecordRaw) => String(item?.name || item?.path || '');
      const prefetchRoute = (item?: RouteRecordRaw | null) => {
        if (!item || regexUrl.test(item.path)) {
          return;
        }

        const key = getRouteKey(item);
        if (!key || prefetchedRoutes.has(key)) {
          return;
        }

        const component = item.component;
        if (typeof component !== 'function') {
          return;
        }

        prefetchedRoutes.add(key);
        try {
          const loadComponent = component as unknown as () => Promise<unknown>;
          const result = loadComponent();
          if (result && typeof (result as Promise<unknown>).catch === 'function') {
            (result as Promise<unknown>).catch(() => {
              prefetchedRoutes.delete(key);
            });
          }
        } catch {
          prefetchedRoutes.delete(key);
        }
      };

      const setCollapse = (val: boolean) => {
        if (appStore.device === 'desktop') {
          appStore.updateSettings({ menuCollapse: val });
        }
      };

      const flattenMenuGroups = ['system', 'usermanage', 'person'];
      const menuFilter = computed(() => appStore.menuFilter || 'cloudserver');
      const getMenuTitle = (element: RouteRecordRaw) => String(element?.meta?.locale || element?.name || '');
      const getIconSlot = (iconName: string) => {
        if (!iconSlots.has(iconName)) {
          iconSlots.set(iconName, () => h(resolveComponent(iconName)));
        }
        return iconSlots.get(iconName);
      };

      const shouldShowRoute = (element: RouteRecordRaw, isRoot = false) => {
        if (element?.meta?.hideInMenu) {
          return false;
        }

        if (!isRoot) {
          return true;
        }

        const group = element?.meta?.menuGroup;
        if (!group) {
          return menuFilter.value === 'cloudserver';
        }

        return group === menuFilter.value;
      };

      const getFirstPrefetchableRoute = (item?: RouteRecordRaw | null): RouteRecordRaw | null => {
        if (!item || regexUrl.test(item.path)) {
          return null;
        }

        if (!item.children?.length) {
          return item;
        }

        for (const child of item.children as RouteRecordRaw[]) {
          const target = getFirstPrefetchableRoute(child);
          if (target) {
            return target;
          }
        }

        return typeof item.component === 'function' ? item : null;
      };

      const collectMenuLeafRoutes = (routes: RouteRecordRaw[], targets: RouteRecordRaw[] = [], isRoot = false) => {
        routes.forEach((element) => {
          if (!shouldShowRoute(element, isRoot)) {
            return;
          }

          if (isRoot && flattenMenuGroups.includes(String(element.name))) {
            collectMenuLeafRoutes((element.children || []) as RouteRecordRaw[], targets);
            return;
          }

          if (element.children?.length) {
            collectMenuLeafRoutes(element.children as RouteRecordRaw[], targets);
            return;
          }

          targets.push(element);
        });

        return targets;
      };

      const scheduleIdleMenuPrefetch = () => {
        if (idlePrefetchTimer != null) {
          window.clearTimeout(idlePrefetchTimer);
        }

        idlePrefetchTimer = window.setTimeout(() => {
          idlePrefetchTimer = null;
          const requestIdle = (window as any).requestIdleCallback;
          const run = () => {
            collectMenuLeafRoutes(menuTree.value as RouteRecordRaw[], [], true)
              .filter(item => item.name !== route.name)
              .slice(0, 6)
              .forEach(prefetchRoute);
          };

          if (typeof requestIdle === 'function') {
            requestIdle(run, { timeout: 1500 });
          } else {
            run();
          }
        }, 800);
      };

      watch(
        [menuTree, menuFilter],
        () => {
          scheduleIdleMenuPrefetch();
        },
        { immediate: true }
      );

      onBeforeUnmount(() => {
        if (idlePrefetchTimer != null) {
          window.clearTimeout(idlePrefetchTimer);
        }
      });

      const renderSubMenu = () => {
        const travel = (_route: RouteRecordRaw[], nodes: never[] = [], isRoot = false) => {
          if (_route) {
            _route.forEach((element) => {
              if (!shouldShowRoute(element, isRoot)) {
                return;
              }

              if (isRoot && flattenMenuGroups.includes(String(element.name))) {
                if (element.children && element.children.length > 0) {
                  travel(element.children, nodes);
                }
                return;
              }

              const icon = element?.meta?.icon
                ? getIconSlot(String(element.meta.icon))
                : null;

              const node =
                element?.children && element?.children.length !== 0 ? (
                  <a-sub-menu
                    key={element?.name}
                    onMouseenter={() => prefetchRoute(getFirstPrefetchableRoute(element))}
                    v-slots={{
                      icon,
                      title: () => getMenuTitle(element),
                    }}
                  >
                    <span>{travel(element?.children as RouteRecordRaw[])}</span>
                    {element?.meta?.linkIcon ? (
                      <icon-launch style="margin-left:6px;font-size:14px;" />
                    ) : (
                      ''
                    )}
                  </a-sub-menu>
                ) : (
                  <a-menu-item
                    key={element?.name}
                    v-slots={{ icon }}
                    onMouseenter={() => prefetchRoute(element)}
                    onFocus={() => prefetchRoute(element)}
                    onClick={() => goto(element)}
                  >
                    <span>{getMenuTitle(element)}</span>
                    {element?.meta?.linkIcon ? (
                      <icon-launch style="margin-left:6px;font-size:14px;" />
                    ) : (
                      ''
                    )}
                  </a-menu-item>
                );

              nodes.push(node as never);
            });
          }

          return nodes;
        };

        return travel(menuTree.value as RouteRecordRaw[], [], true);
      };

      const ckmname = getK8sinfo()['w7.cc/cvm-name'];
      return () => (
        <div class="menu-panel">
          {showMicroBack.value ? (
            <div class="menu-micro-back" onClick={goBackFromMicro}>
              <icon-arrow-left class="c-blue" />
              <div class="ml-10">
                <div class="b fs-16" style="line-height:18px;">云主机列表</div>
                <div class="mt-8 fs-12 c-66">{ckmname}</div>
              </div>
            </div>
          ) : null}
          <a-menu
            mode={topMenu.value ? 'horizontal' : 'vertical'}
            collapsed={collapsed.value}
            v-model:open-keys={openKeys.value}
            show-collapse-button={appStore.device !== 'mobile'}
            auto-open={false}
            selected-keys={selectedKey.value}
            auto-open-selected={true}
            level-indent={34}
            style="flex:1;min-height:0;width:100%;"
            onCollapse={setCollapse}
          >
            {renderSubMenu()}
          </a-menu>
        </div>
      );
    },
  });
</script>

<style lang="less" scoped>
  .menu-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  .menu-micro-back {
    display: flex;
    padding: 10px 16px;
    color: var(--color-text-1);
    cursor: pointer;
    border-bottom: 1px solid var(--color-border-2);
  }
  .menu-micro-back:hover {
    background: var(--color-fill-2);
  }
  .menu-micro-back :deep(.arco-icon) {
    font-size: 18px;
  }
  :deep(.arco-menu-inner) {
    .arco-menu-inline-header {
      display: flex;
      align-items: center;
    }
    .arco-icon {
      &:not(.arco-icon-down) {
        font-size: 18px;
      }
    }
  }
</style>
