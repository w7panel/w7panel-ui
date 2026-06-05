<script lang="tsx">
  import { defineComponent, ref,onMounted, h, compile, computed, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter, RouteRecordRaw } from 'vue-router';
  import type { RouteMeta } from 'vue-router';
  import { useAppStore } from '@/store';
  import { openWindow, regexUrl } from '@/utils';
  import useMenuTree from './use-menu-tree';

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
        // Open external link
        if (regexUrl.test(item.path)) {
          openWindow(item.path);
          selectedKey.value = [item.name as string];
          return;
        }
        // Eliminate external link side effects
        const { hideInMenu, activeMenu } = item.meta as RouteMeta;
        if (route.name === item.name && !hideInMenu && !activeMenu) {
          selectedKey.value = [item.name as string];
          return;
        }
        // Trigger router change
        router.push({
          name: item.name,
        });
      };
      const setCollapse = (val: boolean) => {
        if (appStore.device === 'desktop')
          appStore.updateSettings({ menuCollapse: val });
      };

      const renderSubMenu = () => {
        // 获取当前菜单筛选条件
        const menuFilter = appStore.menuFilter || 'cloudserver';
        
        function travel(_route: RouteRecordRaw[], nodes = []) {
          if (_route) {
            _route.filter(i=>!i?.meta.hideInMenu).forEach((element) => {
////////////////////////////////////////
              // 新增：根据menuFilter筛选菜单
              const shouldExclude = (() => {
                if (!element.name) return false;
                if (menuFilter === 'cloudserver') {
                  return ['system','usermanage','person'].includes(element.name as string);
                }
                if (menuFilter === 'usermanage') {
                  return ['cluster', 'app', 'zpk', 'sitemanage', 'storage','system','person'].includes(element.name as string);
                }
                if (menuFilter === 'system') {
                  return ['cluster', 'app', 'zpk', 'sitemanage', 'storage','usermanage','person'].includes(element.name as string);
                }
                if (menuFilter === 'person') {
                  return ['cluster', 'app', 'zpk', 'sitemanage', 'storage','system','usermanage'].includes(element.name as string);
                }
                // 其他情况不排除
                return false;
              })();
              
              // 如果需要排除则跳过当前菜单
              if (shouldExclude) return;
              if(element.name=='system'||element.name=='usermanage'||element.name=='person'){
                if (element.children && element.children.length > 0) {
                  travel(element.children, nodes);
                }
                return;
              }
////////////////////////////////////////
              // This is demo, modify nodes as needed
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
                    <span>{travel(element?.children)}</span>
                    {element?.meta?.linkIcon? <icon-launch style="margin-left:6px;font-size:14px;" /> : ''}
                  </a-sub-menu>
                ) : (
                  <a-menu-item
                    key={element?.name}
                    v-slots={{ icon }}
                    onClick={() => goto(element)}
                  >
                    <span>{t(element?.meta?.locale || element?.name)}</span>
                    {element?.meta?.linkIcon? <icon-launch style="margin-left:6px;font-size:14px;" /> : ''}
                  </a-menu-item>
                );
              nodes.push(node as never);
            });
          }
          return nodes;
        }
        // console.log('menuTree',menuTree.value)
        return travel(menuTree.value);
      };

      return () => (
        <div class="menu-panel">
          {showMicroBack.value ? (
            <div class="menu-micro-back" onClick={goBackFromMicro}>
              <icon-left />
              <span>返回</span>
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
    flex: 0 0 44px;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 16px;
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
