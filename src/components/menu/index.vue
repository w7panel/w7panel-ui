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

      watch(route, () => {
        selectedKey.value = [route.name as string];
      });

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
              // 新增：根据header顶部 menuFilter 选择显示的菜单
              const shouldExclude = (() => {
                if (!element.name) return false;
                if (menuFilter === 'cloudserver') {
                  return ['system','usermanage'].includes(element.name as string);
                }
                if (menuFilter === 'usermanage') {
                  return ['cluster', 'app', 'zpk', 'sitemanage', 'storage','rate-limit','system'].includes(element.name as string);
                }
                if (menuFilter === 'system') {
                  return ['cluster', 'app', 'zpk', 'sitemanage', 'storage','rate-limit','usermanage'].includes(element.name as string);
                }
                // 其他情况不排除
                return false;
              })();
              
              // 如果需要排除则跳过当前菜单
              if (shouldExclude) return;
              if(element.name=='system'||element.name=='usermanage'){
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
        <a-menu
          mode={topMenu.value ? 'horizontal' : 'vertical'}
          v-model:collapsed={collapsed.value}
          v-model:open-keys={openKeys.value}
          show-collapse-button={appStore.device !== 'mobile'}
          auto-open={false}
          selected-keys={selectedKey.value}
          auto-open-selected={true}
          level-indent={34}
          style="height: 100%;width:100%;"
          onCollapse={setCollapse}
        >
          {renderSubMenu()}
        </a-menu>
      );
    },
  });
</script>

<style lang="less" scoped>
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
