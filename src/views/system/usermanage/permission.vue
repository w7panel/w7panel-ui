<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <!-- <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加权限</a-button>
        </div> -->
        
        <div class=" bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td>创建时间</td>
                    <!-- <td>集群模式</td> -->
                    <td>操作</td>
                </tr>
                <tr v-for="(record,index) in list.filter(i=>i.type=='in')" :key="index+'in'">
                    <td>{{ record.title }}</td>
                    <td>{{ record.type=='in'? '系统内置' : '自定义'}}</td>
                    <td>-</td>
                    <!-- <td>{{ record.clustermodeTxt }}</td> -->
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                        </a-tooltip>
                        <a-button v-if="record.name!='founder'" type="outline" class="ml-4" icon="plus" size="mini" @click="addCustom(record)">
                            <template #icon><icon-plus /></template>
                            <span>创建权限</span>
                        </a-button>
                        <!-- <a-tooltip v-if="record.type=='in'" content="创建新权限">
                            <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                        </a-tooltip> -->
                        <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr><td colspan="5" style="padding:0;background:var(--color-border-1);height:5px;"></td></tr>
                <tr v-for="(record,index) in list.filter(i=>i.type!='in')" :key="index">
                    <td>{{ record.title }}</td>
                    <td>{{ record.type=='in'? '系统内置' : '自定义'}}</td>
                    <td>{{ record.created }}</td>
                    <!-- <td>{{ record.clustermodeTxt }}</td> -->
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                        </a-tooltip>
                        <a-tooltip v-if="record.type=='in'" content="创建新权限">
                            <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                        </a-tooltip>
                        <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </td>
                </tr>
            </tbody></table>
            <!-- <a-table class="cptable" :data="list.filter(i=>i.type=='in')" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="类型">
                        <template #cell="{record}">{{ record.type=='in'? '系统内置' : '自定义' }}</template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="created"></a-table-column>
                    <a-table-column title="集群模式" data-index="clustermodeTxt"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.type=='in'" content="创建新权限">
                                <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                            </a-tooltip>
                            <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>

            <a-table class="cptable mt-30" :data="list.filter(i=>i.type!='in')" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="类型">
                        <template #cell="{record}">{{ record.type=='in'? '系统内置' : '自定义' }}</template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="created"></a-table-column>
                    <a-table-column title="集群模式" data-index="clustermodeTxt"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.type=='in'" content="创建新权限">
                                <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                            </a-tooltip>
                            <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table> -->
        </div>

        <a-drawer
            :visible="form.show"
            direction="rtl"
            :width="800"
            title="菜单权限"
            @ok="submit"
            @cancel="form.show=false;"
        >
            <a-form :model="form" ref="form" auto-label-width :rules="rules">
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" placeholder="请输入"></a-input>
                </a-form-item>
                <!-- <a-form-item label="集群模式" :disabled="!!form.name && !form.isAdd" field="clustermode" :rules="[{required:true,message:'请选择集群模式', trigger: 'blur' }]">
                    <a-select v-model="form.clustermode" placeholder="请选择集群模式">
                        <a-option label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="form.clustermode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="form.clustermode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="form.clustermode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item> -->

                <a-tabs default-active-key="1" style="margin-bottom:20px;">

                    <a-tab-pane key="1" title="基础权限">
                        <a-form-item label="调试权限">
                            <a-switch v-model="form.debug" :disabled="form.name==founderName || (featureConstraint && featureConstraint.debug !== true)"></a-switch>
                            <template #extra>开启后，可查看并修改资源YAML内容。</template>
                        </a-form-item>
                        <a-form-item label="终端执行权限">
                            <a-switch v-model="form.webshell" :disabled="form.name==founderName || (featureConstraint && featureConstraint.webshell !== true)"></a-switch>
                            <template #extra>开启后，可在终端控制台执行命令行。</template>
                        </a-form-item>
                        <a-form-item label="文件管理权限">
                            <a-switch v-model="form.fileeditor" :disabled="form.name==founderName || (featureConstraint && featureConstraint.fileeditor !== true)"></a-switch>
                            <template #extra>开启后，可管理应用内的文件。</template>
                        </a-form-item>
                    </a-tab-pane>
                    <a-tab-pane key="2" title="菜单权限">
                        <a-form-item label="权限">
                            <div class="padding-10" style="background:var(--color-neutral-1);flex:1;">
                                <menu-select
                                    v-if="form.show"
                                    :disabled="form.name==founderName || (menuConstraintKeys && !menuConstraintKeys.length)"
                                    :permission="form.permission"
                                    :allowed-keys="menuConstraintKeys"
                                    :allowedMode="formMenuMode"
                                    @checked="v=>form.permission=v"
                                ></menu-select>
                            </div>
                        </a-form-item>
                    </a-tab-pane>
                    <a-tab-pane key="3" title="域名白名单">
                        <whitelist-component ref="whitelist" :data="form.whitelist"></whitelist-component>
                    </a-tab-pane>
                    <a-tab-pane key="4" title="API权限">
                        <a-form-item label="全部API">
                            <a-switch v-model="form.apiAll" :disabled="form.name==founderName || !canGrantAllApi"></a-switch>
                        </a-form-item>
                        <a-form-item label="API列表" v-if="!form.apiAll">
                            <div class="api-permission-panel">
                                <div class="api-permission-toolbar">
                                    <a-input-search v-model="form.apiSearch" placeholder="搜索 PATH / 说明 / Method" allow-clear />
                                    <a-space>
                                        <a-button size="small" @click="selectAllApiRoutes">全选</a-button>
                                        <a-button size="small" @click="clearApiRoutes">清空</a-button>
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
                                            <tr v-for="group in constrainedApiRouteGroups" :key="group.path">
                                                <td>{{ group.title }}</td>
                                                <td class="api-path">{{ group.path }}</td>
                                                <td>
                                                    <a-select
                                                        :model-value="apiGroupSelectedMethods(group, form.apiSelectedKeys)"
                                                        multiple
                                                        allow-clear
                                                        placeholder="方法匹配值，可多选"
                                                        style="width:220px;"
                                                        :disabled="apiGroupAllowedMethods(group).length === 0"
                                                        @change="methods => setApiGroupMethods(group, methods)"
                                                    >
                                                        <a-option
                                                            v-for="route in apiGroupAllowedRoutes(group)"
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
        </a-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { panelApi } from '@/utils/api';
