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
                :level-indent="34"
                style="width:100%;height:100%;"
                v-model:selected-keys="selectMenu"
                @menu-item-click="handelMicroMenu"
            >
                <template v-for="role in roles" :key="role.name">
                    <div v-if="role.menus && role.menus.length" class="role-header c-aa">
                        <IconUserGroup />
                        <span v-if="!collapsed" class="role-title">{{ role.title }}端</span>
                    </div>
                    <template v-if="role.menus && role.menus.length">
                        <template v-for="(menu,index) in role.menus" :key="menu.do">
                            <a-menu-item v-if="!menu.children||!menu.children.length" :key="menu.do">
                                <template #icon>
                                    <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                    <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                    <IconMenu v-else />
                                </template>
                                <span>{{menu.title}}</span>
                            </a-menu-item>
                            <a-sub-menu v-else :key="index">
                                <template #icon>
                                    <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                    <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                    <IconMenu v-else />
                                </template>
                                <template #title>{{menu.title}}</template>
                                <a-menu-item v-for="submenu in menu.children" :key="submenu.do">{{submenu.title}}</a-menu-item>
                            </a-sub-menu>
                        </template>
                    </template>
                </template>
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
            style="width:100%;height:100%;"
            v-model:selected-keys="selectMenu"
            @menu-item-click="handelMicroMenu"
        >
            <template v-for="role in roles" :key="role.name">
                <div class="role-header c-aa">
                    <IconUserGroup />
                    <span class="role-title">{{ role.title }}端</span>
                </div>
                <template v-if="role.menus && role.menus.length">
                    <template v-for="(menu,index) in role.menus" :key="menu.do">
                        <a-menu-item v-if="!menu.children||!menu.children.length" :key="menu.do">
                            <template #icon>
                                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                <IconMenu v-else />
                            </template>
                            <span>{{menu.title}}</span>
                        </a-menu-item>
                        <a-sub-menu v-else :key="index">
                            <template #icon>
                                <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                <IconMenu v-else />
                            </template>
                            <template #title>{{menu.title}}</template>
                            <a-menu-item v-for="submenu in menu.children" :key="submenu.do">{{submenu.title}}</a-menu-item>
                        </a-sub-menu>
                    </template>
                </template>
            </template>
        </a-menu>
    </a-drawer>
</template>
<script setup>
import { useAppStore } from '@/store';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import useResponsive from '@/hooks/responsive';
import { useRoute } from 'vue-router'
import { getWujieRoutePrefix, normalizeWujieSyncRoute } from '@/utils/wujie-route';

const props = defineProps([
    'roles',
    'info',
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
                // 确保do字段存在，避免报错
                if (!menu.do) return false;
                // 如果路径未出现过，则保留并记录
                if (!existedPaths.has(menu.do)) {
                    existedPaths.add(menu.do);
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
    let active = activeDo || appmicro || props?.roles?.[0]?.menus?.[0]?.do || '';
    selectMenu.value = [active];
}

watch(()=>props.info,defaultSelectMenu)
watch(()=>props.roles,defaultSelectMenu)
watch(()=>route.params.group,defaultSelectMenu)
watch(()=>route.query.do,defaultSelectMenu)
watch(()=>route.query.appmicro,defaultSelectMenu)


const elementsToSvg = (elementsArray, options = {})=>{
    try {
        // 校验输入格式（空数组也允许，后续自动创建默认svg）
        if (!Array.isArray(elementsArray)) {
            throw new Error('输入必须是数组');
        }

        // 1. 查找数组中的svg元素（任意位置）
        const svgElementIndex = elementsArray.findIndex(item => item?.type === 'svg');
        let svgRoot = null;
        
        // 有svg元素则取出并深拷贝，无则创建默认svg根元素
        if (svgElementIndex !== -1) {
            svgRoot = { ...elementsArray[svgElementIndex] };
            // 从原数组中移除svg元素（避免后续重复处理）
            elementsArray = [...elementsArray.slice(0, svgElementIndex), ...elementsArray.slice(svgElementIndex + 1)];
        } else {
            // 创建默认svg根元素
            svgRoot = {
                type: 'svg',
                xmlns: 'http://www.w3.org/2000/svg', // 默认添加命名空间，保证兼容性
                viewBox: '0 0 48 48' // 默认视图框，适配多数图标
            };
        }

        // 2. 应用宽高（优先级：自定义 > svg元素原有值 > 默认24）
        const defaultSize = 16;
        svgRoot.width = options.width ?? svgRoot.width ?? defaultSize;
        svgRoot.height = options.height ?? svgRoot.height ?? defaultSize;

        // 3. 构建SVG根标签的属性字符串
        const svgAttrs = [];
        for (const [key, value] of Object.entries(svgRoot)) {
            // 跳过type属性（已用于识别标签类型）
            if (key === 'type') continue;
            // 属性值转字符串（处理Number类型）
            svgAttrs.push(`${key}="${String(value)}"`);
        }
        const svgStartTag = `<svg ${svgAttrs.join(' ')}>`;
        const svgEndTag = `</svg>`;

        // 4. 构建所有子元素的标签字符串（剩余所有元素都是子元素）
        const childElementsStr = [];
        for (const element of elementsArray) {
            // 跳过无效元素（避免空值/非对象导致报错）
            if (!element || typeof element !== 'object' || !element.type) {
                console.warn('跳过无效元素：', element);
                continue;
            }

            const { type, content, ...attrs } = element;

            // 构建子元素属性字符串
            const elementAttrs = [];
            for (const [key, value] of Object.entries(attrs)) {
                elementAttrs.push(`${key}="${String(value)}"`);
            }

            // 生成元素标签（区分有文本内容和无文本内容的元素）
            if (content) {
                // 有文本内容的元素（如text/title）
                childElementsStr.push(`  <${type} ${elementAttrs.join(' ')}>${content}</${type}>`);
            } else {
                // 无文本内容的自闭合元素（如circle/path）
                childElementsStr.push(`  <${type} ${elementAttrs.join(' ')} />`);
            }
        }

        // 5. 拼接完整的SVG字符串（格式化缩进，便于阅读）
        const svgContent = [
            svgStartTag,
            ...childElementsStr,
            svgEndTag
        ].join('\n');

        return svgContent;

    } catch (error) {
        console.error('生成SVG失败:', error);
        // 返回默认的SVG模板（使用自定义宽高或默认值24）
        const defaultWidth = options.width ?? 16;
        const defaultHeight = options.height ?? 16;
        return `<svg width="${defaultWidth}" height="${defaultHeight}" xmlns="http://www.w3.org/2000/svg"></svg>`;
    }
}


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
