<template>
    <a-layout-sider
        v-if="renderMenu && showMenu"
        v-show="!hideMenu"
        breakpoint="xl"
        class="layout-sider"
        :class="{ 'is-collapsed': collapsed }"
        :collapsed="collapsed"
        :collapsible="true"
        :width="menuWidth"
        :hide-trigger="true"
        @collapse="setCollapsed"
    >
        <div class="menu-wrapper">
            <!-- <a-select v-if="props.identifieList && props.identifieList.length>1" v-model="identifie" @change="v=>emit('changeIdentifie',v)">
                <a-option v-for="item in props.identifieList" :key="item.name" :value="item.identifie" :label="item.title"></a-option>
            </a-select> -->
            <!-- :style="{height:props.identifieList?.length>1?'calc(100% - 32px)':'100%'}" -->
            <a-menu
                :show-collapse-button="appStore.device !== 'mobile'"
                @collapse="setCollapse"
                :level-indent="hasGroupedMenuRoles ? 20 : 34"
                style="width:100%;height:100%;"
                v-model:selected-keys="selectMenu"
                :open-keys="openMenuKeys"
                @update:open-keys="setOpenMenuKeys"
                @menu-item-click="handelMicroMenu"
            >
                <template v-for="role in topMenuRoles" :key="role.key || role.name">
                    <div v-if="role.menus && role.menus.length" class="role-header c-aa">
                        <IconUserGroup />
                        <span v-if="!collapsed" class="role-title">{{ role.title }}端</span>
                    </div>
                    <template v-if="role.menus && role.menus.length">
                        <template v-if="role.isMultiMicroApp">
                            <a-sub-menu v-for="microApp in role.microApps" :key="microApp.key">
                                <template #icon><IconApps /></template>
                                <template #title>{{ microApp.title }}</template>
                                <MicroappMenuItems :menus="microApp.menus" />
                            </a-sub-menu>
                        </template>
                        <MicroappMenuItems v-else :menus="role.menus" />
                    </template>
                </template>
                <a-divider v-if="topMenuRoles.length && bottomMenus.length" class="menu-location-divider" />
                <template v-if="hasGroupedBottomRoles">
                    <template v-for="role in bottomMenuRoles" :key="`bottom:${role.key || role.name}`">
                        <div v-if="role.isMultiMicroApp" class="role-header c-aa">
                            <IconUserGroup />
                            <span v-if="!collapsed" class="role-title">{{ role.title }}端</span>
                        </div>
                        <template v-if="role.isMultiMicroApp">
                            <a-sub-menu v-for="microApp in role.microApps" :key="microApp.key">
                                <template #icon><IconApps /></template>
                                <template #title>{{ microApp.title }}</template>
                                <MicroappMenuItems :menus="microApp.menus" />
                            </a-sub-menu>
                        </template>
                        <MicroappMenuItems v-else :menus="role.menus" />
                    </template>
                </template>
                <MicroappMenuItems v-else :menus="bottomMenus" />
            </a-menu>
        </div>
    </a-layout-sider>
    <a-drawer
        v-if="hideMenu && showMenu"
        :visible="drawerVisible"
        placement="left"
        :footer="false"
        mask-closable
        :closable="false"
        @cancel="drawerCancel"
    >
        <!-- <a-select v-if="props.identifieList && props.identifieList.length>1" v-model="identifie" @change="v=>emit('changeIdentifie',v)">
            <a-option v-for="item in props.identifieList" :key="item.name" :value="item.identifie" :label="item.title"></a-option>
        </a-select> -->
        <!-- :style="{height:props.identifieList?.length>1?'calc(100% - 32px)':'100%'}" -->
        <a-menu
            :show-collapse-button="appStore.device !== 'mobile'"
            @collapse="setCollapse"
            :level-indent="20"
            style="width:100%;height:100%;"
            v-model:selected-keys="selectMenu"
            :open-keys="openMenuKeys"
            @update:open-keys="setOpenMenuKeys"
            @menu-item-click="handelMicroMenu"
        >
            <template v-for="role in topMenuRoles" :key="role.key || role.name">
                <div class="role-header c-aa">
                    <IconUserGroup />
                    <span class="role-title">{{ role.title }}端</span>
                </div>
                <template v-if="role.menus && role.menus.length">
                    <template v-if="role.isMultiMicroApp">
                        <a-sub-menu v-for="microApp in role.microApps" :key="microApp.key">
                            <template #icon><IconApps /></template>
                            <template #title>{{ microApp.title }}</template>
                            <MicroappMenuItems :menus="microApp.menus" />
                        </a-sub-menu>
                    </template>
                    <MicroappMenuItems v-else :menus="role.menus" />
                </template>
            </template>
            <a-divider v-if="topMenuRoles.length && bottomMenus.length" class="menu-location-divider" />
            <template v-if="hasGroupedBottomRoles">
                <template v-for="role in bottomMenuRoles" :key="`bottom:${role.key || role.name}`">
                    <div v-if="role.isMultiMicroApp" class="role-header c-aa">
                        <IconUserGroup />
                        <span class="role-title">{{ role.title }}端</span>
                    </div>
                    <template v-if="role.isMultiMicroApp">
                        <a-sub-menu v-for="microApp in role.microApps" :key="microApp.key">
                            <template #icon><IconApps /></template>
                            <template #title>{{ microApp.title }}</template>
                            <MicroappMenuItems :menus="microApp.menus" />
                        </a-sub-menu>
                    </template>
                    <MicroappMenuItems v-else :menus="role.menus" />
                </template>
            </template>
            <MicroappMenuItems v-else :menus="bottomMenus" />
        </a-menu>
    </a-drawer>