import axios from 'axios';
import menuSelect from '@/views/system/permission/menu-select.vue';
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import whitelistComponent from '../whitelist/whitelist-component.vue';
import { expandPermissionValues, toPermissionPaths, toTreeKeys } from '@/utils/permission-match';
import {
    getLoadedApiRouteDescriptions,
    loadApiRouteDescriptions,
    resolveApiRouteDescription,
} from '@/utils/api-route-description';

const dataTemplate = {
    "kind": "Permission",
    "apiVersion": "w7panel.w7.com/v1alpha1",
    "metadata": {
        "name": "permission",
        "labels": {
            "typemode": "custom",
        },
        "annotations": {},
    },
    "spec": {
        "title": "",
        "type": "custom",
        "role": "normal",
        "parentPermission": "",
        "menuRules": [],
        "apiRules": [],
        "features": {
            "debug": false,
            "webshell": false,
            "fileeditor": false,
        },
        "domainWhiteList": [],
        "rbacRules": [],
    }
}

export default {
    data(){
        return {
            namespaceActive: 'default',
            list: [],
            form: {
                show: false,
                title: '',
                name: '',
                debug: false,
                webshell: false,
                fileeditor: false,
                clustermode: 'virtual',
                permission: [],
                apiAll: false,
                apiSearch: '',
                apiSelectedKeys: [],
                apiExtraRules: {},
                parentPermission: '',
            },
            rules: {
                title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            debug: false,

            sharedTreeData: [],
            virtualTreeData: [],

            founderName: 'founder',
            apiRoutes: [],
            apiRoutesPromise: null,
            apiRouteDescriptions: getLoadedApiRouteDescriptions(),
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getApiRoutes();
        this.getList();
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
                if(!groupMap[route.path].title && description){
                    groupMap[route.path].title = description;
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
            let keyword = String(this.form.apiSearch || '').trim().toLowerCase();
            const groups = this.apiRouteGroups.filter(group => this.apiGroupAllowedRoutes(group).length > 0);
            if(!keyword){return groups;}
            return groups.filter(group => {
                return String(group.path || '').toLowerCase().includes(keyword)
                    || String(group.title || '').toLowerCase().includes(keyword)
                    || group.routes.some(route => String(route.method || '').toLowerCase().includes(keyword));
            });
        },
        constrainedApiRouteGroups(){
            return this.filteredApiRouteGroups.map(group => ({
                ...group,
                routes: this.apiGroupAllowedRoutes(group),
            })).filter(group => group.routes.length > 0);
        },
        permissionConstraint(){
            const parentName = this.form.parentPermission || '';
            if(parentName){
                return this.list.find(item => item.name === parentName)?.originData || null;
            }
            if(this.form.originData?.spec?.type === 'custom' && this.form.originData?.spec?.parentPermission){
                return this.list.find(item => item.name === this.form.originData.spec.parentPermission)?.originData || null;
            }
            return null;
        },
        menuConstraintKeys(){
            if(!this.permissionConstraint){return null}
            return expandPermissionValues(this.permissionConstraint?.spec?.menuRules || []);
        },
        apiConstraintMap(){
            if(!this.permissionConstraint){return null}
            return this.apiRulesToApi(this.permissionConstraint?.spec?.apiRules || []);
        },
        canGrantAllApi(){
            if(!this.apiConstraintMap){return true}
            return Array.isArray(this.apiConstraintMap['*']) && this.apiConstraintMap['*'].includes('*');
        },
        featureConstraint(){
            return this.permissionConstraint?.spec?.features || null;
        },
        formMenuMode(){
            if(this.form.name === this.founderName){return 'global'}
            return this.form.clustermode;
        },
    },
    components: {
        menuSelect,
        yamlDrawer,
        whitelistComponent,
    },
    methods: {
        // initTreeData(){
        //     this.sharedTreeData = this.filterTree(sharedPass);
        //     this.virtualTreeData = this.filterTree(virtualPass);
        // },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.treeData));
    
            function traverseAndDisable(nodes, keyPath = []) {
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    if (keys.includes(node.key)) {
                        node.disabled = true;
                    }
                    if (node.children && node.children.length > 0) {
                        traverseAndDisable(node.children, currentKeyPath);
                    }
                });
            }
            traverseAndDisable(menuDataCopy);
            return menuDataCopy;
        },
        getList(){
            k8sproxy.get("/apis/w7panel.w7.com/v1alpha1/permissions",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = toTreeKeys(i?.spec?.menuRules || []);
                    let whitelist = i?.spec?.domainWhiteList || [];
                    return {
                        originData: i,
                        title: i.spec?.title || i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        permission: permission,
                        
                        debug: i.spec?.features?.debug === true,
                        webshell: i.spec?.features?.webshell === true,
                        fileeditor: i.spec?.features?.fileeditor === true,
                        clustermode: 'virtual',
                        clustermodeTxt: '独享',
                        whitelist: whitelist,
                        api: this.apiRulesToApi(i.spec?.apiRules || []),
                        parentPermission: i.spec?.parentPermission || '',

                        type: i.spec?.type == 'builtin' ? 'in' : (i.metadata?.labels?.typemode || 'custom'),
                    }
                });
                this.list = list;
            })
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
                this.form = {
                    ...this.form,
                    apiSelectedKeys: this.normalizeApiSelectedKeys(this.form.apiSelectedKeys),
                };
                return this.apiRoutes;
            }).finally(()=>{
                this.apiRoutesPromise = null;
            });
            return this.apiRoutesPromise;
        },
        // add(){
        //     this.form = {
        //         show: true,
        //         title: '',
        //         name: '',
        //         clustermode: 'shared',
        //         permission: [],
        //         whitelist: [],
        //     }
        // },
        addCustom(row){
            let originData = JSON.parse(JSON.stringify(row.originData));
            delete originData.metadata.resourceVersion;
            delete originData.metadata.creationTimestamp;
            delete originData.metadata.uid;
            originData.metadata.name = this.createName();
            originData.metadata.labels = originData.metadata.labels || {};
            originData.metadata.labels.typemode = 'custom';
            originData.spec = originData.spec || {};
            originData.spec.type = 'custom';
            originData.spec.role = row.originData?.spec?.role || row.originData?.metadata?.name?.match?.(/^k3k\.permission\.(\w+)/)?.[1] || '';
            originData.spec.parentPermission = row.originData?.spec?.type === 'builtin'
                ? row.originData.metadata.name
                : (row.originData?.spec?.parentPermission || '');
            
            let originTitle = originData.spec?.title || originData.metadata?.annotations?.title || '';

            this.form.originData = originData;
            this.edit({
                ...row,
                originData: originData,
                title: '',
                name: originData.metadata.name,
                isAdd: true,
                originTitle: originTitle? '['+originTitle+'] ' : '',
            });
        },
        async edit(row){
            await this.getApiRoutes();
            this.form = {
                ...this.form,
                isAdd: row.isAdd,
                originTitle: row.originTitle || '',
                show: true,
                originData: row.originData,
                title: row.title,
                name: row.name,
                clustermode: row.clustermode,
                permission: row.permission,
                debug: row.debug,
                webshell: row.webshell,
                fileeditor: row.fileeditor,
                whitelist: row.whitelist,
                ...this.apiToForm(row.api || {}),
                parentPermission: row.parentPermission || row.originData?.spec?.parentPermission || '',
            }
            this.applyFormConstraints();
        },
        del(row){
            k8sproxy.delete("/apis/w7panel.w7.com/v1alpha1/permissions/" + row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0]);
                    return;
                }

                let whitelist = this.$refs.whitelist.getList() || [];
                let api = this.formToApi();
                this.applyFormConstraints();
                api = this.formToApi();

                if(!this.form.name || this.form.isAdd){
                    let data = null;
                    if(this.form.isAdd){
                        data = JSON.parse(JSON.stringify(this.form.originData || {}));
                    }else{
                        data = JSON.parse(JSON.stringify(dataTemplate));
                    }
                    if(this.form.isAdd){
                        data.spec.title = this.form.originTitle + this.form.title;
                    }else{
                        data.metadata.name = this.createName();
                        data.spec.title = this.form.title;
                    }
                    this.sanitizeCreateMetadata(data);
                    data.spec.domainWhiteList = whitelist;
                    data.spec.parentPermission = data.spec.type === 'custom'
                        ? (this.form.parentPermission || data.spec.parentPermission || '')
                        : '';
                    data.spec.menuRules = toPermissionPaths(this.form.permission);
                    data.spec.apiRules = this.apiToRules(api);
                    data.spec.features = {
                        debug: this.form.debug,
                        webshell: this.form.webshell,
                        fileeditor: this.form.fileeditor,
                    };
                    
                    k8sproxy.post("/apis/w7panel.w7.com/v1alpha1/permissions",data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }else{
                    let data = JSON.parse(JSON.stringify(this.form.originData || {}));
                    data.spec = data.spec || {};
                    data.spec.title = this.form.title;
                    data.spec.domainWhiteList = whitelist;
                    data.spec.parentPermission = data.spec.type === 'custom'
                        ? (this.form.parentPermission || data.spec.parentPermission || '')
                        : '';
                    data.spec.menuRules = toPermissionPaths(this.form.permission);
                    data.spec.apiRules = this.apiToRules(api);
                    data.spec.features = {
                        debug: this.form.debug,
                        webshell: this.form.webshell,
                        fileeditor: this.form.fileeditor,
                    };
                    k8sproxy.put("/apis/w7panel.w7.com/v1alpha1/permissions/"+this.form.name, data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        sanitizeCreateMetadata(data){
            data.metadata = data.metadata || {};
            delete data.metadata.namespace;
            delete data.metadata.resourceVersion;
            delete data.metadata.uid;
            delete data.metadata.creationTimestamp;
            delete data.metadata.generation;
            delete data.metadata.managedFields;
            data.metadata.annotations = data.metadata.annotations || {};
            delete data.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
        },
        openYaml(name){
            k8sproxy.get("/apis/w7panel.w7.com/v1alpha1/permissions/" + name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.spec?.title || res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        delete data.metadata.namespace;
                        return k8sproxy.put("/apis/w7panel.w7.com/v1alpha1/permissions/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
            })
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
            return this.apiGroupAllowedRoutes(group)
                .filter(route => selected.has(this.apiRouteKey(route)))
                .map(route => route.method);
        },
        nextApiSelectedKeysForGroup(group, methods, currentKeys){
            let selected = new Set(currentKeys || []);
            let methodSet = new Set(methods || []);
            this.apiGroupAllowedRoutes(group).forEach(route => {
                let key = this.apiRouteKey(route);
                if(methodSet.has(route.method)){
                    selected.add(key);
                }else{
                    selected.delete(key);
                }
            });
            return Array.from(selected);
        },
        setApiGroupMethods(group, methods){
            this.form.apiSelectedKeys = this.nextApiSelectedKeysForGroup(group, methods, this.form.apiSelectedKeys);
        },
        normalizeApiSelectedKeys(keys){
            let valid = new Set(this.apiRoutes.map(route => this.apiRouteKey(route)));
            return (keys || []).filter(key => valid.has(key));
        },
        apiToForm(api){
            let rules = api || {};
            let apiAll = Array.isArray(rules['*']) && rules['*'].includes('*');
            let selected = [];
            let routeKeys = new Set();
            this.apiRoutes.forEach(route => {
                let key = this.apiRouteKey(route);
                routeKeys.add(key);
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
            if(this.form.apiAll){
                return {'*': ['*']};
            }
            let api = {...(this.form.apiExtraRules || {})};
            let selected = new Set(this.form.apiSelectedKeys || []);
            this.apiRoutes.forEach(route => {
                if(!selected.has(this.apiRouteKey(route))){return}
                if(!this.apiRouteAllowed(route)){return}
                if(!api[route.path]){
                    api[route.path] = [];
                }
                if(!api[route.path].includes(route.verb)){
                    api[route.path].push(route.verb);
                }
            });
            return api;
        },
        apiGroupAllowedRoutes(group){
            return (group?.routes || []).filter(route => this.apiRouteAllowed(route));
        },
        apiGroupAllowedMethods(group){
            return this.apiGroupAllowedRoutes(group).map(route => route.method);
        },
        apiRouteAllowed(route){
            if(!this.apiConstraintMap){return true}
            if(Array.isArray(this.apiConstraintMap['*']) && this.apiConstraintMap['*'].includes('*')){return true}
            const verbs = this.matchApiRuleMethods(this.apiConstraintMap, route.path);
            return verbs.includes('*') || verbs.includes(route.verb);
        },
        matchApiRuleMethods(rules, path){
            let bestPattern = '';
            let bestMethods = [];
            Object.keys(rules || {}).forEach(pattern => {
                if(!this.matchApiPath(pattern, path)){return}
                if(!bestPattern || pattern.length > bestPattern.length){
                    bestPattern = pattern;
                    bestMethods = rules[pattern] || [];
                }
            });
            return bestMethods;
        },
        matchApiPath(pattern, path){
            if(pattern === '*' || pattern === path){return true}
            if(String(pattern).endsWith('/*') && !String(pattern).slice(0, -2).includes('*')){
                const prefix = String(pattern).slice(0, -2);
                return path === prefix || String(path).startsWith(prefix + '/');
            }
            const parts = String(pattern).split('*');
            if(parts.length === 1){return false}
            let pos = 0;
            for(let i = 0; i < parts.length; i++){
                const part = parts[i];
                if(!part){continue}
                const idx = String(path).slice(pos).indexOf(part);
                if(idx < 0){return false}
                if(i === 0 && idx !== 0){return false}
                pos += idx + part.length;
            }
            const last = parts[parts.length - 1];
            return !last || String(path).endsWith(last);
        },
        applyFormConstraints(){
            if(this.menuConstraintKeys){
                const allowed = new Set(this.menuConstraintKeys);
                this.form.permission = (this.form.permission || []).filter(key => allowed.has(key));
            }
            if(this.apiConstraintMap){
                this.form.apiAll = this.canGrantAllApi && this.form.apiAll;
                this.form.apiSelectedKeys = (this.form.apiSelectedKeys || []).filter(key => {
                    const route = this.apiRoutes.find(item => this.apiRouteKey(item) === key);
                    return route && this.apiRouteAllowed(route);
                });
                this.form.apiExtraRules = {};
            }
            if(this.featureConstraint){
                this.form.debug = this.featureConstraint.debug === true && this.form.debug;
                this.form.webshell = this.featureConstraint.webshell === true && this.form.webshell;
                this.form.fileeditor = this.featureConstraint.fileeditor === true && this.form.fileeditor;
            }
        },
        apiRulesToApi(apiRules){
            let api = {};
            (apiRules || []).forEach(rule => {
                if(!rule?.path){return}
                api[rule.path] = Array.isArray(rule.method) ? [...rule.method] : [];
            });
            return api;
        },
        apiToRules(api){
            return Object.keys(api || {}).map(path => ({
                path,
                method: Array.isArray(api[path]) ? [...api[path]] : [],
            }));
        },
        toggleApiRoute(route, checked){
            let key = this.apiRouteKey(route);
            let selected = new Set(this.form.apiSelectedKeys || []);
            if(checked){
                selected.add(key);
            }else{
                selected.delete(key);
            }
            this.form.apiSelectedKeys = Array.from(selected);
        },
        selectAllApiRoutes(){
            this.form.apiSelectedKeys = this.apiRoutes.filter(route => this.apiRouteAllowed(route)).map(route => this.apiRouteKey(route));
        },
        clearApiRoutes(){
            this.form.apiSelectedKeys = [];
        },
    }
}
</script>

<style>
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
