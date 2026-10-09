<template>
    <a-layout class="layout" :class="{ mobile: appStore.hideMenu }">
        <div v-if="navbar" class="layout-navbar">
            <NavBar />
        </div>
        <a-layout class="layout-frame">
            <a-layout class="layout-frame">
                <a-layout-sider
                    v-if="renderMenu"
                    v-show="!hideMenu"
                    class="layout-sider"
                    breakpoint="xl"
                    :collapsed="collapsed"
                    :collapsible="true"
                    :width="menuWidth"
                    :style="{ paddingTop: navbar ? '60px' : '' }"
                    :hide-trigger="true"
                    @collapse="setCollapsed"
                >
                    <div class="menu-wrapper w7-menu-scroll">
                        <Menu />
                    </div>
                </a-layout-sider>
                <a-drawer
                    v-if="renderMenu && hideMenu"
                    :visible="drawerVisible"
                    placement="left"
                    body-class="w7-menu-drawer-body w7-menu-scroll"
                    :header="false"
                    :footer="false"
                    mask-closable
                    :closable="false"
                    @cancel="drawerCancel"
                >
                    <div class="menu-wrapper w7-menu-scroll">
                        <Menu />
                    </div>
                </a-drawer>
                <a-layout class="layout-content" :style="paddingStyle">
                    <!-- <TabBar v-if="appStore.tabBar" /> -->
                    <a-layout-content
                        ref="routerViewScroller"
                        class="layout-router-view"
                        :class="{ 'layout-router-view--fixed': route.meta.replaceRootMenu }"
                    >
                        <!-- <PageLayout /> -->
                        <router-view />
                    </a-layout-content>
                    <!-- <Footer v-if="footer" /> -->
                </a-layout>
            </a-layout>
        </a-layout>
        <contact-us></contact-us>
    </a-layout>
</template>

<script lang="ts" setup>
    import { ref, computed, watch, provide, onMounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import { useAppStore, useUserStore } from '@/store';
    import NavBar from '@/components/navbar/index.vue';
    import Menu from '@/components/menu/index.vue';
//   import Footer from '@/components/footer/index.vue';
//   import TabBar from '@/components/tab-bar/index.vue';
    import usePermission from '@/hooks/permission';
    import useResponsive from '@/hooks/responsive';
    import PageLayout from './page-layout.vue';
    import contactUs from '@/components/contact-us.vue';

    const isInit = ref(false);
    const appStore = useAppStore();
    const userStore = useUserStore();
    const router = useRouter();
    const route = useRoute();
    const permission = usePermission();
    useResponsive(true);
    const navbarHeight = `60px`;
    const navbar = computed(() => appStore.navbar && !isInIframe && !(window as any).__POWERED_BY_WUJIE__);
    const isInIframe = window.self !== window.top;
    const renderMenu = computed(() => appStore.menu && !appStore.topMenu && !route.meta.replaceRootMenu);
    const hideMenu = computed(() => appStore.hideMenu);
    const footer = computed(() => appStore.footer);
    const menuWidth = computed(() => {
        return appStore.menuCollapse ? 48 : appStore.menuWidth;
    });
    const collapsed = computed(() => {
        return appStore.menuCollapse;
    });
    const paddingStyle = computed(() => {
        const paddingLeft =
            renderMenu.value && !hideMenu.value
                ? { paddingLeft: `${menuWidth.value}px` }
                : {};
        const paddingTop = navbar.value ? { paddingTop: navbarHeight } : {};
        return { ...paddingLeft, ...paddingTop };
    });
    const routerViewScroller = ref<any>(null);
    watch(
        () => route.fullPath,
        () => {
            const scroller = routerViewScroller.value?.$el || routerViewScroller.value;
            if (scroller instanceof HTMLElement) {
                scroller.scrollTop = 0;
                scroller.scrollLeft = 0;
            }
        },
        { flush: 'post' }
    );
    const setCollapsed = (val: boolean) => {
        if (!isInit.value) return; // for page initialization menu state problem
        appStore.updateSettings({ menuCollapse: val });
    };
//   watch(
//     () => userStore.role,
//     (roleValue) => {
//       if (roleValue && !permission.accessRouter(route))
//         router.push({ name: 'notFound' });
//     }
//   );
    const drawerVisible = ref(false);
    const drawerCancel = () => {
        drawerVisible.value = false;
    };
    provide('toggleDrawerMenu', () => {
        drawerVisible.value = !drawerVisible.value;
    });
    onMounted(() => {
        isInit.value = true;
    });
</script>

<style scoped lang="less">
    @nav-size-height: 60px;
    @layout-max-width: 1100px;

    .layout {
        width: 100%;
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    .layout-frame {
        min-height: 0;
        overflow: hidden;
    }

    .layout-navbar {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 100;
        width: 100%;
        height: @nav-size-height;
    }

    .layout-sider {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99;
        height: 100%;
        min-height: 0;
        overflow: hidden;
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
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
        }
    }

    .menu-wrapper {
        flex: 1 1 auto;
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    .layout-content {
        height: 100%;
        min-height: 0;
        overflow: hidden;
        background-color: var(--color-fill-2);
        transition: padding 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);
    }

    .layout-router-view {
        min-height: 0;
        overflow-y: auto;
    }

    .layout-router-view--fixed {
        overflow: hidden;
    }
</style>