</template>
<script setup>
import { useAppStore } from '@/store';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import useResponsive from '@/hooks/responsive';
import { useRoute } from 'vue-router'
import { getWujieRoutePrefix, normalizeWujieSyncRoute } from '@/utils/wujie-route';
import { splitMicroAppMenuRoles } from '@/utils/microapp-menu';
import MicroappMenuItems from '@/components/microapp-menu-items.vue';

const props = defineProps([
    'roles',
    'info',
    'menuActive',
    // 'identifie',
    // 'identifieList'
])
const emit = defineEmits(['routeChange'])

useResponsive(true);

// 获取响应式的路由对象
const route = useRoute()

const appStore = useAppStore();

const renderMenu = computed(() => appStore.menu && !appStore.topMenu);
const hideMenu = computed(() => appStore.hideMenu);

const collapsed = computed(() => appStore.menuCollapse);

const menuWidth = computed(() => {
    return appStore.menuCollapse ? 48 : appStore.menuWidth;
});
// 选择应用
// const identifie = ref(props?.identifie);
// watch(()=>props.identifie,()=>{
//     identifie.value = props.identifie;
// })

// 角色菜单筛选
const roles = ref([])
const showMenu = ref(true);
const filterMenu = ()=>{
    function filterDuplicateMenus(menuArray) {
        // 用于记录已经出现过的do路径，Set查询效率更高
        const existedPaths = new Set();
        
        // 遍历数组并处理每个元素，返回新数组（不修改原数组）
        return menuArray.map(item => {
            // 过滤当前元素的menus，只保留未出现过的路径
            const filteredMenus = item.menus.filter(menu => {
                // 确保菜单标识存在，避免报错
                if (!menu.key && !menu.do) return false;
                const menuKey = menu.key || menu.do;
                // 如果路径未出现过，则保留并记录
                if (!existedPaths.has(menuKey)) {
                    existedPaths.add(menuKey);
                    return true;
                }
                // 路径已存在，过滤掉
                return false;
            });
            
            // 返回新的元素对象，保持其他字段不变，仅替换menus
            return {
                ...item,
                menus: filteredMenus
            };
        });
    }
    roles.value = props?.roles || [];
    roles.value = filterDuplicateMenus(roles.value);
    roles.value = roles.value.filter(i=>i.menus?.length);
    showMenu.value = roles.value?.length>1 || roles.value?.[0]?.menus?.length>1;
}

