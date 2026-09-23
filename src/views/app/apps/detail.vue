<template>
    <div class="app-detail-page" :style="{minHeight: appDetailMinHeight}">
        <a-layout class="app-detail-layout">
            <component
                :is="appMenuContainer"
                v-if="!hideAppMenu && shouldRenderAppMenu"
                v-bind="appMenuContainerProps"
                :class="['app-detail-menu-container', {'app-detail-menu-container--drawer': appStore.hideMenu}]"
                @collapse="setAppMenuCollapsed"
                @cancel="appMenuDrawerVisible=false"
            >
                <div class="df df-c menu-absolute-div app-detail-menu-scroll" :style="appMenuScrollStyle">
                    <a-menu
                        v-model:collapsed="appMenuCollapsed"
                        v-model:selected-keys="selectMenu"
                        :show-collapse-button="!appStore.hideMenu && appStore.device !== 'mobile'"
                        :level-indent="34"
                        style="width:100%;height:100%;"
                        @collapse="setAppMenuCollapsed"
                        @menu-item-click="handleAppMenuClick"
                    >
                        <template v-for="role in topMenuRoles" :key="role.key || role.name">
                            <div v-if="role.menus && role.menus.length && !appMenuCollapsed" class="microapp-role-header">
                                <span>{{ role.title }}</span>
                            </div>
                            <template v-if="role.menus && role.menus.length">
                                <template v-if="role.isMultiMicroApp">
                                    <MicroappMenuItems
                                        v-for="microApp in role.microApps"
                                        :key="microApp.key"
                                        :menus="microApp.menus"
                                        :group-title="microApp.title"
                                        :collapsed="appMenuCollapsed"
                                    />
                                </template>
                                <MicroappMenuItems v-else :menus="role.menus" />
                            </template>
                        </template>

                        <a-divider
                            v-if="topMenuRoles.length && (bottomMenus.length || (!isTopAppEntry && $route.name!='group-micro2'))"
                            class="app-detail-menu-divider"
                        />
                        <template v-if="hasGroupedBottomRoles">
                            <template v-for="role in bottomMenuRoles" :key="role.key || role.name">
                                <div v-if="role.isMultiMicroApp && !appMenuCollapsed" class="microapp-role-header">
                                    <span>{{ role.title }}</span>
                                </div>
                                <template v-if="role.isMultiMicroApp">
                                    <MicroappMenuItems
                                        v-for="microApp in role.microApps"
                                        :key="microApp.key"
                                        :menus="microApp.menus"
                                        :group-title="microApp.title"
                                        :collapsed="appMenuCollapsed"
                                    />
                                </template>
                                <MicroappMenuItems v-else :menus="role.menus" />
                            </template>
                        </template>
                        <MicroappMenuItems v-else :menus="bottomMenus" />

                        <template v-if="$route.name!='group-micro2' && !isTopAppEntry">
                            <a-divider v-if="bottomMenus.length" class="app-detail-menu-divider" />
                            <template v-if="isHelmPage || ((isMicroPage||isAppDirectPage)&&isHelmApp)">
                                <a-menu-item key="group-helm-detail" class="app-detail-native-menu-item">
                                    <template #icon><icon-apps /></template>
                                    应用详情
                                </a-menu-item>
                                <a-menu-item key="group-helm-domain" class="app-detail-native-menu-item">
                                    <template #icon><icon-cloud /></template>
                                    域名管理
                                </a-menu-item>
                                <a-menu-item v-if="showAppDirect" key="group-app-direct" class="app-detail-native-menu-item">
                                    <template #icon><icon-launch /></template>
                                    应用直达
                                </a-menu-item>
                            </template>
                            <template v-else>
                                <a-menu-item key="app-detail-detail" class="app-detail-native-menu-item">
                                    <template #icon><icon-apps /></template>
                                    应用详情
                                </a-menu-item>
                                <a-menu-item key="app-detail-pod" class="app-detail-native-menu-item">
                                    <template #icon><icon-nav /></template>
                                    容器列表
                                </a-menu-item>
                                <a-menu-item v-if="fileeditor" key="app-detail-files" class="app-detail-native-menu-item">
                                    <template #icon><icon-folder /></template>
                                    文件管理
                                </a-menu-item>
                                <a-menu-item key="app-detail-domain" class="app-detail-native-menu-item">
                                    <template #icon><icon-cloud /></template>
                                    域名管理
                                </a-menu-item>
                                <a-menu-item key="app-detail-job" class="app-detail-native-menu-item">
                                    <template #icon><icon-code-square /></template>
                                    执行脚本
                                </a-menu-item>
                                <a-menu-item key="app-detail-version" class="app-detail-native-menu-item">
                                    <template #icon><icon-select-all /></template>
                                    历史版本
                                </a-menu-item>
                                <a-menu-item key="app-detail-moniter" class="app-detail-native-menu-item">
                                    <template #icon><icon-bar-chart /></template>
                                    运行状态
                                </a-menu-item>
                            </template>
                        </template>
                    </a-menu>
                </div>
            </component>

            <a-layout class="app-detail-main df df-c" :style="appDetailMainStyle">
                <Breadcrumb v-if="!isTopAppEntry" class="df-s0" :routes="detailBreadcrumbRoutes" />
                <a-layout-content v-if="isAppDirectPage" class="df df-c">
                    <app-direct :info="info" class="routerviewbox fc" />
                </a-layout-content>
                <a-layout-content v-else-if="isMicroPage" class="df df-c">
                    <div class="app-detail-micro-container bg-white routerviewbox fc">
                        <div v-show="downOk" id="app-detail-micro" :style="microPanelStyle"></div>
                        <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." :style="{display:'block', height: microPanelHeight}">
                            <div style="height:100%;" class="bg-white"></div>
                        </a-spin>
                        <a-spin v-if="microLoading" class="app-detail-micro-loading" :loading="microLoading" :size="32">
                            <div :style="{height: microPanelHeight}"></div>
                        </a-spin>
                    </div>
                </a-layout-content>
                <a-layout-content v-else class="df df-c">
                <a-tabs
                    :active-key="appname"
                    type="card"
                    :editable="permission.includes('app/apps/delete')"
                    @tab-click="tabClick"
                    @add="createApp"
                    @delete="delApp"
                    :show-add-button="$route.params.group!=='w7panel'&&permission.includes('app/apps/add')"
                    hide-content
                    class="appdetail-tabs df-s0"
                >
                    <a-tab-pane v-for="(item,index) in applist" :key="item.key" :title="item.title" :closable="index!==0&&!copying&&$route.params.group!=='w7panel'">
                        <template #title>
                            <a-checkbox v-if="copying&&!item.isHelm" v-model="copyList" :key="item.key" :value="item.key" @click.stop>{{item.title}}</a-checkbox>
                            <div v-else class="df ai-c" style="height:24px;">
                                <div v-if="!item.isHelm" class="point" :class="{red:item.status==2, green:item.status==1}"></div>
                                <div v-else class="point" style="width:0;"></div>
                                <div>{{item.title}}</div>
                            </div>
                        </template>
                    </a-tab-pane>
                    <template #extra>
                        <a-button @click="toCopy" v-if="$route.params.group!=='w7panel'" :type="copying?'primary':'outline'" :status="copying?'warning':''" size="mini">
                            <template #icon>
                                <icon-copy />
                            </template>
                            <span>{{copying?'执行':'复制'}}</span>
                        </a-button>
                    </template>
                </a-tabs>
                <div class="bg-white routerviewbox fc" >
                    <router-view v-if="$route.name=='app-detail-micro'" :url="appLocation" :data="data" @refresh="dataDetail" />
                    <router-view v-else-if="data||isHelmPage" :data="data" :identifie="identifie" :appList="applist" :title="title" @refresh="dataDetail" @editApp="openForm()"/>
                </div>
                </a-layout-content>
            </a-layout>
        </a-layout>
        
        <form-drawer :show="form.show" :id="form.name" @submitOk="getData" :groupname="$route.params.group" :afterName="form.suffix" @close="closeForm"></form-drawer>
        <!-- <addapp-drawer ref="addappdrawer" :show="form.show&&!form.id" :tabs="form.tabs" :activeName="form.id" @close="closeForm" /> -->
        
        <a-modal width="400px" v-model:visible="checkDelete.show" @ok="checkDelete.ok" @cancel="checkDelete.show=false;" :popup-container="$popupContainer">
            <template #title>删除应用</template>
            <div>
                <div class="df ai-c jc-c">
                    <div class="mb-20">确认要删除{{checkDelete.name}}吗？</div>
                </div>
            </div>
        </a-modal>

        <wujie-modals v-if="isMicroPage" ref="wujieModals" :exclude-wujie-events="modalExcludeWujieEvents" />
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { useAppStore,useNamespaceStore,useLoadingStore } from '@/store';
import formDrawer from '@/views/app/pages/form-drawer.vue';
import { bus, startApp } from "wujie";
import { getPermission,getFileEditor ,getToken,getK8sinfo} from '@/utils/auth';
import wujieModals from '@/components/wujie-modals.vue';
import { getWujieRoutePrefix, normalizeWujieSyncRoute, normalizeWujieNavigationRoute, joinWujieUrlRoute } from '@/utils/wujie-route';
import { appendWujieModalHandles } from '@/utils/wujie-modal-handles';
import { appendWujieProxyRequestQuery, getWujieProxyBackendUrl } from '@/utils/wujie-proxy-request';
import { createWujieRequirePlugin } from '@/utils/wujie-require-plugin';
import { createWujieRequestCredentialsPlugin } from '@/utils/wujie-request-credentials-plugin';
import { createWujieHostRoutePlugin } from '@/utils/wujie-route';
import { wujieFetch } from '@/utils/wujie-cors-fetch';
import { filterAppGroupWorkloadItems, uninstallAppGroup } from '@/utils/appgroup';
import { splitMicroAppMenuRoles } from '@/utils/microapp-menu';
import {
    loadMicroAppReverseDependentApps,
    loadVisibleAppGroupContext,
    resolvePresentedMicroApps,
    sortVisibleAppGroupMicroApps,
} from '@/utils/appgroup-microapps';
import { createK8sProxy, createMicroappProxy, createPanelProxy } from '@/utils/microapp-proxy';
import { runningFirstPod } from '@/utils/running-first-pod';
import { podShell } from '@/utils/pod-shell';
import { RESOURCE_GROUP_LABEL, loadResourcesByGroupNames } from '@/utils/w7panel-resource';
import AppDirect from '@/views/topapp/app-direct.vue';
import MicroappMenuItems from '@/components/microapp-menu-items.vue';

