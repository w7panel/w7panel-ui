<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加用户组</a-button>
        </div>
        <div class="bg-white padding-20 mt-20 fc">
            <a-table class="cptable" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>

                    <a-table-column title="权限">
                        <template #cell="{record}">
                            <span @click="openPmsForm(record)" class="cursor">
                                <span>{{record.permissionPackageTitle||'自定义'}}</span>
                                <i class="opt-icon hovershow"><icon-edit /></i>
                            </span>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="费用">
                        <template #cell="{record}">
                            <div @click="openCost(record)" class="cursor">
                                <span v-if="record.cost">
                                    <span>CPU:￥{{record.cost.cpu}}/</span>
                                    <span>内存:￥{{record.cost.memory}}/</span>
                                    <span>存储:￥{{record.cost.storage}}/</span>
                                    <span>带宽:￥{{record.cost.bandwidth}}</span>
                                </span>
                                <span v-else>-</span>
                                <i class="opt-icon hovershow"><icon-edit /></i>
                            </div>
                        </template>
                    </a-table-column>

                    <a-table-column title="集群模式">
                        <template #cell>
                            <!-- {{ {'shared':'共享','virtual':'独享','global':'全局'}[record.allowedMode] }} -->
                            <span>独享</span>
                        </template>
                    </a-table-column>
                    <!-- <a-table-column title="全网发布">
                        <template #cell="{ record }">
                            <a-switch v-model="record.showInShop" :disabled="record.showInShopDisabled" @change="changeShowInShop(record)"></a-switch>
                        </template>
                    </a-table-column> -->
                    <a-table-column title="操作" :width="300">
                        <template #cell="{ record,rowIndex }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <!-- <a-tooltip content="权限管理">
                                <i class="opt-icon" @click="openPmsForm(record)"><icon-user-group /></i>
                            </a-tooltip> -->
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <!-- <a-tooltip content="全网发布">
                                <i class="opt-icon" @click="openRelease(record)"><icon-send /></i>
                            </a-tooltip> -->

                            <a-tooltip content="优惠码">
                                <i class="opt-icon" @click="openPromoCode(record)"><icon-gift /></i>
                            </a-tooltip>

                            <a-popover trigger="click" @popup-visible-change="v=>changeAllowRegister(v,record)" position="tr">
                                <i class="opt-icon"><icon-user-add /></i>
                                <template #content>
                                    <div style="width:380px;">
                                        <span>注册链接：</span>
                                        <span>{{locationOrigin+'/allow-register/register?policyName='+record.name}}</span>
                                        <span class="ml-10 c-blue cursor" style="white-space:nowrap;" @click="onekeyCopy(locationOrigin+'/allow-register/register?policyName='+record.name)">复制</span>
                                    </div>
                                </template>
                            </a-popover>
                            <a-popconfirm :content="'确认要删除吗'" @ok="del(record,rowIndex)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <a-drawer
            :width="600"
            :title="form.isEdit?'修改用户组':'添加用户组'"
            :visible="form.show"
            @ok="submit"
            @cancel="form.show=false;"
            :popup-container="false?'#allmodalbox':'body'"
        >
            <a-form ref="form" :rules="rules" :model="form" auto-label-width class="padding-20">
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                <!-- <a-form-item label="禁用网络策略">
                    <a-switch v-model="form.dnp"></a-switch>
                </a-form-item> -->
                <!-- <a-form-item label="集群模式" field="allowedMode">
                    <a-select v-model="form.allowedMode" :disabled="form.isEdit" @change="changeAllowedMode" placeholder="请选择集群模式">
                        <a-option disabled label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option :disabled="consoleInfo.license_type=='team'" label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="form.allowedMode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="form.allowedMode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="form.allowedMode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item> -->
                <a-form-item label="演示用户">
                    <a-switch v-model="form.demouser"></a-switch>
                </a-form-item>
                <!-- <a-form-item label="上架状态">
                    <a-switch v-model="form.showInShop"></a-switch>
                </a-form-item> -->
                <!-- <a-form-item label="权限套餐">
                    <a-select v-model="form.permissionPackage">
                        <a-option label="自定义" value=""></a-option>
                        <a-option v-for="item in (form.allowedMode=='shared'?permissionPackageListShared:permissionPackageListVirtual)" :key="item.name" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item> -->
            </a-form>
        </a-drawer>
        
        <permission-edit
            :show="pmsForm.show"
            :list="pmsForm.list"
            :permissionPackage="pmsForm.permissionPackage"
            :debug="pmsForm.debug"
            :webshell="pmsForm.webshell"
            :fileeditor="pmsForm.fileeditor"
            :type="pmsForm.type"
            :name="pmsForm.name"
            :whitelist="pmsForm.whitelist"
            :noCustom="true"
            @close="()=>pmsForm.show=false"
            @submit="submitPermission"
        ></permission-edit>

        <cost-edit
            :show="costForm.show"
            :data="costForm"
            :list="costList"
            :onlypackage="true"
            @submit="submitCost"
            @close="()=>costForm.show=false"
        ></cost-edit>

        <!-- <release-package
            :show="release.show"
            :data="release.data"
            @submit="()=>{getList();release.show=false;}"
            @close="()=>release.show=false"
        /> -->

        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <promo-code :show="pcdata.show" :data="pcdata.data" @close="pcdata.show=false;"></promo-code>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore,useUserStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import permissionEdit from '@/components/permission-edit.vue';
