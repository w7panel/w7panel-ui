<template>
    <a-drawer :width="700" :visible="visible" @cancel="closeDrawer()" @ok="submit">
        <template #title>权限管理</template>
        <div>
            <a-form :model="pmsForm" auto-label-width>
                
                <a-form-item label="权限套餐">
                    <a-select v-model="pmsForm.permissionPackage" :disabled="pmsForm.userMode=='founder'" @change="pmsFormChangePermissionPackage" placeholder="请选择">
                        <a-option v-if="!noCustom" label="自定义" value=""></a-option>
                        <a-option v-for="item in pmsls" :key="item.name" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>

                <a-tabs v-show="!noCustom" default-active-key="1" style="margin-bottom:20px;">

                    <a-tab-pane key="1" title="基础权限">
                        <a-form-item label="调试权限">
                            <a-switch :disabled="disabledBase" v-model="pmsForm.debug" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可查看并修改资源YAML内容。</template>
                        </a-form-item>
                        <a-form-item label="终端执行权限">
                            <a-switch :disabled="disabledBase" v-model="pmsForm.webshell" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可在终端控制台执行命令行。</template>
                        </a-form-item>
                        <a-form-item label="文件管理权限">
                            <a-switch :disabled="disabledBase" v-model="pmsForm.fileeditor" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可管理应用内的文件。</template>
                        </a-form-item>
                    </a-tab-pane>

                    <a-tab-pane key="2" title="菜单权限">
                        <a-form-item label="权限">
                            <div class="padding-10" style="background:var(--color-neutral-1);flex:1;">
                                <a-tree
                                    ref="tree"
                                    :checkable="true"
                                    v-model:checked-keys="pmsForm.list"
                                    @check="pmsForm.permissionPackage=''"
                                    :data="{shared:sharedTreeData,virtual:virtualTreeData,global:globalTreeData}[pmsForm.type]"
                                    check-strictly
                                />
                            </div>
                        </a-form-item>
                    </a-tab-pane>

                    <a-tab-pane key="3" title="域名白名单">
                        <whitelist-component ref="whitelist" :data="pmsForm.whitelist"></whitelist-component>
                    </a-tab-pane>
                    <a-tab-pane key="4" title="API权限">
                        <a-form-item label="全部API">
                            <a-switch :disabled="disabledMenu" v-model="pmsForm.apiAll" @change="pmsForm.permissionPackage=''"></a-switch>
                        </a-form-item>
                        <a-form-item label="API列表" v-if="!pmsForm.apiAll">
                            <div class="api-permission-panel">
                                <div class="api-permission-toolbar">
                                    <a-input-search v-model="pmsForm.apiSearch" placeholder="搜索 PATH / 说明 / Method" allow-clear />
                                    <a-space>
                                        <a-button size="small" :disabled="disabledMenu" @click="selectAllApiRoutes">全选</a-button>
                                        <a-button size="small" :disabled="disabledMenu" @click="clearApiRoutes">清空</a-button>
                                    </a-space>
                                </div>
                                <div class="api-permission-table">
                                    <table class="com-table">
                                        <tbody>
                                            <tr>
                                                <td style="width:220px;">说明</td>
                                                <td>URL</td>
                                                <td style="width:220px;">Method</td>
                                            </tr>
                                            <tr v-for="group in filteredApiRouteGroups" :key="group.path">
                                                <td>{{ group.title }}</td>
                                                <td class="api-path">{{ group.path }}</td>
                                                <td>
                                                    <a-select
                                                        :model-value="apiGroupSelectedMethods(group, pmsForm.apiSelectedKeys)"
                                                        multiple
                                                        allow-clear
                                                        :disabled="disabledMenu"
                                                        placeholder="方法匹配值，可多选"
                                                        style="width:220px;"
                                                        @change="methods => setPmsApiGroupMethods(group, methods)"
                                                    >
                                                        <a-option
                                                            v-for="route in group.routes"
                                                            :key="apiRouteKey(route)"
                                                            :label="route.method"
                                                            :value="route.method"
                                                        ></a-option>
                                                    </a-select>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </a-form-item>
                    </a-tab-pane>
                </a-tabs>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import axios from "axios";
import { useNamespaceStore,useUserStore } from '@/store';
import whitelistComponent from '@/views/system/whitelist/whitelist-component.vue';
import { toPermissionPaths, toTreeKeys } from '@/utils/permission-match';
import {
    getLoadedApiRouteDescriptions,
    loadApiRouteDescriptions,
    resolveApiRouteDescription,
} from '@/utils/api-route-description';

const sharedPass = [
    'cluster-nodes',
    'cluster-nodes-add',
    'cluster-nodes-registries',
    'cluster-nodes-gpu',
    'cluster-nodes-memory',
    'system-whitelist',
    'system-user',
    'system-usergroup',
    'system-permission',
    'system-manage',
    'zpk',
]

