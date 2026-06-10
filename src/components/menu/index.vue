<script lang="tsx">
  import { defineComponent, ref, h, compile, computed, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter, RouteRecordRaw } from 'vue-router';
  import type { RouteMeta } from 'vue-router';
  import { useAppStore } from '@/store';
  import { openWindow, regexUrl } from '@/utils';
  import useMenuTree from './use-menu-tree';
  import { getK8sinfo } from '@/utils/auth';

  export default defineComponent({
    emit: ['collapse'],
    setup() {
      const { t } = useI18n();
      const appStore = useAppStore();
      const router = useRouter();
      const route = useRoute();
      const { menuTree } = useMenuTree();

      const collapsed = computed({
        get() {
          if (appStore.device === 'desktop') return appStore.menuCollapse;
          return false;
        },
        set(value: boolean) {
          appStore.updateSettings({ menuCollapse: value });
        },
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

      const setCollapse = (val: boolean) => {
        if (appStore.device === 'desktop') {
          appStore.updateSettings({ menuCollapse: val });
        }
      };

      const renderSubMenu = () => {
        const menuFilter = appStore.menuFilter || 'cloudserver';
        const flattenMenuGroups = ['system', 'usermanage', 'person'];

        const shouldShowRoute = (element: RouteRecordRaw, isRoot = false) => {
          if (element?.meta?.hideInMenu) {
            return false;
          }

          if (!isRoot) {
            return true;
          }

          const group = element?.meta?.menuGroup;
          if (!group) {
            return menuFilter === 'cloudserver';
          }

          return group === menuFilter;
        };

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
                ? () => h(compile(`<${element?.meta?.icon}/>`))
                : null;

              const node =
                element?.children && element?.children.length !== 0 ? (
                  <a-sub-menu
                    key={element?.name}
                    v-slots={{
                      icon,
                      title: () => h(compile(t(element?.meta?.locale || element?.name))),
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
                    onClick={() => goto(element)}
                  >
                    <span>{t(element?.meta?.locale || element?.name)}</span>
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
            v-model:collapsed={collapsed.value}
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