import costEdit from '@/components/cost-edit.vue';
// import releasePackage from '../usermanage/release-package.vue';
import promoCode from './promo-code.vue';

const dataTemplate = {
    apiVersion: 'k3k.io/v1alpha1',
    kind: 'VirtualClusterPolicy',
    metadata: {
        name: '',
        annotations: {
            title: '',
        },
        labels: {
            "w7.cc/allow-register": "false",
        },
    },
    spec: {
        disableNetworkPolicy: true,
        allowedMode: 'virtual',
    },
}

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
    data(){
        return {
            namespaceActive: '',
            list: [],
            form: {
                show: false,
                demouser: false,
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            rules: {
                title: [{ required: true, message: '请输入用户名', trigger: 'blur' },],
            },
            limits: [
                {title:'默认限制',key:'default', description:'如果POD未设置CPU/内存限制，会强制给一个默认值。'},
                // {title:'默认请求',key:'defaultRequest'},
                // {title:'最大限制',key:'max'},
                // {title:'最小限制',key:'min'},
            ],

            pmsForm: {
                show: false,
                name: '',
                type: 'shared',
                permissionPackage: '',
                list: [],
                whitelist: [],
            },

            treeData: [],
            sharedNative: '[]',
            sharedTreeData: [],
            virtualNative: '[]',
            virtualTreeData: [],

            consoleInfo: {},
            debug: false,

            permissionPackageList: [],
            costList: [],

            locationOrigin: '',

            costForm: {
                show: false,
                name: "",
                package: "",
                buymode: "",
                cpu: "",
                memory: "",
                storage: "",
                bandwidth: "",
                packageConfig: [],
            },

            // release: {
            //     show: false,
            //     data: null,
            // },

            pcdata: {
                show: false,
                data: null,
            },
        }
    },
    async created(){
        this.locationOrigin = window.location.origin;
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.treeData = useUserStore().getTreeData;
        this.namespaceActive = useNamespaceStore().namespace;
        
        await this.taocan();
        this.getList();
        // this.getStorageList();

        panelApi.get('/auth/console/info?code=test').then(res=>{
            this.consoleInfo = res?.data;
        })
    },
    components: {
        yamlDrawer,
        permissionEdit,
        costEdit,
        // releasePackage,
        promoCode,
    },
    methods: {
        openPromoCode(row){
            this.pcdata = {
                show: true,
                data: row,
            }
        },
        // openRelease(row){
        //     this.release = {
        //         show: true,
        //         data: row.data,
        //     }
        // },
        openCost(row){
            
            this.costForm = {
                ...this.costForm,
                show: true,
                name: row?.name,
                package: row?.costName || "",
                buymode: row?.cost?.buymode || "give",
                cpu: row?.cost?.cpu || "",
                memory: row?.cost?.memory || "",
                storage: row?.cost?.storage || "",
                bandwidth: row?.cost?.bandwidth || "",
                packageConfig: row?.cost?.packageConfig || [],
            }

        },
        submitCost(data){
            
            k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+this.costForm.name,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1cost-name',
                value: data.package,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1cost',
                value: JSON.stringify({
                    cpu: data.cpu,
                    memory: data.memory,
                    storage: data.storage,
                    bandwidth: data.bandwidth,
                    packageConfig: data?.packageConfig || [],
                }),
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.costForm.show = false;
                this.getList();
            })
        },
        changeAllowRegister(boo,row){
            if(!boo){return}
            if(row.allowregister){return}
            k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+row.name,[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1allow-register',
                value: 'true',
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.getList();
            })
        },
        // getStorageList(){
        //     k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
        //         let data = res?.data || [];
        //         let list = data.items || [];
        //         list = list.map(item=>{
        //             return item.metadata.name;
        //         })
        //         this.storageLs = list;
        //     });
        // },
        // 集群模式
        changeAllowedMode(v){
            this.form.permissionPackage = '';
        },
        async taocan(){
            await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=permission",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = i?.data?.menu || '[]';
                    permission = JSON.parse(permission);
                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        permission: permission,
                        clustermode: i.metadata?.labels?.clustermode,
                        debug: i?.data?.debug === 'true',
                        webshell: i?.data?.webshell === 'true',
                        fileeditor: i?.data?.fileeditor === 'true',
                    }
                });
                this.permissionPackageList = list;
                this.permissionPackageListShared = list.filter(i=>i.clustermode=='shared');
                this.permissionPackageListVirtual = list.filter(i=>i.clustermode=='virtual');
            })

            await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=cost",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        data: i.data,
                        ...i.data,
                    }
                });
                this.costList = list;
            })
        },
        openPmsForm(row){
            row = JSON.parse(JSON.stringify(row));
            this.pmsForm = {
                ...this.pmsForm,
                name: row.name,
                show: true,
                permissionPackage: row.permissionPackage || '',
                debug: row.debug,
                webshell: row.webshell,
                fileeditor: row.fileeditor,
                type: row.allowedMode,
                list: row.permission,
                whitelist: row.whitelist || [],
            }
        },
        submitPermission(data){
            k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+data.name,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1menu',
                value: JSON.stringify(data.list),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1menu-name',
                value: data.permissionPackage,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1domain-white-list',
                value: data.whitelist,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1debug',
                value: String(data.debug),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1web-shell',
                value: String(data.webshell),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1file-editor',
                value: String(data.fileeditor),
            },
            ...(data.role?[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1role',
                value: data.role,
            }]:[])
            ],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.pmsForm.show = false;
                this.getList();
            })
        },
        openYaml(name){
            k8sproxy.get('/apis/k3k.io/v1alpha1/virtualclusterpolicies/' + name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/k3k.io/v1alpha1/virtualclusterpolicies/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        getList(){
            k8sproxy.get('/apis/k3k.io/v1alpha1/virtualclusterpolicies',{
                params:{ limit:500, },
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let md = i.metadata;
                    let spec = i.spec;
                    
                    let permissionPackage = i.metadata.annotations?.['w7.cc/menu-name'] || '';
                    let permissionPackageTitle = '';
                    if(permissionPackage && this.permissionPackageList?.length){
                        permissionPackageTitle = this.permissionPackageList?.find(i=>i.name==permissionPackage)?.title;
                    }
                    let whitelist = md?.annotations?.['w7.cc/domain-white-list'] || '[]';
                    whitelist = JSON.parse(whitelist);

                    // 费用
                    let costName = i.metadata?.annotations?.['w7.cc/cost-name'] || '';
                    if(costName){
                        let find = this.costList.find(i=>i.name == costName);
                        // costName = find?.title || costName;
                        if(find){
                            try{
                                i.metadata.annotations['w7.cc/cost'] = JSON.stringify(find?.data);
                            }catch{}
                        }
                    }
                    let cost = i.metadata?.annotations?.['w7.cc/cost'];
                    cost = cost? JSON.parse(cost) : null;
                    
                    let showInShopDisabled = true;
                    let packageConfig = cost?.packageConfig;
                    if(typeof packageConfig=='string'){packageConfig = JSON.parse(packageConfig);}
                    packageConfig?.map?.(p=>{
                        p?.config?.map?.(i=>{
                            if(i.online){showInShopDisabled = false;}
                        })
                    })

                    return {
                        data: i,
                        name: md.name,
                        title: md.annotations?.title || md.name,
                        annotations: md.annotations,
                        version: Number(md.annotations?.['w7.cc/version']),
                        // dnp: spec.disableNetworkPolicy,
                        allowedMode: spec.allowedMode,
                        permission: JSON.parse(md.annotations?.['w7.cc/menu'] || '[]'),
                        bandwidth: md.annotations?.['w7.cc/bandwidth'] || '',
                        demouser: md.labels?.['w7.cc/demo-user'] == 'true',
                        
                        permissionPackage: permissionPackage,
                        permissionPackageTitle: permissionPackageTitle,
                        
                        debug: i.metadata.annotations?.['w7.cc/debug'] == 'true',
                        webshell: i.metadata.annotations?.['w7.cc/web-shell'] == 'true',
                        fileeditor: i.metadata.annotations?.['w7.cc/file-editor'] == 'true',

                        allowregister: i.metadata?.labels?.['w7.cc/allow-register'] == 'true',

                        showInShop: i.metadata?.labels?.['w7.cc/showInShop'] == 'true',
                        showInShopDisabled: showInShopDisabled,

                        cost: cost,
                        costName: costName,

                        whitelist: whitelist,
                    }
                })
                this.list = list;
                // console.log(list)
            })
        },
        add(){
            let all = this.getAllKeys(this.treeData);
            all = all.filter(i=>!sharedPass.includes(i));
            this.form = {
                ...this.form,
                show: true,
                isEdit: false,
                title: '',
                name: '',
                demouser: false,
                allowedMode: 'virtual',
                permissionPackage: '',
                showInShop: true,
            };
        },
        edit(row){
            this.form = {
                ...this.form,
                show: true,
                isEdit: true,
                name: row.name,
                title: row.title,
                allowedMode: row.allowedMode || 'virtual',
                demouser: row.demouser,
                permissionPackage: row.permissionPackage || '',
                showInShop: row.showInShop,
            }
        },
        changeShowInShop(row){
            k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+row.name,[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1showInShop',
                value: String(row.showInShop),
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }
                let debug = false;
                let webshell = false;
                let fileeditor = false;
                if(this.form.permissionPackage){
                    let find = this.permissionPackageList.find(i=>i.name==this.form.permissionPackage);
                    if(find){
                        let permission = find?.permission || [];
                        this.form.permission = permission.filter(i=>!(this.form.allowedMode=='shared'?sharedPass:virtualPass).includes(i));
                        debug = find.debug;
                        webshell = find.webshell;
                        fileeditor = find.fileeditor;
                    }
                }
                if(this.form.isEdit){
                    k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+this.form.name,[{
                        op: 'replace',
                        path: '/metadata/annotations/title',
                        value: this.form.title,
                    },{
                        op: 'replace',
                        path: '/metadata/labels/w7.cc~1showInShop',
                        value: String(this.form.showInShop),
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1menu-name',
                        value: this.form.permissionPackage,
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1menu',
                        value: JSON.stringify(this.form.permission),
                    },{
                        op: 'replace',
                        path: '/spec/allowedMode',
                        value: this.form.allowedMode,
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1debug',
                        value: String(debug),
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1web-shell',
                        value: String(webshell),
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1file-editor',
                        value: String(fileeditor),
                    },{
                        op: 'replace',
                        path: '/metadata/labels/w7.cc~1demo-user',
                        value: String(this.form.demouser),
                    }],{
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }else{
                    let data = JSON.parse(JSON.stringify(dataTemplate));
                    data.metadata.name = this.createName();
                    data.metadata.annotations.title = this.form.title;
                    data.metadata.annotations['w7.cc/menu-name'] = this.form.permissionPackage;
                    data.metadata.annotations['w7.cc/menu'] = JSON.stringify(this.form.permission);
                    data.metadata.annotations['w7.cc/debug'] = String(debug);
                    data.metadata.annotations['w7.cc/web-shell'] = String(webshell);
                    data.metadata.annotations['w7.cc/file-editor'] = String(fileeditor);
                    data.metadata.labels['w7.cc/demo-user'] = String(this.form.demouser);
                    data.metadata.labels['w7.cc/showInShop'] = String(this.form.showInShop);

                    data.spec.allowedMode = this.form.allowedMode;
    
                    k8sproxy.post('/apis/k3k.io/v1alpha1/virtualclusterpolicies',data,{loading:true}).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        del(row){
            k8sproxy.delete('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
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
        getAllKeys(tree) {
            const keys = [];
            function traverse(node) {
                keys.push(node.key);
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => traverse(child));
                }
            }
            tree.forEach(root => traverse(root));
            return keys;
        },
        onekeyCopy(text){
            var textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.style.position = 'fixed';
            textarea.style.clip = 'rect(0 0 0 0)';
            textarea.style.top = '10px';
            textarea.value = text;
            textarea.select();
            let copy = document.execCommand('copy', true);
            document.body.removeChild(textarea);
            if(copy){
                this.$message.success("复制成功");
            }else{
                this.$message.warning('复制失败，请手动复制');
            }
        },
    },
}
</script>

<style>
.cptable .hovershow{opacity:0;}
.cptable tr:hover .hovershow{opacity:1;}
</style>