const virtualPass = [
    'cluster-nodes-add',
    'cluster-nodes-gpu',
    'cluster-nodes-memory',
    'system-whitelist',
    'system-user',
    'system-usergroup',
    'system-permission',
    'system-manage',
    'zpk',
]
export default {
    props: ['show','list','api','name', 'debug','fileeditor','whitelist','webshell','permissionPackage','userMode','disabledBase','disabledMenu','noCustom'],
    data(){
        return {
            namespaceActive: '',
            pmsls: [],
            permissionPackageList: [],
            permissionPackageListShared: [],
            permissionPackageListVirtual: [],
            pmsForm: {
                type: 'virtual',
                permissionPackage: '',
                list: [],
                treeData: [],
                debug: false,
                fileeditor: false,
                webshell: false,
                userMode: '',
                apiAll: false,
                apiSearch: '',
                apiSelectedKeys: [],
                apiExtraRules: {},
            },
            
            sharedTreeData: [],
            virtualTreeData: [],
            globalTreeData: [],
            apiRoutes: [],
            apiRoutesPromise: null,
            apiRouteDescriptions: getLoadedApiRouteDescriptions(),
        }
    },
    components: {
    },
    watch:{
        show(){
            this.visible = this.show;
            this.init();
        },
        disabledMenu(){
            this.initTreeData();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.treeData = useUserStore().getTreeData;
        this.init();
        this.taocan();
        this.getApiRoutes();
        this.initTreeData();
    },
    computed: {
        apiRouteGroups(){
            let groupMap = {};
            this.apiRoutes.forEach(route => {
                let description = this.apiRouteDescription(route);
                if(!groupMap[route.path]){
                    groupMap[route.path] = {
                        path: route.path,
                        title: description,
                        routes: [],
                    };
                }
                groupMap[route.path].routes.push(route);
            });
            return Object.values(groupMap).map(group => {
                group.routes.sort((a, b) => this.methodOrder(a.method) - this.methodOrder(b.method));
                let titles = Array.from(new Set(group.routes.map(route => this.apiRouteDescription(route)).filter(Boolean)));
                group.title = titles.length <= 1
                    ? (titles[0] || '')
                    : group.routes
                        .filter(route => this.apiRouteDescription(route))
                        .map(route => `${route.method} ${this.apiRouteDescription(route)}`)
                        .join('；');
                return group;
            });
        },
        filteredApiRouteGroups(){
            let keyword = String(this.pmsForm.apiSearch || '').trim().toLowerCase();
            if(!keyword){return this.apiRouteGroups;}
            return this.apiRouteGroups.filter(group => {
                return String(group.path || '').toLowerCase().includes(keyword)
                    || String(group.title || '').toLowerCase().includes(keyword)
                    || group.routes.some(route => String(route.method || '').toLowerCase().includes(keyword));
            });
        },
    },
    components: {
        whitelistComponent,
    },
    methods: {
        init(){
            this.pmsForm.debug = this.debug || false;
            this.pmsForm.fileeditor = this.fileeditor || false;
            this.pmsForm.webshell = this.webshell || false;
            this.pmsForm.list = toTreeKeys(this.list || []);
            this.pmsForm.type = 'virtual'; //this.type || 'shared';
            this.pmsForm.permissionPackage = this.permissionPackage || '';
            this.pmsForm.userMode = this.userMode || '';
            this.hasDebug = this.debug===true || this.debug===false;
            this.pmsForm.whitelist = this.whitelist || [];
            this.pmsForm = {
                ...this.pmsForm,
                ...this.apiToForm(this.api || {}),
            };
            this.getApiRoutes().then(()=>{
                if(!this.show){return}
                this.pmsForm = {
                    ...this.pmsForm,
                    ...this.apiToForm(this.api || {}),
                };
            });
            
            this.pmsls = this.getVisiblePermissionPackages();

            // this.pmsls = this.permissionPackageList;
            // if(this.type=='shared'){ this.pmsls = this.permissionPackageListShared; }
            // if(this.type=='virtual'){ this.pmsls = this.permissionPackageListVirtual; }
        },
        submit(){
            let whitelist = this.$refs.whitelist.getList() || [];
            
            let find = this.permissionPackageList.find(i=>i.name==this.pmsForm.permissionPackage);
            let parent = find?.parentPermission
                ? this.permissionPackageList.find(i=>i.name==find.parentPermission)
                : null;
            let role = find?.role || parent?.role || '';
            this.$emit('submit',{
                list: toPermissionPaths(this.pmsForm.list),
                api: this.formToApi(),
                permissionPackage: this.pmsForm.permissionPackage,
                role: role,
                debug: this.pmsForm.debug,
                fileeditor: this.pmsForm.fileeditor,
                webshell: this.pmsForm.webshell,
                name: this.name,
                whitelist: whitelist,
            })
            this.closeDrawer();
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        isFounderPermissionPackage(item){
            if(!item){return false}
            if(item.name=='founder' || item.role=='founder'){return true}
            let parent = item.parentPermission
                ? this.permissionPackageList.find(i=>i.name==item.parentPermission)
                : null;
            return parent?.name=='founder' || parent?.role=='founder';
        },
        getVisiblePermissionPackages(){
            if(this.pmsForm.userMode=='founder'){
                return this.permissionPackageList.filter(i=>this.isFounderPermissionPackage(i));
            }
            return this.permissionPackageList.filter(i=>!this.isFounderPermissionPackage(i));
        },
        taocan(){
            k8sproxy.get("/apis/w7panel.w7.com/v1alpha1/permissions",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = toTreeKeys(i?.spec?.menuRules || []);
                    let whitelist = i?.spec?.domainWhiteList || [];

                    return {
                        title: i.spec?.title || i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        permission: permission,
                        clustermode: 'virtual',
                        debug: i.spec?.features?.debug === true,
                        webshell: i.spec?.features?.webshell === true,
                        fileeditor: i.spec?.features?.fileeditor === true,
                        whitelist: whitelist,
                        api: this.apiRulesToApi(i.spec?.apiRules || []),
                        role: i?.spec?.role || '',
                        parentPermission: i?.spec?.parentPermission || '',
                    }
                });
                this.permissionPackageList = list;
                this.pmsls = this.getVisiblePermissionPackages(); //.filter(i=>i.clustermode=='virtual');
                // this.permissionPackageListShared = list.filter(i=>i.clustermode=='shared');
                // this.permissionPackageListVirtual = list.filter(i=>i.clustermode=='virtual');
                // this.pmsls = this.permissionPackageList;
                // if(this.type=='shared'){ this.pmsls = this.permissionPackageListShared; }
                // if(this.type=='virtual'){ this.pmsls = this.permissionPackageListVirtual; }
            })
        },
        // 修改权限切换套餐
        pmsFormChangePermissionPackage(){
            if(this.pmsForm.permissionPackage==''){return}
            let find = this.permissionPackageList.find(i=>i.name==this.pmsForm.permissionPackage);
            if(!find){return}
            let permission = find?.permission || [];
            this.pmsForm.list = permission.filter(i=>!(this.pmsForm.type=='shared'?sharedPass:virtualPass).includes(i));
            this.pmsForm.debug = find.debug;
            this.pmsForm.webshell = find.webshell;
            this.pmsForm.fileeditor = find.fileeditor;
            this.pmsForm.whitelist = find.whitelist;
            this.pmsForm = {
                ...this.pmsForm,
                ...this.apiToForm(find.api || {}),
            };
        },
        getApiRoutes(){
            if(this.apiRoutesPromise){
                return this.apiRoutesPromise;
            }
            this.apiRoutesPromise = Promise.all([
                panelApi.get('/auth/permissions/routes', {noAlert:true}),
                loadApiRouteDescriptions(),
            ]).then(([res, descriptions])=>{
                this.apiRouteDescriptions = descriptions;
                let list = res?.data?.data || res?.data || [];
                this.apiRoutes = Array.isArray(list) ? list.map(route => this.normalizeApiRoute(route)) : [];
                this.pmsForm.apiSelectedKeys = this.normalizeApiSelectedKeys(this.pmsForm.apiSelectedKeys);
                return this.apiRoutes;
            }).finally(()=>{
                this.apiRoutesPromise = null;
            });
            return this.apiRoutesPromise;
        },
        apiRouteKey(route){
            return `${route.method} ${route.path}`;
        },
        normalizeApiRoute(route){
            let method = route?.method || route?.Method || '';
            let path = route?.path || route?.Path || '';
            let normalized = {
                ...route,
                method: method,
                path: path,
                verb: route?.verb || route?.Verb || this.apiRouteVerb(method),
            };
            return {
                ...normalized,
                description: this.apiRouteDescription(normalized),
            };
        },
        apiRouteDescription(route){
            return resolveApiRouteDescription(this.apiRouteDescriptions, {
                method: route?.method || route?.Method,
                route: route?.path || route?.Path,
                fallback: route?.description || route?.title || route?.Description || route?.Title || '',
            });
        },
        apiRouteVerb(method){
            return {
                GET: 'get',
                HEAD: 'get',
                POST: 'create',
                PUT: 'update',
                PATCH: 'patch',
                DELETE: 'delete',
            }[String(method || '').toUpperCase()] || '';
        },
        methodOrder(method){
            return {
                GET: 1,
                POST: 2,
                PUT: 3,
                PATCH: 4,
                DELETE: 5,
                HEAD: 6,
            }[String(method || '').toUpperCase()] || 99;
        },
        apiGroupSelectedMethods(group, selectedKeys){
            let selected = new Set(selectedKeys || []);
            return (group?.routes || [])
                .filter(route => selected.has(this.apiRouteKey(route)))
                .map(route => route.method);
        },
        nextApiSelectedKeysForGroup(group, methods, currentKeys){
            let selected = new Set(currentKeys || []);
            let methodSet = new Set(methods || []);
            (group?.routes || []).forEach(route => {
                let key = this.apiRouteKey(route);
                if(methodSet.has(route.method)){
                    selected.add(key);
                }else{
                    selected.delete(key);
                }
            });
            return Array.from(selected);
        },
        setPmsApiGroupMethods(group, methods){
            if(this.disabledMenu){return}
            this.pmsForm.permissionPackage = '';
            this.pmsForm.apiSelectedKeys = this.nextApiSelectedKeysForGroup(group, methods, this.pmsForm.apiSelectedKeys);
        },
        normalizeApiSelectedKeys(keys){
            let valid = new Set(this.apiRoutes.map(route => this.apiRouteKey(route)));
            return (keys || []).filter(key => valid.has(key));
        },
        apiToForm(api){
            let rules = api || {};
            let apiAll = Array.isArray(rules['*']) && rules['*'].includes('*');
            let selected = [];
            this.apiRoutes.forEach(route => {
                let key = this.apiRouteKey(route);
                let verbs = rules[route.path] || [];
                if(apiAll || verbs.includes('*') || verbs.includes(route.verb)){
                    selected.push(key);
                }
            });
            let extraRules = {};
            Object.keys(rules).forEach(path => {
                if(path === '*'){return}
                let matched = this.apiRoutes.some(route => route.path === path);
                if(!matched){
                    extraRules[path] = rules[path];
                }
            });
            return {
                apiAll: apiAll,
                apiSearch: '',
                apiSelectedKeys: selected,
                apiExtraRules: extraRules,
            };
        },
        formToApi(){
            if(this.pmsForm.apiAll){
                return {'*': ['*']};
            }
            let api = {...(this.pmsForm.apiExtraRules || {})};
            let selected = new Set(this.pmsForm.apiSelectedKeys || []);
            this.apiRoutes.forEach(route => {
                if(!selected.has(this.apiRouteKey(route))){return}
                if(!api[route.path]){
                    api[route.path] = [];
                }
                if(!api[route.path].includes(route.verb)){
                    api[route.path].push(route.verb);
                }
            });
            return api;
        },
        apiRulesToApi(apiRules){
            let api = {};
            (apiRules || []).forEach(rule => {
                if(!rule?.path){return}
                api[rule.path] = Array.isArray(rule.method) ? [...rule.method] : [];
            });
            return api;
        },
        toggleApiRoute(route, checked){
            if(this.disabledMenu){return}
            this.pmsForm.permissionPackage = '';
            let key = this.apiRouteKey(route);
            let selected = new Set(this.pmsForm.apiSelectedKeys || []);
            if(checked){
                selected.add(key);
            }else{
                selected.delete(key);
            }
            this.pmsForm.apiSelectedKeys = Array.from(selected);
        },
        selectAllApiRoutes(){
            if(this.disabledMenu){return}
            this.pmsForm.permissionPackage = '';
            this.pmsForm.apiSelectedKeys = this.apiRoutes.map(route => this.apiRouteKey(route));
        },
        clearApiRoutes(){
            if(this.disabledMenu){return}
            this.pmsForm.permissionPackage = '';
            this.pmsForm.apiSelectedKeys = [];
        },
        initTreeData(){
            this.sharedTreeData = this.filterTree(sharedPass);
            this.virtualTreeData = this.filterTree(virtualPass);
            this.globalTreeData = this.filterTree([]);
        },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.treeData));
    
            function traverseAndDisable(nodes, keyPath = [], disabled) {
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    if (keys.includes(node.key) || disabled) {
                        node.disabled = true;
                    }
                    if (node.children && node.children.length > 0) {
                        traverseAndDisable(node.children, currentKeyPath, disabled);
                    }
                });
            }
            traverseAndDisable(menuDataCopy, [], this.disabledMenu);
            return menuDataCopy;
        },
    },

}
</script>

<style scoped>
.api-permission-panel {
    width: 100%;
}
.api-permission-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.api-permission-toolbar :deep(.arco-input-wrapper) {
    max-width: 360px;
}
.api-permission-table {
    max-height: 420px;
    overflow: auto;
}
.api-path {
    word-break: break-all;
}
</style>