const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
    normal: '普通用户',
}

const APP_DETAIL_MICRO_NAME = 'app-detail-micro-runtime';
const APP_DETAIL_MICRO_EL = '#app-detail-micro';
const APP_DETAIL_MICRO_QUERY = 'app-detail-micro';
const APP_DETAIL_MICRO_RESOURCE_QUERY = 'microapp';
const LEGACY_APP_DIRECT_DO = '__topapp_app_direct__';
const SYSTEM_FRONT_PROP_TEMPLATE = /^\$\{system\.([A-Za-z0-9_]+)\}$/;

function resolveFrontendPropTemplates(frontendProps, frontProps) {
    return Object.fromEntries(Object.entries(frontendProps || {}).map(([name, value])=>{
        const match = typeof value === 'string' ? value.match(SYSTEM_FRONT_PROP_TEMPLATE) : null;
        if(!match){ return [name, value]; }
        const resolvedValue = frontProps?.[match[1]];
        return [name, resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '' ? resolvedValue : value];
    }));
}

export default {
    setup(){
        return {
            appStore: useAppStore(),
        };
    },
    data(){
        return {
            isHelmPage: false,
            isHelmApp: false,
            form: {
                show: false,
                id: '',
                tabs: [],
            },
            namespaceActive: '',
            data: null,
            title: '',
            groupTitle: '',
            appname: '',
            applist: [],

            menukey: "",
            appMenu: [],
            appLocation: '',

            copying: false,
            copyList: [],
            checkDelete: {
                show: false,
                name: '',
                ok: ()=>{}
            },

            watchInterval: null,
            identifie: '',

            roles: [],
            menus: [],
            selectMenu: [],
            info: {},
            microAppBaseInfo: {},
            microAppRoleConfig: {},
            extra: {},
            permission: [],
            fileeditor: '',

            hasThirdpartyCd: false,
            microApp: null,
            microApps: [],
            microAppGroup: '',
            appGroupName: '',
            activeMicroAppName: '',
            reverseDependentAppCache: {},
            reverseDependentAppRequests: {},
            wujieInitPromise: null,
            wujieInitSignature: '',
            wujiePendingSignature: '',
            wujieDestroy: null,
            downOk: true,
            microLoading: false,
            hideAppMenu: false,
            appMenuDrawerVisible: false,
            userRole: '',
        }
    },
    watch: {
        '$route.name'(v,ov){
            this.selectMenu = [this.$route.meta.routekey];
            this.isHelmPage = /^group\-helm(\-|$)/.test(v);
            if(['group-micro', 'group-micro2', 'topapp-micro'].includes(v)){
                this.microLoading = true;
            }
            if(this.isHelmPage){
                this.appname = 'helm-'+this.$route.params.group;
            }else if(this.$route.params.kind && this.$route.params.id){
                this.appname = this.$route.params.kind + this.$route.params.id;
            }
            if(v == 'group-app-direct' || ov == 'group-app-direct'){
                return;
            }
            this.getData();
        },
        '$route.params.group'(v,ov){
            if(v===ov){return;}
            this.groupTitle = v;
            // When switching groups on the same detail route, Vue reuses this
            // component and the route-name watcher does not run.
            this.getData();
        },
        '$route.params.page'(v){
            let p = this.$route.fullPath.replace('/app/appgroup/'+this.$route.params.group+'/'+this.$route.params.kind+'/'+this.$route.params.id+'/micro/','');
            this.menukey = p || '';
        },
        '$route.params.id'(){
            this.syncActiveAppTitle();
        },
        '$route.query.showMenu'(){
            this.hideAppMenu = this.isHideMenu();
        },
        '$route.query.do'(value){
            this.syncRequestedMicroRoute(value || this.getRequestedMicroRoute(), true);
        },
        '$route.query.appmicro'(value){
            this.syncRequestedMicroRoute(value, false);
        },
        '$route.query.app-detail-micro'(value){
            this.syncRequestedMicroRoute(value || this.getRequestedMicroRoute(), true);
        },
        '$route.query.microapp'(){
            this.syncRequestedMicroRoute(this.getRequestedMicroRoute(), true);
        },
    },
    async created(){
        this.permission = getPermission() || [];
        this.fileeditor = getFileEditor() == 'true';
        this.userRole = getK8sinfo()?.['w7.cc/role'] || '';
        this.selectMenu = [this.$route.meta.routekey]
        this.namespaceActive = useNamespaceStore().namespace;
        this.groupTitle = this.$route.params.group;
        this.hideAppMenu = this.isHideMenu();
        if(this.isMicroPage){
            this.microLoading = true;
        }
        bus.$on('changeAppMenu', this.changeAppMenu);
        await this.getData();
    },
    computed:{
        isTopAppEntry(){
            return this.$route.name === 'topapp-micro' || this.$route.name === 'topapp-direct';
        },
        showTopAppMenu(){
            return this.roles.length > 1 || this.roles[0]?.menus?.length > 1;
        },
        shouldRenderAppMenu(){
            if(!this.isTopAppEntry){
                return true;
            }
            if(!this.showTopAppMenu){
                return false;
            }
            return this.appStore.hideMenu || (this.appStore.menu && !this.appStore.topMenu);
        },
        appDetailMainStyle(){
            return {
                padding: this.isTopAppEntry && this.hideAppMenu ? '0' : '20px',
            };
        },
        appDetailMinHeight(){
            if((window).__POWERED_BY_WUJIE__){
                return 'calc(100vh - 62px)';
            }
            const hasNavbar = this.appStore.navbar && window.self === window.top;
            return hasNavbar ? 'calc(100vh - 60px)' : '100vh';
        },
        appMenuCollapsed: {
            get(){
                return this.appStore.device === 'desktop' && this.appStore.menuCollapse;
            },
            set(value){
                this.setAppMenuCollapsed(value);
            },
        },
        appMenuContainer(){
            return this.appStore.hideMenu ? 'a-drawer' : 'a-layout-sider';
        },
        appMenuContainerProps(){
            if(this.appStore.hideMenu){
                return {
                    visible: this.appMenuDrawerVisible,
                    placement: 'left',
                    footer: false,
                    maskClosable: true,
                    closable: false,
                    width: this.appStore.menuWidth,
                };
            }
            return {
                breakpoint: 'xl',
                width: this.appStore.menuWidth,
                collapsed: this.appMenuCollapsed,
                collapsible: true,
                hideTrigger: true,
            };
        },
        appMenuScrollStyle(){
            return this.appStore.hideMenu
                ? {height:'100%', overflow:'auto'}
                : {flex:'1 1 auto', minHeight:0, overflow:'auto'};
        },
        detailBreadcrumbRoutes(){
            const appTarget = this.getBreadcrumbAppTarget();
            const routes = [
                {name:'root'},
                {name:'app', label:'应用管理'},
                {
                    ...appTarget,
                    label: this.groupTitle || this.$route.params.group || '',
                },
            ];
            const currentLabel = this.getCurrentBreadcrumbLabel();
            if(currentLabel){
                routes.push({
                    name: this.$route.name,
                    label: currentLabel,
                    params: {...this.$route.params},
                    query: {...this.$route.query},
                });
            }
            return routes;
        },
        isMicroPage(){ return this.$route.name == 'group-micro' || this.$route.name == 'group-micro2' || this.$route.name == 'topapp-micro'; },
        isAppDirectPage(){ return this.$route.name == 'group-app-direct' || this.$route.name == 'topapp-direct'; },
        showAppDirect(){ return this.hasThirdpartyCd && this.userRole == 'founder'; },
        menuLocationGroups(){
            return splitMicroAppMenuRoles(this.roles);
        },
        topMenuRoles(){
            return this.menuLocationGroups.topRoles;
        },
        bottomMenuRoles(){
            return this.menuLocationGroups.bottomRoles;
        },
        hasGroupedBottomRoles(){
            return this.menuLocationGroups.hasGroupedBottomRoles;
        },
        bottomMenus(){
            return this.menuLocationGroups.bottomMenus;
        },
        microPanelHeight(){
            if(this.isTopAppEntry){
                const headerOffset = 62;
                const paddingOffset = this.hideAppMenu ? 0 : 40;
                return `calc(100vh - ${headerOffset + paddingOffset}px)`;
            }
            return this.hideAppMenu ? 'calc(100vh - 86px)' : 'calc(100vh - 146px)';
        },
        microPanelStyle(){
            return {
                height: this.microPanelHeight,
                transform: 'translate(0,0)',
            };
        },
        modalExcludeWujieEvents(){
            const group = this.$route.params.group || '';
            const identifie = this.extra?.identifie || this.identifie || '';
            if(/^w7panel-ckm-/.test(group) || /^w7panel-ckm($|-)/.test(identifie)){
                return ['toStoreInstall'];
            }
            return [];
        },
    },
    components: {
        formDrawer,
        wujieModals,
        AppDirect,
        MicroappMenuItems,
    },
    mounted(){
        window.addEventListener('toggle-drawer', this.toggleAppMenuDrawer);
    },
    beforeUnmount(){
        if(this.watchInterval){
            clearInterval(this.watchInterval);
        }
        this.destroyWujieApp();
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
        bus.$off('changeAppMenu', this.changeAppMenu);
        window.removeEventListener('toggle-drawer', this.toggleAppMenuDrawer);

    },
    methods: {
        setAppMenuCollapsed(value){
            if(this.appStore.device === 'desktop'){
                this.appStore.updateSettings({menuCollapse:value});
            }
        },
        toggleAppMenuDrawer(){
            if(!this.appStore.hideMenu || this.hideAppMenu){ return; }
            this.appMenuDrawerVisible = !this.appMenuDrawerVisible;
        },
        handleAppMenuClick(value){
            if(this.findMenu(value)){
                this.handelMicroMenu(value);
            }else{
                this.changeKey(value);
            }
            if(this.appStore.hideMenu){
                this.appMenuDrawerVisible = false;
            }
        },
        getBreadcrumbAppTarget(){
            const group = this.$route.params.group || '';
            const currentApp = this.applist.find(item=>
                item?.name === this.$route.params.id && item?.kind === this.$route.params.kind
            );
            const app = currentApp || this.applist.find(item=>item?.name && item?.kind && !item?.isHelm);
            if(app){
                return {
                    name: 'app-detail-detail',
                    params: {group, kind:app.kind, id:app.name},
                };
            }
            if(this.isHelmApp || this.applist.some(item=>item?.isHelm)){
                return {
                    name: 'group-helm-detail',
                    params: {group},
                };
            }
            if(this.isMicroPage || this.hasThirdpartyCd){
                return {
                    name: this.$route.name === 'group-micro2' ? 'group-micro2' : 'group-micro',
                    params: {group},
                };
            }
            return {name:'app-apps'};
        },
        getCurrentBreadcrumbLabel(){
            if(this.isMicroPage){
                return this.findMenu(this.selectMenu?.[0])?.title
                    || this.findMenu(this.menuActive)?.title
                    || '';
            }
            if(this.isAppDirectPage){
                return '应用直达';
            }
            return typeof this.$route.meta.locale === 'string' ? this.$route.meta.locale : '';
        },
        syncActiveAppTitle(){
            const app = this.applist.find(item=>
                item?.name === this.$route.params.id && item?.kind === this.$route.params.kind
            );
            this.title = app?.title || this.groupTitle || this.$route.params.group || '';
        },
        isHideMenu(){
            const showMenu = Array.isArray(this.$route.query.showMenu)
                ? this.$route.query.showMenu[0]
                : this.$route.query.showMenu;
            return showMenu === false || showMenu === 'false';
        },
        changeAppMenu(show){
            this.hideAppMenu = show === false ? true : this.isHideMenu();
            if(this.hideAppMenu){
                this.appMenuDrawerVisible = false;
            }
        },
        buildIframeSrc(path, route){
            const token = getToken();
            const base = joinWujieUrlRoute(path, route);
            if(!token){ return base; }
            return base
        },
        getMicroAppBaseUrl(){
            if(this.info.load_mode === 'iframe'){
                return this.info.serverUrl || this.info.url || this.info.frontendUrl || '';
            }
            return this.info.frontendUrl || '';
        },
        buildMicroAppUrl(route){
            const targetRoute = route || '';
            if(/^https?:\/\//i.test(targetRoute)){
                return targetRoute;
            }
            const base = this.getMicroAppBaseUrl();
            if(this.info.load_mode === 'iframe'){
                return this.buildIframeSrc(base, targetRoute);
            }
            return joinWujieUrlRoute(base, targetRoute);
        },
        getMicroRoutePrefix(){
            return getWujieRoutePrefix(this.getMicroAppBaseUrl());
        },
        getMicroNormalizePrefix(){
            const base = this.getMicroAppBaseUrl();
            const prefix = this.getMicroRoutePrefix();
            if(this.info.frontendUrl && this.info.frontendUrl !== base){
                return {
                    ...prefix,
                    frontendIndex: this.info.frontendUrl,
                    frontendOther: this.info.frontendUrl,
                };
            }
            return prefix;
        },
        getNavigateMicroRoute(payload){
            const href = typeof payload === 'object'
                ? (payload?.href || payload?.url || payload?.route)
                : payload;
            return normalizeWujieNavigationRoute(href, this.getMicroAppBaseUrl()) || href || '';
        },
        navigateMicro(payload){
            const route = this.getNavigateMicroRoute(payload);
            if(!route){
                return false;
            }

            this.menuActive = route;
            const menu = this.findMenu(route, this.activeMicroAppName);
            this.selectMenu = [menu?.key || route];
            this.replaceMicroRouteQuery(menu?.do || route, this.activeMicroAppName).then(()=>{
                this.wujieInit();
            });
            return true;
        },
        routeChange(v){
            if(this.info.load_mode === 'iframe'){
                this.menuActive = v || '';
                this.wujieInit();
                return;
            }
            bus.$emit("routeChange", (v || '').replace(/^#/,''), {
                fromSubPanel: window.__POWERED_BY_WUJIE__
            });
        },
        isExternalMenuRoute(route){
            return /^https?:\/\//i.test(route || '');
        },
        findMenu(value, microAppName = ''){
            const findMenu = (menus = []) => {
                for(const menu of menus){
                    const matchesApp = !microAppName || menu.microAppName === microAppName;
                    if(matchesApp && (menu.key === value || menu.do === value)){ return menu; }
                    const child = findMenu(menu.children);
                    if(child){ return child; }
                }
                return null;
            };
            for(const role of this.roles){
                const menu = findMenu(role.menus);
                if(menu){ return menu; }
            }
            return null;
        },
        getMenuBindingName(value){
            const menu = this.findMenu(value, this.activeMicroAppName) || this.findMenu(value);
            if(!menu){ return ''; }
            return this.roles.find(role=>role.menus?.some(item=>this.findMenuInTree(item, menu.key)))?.name || '';
        },
        findMenuInTree(menu, key){
            if(menu?.key === key){ return true; }
            return (menu?.children || []).some(child=>this.findMenuInTree(child, key));
        },
        normalizeMicroMenuRoute(value){
            const bases = [
                this.getMicroAppBaseUrl(),
                this.microAppBaseInfo?.frontendUrl,
                ...Object.values(this.microAppRoleConfig || {}).flatMap(config=>[config?.serverUrl, config?.url]),
            ].filter(Boolean);
            for(const base of [...new Set(bases)]){
                const route = normalizeWujieSyncRoute(value, getWujieRoutePrefix(base));
                if(this.getMenuBindingName(route)){
                    return route;
                }
            }
            return normalizeWujieSyncRoute(value, this.getMicroNormalizePrefix());
        },
        getRequestedMicroRoute(){
            const value = this.$route.query?.[APP_DETAIL_MICRO_QUERY]
                || this.$route.query?.do
                || this.$route.query?.appmicro;
            return Array.isArray(value) ? value[0] : value;
        },
        getMicroRouteQuery(route, microAppName = this.activeMicroAppName){
            const query = {
                ...this.$route.query,
                [APP_DETAIL_MICRO_RESOURCE_QUERY]: microAppName,
            };
            delete query.appmicro;
            if(this.isTopAppEntry){
                delete query[APP_DETAIL_MICRO_QUERY];
                query.do = route;
            }else{
                delete query.do;
                query[APP_DETAIL_MICRO_QUERY] = route;
            }
            return query;
        },
        replaceMicroRouteQuery(route, microAppName = this.activeMicroAppName){
            return this.$router.replace({
                query: this.getMicroRouteQuery(route, microAppName),
            }).catch(()=>{});
        },
        normalizeMicroRouteForCompare(route){
            const normalizeQuery = value => {
                const questionIndex = value.indexOf('?');
                if(questionIndex < 0){
                    return value;
                }
                const path = value.slice(0, questionIndex);
                const entries = [...new URLSearchParams(value.slice(questionIndex + 1)).entries()]
                    .sort(([leftKey, leftValue], [rightKey, rightValue])=>{
                        const keyOrder = leftKey.localeCompare(rightKey);
                        return keyOrder || leftValue.localeCompare(rightValue);
                    });
                const query = new URLSearchParams(entries).toString();
                return query ? `${path}?${query}` : path;
            };
            const value = String(route || '');
            const hashIndex = value.indexOf('#');
            if(hashIndex < 0){
                return normalizeQuery(value);
            }
            const normalizedMainRoute = normalizeQuery(value.slice(0, hashIndex));
            const mainRoute = normalizedMainRoute === '/' ? '' : normalizedMainRoute;
            const normalizedHashRoute = normalizeQuery(value.slice(hashIndex + 1));
            const hashRoute = normalizedHashRoute && !normalizedHashRoute.startsWith('/')
                ? `/${normalizedHashRoute}`
                : normalizedHashRoute;
            return `${mainRoute}#${hashRoute}`;
        },
        isSameMicroRoute(leftRoute, rightRoute){
            return this.normalizeMicroRouteForCompare(leftRoute)
                === this.normalizeMicroRouteForCompare(rightRoute);
        },
        syncMicroRouteFromChild(route, microAppName){
            if(!this.isMicroPage || microAppName !== this.activeMicroAppName){
                return;
            }
            const normalizedRoute = this.getNavigateMicroRoute(route);
            if(!normalizedRoute){
                return;
            }
            const menu = this.findMenu(normalizedRoute, microAppName);
            const targetRoute = menu?.do || normalizedRoute;
            const requestedMicroApp = this.$route.query?.[APP_DETAIL_MICRO_RESOURCE_QUERY];
            const requestedMicroAppName = Array.isArray(requestedMicroApp)
                ? requestedMicroApp[0]
                : requestedMicroApp;
            const requestedRoute = this.normalizeMicroMenuRoute(this.getRequestedMicroRoute());
            if(requestedMicroAppName === microAppName && this.isSameMicroRoute(requestedRoute, targetRoute)){
                return;
            }

            if(menu){
                this.menuActive = menu.do;
                this.selectMenu = [menu.key];
            }
            this.replaceMicroRouteQuery(targetRoute, microAppName);
        },
        syncRequestedMicroRoute(requestedRoute, shouldNavigate){
            if(!this.isMicroPage || !this.roles.length){ return; }
            requestedRoute = Array.isArray(requestedRoute) ? requestedRoute[0] : requestedRoute;
            if(!requestedRoute){ return; }
            const requestedMicroApp = this.$route.query?.[APP_DETAIL_MICRO_RESOURCE_QUERY];
            const requestedMicroAppName = Array.isArray(requestedMicroApp)
                ? requestedMicroApp[0]
                : requestedMicroApp;
            if(this.redirectLegacyAppDirect(requestedRoute, requestedMicroAppName, true)){
                return;
            }
            const normalizedRoute = this.normalizeMicroMenuRoute(requestedRoute);
            const menu = this.findMenu(normalizedRoute, requestedMicroAppName)
                || this.findMenu(normalizedRoute);
            if(!menu){
                if(!shouldNavigate){
                    this.selectMenu = [normalizedRoute];
                }
                return;
            }

            const previousMenu = this.menuActive;
            const previousMicroAppName = this.activeMicroAppName;
            const previousBinding = this.getMenuBindingName(this.selectMenu?.[0] || previousMenu);
            if(menu.microAppName !== this.activeMicroAppName){
                this.applyMicroApp(this.microApps.find(item=>item?.metadata?.name===menu.microAppName));
            }
            this.menuActive = menu.do;
            this.selectMenu = [menu.key];
            const currentBinding = this.applyMenuRuntimeConfig(menu.key);
            if(!shouldNavigate || (
                previousMenu === this.menuActive
                && previousMicroAppName === this.activeMicroAppName
                && previousBinding === currentBinding
            )){
                return;
            }
            if(previousMicroAppName !== this.activeMicroAppName || previousBinding !== currentBinding || this.isExternalMenuRoute(previousMenu) || this.isExternalMenuRoute(this.menuActive)){
                this.wujieInit();
            }else{
                this.routeChange(this.menuActive);
            }
        },
        redirectLegacyAppDirect(value, microAppName = '', replace = true){
            if(value !== LEGACY_APP_DIRECT_DO){ return false; }
            const query = {...this.$route.query};
            delete query[APP_DETAIL_MICRO_QUERY];
            delete query.do;
            delete query.appmicro;
            delete query.showMenu;
            if(microAppName){
                query[APP_DETAIL_MICRO_RESOURCE_QUERY] = microAppName;
            }
            const target = {
                name: this.isTopAppEntry ? 'topapp-direct' : 'group-app-direct',
                params: {...this.$route.params, group:this.microAppGroup || this.$route.params.group},
                query,
            };
            const navigation = replace
                ? this.$router.replace(target)
                : this.$router.push(target);
            navigation.catch(()=>{});
            return true;
        },
        applyMenuRuntimeConfig(route){
            const userRole = getK8sinfo()['w7.cc/role'];
            const bindingName = this.getMenuBindingName(route);
            const roleProps = this.microAppRoleConfig?.[bindingName]
                || this.microAppRoleConfig?.[userRole]
                || this.microAppRoleConfig?.founder
                || {};
            this.info = {
                ...this.microAppBaseInfo,
                ...roleProps,
                ...(roleProps.frontend_props || {}),
                appgroup: this.appGroupName,
                group: this.appGroupName,
                microappName: this.activeMicroAppName,
            };
            return bindingName;
        },
        applyMicroApp(item){
            if(!item){ return; }
            const microAppName = item?.metadata?.name || '';
            const groupName = item?.metadata?.labels?.[RESOURCE_GROUP_LABEL]
                || this.microAppGroup
                || this.$route.params.group;
            this.microApp = item;
            this.appGroupName = groupName;
            this.activeMicroAppName = microAppName;
            this.microAppRoleConfig = item?.spec?.['config-v2']?.props?.roleConfig || {};
            this.microAppBaseInfo = {
                appgroup: groupName,
                group: groupName,
                microappName: microAppName,
                frontendUrl: item?.spec?.frontendUrl,
                backendUrl: item?.spec?.backendUrl,
                appImage: item?.spec?.config?.props?.image,
                ...item?.spec?.config?.props,
            };
            this.extra = {
                identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                version: item.metadata?.labels?.['w7.cc/version'] || '',
                releaseName: groupName,
                namespace: item.metadata?.namespace,
            };
            this.applyMenuRuntimeConfig('');
        },
        wujieInit(){
            const signature = [
                this.activeMicroAppName,
                this.getMenuBindingName(this.selectMenu?.[0] || this.menuActive),
                this.menuActive || '',
                this.getMicroAppBaseUrl(),
                this.info.load_mode || '',
            ].join('\n');
            if(this.wujieInitPromise){
                // 首次进入页面时，菜单和查询参数同步可能会请求初始化同一个
                // iframe 两次。第二次销毁已经跳转到跨域页面的 degrade iframe
                // 会触发 Wujie 读取 __WUJIE_EVENTLISTENER__ 的 SecurityError。
                // 仅在初始化目标确实变化时排队重载，并始终以最后一次请求为准。
                this.wujiePendingSignature = signature === this.wujieInitSignature ? '' : signature;
                return this.wujieInitPromise;
            }
            this.microLoading = true;
            this.wujieInitSignature = signature;
            this.wujieInitPromise = this._wujieInit().finally(()=>{
                this.wujieInitPromise = null;
                const shouldReload = this.wujiePendingSignature
                    && this.wujiePendingSignature !== this.wujieInitSignature;
                this.wujiePendingSignature = '';
                if(shouldReload){
                    this.wujieInit();
                    return;
                }
                this.microLoading = false;
            });
            return this.wujieInitPromise;
        },
        async destroyWujieApp(){
            const destroy = this.wujieDestroy;
            if(!destroy){
                return;
            }
            this.wujieDestroy = null;
            if(this.info.load_mode === 'iframe'){
                const iframe = document.querySelector(`${APP_DETAIL_MICRO_EL} iframe`);
                if(iframe){
                    let isCrossOrigin = false;
                    try{
                        void iframe.contentWindow?.__WUJIE_EVENTLISTENER__;
                    }catch{
                        isCrossOrigin = true;
                    }
                    if(isCrossOrigin){
                        await new Promise(resolve=>{
                            const done = ()=>resolve();
                            iframe.addEventListener('load', done, {once:true});
                            iframe.src = 'about:blank';
                            setTimeout(done, 1000);
                        });
                    }
                }
            }
            try{
                await destroy();
            }catch(error){
                console.warn('Failed to destroy detail app', error);
            }
        },
        async _wujieInit(){
            
            const {data} = await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.releaseName,
            }}).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
                return res;
            })

            // 制品应用详情每次打开都重新请求制品 info；即使前端包已经下载到本地，
            // 也能在试用期届满后收到 ZPK_TRIAL_EXPIRED。
            const bindings = this.microApp?.spec?.bindings || [];
            const isArtifactMenu = bindings.some(binding=>binding.name === 'other' && (binding.menu || []).some(menu=>menu.do === this.menuActive));
            const repoUrl = data?.respoUrl;
            if(repoUrl && !isArtifactMenu){
                await panelApi.get('/zpk/config', {
                    params: { repoUrl },
                    noAlert: true,
                });
            }

            
            await this.destroyWujieApp();

            let is_register = false;
            let thirdparty_cd_token = '';
            if(!this.downOk){
                this.info.frontendUrl = data.proxyUrl;
                this.downOk = true;
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.releaseName}`)
                // this.extra.setTimeout = setTimeout(()=>{
                //     this.wujieInit();
                // }, 5000)
                // return;
            }
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let frontProps = {};
            await panelApi.get(`/microapp/${this.activeMicroAppName}/frontprops`, { noAlert: true }).then(res=>{
                frontProps = res?.data || {};
            }).catch(()=>{});
            const microappName = this.activeMicroAppName;
            const appGroupName = this.appGroupName;
            const reverseDependentApps = await this.loadReverseDependentApps(appGroupName).catch(()=>[]);
            if(this.info.frontend_props) {
                this.info.frontend_props = {
                    ...resolveFrontendPropTemplates(this.info.frontend_props, frontProps),
                    ...frontProps,
                    group: appGroupName,
                }
            }
            const runtimeFrontProps = {
                ...frontProps,
                group: appGroupName,
            };
            const loginCloud = (componentAppId)=>{
                const appId = typeof componentAppId === 'object' ? componentAppId?.componentAppId : componentAppId;
                return panelApi.get('/js-cloud-code', {
                    params: { componentAppId: appId },
                    noAlert: true,
                }).then(res=>res.data);
            };
            const proxyBackendUrl = getWujieProxyBackendUrl(this.info.backendUrl);
            let props = {
                url: proxyBackendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
                ...frontProps,
                appgroup: appGroupName,
                group: appGroupName,
                microappName,
                reverse_dependent_apps: reverseDependentApps,
                loginCloud,
                runningFirstPod,
                podShell,
                microappProxy: createMicroappProxy(proxyBackendUrl),
                k8sproxy: createK8sProxy(),
                panelProxy: createPanelProxy(),
                navigateMicro: (payload) => this.navigateMicro(payload),
                restartMicroApp: (payload) => this.navigateMicro(payload),
            }
            appendWujieModalHandles(props, () => this.$refs.wujieModals);
            console.log(props)
            const baseAppUrl = this.buildMicroAppUrl(this.menuActive || '');
            const appUrl = this.info.load_mode === 'iframe'
                ? appendWujieProxyRequestQuery(baseAppUrl, {
                    proxyRequest: this.info.proxy_request,
                    frontProps: runtimeFrontProps,
                    backendUrl: proxyBackendUrl,
                    group: appGroupName,
                    role: getK8sinfo()['w7.cc/role'],
                })
                : baseAppUrl;
            const plugins = [
                createWujieHostRoutePlugin(route=>this.syncMicroRouteFromChild(route, microappName)),
            ];
            if(this.info.load_mode === 'iframe'){
                plugins.unshift(createWujieRequestCredentialsPlugin(), createWujieRequirePlugin());
            }
            try{
                this.wujieDestroy = await startApp({
                name: APP_DETAIL_MICRO_NAME,
                url: appUrl,
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.menuActive || ''),
// url: 'http://218.23.2.48:9090' + this.info.frontendUrl + (this.menuActive || ''),
                el: APP_DETAIL_MICRO_EL,
                // alive: true,
                degrade: this.info.load_mode === 'iframe',
                degradeAttrs: { style: 'border:0;display:block;' },
                sync: false,
                props: props,
                prefix: this.getMicroRoutePrefix(),
                plugins,
                fetch: this.info.load_mode === 'iframe' ? wujieFetch : null,
                loadError: (url, error)=>{
                    console.log(`appdetail loadError`, url, error);
                },
                });
                console.log(`appdetail start success`, appUrl);
            }catch(error){
                console.log(`appdetail start error`, appUrl, error);
            }
            // startApp({name: APP_DETAIL_MICRO_NAME});
            
// 测试
// setTimeout(()=>{
//     this.zip({
//         pid: {
//             namespace: 'default',
//             HostIp: '172.16.1.162',
//             containerId: 'containerd://433217e458043e6760b415a791c2a9ad0757b23b66aa4d539c4a1cef7898547e',
//             containerName: 'w7-go',
//             podName: 'w7-go-7dc9bf7cf7-g8p4g',
//         },
//         output: '/home/txt.zip',
//         input: ['/home/aa.txt','/home/bb.txt'],
//     },(v)=>{
//         console.log(v);
//     })
// },3000)
        },
        async handelMicroMenu(v){
            const previousMenu = this.menuActive;
            const previousMicroAppName = this.activeMicroAppName;
            const previousBinding = this.getMenuBindingName(this.selectMenu?.[0] || previousMenu);
            const menu = this.findMenu(v);
            if(!menu){ return; }
            if(this.redirectLegacyAppDirect(menu.do, menu.microAppName, false)){
                return;
            }
            if(menu.microAppName !== this.activeMicroAppName){
                this.applyMicroApp(this.microApps.find(item=>item?.metadata?.name===menu.microAppName));
            }
            this.menuActive = menu.do;
            this.selectMenu = [menu.key];
            const currentBinding = this.applyMenuRuntimeConfig(menu.key);
            if(this.isMicroPage){
                const shouldReinitialize = previousMicroAppName !== this.activeMicroAppName
                    || previousBinding !== currentBinding
                    || this.isExternalMenuRoute(previousMenu)
                    || this.isExternalMenuRoute(this.menuActive);
                await this.replaceMicroRouteQuery(this.menuActive, this.activeMicroAppName);
                if(shouldReinitialize){
                    this.wujieInit();
                }else{
                    this.routeChange(this.menuActive);
                }
            }else{
                const query = this.isTopAppEntry
                    ? {
                        do: this.menuActive,
                        [APP_DETAIL_MICRO_RESOURCE_QUERY]: this.activeMicroAppName,
                    }
                    : {
                        [APP_DETAIL_MICRO_QUERY]: this.menuActive,
                        [APP_DETAIL_MICRO_RESOURCE_QUERY]: this.activeMicroAppName,
                    };
                this.$router.push({
                    name: this.isTopAppEntry ? 'topapp-micro' : 'group-micro',
                    params: {...this.$route.params, group:this.microAppGroup || this.$route.params.group},
                    query,
                });
            }
        },
        getFront(microApps){
            const getMicroApps = microApps
                ? Promise.resolve(Array.isArray(microApps) ? microApps : [microApps])
                : this.loadMicroApps(this.microAppGroup || this.$route.params.group);
            getMicroApps.then(items=>{
                if(!items.length){ return; }
                const sortedItems = sortVisibleAppGroupMicroApps(
                    items,
                    this.microAppGroup || this.$route.params.group,
                );
                this.microApps = sortedItems;
                this.getMenu(sortedItems);
                const requestedMicroAppName = this.$route.query?.[APP_DETAIL_MICRO_RESOURCE_QUERY];
                const item = sortedItems.find(item=>item?.metadata?.name===requestedMicroAppName)
                    || sortedItems.find(item=>item?.metadata?.name===this.activeMicroAppName)
                    || sortedItems[0];
                this.applyMicroApp(item);
                if(this.isMicroPage){
                    const routeMenu = this.microAppGroup === this.$route.params.group
                        ? this.getRequestedMicroRoute()
                        : '';
                    const appDetailMicro = this.normalizeMicroMenuRoute(routeMenu);
                    const selectedMenu = this.findMenu(appDetailMicro, this.activeMicroAppName)
                        || this.roles.flatMap(role=>role.menus || []).find(menu=>menu.microAppName===this.activeMicroAppName && menu.is_default==1)
                        || this.roles.flatMap(role=>role.menus || []).find(menu=>menu.microAppName===this.activeMicroAppName)
                        || this.roles?.[0]?.menus?.[0];
                    if(this.redirectLegacyAppDirect(selectedMenu?.do || appDetailMicro, selectedMenu?.microAppName, true)){
                        return;
                    }
                    if(selectedMenu?.microAppName !== this.activeMicroAppName){
                        this.applyMicroApp(sortedItems.find(item=>item?.metadata?.name===selectedMenu?.microAppName));
                    }
                    this.menuActive = selectedMenu?.do || appDetailMicro || '';
                    this.selectMenu = [selectedMenu?.key || this.menuActive];
                    this.applyMenuRuntimeConfig(this.selectMenu[0]);
                    this.$nextTick(async()=>{
                        await this.replaceMicroRouteQuery(this.menuActive, this.activeMicroAppName);
                        this.wujieInit();
                    })
                }
            }).catch(()=>{
                this.noMicroJump();
            })
        },
        loadMicroApps(groupName){
            return loadVisibleAppGroupContext(k8sproxy, this.namespaceActive, groupName).then(context=>{
                this.reverseDependentAppCache[groupName] = context?.reverseDependentApps || [];
                const resources = context?.microApps || [];
                const result = [];
                const names = new Set();
                resources.forEach(microApp=>{
                    const name = microApp?.metadata?.name;
                    const hasThirdpartyCdMenu = (microApp?.spec?.bindings || []).some(binding=>
                        binding?.support === 'thirdparty_cd' && Array.isArray(binding?.menu) && binding.menu.length > 0
                    );
                    if(!name || names.has(name) || !hasThirdpartyCdMenu){ return; }
                    names.add(name);
                    result.push(microApp);
                });
                return result;
            });
        },
        async loadTopMicroApps(groupName){
            const selected = await panelApi.get(`/microapp/${encodeURIComponent(groupName)}/info`, {noAlert:true})
                .then(res=>res?.data)
                .catch(()=>null);
            const resolvedGroupName = selected?.metadata?.labels?.[RESOURCE_GROUP_LABEL]
                || String(selected?.metadata?.name || groupName).replace(/-root$/, '');
            const microAppApi = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(this.namespaceActive)}/microapps`;
            const groupedMicroApps = await loadResourcesByGroupNames(
                k8sproxy,
                microAppApi,
                [resolvedGroupName],
                true,
            ).catch(()=>[]);
            const microAppMap = new Map();
            [selected, ...groupedMicroApps].forEach((microApp)=>{
                const name = microApp?.metadata?.name;
                const hasThirdpartyCdMenu = (microApp?.spec?.bindings || []).some(binding=>
                    binding?.support === 'thirdparty_cd' && Array.isArray(binding?.menu) && binding.menu.length > 0
                );
                if(!name || !hasThirdpartyCdMenu){ return; }
                const normalizedName = microApp === selected && microApp?.metadata?.labels?.['microapp.w7.cc/from'] === 'root'
                    ? String(name).replace(/-root$/, '')
                    : String(name);
                if(!microAppMap.has(normalizedName)){
                    microAppMap.set(normalizedName, microApp);
                }
            });
            return {
                groupName: resolvedGroupName,
                items: resolvePresentedMicroApps([...microAppMap.values()], resolvedGroupName),
            };
        },
        loadMicroApp(groupName){
            return this.loadMicroApps(groupName).then(items=>items[0] || null);
        },
        loadReverseDependentApps(appGroupName){
            if(!appGroupName){return Promise.resolve([])}
            if(Object.prototype.hasOwnProperty.call(this.reverseDependentAppCache, appGroupName)){
                return Promise.resolve(this.reverseDependentAppCache[appGroupName]);
            }
            if(this.reverseDependentAppRequests[appGroupName]){
                return this.reverseDependentAppRequests[appGroupName];
            }
            const request = loadMicroAppReverseDependentApps(
                k8sproxy,
                this.namespaceActive,
                appGroupName,
            ).then(items=>{
                const reverseDependentApps = items || [];
                this.reverseDependentAppCache[appGroupName] = reverseDependentApps;
                return reverseDependentApps;
            }).finally(()=>{
                delete this.reverseDependentAppRequests[appGroupName];
            });
            this.reverseDependentAppRequests[appGroupName] = request;
            return request;
        },
        getMenu(microApps){

            let userRole = getK8sinfo()['w7.cc/role'];

            let roles = []
            try{
                const items = Array.isArray(microApps) ? microApps : [];
                items.forEach(item=>{
                    const microAppName = item?.metadata?.name || '';
                    const microAppTitle = item?.spec?.title || microAppName;
                    let rl = (item?.spec?.bindings || []).filter(i=>i.support == "thirdparty_cd");
                    rl.forEach((i, roleIndex)=>{
                        let menus = i.menu || [];
                        menus = menus.map(menu=>({
                            ...menu,
                            key: `${microAppName}:${menu.do}`,
                            microAppName,
                            microAppTitle,
                            location: menu.location || (i.location === 'bottom' ? 'back' : i.location),
                        }));
                        menus.sort((a,b)=>b.displayorder-a.displayorder);
                        menus = this.transformMenu(menus)

                        roles.push({
                            key: `${microAppName}:${i.name}:${roleIndex}`,
                            title: ROLE_NAME[i.name] || i.title || i.name,
                            name: i.name,
                            microAppName,
                            microAppTitle,
                            menus: menus,
                        })
                    })
                })
            }catch{}
            roles.sort((a, b) => (b.name === 'founder') - (a.name === 'founder'));

            if(this.isTopAppEntry){
                const visibleRoles = userRole=='founder'
                    ? roles
                    : roles.filter(i=>i.name==userRole);
                this.roles = this.filterMenu(visibleRoles).filter(i=>i.menus?.length);
            }else{
                roles = this.filterMenu(roles);
                if(userRole=='founder'){
                    this.roles = roles;
                }else{
                    this.roles = roles.filter(i=>i.name==userRole);
                }
            }
            if(!this.roles?.length){
                this.noMicroJump();
            }
            // console.log(bindings,roles,'xxxxxxxxxxx')
        },
        noMicroJump(){
            if(!this.isMicroPage){return}
            if(this.isTopAppEntry){return}
            if(this.isHelmApp){
                this.$router.push({path:'/app/appgroup/'+ this.$route.params.group+'/helm/detail'}).then(()=>{
                    this.selectMenu = [this.$route.meta.routekey]
                });
                return;
            }
            let app = this.applist.find(i=>!i.isHelm)
            this.$router.push({name:'app-detail',params:{group:this.$route.params.group, id:app?.name, kind:app?.kind}}).then(()=>{
                this.selectMenu = [this.$route.meta.routekey]
            });
        },
        
        filterMenu(roles){
            function filterDuplicateMenus(menuArray) {
                // 用于记录已经出现过的do路径，Set查询效率更高
                const existedPaths = new Set();
                
                // 遍历数组并处理每个元素，返回新数组（不修改原数组）
                return menuArray.map(item => {
                    // 过滤当前元素的menus，只保留未出现过的路径
                    const filteredMenus = item.menus.filter(menu => {
                        // 确保菜单标识存在，避免报错
                        if (!menu.key) return false;
                        // 如果路径未出现过，则保留并记录
                        if (!existedPaths.has(menu.key)) {
                            existedPaths.add(menu.key);
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
            return filterDuplicateMenus(roles);
        },

        transformMenu(data) {
            const map = new Map();
            data.forEach(item => map.set(item.do, item));
            return data.filter(item => {
                const node = map.get(item.do);
                if (item.parent && map.has(item.parent)) {
                    const parent = map.get(item.parent);
                    parent.children = [...(parent.children || []), {...node}];
                    return false;
                }
                return true;
            });
        },
        // parseMenu(menu) {
        //     const parentMenu = [];
        //     const menuMap = {};

        //     menu.forEach(item => {
        //         const newItem = {
        //             do: item.do,
        //             location: item.location || '',
        //             icon: item.icon || '',
        //             title: item.title,
        //             children: []
        //         };
        //         menuMap[item.do] = newItem;

        //         const parentPath = item.do.split('/').slice(0, -1).join('/');
        //         if (parentPath && menuMap[parentPath]) {
        //             menuMap[parentPath].children.push(newItem);
        //         } else {
        //             parentMenu.push(newItem);
        //         }
        //         if(!this.selectMenu[0] && this.menuActive){
        //         }
        //     });

        //     return parentMenu;
        // },
        tabClick(v){
            let applistItem = this.applist.find(i=>i.key==v);
            this.isHelmPage = applistItem.isHelm;
            if(this.isHelmPage){
                this.$router.push({
                    name: 'group-helm',
                    params: {
                        ...this.$route.params,
                        group: applistItem.groupName,
                    },
                }).then(()=>{
                    this.appname = 'helm-'+this.$route.params.group;
                    this.selectMenu = [this.$route.meta.routekey]
                });
            }else{
                let item = this.applist.find(i=>i.key==v);
                this.$router.push({
                    name: 'app-detail-detail',
                    params:{
                        ...this.$route.params,
                        group: item.groupName,
                        id: item.name,
                        kind: item.kind,
                    },
                }).then(()=>{
                    this.getData();
                    this.selectMenu = [this.$route.meta.routekey];
                });
            }
        },
        // toMicro(v){
        //     // console.log(v);
        //     this.$router.push('/app/appgroup/'+this.$route.params.group+'/'+ this.$route.params.kind +'/'+ this.$route.params.id +'/micro/'+ v);
        // },
        async delApp(key){
            let item = this.applist.find(i=>i.key==key);
            if(!item){return}
            if(item.isHelm){
                try{
                    await uninstallAppGroup(k8sproxy, this.namespaceActive, item.groupName);
                    this.$message.success('操作成功');
                    if(this.appname=='helm-'+item.groupName){
                        await this.$router.push({
                            name: 'group-helm',
                            params: {
                                ...this.$route.params,
                                group: this.applist[0].groupName,
                            },
                        });
                        this.appname = 'helm-'+this.$route.params.group;
                        this.getData();
                    }
                }catch(error){
                    this.$message.error(error?.message || '操作失败，请稍后重试');
                }
                return;
            }
            this.checkDelete = {
                show: true,
                name: item.title,
                ok: ()=>{
                    this.checkDelete.show = false;
                    k8sproxy.delete("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ item.kind +"/"+item.name).then(async res=>{
                        if(!res?.data){return}
                        // let rls = this.applist.find(i=>i.name==name);
                        // if(rls?.releaseName){
                        //     k8sproxy.delete("/api/v1/helm/releases/" + rls.releaseName, {params:{
                        //         namespace: rls.namespace,
                        //     },noAlert:true});
                        // }
                        k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/services/"+ item.name+'-lb',{noAlert:true}).finally(()=>{
                            this.$message.success('操作成功');
                            if(this.$route.params.id==item.name && this.$route.params.kind==item.kind){
                                this.appname = '';
                                this.$router.push({
                                    params:{
                                        kind: '',
                                        id: '',
                                    }
                                }).then(()=>{
                                    this.getData();
                                });
                            }else{
                                this.getData();
                            }
                        })
                    })
                }
            }
        },
        createApp(){
            this.form.id = '';
            this.form.name = '';
            this.form.show = true;
            this.form.suffix = this.applist?.filter(i=>i.suffix)?.[0]?.suffix;
            if(!this.form.suffix){
                this.form.suffix = this.applist?.filter(i=>i.name)?.[0]?.name?.replace(/^[^-]+\-?/,'');
            }
            // this.form.tabs = this.applist.filter(i=>i.canedit).map(i=>({
            //     name: i.name,
            //     title: i.title,
            //     suffix: i.suffix,
            //     kind: i.kind,
            // }))
            // this.$nextTick(()=>{
            //     setTimeout(()=>{
            //         this.$refs.addappdrawer?.addTab();
            //     },400)
            // })
        },
        openForm(v){
            this.form.id = this.$route.params.kind + this.$route.params.id;
            this.form.name = this.$route.params.id;
            this.form.show = true;
            this.form.tabs = this.applist.filter(i=>i.canedit).map(i=>({
                name: i.name,
                title: i.title,
                suffix: i.suffix,
                kind: i.kind,
            }))
        },
        closeForm(v){
            this.form.show = false;
            if(v){ this.getData(); }
        },
        // 只刷新data
        dataDetail(){
            if(this.isHelmPage){ return Promise.resolve({}); }
            if(!this.$route.params.kind || !this.$route.params.id){return Promise.resolve({}); }
            return new Promise((resolve,reject)=>{
                return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+this.$route.params.kind+"/"+this.$route.params.id ).then(res=>{
                    let data = res?.data || {};
                    this.data = data;
                    resolve(res);
                }).catch(()=>{
                    reject();
                })
            })
        },
        watchStatus(){
            let status = 1;
            this.applist.map(i=>{
                if(i.status!=1&&!i.isHelm){status = i.status;}
            })
            if(this.watchInterval){ clearInterval(this.watchInterval); }
            // console.log('watch', status)
            if(status==1){return;}
            this.watchInterval = setInterval(()=>{
                k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group).then(async res=>{
                    let items = filterAppGroupWorkloadItems(res?.data?.status?.items || []);
                    let status = 1;
                    for(let i in items){
                        let kind = items[i]?.kind?.toLowerCase() + 's';
                        let a = this.applist.find(app=>app.name==items[i].name && app.kind==kind);
                        if(!a){continue;}
                        let is = items[i].isZeroReplicas? 0 : ( items[i].ready?1:2);
                        a.status = is;
                        if(is!=1){status=is;}
                    }
                    if(status==1){
                        clearInterval(this.watchInterval)
                        this.dataDetail();
                    }
                });
            },5000);
        },
        arrangeList(data){
            let helmTab = [];
            let list = [];
            
            let items = filterAppGroupWorkloadItems(data?.status?.items || []);
            if(data?.spec?.isHelm){
                helmTab.push({
                    title: (data?.metadata?.annotations?.title || data?.metadata?.name || '') + '资源概览',
                    isHelm: true,
                    groupName: data.metadata?.name,
                    key: 'helm-' + data.metadata?.name,
                    suffix: data?.spec?.suffix || '',
                });
            }
            
            for(let i in items){
                let groupItem = items[i];
                let name = groupItem.name;
                let kind = groupItem?.kind?.toLowerCase() + 's';
                list.push({
                    key: kind + name,
                    name: name,
                    kind: kind,
                    title: groupItem.title || name,
                    status: groupItem.isZeroReplicas? 0 : (groupItem.ready?1:2),
                    suffix: data?.spec?.suffix || '', // || data?.metadata?.labels?.['w7.cc/suffix'] || '',
                    groupName: data.metadata?.name,
                    canedit: true,
                })
                if(this.$route.params.id==groupItem.name && this.$route.params.kind==kind){
                    this.title = groupItem.title || groupItem.name;
                }
            }
            
            return {
                helmTab,
                list,
            }
        },
        async getTopAppData(){
            const requestedGroup = String(this.$route.params.group || '');
            const topApp = this.appStore.topApps.find(item=>item?.name === requestedGroup);

            this.groupRedirecting = true;
            this.groupTitle = topApp?.title || requestedGroup;
            this.title = this.groupTitle;
            this.appGroups = [];
            this.activeGroup = '';
            this.applist = [];
            this.roles = [];
            this.isHelmApp = false;
            this.hasThirdpartyCd = false;
            this.microApp = null;
            this.microApps = [];
            this.microAppGroup = '';
            this.appGroupName = '';
            this.activeMicroAppName = '';

            const {groupName, items} = await this.loadTopMicroApps(requestedGroup);
            if(!this.isTopAppEntry || String(this.$route.params.group || '') !== requestedGroup){
                return;
            }

            this.appGroups = [{
                name: groupName,
                title: this.groupTitle,
                apps: [],
            }];
            this.activeGroup = groupName;
            this.microAppGroup = groupName;
            this.groupRedirecting = false;
            if(!items.length){
                this.microLoading = false;
                return;
            }

            this.microApps = items;
            this.microApp = items[0];
            this.hasThirdpartyCd = true;
            this.getFront(items);
        },
        async getData(){
            if(this.isMicroPage){
                this.microLoading = true;
            }
            useLoadingStore().loading = true;
            this.reverseDependentAppCache = {};
            this.reverseDependentAppRequests = {};

            const currentGroup = this.$route.params.group;
            this.hasThirdpartyCd = false;
            this.microApp = null;
            this.microApps = [];
            this.microAppGroup = '';
            this.appGroupName = '';
            this.activeMicroAppName = '';

            this.isHelmPage = /^group\-helm(\-|$)/.test(this.$route.name);
            if(this.isHelmPage){
                this.appname = 'helm-'+this.$route.params.group;
            }else{
                this.appname = (this.$route.params.kind && this.$route.params.id) ? this.$route.params.kind + this.$route.params.id : '';
            }
            if(this.isTopAppEntry){
                try{
                    await this.getTopAppData();
                }catch(error){
                    if(this.$route.params.group === currentGroup && this.isMicroPage){
                        this.microLoading = false;
                    }
                    throw error;
                }finally{
                    useLoadingStore().loading = false;
                }
                return;
            }
            const microAppRequest = this.loadMicroApps(currentGroup).then(items=>{
                if(this.$route.params.group !== currentGroup){return false}
                const microApps = sortVisibleAppGroupMicroApps(items, currentGroup);
                if(!microApps.length){return false}
                this.microApps = microApps;
                this.microApp = microApps[0];
                this.microAppGroup = currentGroup;
                this.hasThirdpartyCd = true;
                this.getFront(microApps);
                return true;
            }).catch(()=>false);
            await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {
            }).then(async res=>{
                this.groupTitle = res?.data?.spec?.title
                    || res?.data?.metadata?.annotations?.title
                    || this.groupTitle;
                const {helmTab,list} = this.arrangeList(res?.data);
                this.identifie = res?.data?.metadata?.annotations?.['w7.cc/identifie'];
                this.isHelmApp = Boolean(helmTab?.length);
                this.applist = helmTab.concat(list);
                this.syncActiveAppTitle();
                const hasMicroApp = await microAppRequest;
                if(!hasMicroApp && this.$route.params.group === currentGroup && this.isMicroPage){
                    this.noMicroJump();
                }
                this.watchStatus();
                useLoadingStore().loading = false;
            }).then(()=>{
                new Promise((resolve,reject)=>{
                    if(!this.isMicroPage && !this.isAppDirectPage && !this.appname && (!this.$route.params.kind || !this.$route.params.id)){
                        let app = this.applist.find(i=>i.kind&&i.name);
                        this.appname = app.kind + app.name;
                        this.$router.push({params:{
                            kind: app.kind,
                            id: app.name,
                        }}).then(()=>{
                            resolve();
                        });
                    }else{
                        resolve();
                    }
                }).then(()=>{
                    return this.dataDetail();
                }).then(res=>{
                    // let data = res?.data || {};
                    
                    // if(data?.metadata?.annotations?.['w7.cc/bindings'] && data?.metadata?.annotations?.['w7.cc/static-url']){
                    //     let bindings = data.metadata.annotations['w7.cc/bindings'];
                    //     let location = data.metadata.annotations['w7.cc/static-url'];
                    //     try{
                    //         bindings = JSON.parse(bindings);
                    //     }catch(e){ bindings = []; }
                    //     let menu = bindings?.find(i=>i.name=='founder'&&i.support=='thirdparty_cd');
                    //     if(menu?.menu?.length){
                    //         this.appMenu = menu.menu.map(i=>{
                    //             i.do = i.do.replace(/^\//,'');
                    //             return i;
                    //         });
                    //         this.appLocation = location;
                    //     }else{
                    //         this.appMenu = [];
                    //         this.appLocation = '';
                    //         if(this.$route.name=='app-detail-micro'){
                    //             this.$router.push({name:'app-detail-detail', params: this.$route.params});
                    //         }
                    //     }
                    // } 
                })
            }).catch(()=>{
                useLoadingStore().loading = false;
            });
        },
        changeKey(val){
            let params = this.$route.params;
            if(val == 'group-app-direct'){
                params = {group: this.$route.params.group};
            }else if(val.startsWith('app-detail-') && (!params.kind || !params.id)){
                const app = this.applist.find(item=>!item.isHelm && item.key==this.appname)
                    || this.applist.find(item=>!item.isHelm && item.kind && item.name);
                params = {
                    group: this.$route.params.group,
                    kind: app?.kind,
                    id: app?.name,
                };
            }
            this.$router.push({name:val, params});
        },
        toCopy(){
            if(!this.copying){
                this.copying = true;
                this.copyList = [];
                this.$message.info('请选择要复制应用的标签');
                return;
            }
            if(this.copyList.length==0){
                this.copying = false;
                return;
            }
            Promise.all(this.copyList.map(i=>{
                return this.copyApp(i);
            })).then(()=>{
                this.$message.success('复制成功');
                this.copying = false;
                this.copyList = [];
                this.getData();
            });
        },
        copyApp(key){
            let app = this.applist.find(i=>i.key==key);
            return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name ).then(res=>{
                if(!res?.data){return}
                let data = res?.data;
                let pn = this.applist.find(i=>!i.isHelm && i.name);
                data.metadata.labels = data.metadata.labels || {};
                data.metadata.annotations = data.metadata.annotations || {};
                data.metadata.labels.parent = pn?.name;

                let baseName = data.metadata?.labels?.['w7.cc/identifie'] || data.metadata?.annotations?.['w7.cc/identifie'] || data.metadata.name;
                let name = baseName + '-' + this.createName(4);
                data.metadata.name = name;
                data.metadata.labels.app = name;
                data?.spec?.selector?.matchLabels && (data.spec.selector.matchLabels.app = name);
                data?.spec?.template?.metadata?.labels && (data.spec.template.metadata.labels.app = name);
                
                delete data.metadata.resourceVersion;
                delete data.metadata.generation;
                delete data.metadata.creationTimestamp;
                delete data.metadata.uid;
                delete data.status;

                return data

            }).then(data=>{
                if(!data){return}
                return k8sproxy.post("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind, data);
            });
        },
        createName(length){
            let len = length || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
        
        elementsToSvg(elementsArray, options = {}){
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


    }
}
</script>

