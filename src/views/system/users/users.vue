<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="df">
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加用户</a-button>
            <!-- <a-button type="outline" class="ml-20" @click="openRegister">注册设置</a-button> -->
        </div>
        <div class="bg-white mt-20">
            <a-form :model="search" layout="inline" class="padding-20" style="padding-bottom:12px;">
                <a-form-item label="用户名">
                    <a-input v-model="search.username" placeholder="请输入用户名"></a-input>
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" @click="getList">确定</a-button>
                </a-form-item>
            </a-form>
        </div>
        
        <div class="bg-white padding-20 mt-20 fc">
            <a-table class="cptable user-cptable" :data="list" :pagination="false" :bordered="false" :scroll="{ x: 1000 }">
                <template #columns>
                    <a-table-column title="用户名" data-index="name">
                        <template #cell="{ record }">
                            <div>{{record.name}}</div>
                        </template>
                    </a-table-column>

                    <a-table-column title="权限" >
                        <template #cell="{record}">
                            <span @click="openPmsForm(record)" class="cursor df ai-c">
                                <span class="lh-20">{{record.permissionPackageTitle||'自定义'}}</span>
                                <i class="opt-icon hovershow"><icon-edit /></i>
                            </span>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="操作" :width="200" fixed="right">
                        <template #cell="{ record,rowIndex }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.userMode!=='founder'" content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            
                            <a-tooltip content="webshell">
                                <span class="opt-icon" @click="openWs(record)" :style="{opacity:record?.status=='complete'?1:0.5}">
                                    <icon-code-square />
                                </span>
                            </a-tooltip>
                            <a-popconfirm v-if="record.userMode!=='founder'" :content="'确认要删除吗'" @ok="del(record,rowIndex)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <a-drawer :width="600" :title="form.isEdit?'修改用户':'添加用户'" :visible="form.show" @ok="submit" @cancel="form.show=false;" @open="$refs.form.clearValidate()" :popup-container="$popupContainer">
            <a-form ref="form" :rules="rules" :model="form" auto-label-width class="padding-20">
                <a-form-item label="用户名" field="username">
                    <a-input v-model="form.username" :disabled="form.isEdit" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="密码" field="password">
                    <a-input v-model="form.password" type="password" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                
                <!-- <a-form-item v-if="!form.isEdit" label="到期时间" field="expiretime">
                    <a-date-picker v-if="!form.forever" v-model="form.expiretime" showTime class="mr-20" />
                    <a-checkbox v-model="form.forever">永久</a-checkbox>
                </a-form-item> -->
                <a-form-item label="演示用户">
                    <a-switch v-model="form.demouser"></a-switch>
                </a-form-item>
                <!-- <a-form-item label="救援模式">
                    <a-switch v-model="form.weihu"></a-switch>
                </a-form-item> -->
            </a-form>
        </a-drawer>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        
        <a-modal title="到期时间" :visible="expiretimeModal.show" width="600px" @ok="submitExpiretime" @cancel="expiretimeModal.show=false;">
            <a-form ref="expiretimeModal" :rules="expiretimeModalRules" :model="expiretimeModal" auto-label-width>
                <a-form-item label="到期时间" field="expiretime">
                    <a-date-picker v-if="!expiretimeModal.forever" v-model="expiretimeModal.expiretime" style="width:300px;" showTime class="mr-20" />
                    <a-checkbox v-model="expiretimeModal.forever">永久</a-checkbox>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal title="webshell" v-model:visible="ws.dialog" width="500px"  @cancel="ws.dialog = false;" top="10vh" :popup-container="$popupContainer">
            <template #title>webshell</template>
            <div style="margin-top:-10px;">
                <a-form :model="ws">
                    <a-form-item label="Shell环境">
                        <a-select v-model="ws.type" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option label="bin/sh" value="bin/sh"></a-option>
                            <a-option label="bin/bash" value="bin/bash"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="容器">
                        <a-select v-model="ws.container" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option v-for="item in ws.containers" :key="item.name" :label="item.name" :value="item.name"></a-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </div>
            <template #footer>
                <a-button size="small" @click="ws.dialog=false;">取消</a-button>
                <a :href="webshelllink" target="_blank" class="ml-10">
                    <a-button size="small" type="primary" @click="ws.dialog=false;">确定</a-button>
                </a>
            </template>
        </a-modal>
        <permission-edit
            :show="pmsForm.show"
            :list="pmsForm.list"
            :permissionPackage="pmsForm.permissionPackage"
            :debug="pmsForm.debug"
            :webshell="pmsForm.webshell"
            :fileeditor="pmsForm.fileeditor"
            :name="pmsForm.name"
            :whitelist="pmsForm.whitelist"
            :api="pmsForm.api"
            :userMode="pmsForm.userMode"
            :disabledBase="pmsForm.userMode=='founder'"
            :disabledMenu="pmsForm.userMode=='founder'"
            @close="pmsForm.show=false"
            @submit="submitPermission"
        ></permission-edit>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store';