filterMenu();
watch(()=>props.roles,filterMenu)
const menuLocationGroups = computed(() => splitMicroAppMenuRoles(roles.value));
const topMenuRoles = computed(() => menuLocationGroups.value.topRoles);
const bottomMenuRoles = computed(() => menuLocationGroups.value.bottomRoles);
const hasGroupedBottomRoles = computed(() => menuLocationGroups.value.hasGroupedBottomRoles);
const hasGroupedMenuRoles = computed(() => menuLocationGroups.value.isMultiMicroApp);
const bottomMenus = computed(() => menuLocationGroups.value.bottomMenus);
const groupedMicroAppKeys = computed(() => [
    ...topMenuRoles.value,
    ...bottomMenuRoles.value,
].flatMap(role => role.isMultiMicroApp ? role.microApps.map(item => item.key) : []));
const openMenuKeys = ref([]);
watch(() => groupedMicroAppKeys.value.join('|'), () => {
    openMenuKeys.value = [...groupedMicroAppKeys.value];
}, { immediate: true });
const setOpenMenuKeys = (keys) => {
    openMenuKeys.value = keys;
};
// watch(()=>props.identifieList,()=>{
//     showMenu.value = props.identifieList?.length>1 || roles.value?.length>1 || roles.value?.[0]?.menus?.length>1;
// })

// 菜单
const selectMenu = ref([]);
const handelMicroMenu = (v)=>{
    selectMenu.value = [v];
    emit("routeChange", v);
}

const defaultSelectMenu = ()=>{
    const activeDo = Array.isArray(route.query?.do) ? route.query.do[0] : route.query?.do;
    const appmicro = normalizeWujieSyncRoute(route.query?.appmicro, getWujieRoutePrefix(props?.info?.frontendUrl));
    let active = props?.menuActive || activeDo || appmicro || props?.roles?.[0]?.menus?.[0]?.key || props?.roles?.[0]?.menus?.[0]?.do || '';
    selectMenu.value = [active];
}

watch(()=>props.info,defaultSelectMenu)
watch(()=>props.roles,defaultSelectMenu)
watch(()=>props.menuActive,defaultSelectMenu)
watch(()=>route.params.group,defaultSelectMenu)
watch(()=>route.query.do,defaultSelectMenu)
watch(()=>route.query.appmicro,defaultSelectMenu)


const drawerVisible = ref(false);
const drawerCancel = () => {
    drawerVisible.value = false;
};
// 事件处理函数（需单独定义，方便移除监听）
const handleToggleDrawer = () => {
    drawerVisible.value = !drawerVisible.value;
};

// 组件挂载时监听全局事件
onMounted(() => {
    window.addEventListener('toggle-drawer', handleToggleDrawer);
});
// 组件卸载时移除监听（关键：防止内存泄漏）
onUnmounted(() => {
    window.removeEventListener('toggle-drawer', handleToggleDrawer);
});

const setCollapsed = (val) => {
    appStore.updateSettings({ menuCollapse: val });
};
const setCollapse = (val) => {
    if(appStore.device === 'desktop'){appStore.updateSettings({ menuCollapse: val })}
};

</script>

<style scoped lang="less">
.menu-wrapper {
    height: 100%;
    overflow: auto;
    overflow-x: hidden;
    :deep(.arco-menu) {
        ::-webkit-scrollbar {
            width: 12px;
            height: 4px;
        }

        ::-webkit-scrollbar-thumb {
            border: 4px solid transparent;
            background-clip: padding-box;
            border-radius: 7px;
            background-color: var(--color-text-4);
        }

        ::-webkit-scrollbar-thumb:hover {
            background-color: var(--color-text-3);
        }
    }
}

.role-header {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 16px;
    line-height: 40px;

    .arco-icon {
        flex: 0 0 16px;
        width: 16px;
        font-size: 16px;
    }
}

.role-title {
    margin-left: 10px;
}

.menu-location-divider {
    width: auto;
    min-width: auto;
    margin: 10px;
}

.layout-sider {
    // position: fixed;
    // top: 0;
    // left: 0;
    // z-index: 99;
    height: 100%;
    transition: all 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);
    &::after {
        position: absolute;
        top: 0;
        right: -1px;
        display: block;
        width: 1px;
        height: 100%;
        background-color: var(--color-border);
        content: '';
    }
    > :deep(.arco-layout-sider-children) {
        overflow-y: hidden;
    }

    &.is-collapsed {
        .role-header {
            justify-content: center;
            padding: 0;
        }
    }
}
</style>