<style>
.app-detailmenu{width:100%;}
.app-detailmenu .arco-tabs-nav{width:100px; padding-top:10px;}

.appdetail-tabs .arco-drawer-body{padding:0;}
.appdetail-tabs .arco-tabs-tab.arco-tabs-tab-active{
    background:var(--color-bg-2);
    /* border-bottom-color: var(--color-neutral-3); */
}
/* .appdetail-tabs .arco-tabs-nav::before{display:none;} */

</style>
<style scoped>
.point{width:8px; height:8px; border-radius:50%; background:#999; margin-right:6px;}
.point.red{background:#D00805;}
.point.green{background:#00A870;}

.routerviewbox{border:1px solid var(--color-neutral-3);border-top:0;}
.app-detail-micro-container{position:relative;}
.app-detail-micro-loading{
    position:absolute;
    inset:0;
    z-index:10;
    display:flex;
    align-items:center;
    justify-content:center;
    background:var(--color-bg-1);
}
.app-detail-page{height:auto;}
.app-detail-layout{min-width:0;min-height:inherit;}
.app-detail-main{box-sizing:border-box;min-width:0;min-height:inherit;}
.app-detail-menu-container:not(.app-detail-menu-container--drawer){
    display:flex;
    flex-direction:column;
    align-self:stretch;
    height:auto;
    min-height:0;
}
:deep(.app-detail-menu-container:not(.app-detail-menu-container--drawer) > .arco-layout-sider-children){
    display:flex;
    flex:1 1 auto;
    flex-direction:column;
    height:auto;
    min-height:0;
    overflow:hidden;
}
.app-detail-menu-scroll{width:100%;min-height:0;}
.microapp-role-header{
    box-sizing:border-box;
    height:40px;
    padding:0 12px;
    color:var(--color-text-3);
    line-height:40px;
}
.app-detail-menu-divider{
    width:auto;
    min-width:auto;
    margin:10px;
}
:deep(.app-detail-native-menu-item .arco-menu-icon){
    display:inline-flex;
    flex:0 0 32px;
    align-items:center;
    width:32px;
    margin-right:0 !important;
}
:deep(.app-detail-native-menu-item .arco-menu-icon > *){
    flex:0 0 16px;
    width:16px;
}
:deep(.app-detail-native-menu-item .arco-menu-icon svg){
    width:16px !important;
    height:16px !important;
}
.content{height:100%;}
/* .appheader{height:50px; background:var(--color-bg-2); border-bottom:1px solid var(--color-border-1); padding:0 20px;} */
.appheader .apps{background: var(--color-fill-2); height: 36px; padding: 0 8px; border-radius: 20px;}
.appheader .apps .item{height:26px; line-height:26px; cursor:pointer; border-radius:16px; padding:0 12px; position: relative;}
.appheader .apps .item .close{display:none; background:var(--color-bg-1); border-radius:50%; position:absolute; top:-8px; right:-8px;}
.appheader .apps .item:hover{background:var(--color-bg-2);}
.appheader .apps .item:hover .close{display:block;}
.appheader .apps .item+.item{margin-left:8px;}
.appheader .apps .item.active{background:var(--color-bg-1);}

/* .menu-absolute-div::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.menu-absolute-div::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.menu-absolute-div::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.menu-absolute-div::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.menu-absolute-div::-webkit-scrollbar-thumb:active {
  background: #909090;
} */
</style>