import bcrypt from "bcryptjs";
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import permissionEdit from '@/components/permission-edit.vue';

const dataTemplate = {
    apiVersion: 'w7panel.w7.com/v1alpha1',
    kind: 'User',
    metadata: {
        labels:{
        },
        annotations: {
        },
        name: '',
    },
    spec: {
        passwordHash: '',
        userMode: 'normal',
        role: 'normal',
        permissionName: 'normal',
        menuRules: [],
        apiRules: [],
        features: {
            debug: false,
            webshell: false,
            fileeditor: false,
        },
        domainWhiteList: [],
        demoUser: false,
        version: 1,
    },
}

export default {
    data(){
        return {
            namespaceActive: '',
            search: {
                username: '',
                expiretime: '',
            },
            list: [],
            form: {
                show: false,
                forever: false,
                username: '',
                password: '',
                expiretime: null,
                whitelist: [],
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            rules: {
                username: [{ required: true, message: '请输入用户名', trigger: 'blur' },],
                password: [{ required: true, message: '请输入密码', trigger: 'blur' },],
                expiretime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.form.forever){cb('请选择到期时间'); return}
                    cb();
                }, trigger: 'blur'}],
            },
            expiretimeModalRules: {
                expiretime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.expiretimeModal.forever){cb('请选择到期时间'); return}
                    cb();
                }}],
            },
            ws: {
                dialog: false,
                type: 'bin/sh',
                row: {},
            },
            debug: false,
            pmsForm: {
                show: false,
                name: '',
                permissionPackage: '',
                list: [],
                api: {},
            },
            permissionPackageList: [],
            
            userInfo: {},

            expiretimeModal: {
                show: false,
                name: '',
                expiretime: '',
            },

            leavePage: false,
        }
    },
    async created(){
        this.userInfo = getUserInfo();
        this.debug = this.userInfo?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;

        this.getList();
        this.getPermissionPackages();
    },
    components: {
        yamlDrawer,
        permissionEdit,
    },
    unmounted(){
        this.leavePage = true;
    },
    methods: {
        submitExpiretime(){
            this.$refs.expiretimeModal.validate((err) => {
                if (err) {
                    return;
                }
                k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/users/'+this.expiretimeModal.name,{
                    spec: {
                        expireTime: this.expiretimeModal.forever ? null : this.expiretimeModal.expiretime,
                    }
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'},
                    loading: true,
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.expiretimeModal.show = false;
                    this.getList();
                })
            })
        },
        editExpiretime(row){
            this.expiretimeModal = {
                ...this.expiretimeModal,
                show: true,
                expiretime: row.expiretime,
                name: row.name,
            }
        },
        // openRegister(){
        //     k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/config',{noAlert:true}).then(res=>{
        //         this.register = {
        //             show: true,
        //             allowConsoleRegister: res?.data?.spec?.data?.allowConsoleRegister === 'true',
        //             showInShop: res?.data?.spec?.data?.showInShop === 'true',
        //             defaultPermissionName: res?.data?.spec?.data?.defaultPermissionName,
        //         }
        //     }).catch((err)=>{
        //         if(err?.response?.status != 404){
        //             if(error?.response?.data?.message){
        //                 this.$message.error(error?.response?.data?.message);
        //             }
        //             return;
        //         }
                
        //         let o = {
        //             apiVersion: 'w7panel.w7.com/v1alpha1',
        //             kind: 'K3kConfig',
        //             metadata: {
        //                 name: 'config',
        //                 labels: {},
        //                 annotations: {},
        //             },
        //             spec: {data: {}},
        //         }
        //         k8sproxy.post("/apis/w7panel.w7.com/v1alpha1/k3kconfigs", o,{loading:true}).then(res=>{
        //             this.register = {
        //                 show: true,
        //                 allowConsoleRegister: false,
        //                 showInShop: false,
        //                 defaultPermissionName: '',
        //             }
        //         });
        //     })
        // },
        // submitRegister(){
        //     k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/config',{
        //         spec:{
        //             data:{
        //                 allowConsoleRegister: String(this.register.allowConsoleRegister),
        //                 showInShop: String(this.register.showInShop),
        //                 defaultPermissionName: this.register.defaultPermissionName,
        //             },
        //         }
        //     },{
        //         headers: {'Content-Type': 'application/merge-patch+json'}
        //     }).then(res=>{
        //         this.$message.success('操作成功')
        //         this.register.show = false;
        //     })
        // },
        openPmsForm(row){
            row = JSON.parse(JSON.stringify(row))
            this.pmsForm = {
                show: true,
                name: row.name,
                permissionPackage: row.permissionPackage || '',
                debug: row.debug,
                webshell: row.webshell,
                fileeditor: row.fileeditor,
                list: row.permission,
                api: row.api,
                whitelist: row.whitelist || [],
                userMode: row.userMode,
            }
        },
        submitPermission(data){
            if(this.pmsForm.userMode=='founder' && data.role && data.role!='founder'){
                this.$message.error('创始人角色不允许修改为其他角色');
                return;
            }
            if(this.pmsForm.userMode!='founder' && (data.role=='founder' || data.permissionPackage=='founder')){
                this.$message.error('不允许选择创始人权限');
                return;
            }
            k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/users/'+data.name,{
                spec: {
                    menuRules: data.list || [],
                    permissionName: data.permissionPackage,
                    apiRules: Object.entries(data.api || {}).map(([path, method])=>({path, method})),
                    domainWhiteList: Array.isArray(data.whitelist)? data.whitelist : [],
                    features: {
                        debug: Boolean(data.debug),
                        webshell: Boolean(data.webshell),
                        fileeditor: Boolean(data.fileeditor),
                    },
                    ...(data.role ? { role: data.role, userMode: data.role } : {}),
                }
            },{
                headers: {'Content-Type': 'application/merge-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.pmsForm.show = false;
                this.getList();
            })
        },
        openWs(row){
            if(row?.status!=='complete'){return;}
            this.ws.row = row;
            this.ws.dialog = true;
            this.ws.container = 'w7panel-agent';
            this.ws.containers = [];
            this.ws.getLink = ()=>{
                if(this.inMicro){
                    let token = getToken();
                    this.webshelllink = window.microApp?.getData()?.originUrl || '';
                    this.webshelllink = this.webshelllink.replace(/\/$/,'') + `/fp/pod-webshell?type=${this.ws.type}&pod=w7panel-k3k-agent-${row.name}&namespace=${this.namespaceActive}&containerName=${this.ws.container}&api_token=${token}`;
                }else{
                    // this.webshelllink = `/fp/pod-webshell?pod=w7panel-k3k-agent-${row.name}&namespace=${this.namespaceActive}&containerName=${this.ws.container}&type=${this.ws.type}`;
                    this.webshelllink = `/fp/pod-webshell?pod=k3k-${row.name}-server-0&namespace=k3k-${row.name}&containerName=k3k-${row.name}-server&type=${this.ws.type}`;
                }
            }
            this.ws.getLink();
        },
        openYaml(name){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/users/'+name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/w7panel.w7.com/v1alpha1/users/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        getPermissionPackages(){
            k8sproxy.get("/apis/w7panel.w7.com/v1alpha1/permissions").then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    return {
                        title: i.spec?.title || i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                    }
                })
                this.permissionPackageList = list;
                if(this.list?.length){
                    this.list.map(i=>{
                        if(!i.permissionPackage){return}
                        i.permissionPackageTitle = this.permissionPackageList?.find(f=>f.name==i.permissionPackage)?.title;
                    })
                }
            })
        },
        getList(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/users',{
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let spec = i.spec || {};

                    let expiretime = new Date(spec.expireTime).getTime();
                    let is_expired = !(!spec.expireTime || expiretime>Date.now());

                    let permissionPackage = spec.permissionName || '';
                    let permissionPackageTitle = '';
                    if(permissionPackage && this.permissionPackageList.length){
                        permissionPackageTitle = this.permissionPackageList?.find(i=>i.name==permissionPackage)?.title;
                    }
                    let whitelist = spec.domainWhiteList || [];

                    let createTime = new Date(i.metadata['creationTimestamp']).getTime();
                    
                    return {
                        name: i.metadata.name,
                        expiretime: spec.expireTime,
                        is_expired: is_expired,
                        'w7.cc/pause': spec.pause,
                        status: spec.status,
                        jobname: spec.jobName,
                        debug: spec.features?.debug === true,
                        webshell: spec.features?.webshell === true,
                        fileeditor: spec.features?.fileeditor === true,
                        demouser: spec.demoUser === true,
                        weihu: spec.maintenance === true,
                        createTime: createTime,

                        userMode: spec.userMode,

                        recycleTime: spec.pendingRecycleTime || '',

                        version: Number(spec.version) || 0,
                        permissionPackage: permissionPackage,
                        permissionPackageTitle: permissionPackageTitle,
                        permission: spec.menuRules || [],
                        api: (spec.apiRules || []).reduce((acc, rule)=>{
                            if(rule?.path){ acc[rule.path] = rule.method || []; }
                            return acc;
                        }, {}),
                        password: spec.passwordHash,
                        whitelist: whitelist,
                        
                        data: i,
                    }
                })
                if(this.search.expiretime){
                    list = list.filter(i=>i.is_expired==(this.search.expiretime=='expired'))
                }
                if(this.search.username){
                    list = list.filter(i=>new RegExp(this.search.username).test(i.name));
                }
                list.sort((a, b) => b.createTime - a.createTime);
                this.list = list;
            })
        },
        getErrorReason(row,index){
            // if(row.sourceStatus!=5){return}
            
            this.list[index].podStatus = {
                loading: true
            }
            k8sproxy.get(`/api/v1/namespaces/k3k-${row.name}/pods/k3k-${row.name}-server-0`,{noAlert:true}).then(res=>{
                let data = res?.data?.status?.containerStatuses?.[0]
                data = {
                    name: data?.name || '',
                    state: data?.state || {},
                    lastState: data?.lastState || {},
                    ready: data?.ready,
                    restartCount: data?.restartCount,
                }
                this.list[index].podStatus = {
                    loading: false,
                    data: JSON.stringify(data,false,4),
                }
            }).catch(()=>{
                this.list[index].podStatus = {
                    loading: false,
                    data: '{}',
                }
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
        add(){
            this.rules.password[0].required = true;
            this.form = {
                ...this.form,
                isEdit: false,
                show: true,
                forever: false,
                username: '',
                password: '',
                expiretime: '',
                // debug: false,
                version: 0,
                demouser: false,
                weihu: false,
            };
        },
        edit(row,recycle){
            this.rules.password[0].required = false;
            this.form = {
                ...this.form,
                isEdit: true,
                show: true,
                forever: !row.expiretime,
                username: row.name,
                password: '',
                old_password: row.password,
                expiretime: row.expiretime || '',
                // debug: row.debug,
                version: row.version || 0,
                demouser: row.demouser,
                // cvmuser: row.cvmuser,
                weihu: row.weihu,
            }
            // console.log(this.form)
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }

                if(this.form.isEdit){
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(this.form.password, salt);
                    let data = this.list.find(i=>i.name==this.form.username).data;
                    if(!data){ this.$message.error('操作失败'); return; }
                    delete data.metadata.resourceVersion;
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.uid;
                    data.spec = data.spec || {};
                    data.spec.passwordHash = this.form.password? hash : this.form.old_password;
                    data.spec.maintenance = Boolean(this.form.weihu);
                    data.spec.demoUser = Boolean(this.form.demouser);
                    data.spec.version = Number(this.form.version || 0) + 1;

                    if(!this.form.forever){
                        data.spec.expireTime = this.form.expiretime;
                    }else{
                        delete data.spec.expireTime;
                    }

                    k8sproxy.put('/apis/w7panel.w7.com/v1alpha1/users/'+this.form.username,data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }else{
                    let data = JSON.parse(JSON.stringify(dataTemplate));
                    data.metadata.name = this.form.username;

                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(this.form.password, salt);
                    data.spec.passwordHash = hash;
                    data.spec.maintenance = Boolean(this.form.weihu);
                    data.spec.demoUser = Boolean(this.form.demouser);
                    if(!this.form.forever){
                        data.spec.expireTime = this.form.expiretime;
                    }
                    k8sproxy.post('/apis/w7panel.w7.com/v1alpha1/users',data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        del(row){
            k8sproxy.delete('/apis/w7panel.w7.com/v1alpha1/users/'+row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
    },
}
</script>

<style scoped>
.mr-4{margin-right:4px;}
.mr-5{margin-right:5px;}
</style>
<style>
.cptable .hovershow{display:inline-block; margin-left:3px; opacity:0;}
.cptable tr:hover .hovershow{display:inline-block; opacity: 1;}
.user-cptable.cptable .opt-icon{padding:1px; min-width:18px; height:18px;}
.user-cptable.cptable .lh-20{line-height:20px;}
</style>
