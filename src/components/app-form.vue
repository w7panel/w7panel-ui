<template>
    <div>
        <div class="bg-white  df df-c" style="min-height:600px;">
            <div class="title">基本信息</div>
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" label-align="left" auto-label-width class="app-formclass">
                <a-form-item label="应用名称" field="title">
                    <a-input type="text" v-model="form.title" @input="titleInput();" @blur="titleInput();" size="large" :placeholder="form.namePlaceholder||'应用名称'" :spellcheck="false" style="width:500px;" />
                </a-form-item>
                <a-form-item label="应用标识" field="nameBefore">
                    <div class="df df-c">
                        <a-input type="text" v-if="id || defaultData" v-model="form.name" :disabled="true" size="large" placeholder="应用标识" style="width:500px;" />
                        <a-input type="text" v-else v-model="form.nameBefore" @blur="emitInfo()" @input="emitInfo()" placeholder="应用标识" size="large" :spellcheck="false" style="width:500px;">
                            <template v-if="this.form.nameAfter" #append>{{this.form.nameAfter}}</template>
                        </a-input>
                        <div class="fs-12 c-99">最长63个字符，只能包含小写字母、数字及分隔符("-")，且必须以小写字母开头，数字或小写字母结尾</div>
                    </div>
                </a-form-item>

                <a-form-item label="应用类型" field="kind">
                    <div class="df ai-c">
                        <a-radio-group v-model="form.kind" :disabled="!!id">
                            <a-radio value="deployments" >
                                <template #radio="{checked,disabled}">
                                    <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">无状态应用</div>
                                </template>
                            </a-radio>
                            <a-radio value="statefulsets">
                                <template #radio="{checked,disabled}">
                                    <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">有状态应用</div>
                                </template>
                            </a-radio>
                            <a-radio value="daemonsets">
                                <template #radio="{checked,disabled}">
                                    <div class="app-type-custom-label" :class="{'custom-radio-card-checked':checked, 'custom-radio-card-disabled':disabled }">守护进程应用</div>
                                </template>
                            </a-radio>
                        </a-radio-group>
                    </div>
                </a-form-item>

                <!-- <a-form-item label="挂载文件用户">
                    <a-input v-model="form.fsGroup" type="number" placeholder="文件组ID"></a-input>
                </a-form-item> -->

                <!-- <a-form-item label="启动用户" class="mt-20">
                    <a-checkbox v-model="form.security_context.runAsNonRoot" >非root运行</a-checkbox>
                    <a-input v-model="form.security_context.runAsUser" type="number" class="w_140 ml-10" placeholder="用户id" />
                    <a-input v-model="form.security_context.runAsGroup" type="number" class="w_140 ml-10" placeholder="用户组id" />
                    <a-input v-model="form.security_context.fsGroup" type="number" class="w_140 ml-10" placeholder="文件组" />
                </a-form-item> -->
                
                <!-- <a-form-item label="镜像仓库">
                    <a-select v-model="form.imagePullSecrets" :options="mirror" size="large" popup-container="#mirror_select_box" placeholder="请选择" style="width:500px;">
                        <template #label="{ data }">
                            <span>{{data?.label+(data.namespace?'/':'')+data.namespace}}</span>
                        </template>
                        <template #option="{data}">
                            <div class="df ai-c jc-b">
                                <span class="custom-label" :class="{'lh-1':data.value}">{{ data.label+(data.namespace?'/':'')+data.namespace }}</span>
                                <span>
                                    <span v-if="data.value" class="df-s0 ml-10 c-blue cursor"  @click.stop="createImage.name=data.value;createImage.show=true;">编辑</span>
                                    <span v-if="data.value" class="df-s0 ml-10 c-blue cursor" @click.stop="delMirror(data.value)">删除</span>
                                </span>
                            </div>
                        </template>
                    </a-select>
                    <span class="ml-20 cursor c-blue" @click="createImage.name='';createImage.show=true;">新建</span>
                </a-form-item> -->

                <!-- 数据卷 -->
                <app-form-volumes
                    :id="id"
                    :data="data"
                    :kind="form.kind"
                    @submit="v=>{volumes=v.volumes;volumeClaimTemplates=v.volumeClaimTemplates;}"
                ></app-form-volumes>

                <div class="title">容器（Containers）</div>
                <!-- 容器 -->
                <app-form-container
                    ref="appformcontainer"
                    :data="data"
                    :volumes="volumes"
                    :volumeClaimTemplates="volumeClaimTemplates"
                    :mirror="mirror"
                    @getMirror="getMirror"
                    @editMirror="v=>{createImage.name=v;createImage.show=true;}"
                    @delMirror="delMirror"
                    @showExtra="v=>showExtra=v"
                ></app-form-container>
                <div class="mt-20" v-show="showExtra">
                    <div class="title">节点调度</div>
                    <a-form-item label="节点调度">
                        <node-select :ns="affinity" @select="v=>form.affinity=v"></node-select>
                    </a-form-item>
    
                    <a-form-item label="容忍度">
                        <a-checkbox v-model="tlrt" >容忍节点封锁</a-checkbox>
                    </a-form-item>
                </div>
            </a-form>
        </div>

        <imageform-drawer :show="createImage.show" :id="createImage.name" @submit="createImage.submit" @close="createImage.show=false;"></imageform-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store';
import nodeSelect from '@/components/node/node-select.vue';

import { getUserInfo } from '@/utils/auth';
import imageformDrawer from '@/views/config/sercet/imageform-drawer.vue';

import appFormVolumes from './app-form-volumes.vue';
import appFormContainer from '@/components/app-form-container.vue';


const dataTemplate = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
        name: 'my-deployment',
        labels: {
            app: 'my-app'
        }
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                app: 'my-app'
            }
        },
        template: {
            metadata: {
                labels: {
                    app: 'my-app'
                }
            },
            spec: {
                containers: [{
                    name: 'my-container',
                    image: 'nginx:latest',
                    ports: [{
                        containerPort: 80
                    }]
                }],
                imagePullSecrets: [{
                    "name": ""
                }]
            }
        }
    }
}

export default {
    props: ['id', 'kind', 'defaultData', 'parent', 'afterName','groupname'],
    data(){
        return {
            namespaceActive: '',

            data: {},
            affinity: null,
            tlrt: false,

            createImage: {
                show: false,
                name: '',
                submit: ()=>{ this.getMirror(); }
            },

            form: {
                name: '',
                title: '',
                ports: [],
                env: [],
                kind: 'deployments',
                //启动用户
                // security_context: {
                //     runAsNonRoot: false,
                //     runAsUser: '',
                //     runAsGroup: '',
                //     fsGroup: '',
                // },
                // gpu
                runtime_class_name: false,
                affinity: null,
            },
            rules: {
                nameBefore: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                title: [{ required: true, message: '请输入别名', trigger: 'blur' }],
                image: [],
                kind: [{ required: true, message: '请选择类型', trigger: 'change' }],
            },
            mirror: [],
            userInfo: {},
            volumes: [],
            volumeClaimTemplates:[],
            showExtra: false,
        }
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.userInfo = getUserInfo();

        await this.getMirror();
        this.init();
    },
    components: {
        nodeSelect,
        appFormContainer,
        appFormVolumes,
        imageformDrawer,
    },
    watch:{
        defaultData: "init",
        id: "init",
        'form.nameAfter'(v){ this.form.name = (this.form.nameBefore + this.form.nameAfter).toLowerCase();  },
        'form.nameBefore'(v){ this.form.name = (this.form.nameBefore + this.form.nameAfter).toLowerCase();  },
    },
    computed: {
        replica(){
            if(this.data.kind=='DaemonSet'){
                return this?.data?.status?.numberReady || 0;
            }else{
                return this?.data?.spec?.replicas || 0;
            }
        }
    },
    methods: {
        getMirror(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let dockerconfigjson = {};
                    if(i?.data['.dockerconfigjson']){
                        let dj = {}
                        try{
                            dj = JSON.parse(atob(i?.data['.dockerconfigjson']));
                        } catch(e){}
                        if(dj?.auths){
                            let o = Object.keys(dj?.auths).map(i=>({
                                host: i,
                                username: dj?.auths[i]?.username || '',
                                password: dj?.auths[i]?.password || '',
                            }));
                            o.length && (dockerconfigjson = o[0]);
                        }
                    }

                    return {
                        label: dockerconfigjson.host || i?.metadata?.name || '',
                        namespace: atob(i?.data?.namespace || ''),
                        value: i?.metadata?.name || '',
                    }
                });
                
                this.mirror = [
                    {label: '无', value:'', namespace: ''},
                    ...list,
                ]
            })
        },
        
        delMirror(name){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getMirror();
            })
        },
        titleInput(){
            if(this.id || this.defaultData){return}
            let tt = this.form.title.replace(/\-/g,'').replace(/_/g,'-');
            if(/[\u4e00-\u9fa5]/.test(tt)){
                panelApi.post('/pinyin',{words:tt.replace(/[^\u4e00-\u9fa5]/g,'')},{noAlert:true}).then(res=>{
                    if(res?.data?.length){
                        let str = res.data.map(i=>i?.[0]?.[0]||'').join('');
                        let len = 0;
                        this.form.nameBefore = tt.replace(/[\u4e00-\u9fa5]/g,()=>str[len++]);
                    }
                }).finally(()=>{
                    this.emitInfo();
                })
            }else{
                this.form.nameBefore = tt;
                this.emitInfo();
            }
        },
        emitInfo(obj){
            this.$nextTick(()=>{
                this.$emit('getInfo', {
                    name: this.form.name,
                    title: this.form.title,
                    isSubmit: obj?.isSubmit || false,
                    submitStatus: obj?.submitStatus || false,
                });
            });
        },
        init(){
            if(this.id){
                this.getData();
            }else if(this.defaultData){
                this.data = JSON.parse(JSON.stringify(this.defaultData));
                this.dataToForm();
            }else{
                let nameAfter = this.afterName || this.createName(8);
                this.form = {
                    ...this.form,
                    namePlaceholder: this.parent===false? '应用名称' : '子应用名称',
                    name: '',
                    title: '',
                    privileged: false, // 特级容器
                    //启动用户
                    // security_context: {
                    //     runAsNonRoot: false,
                    //     runAsUser: '',
                    //     runAsGroup: '',
                    //     fsGroup: '',
                    // },
                    affinity: null,
                };
                this.form.nameAfter = '-' + nameAfter;
                this.data = dataTemplate;
                this.data.kind = 'deployments';
                this.data.metadata.labels['w7.cc/suffix'] = nameAfter;
                this.data.spec.suffix = nameAfter;
            }
        },
        getData(){
            k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.kind +"/"+this.id,{loading:true}).then(res=>{
                this.data = res.data;
                this.dataToForm();
            })
        },
        dataToForm(){
            let spec = this?.data?.spec?.template?.spec;
            // 容忍度
            this.tlrt = Boolean(spec?.tolerations?.find(i=>i.key=='node.kubernetes.io/unschedulable'));
            // 启动用户
            // this.form.security_context = {
            //     runAsNonRoot: spec?.securityContext?.runAsNonRoot || false,
            //     runAsUser: spec?.securityContext?.runAsUser || '',
            //     runAsGroup: spec?.securityContext?.runAsGroup || '',
            //     fsGroup: spec?.securityContext?.fsGroup || '',
            // }
            
            // 挂载文件用户
            this.form.fsGroup = spec?.securityContext?.fsGroup || '';
            // 节点调度
            this.affinity = this?.data?.spec?.template?.spec?.affinity;
            this.form.affinity = JSON.parse(JSON.stringify(this.affinity||{}));

            let ctn = this?.data?.spec?.template?.spec?.containers?.[0];
            // 特级容器
            this.form.privileged = ctn?.securityContext?.privileged || false;
            
            // let imagePullSecrets = this?.data?.spec?.template?.spec?.imagePullSecrets?.[0]?.name || '';

            this.form = {
                ...this.form,
                kind: this.data?.kind?.toLowerCase() + 's',
                name: this.data?.metadata?.name,
                nameBefore: this.data?.metadata?.name,
                nameAfter: '',
                title: this.data?.metadata?.annotations?.title || "",
                // imagePullSecrets: imagePullSecrets,
            }
            if(this.id && !this.form.title){
                this.form.title = this.form.name;
            }
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

        formTodata(){
            let data = JSON.parse(JSON.stringify(this.data));
            data.metadata.annotations = data.metadata?.annotations || {}
            data.metadata.annotations.title = this.form.title;
            data.metadata.annotations['w7.cc.app/title'] = this.form.title;
// data.metadata.annotations['w7.cc.app/ports'] = JSON.stringify(hostPorts);
            if(this.form.kind=='statefulsets'){
                data.metadata.annotations['w7.cc/create-headless-svc'] = String(this.form.headless);
                data.spec.serviceName = this.form.name + "-headless";
                data.spec.volumeClaimTemplates = this.volumeClaimTemplates;
            }
            data.kind = {
                'Deployment': 'deployments',
                'StatefulSet': 'statefulsets',
                'DaemonSet': 'daemonsets',
            }[this.form.kind];

            let spec = data?.spec?.template?.spec || {};
            
            
            // 容忍度
            if(this.tlrt){
                spec.tolerations = [{key:'node.kubernetes.io/unschedulable',operator:'Exists',effect:'NoSchedule'}];
            }else{
                delete spec.tolerations;
            }

            // 节点调度
            if(this.form.affinity){
                spec.affinity = this.form.affinity;
            }else{
                delete spec.affinity;
            }
            
            // 挂载文件用户
            spec.securityContext = spec?.securityContext || {};
            if(this.form.fsGroup){
                spec.securityContext.fsGroup = Number(this.form.fsGroup);
            }else{
                delete spec.securityContext.fsGroup;
            }

            // 镜像仓库
            // if(this.form.imagePullSecrets){
            //     spec.imagePullSecrets = [{name: this.form.imagePullSecrets}];
            // }else{
            //     delete spec.imagePullSecrets;
            // }
            // 启动用户
            // spec.securityContext = {};
            // if(this.form.security_context.runAsNonRoot){ spec.securityContext.runAsNonRoot = true; }
            // if(this.form.security_context.runAsUser){ spec.securityContext.runAsUser = Number(this.form.security_context.runAsUser);  }
            // if(this.form.security_context.runAsGroup){ spec.securityContext.runAsGroup = Number(this.form.security_context.runAsGroup);  }
            // if(this.form.security_context.fsGroup){ spec.securityContext.fsGroup = Number(this.form.security_context.fsGroup);  }
            
            if(!this.id){
                data.metadata.name = this.form.name;
                data.metadata.labels = data.metadata.labels || {};
                data.metadata.labels['w7.cc/group-name'] = this.groupname || this.afterName;
                
                data.metadata.labels.app = this.form.name;
                data.spec.selector.matchLabels.app = this.form.name;
                data.spec.template.metadata.labels.app = this.form.name;
            }

            delete data.metadata?.resourceVersion;
            delete data.metadata?.uid;
            
            return data;
        },
        validate(){
            return new Promise((resolve,reject)=>{
                this.$refs.form.validate((err) => {
                    if (err) {
                        this.$refs.form.scrollToField(Object.keys(err)[0])
                        reject();
                    }
                    resolve();
                });
            })
        },
        exportFormData(){
            return this.validate().then(()=>{
                
                let data = this.formTodata();

                let {
                    initContainers,
                    containers,
                    hostPorts,
                    imagePullSecrets,
                } = this.$refs.appformcontainer.formToData();
                
                data.spec.template.spec.volumes = this.volumes || [];
                data.spec.volumeClaimTemplates = this.volumeClaimTemplates || [];
                data.spec.template.spec.initContainers = initContainers;
                data.spec.template.spec.containers = containers;
                
                data.spec.template.spec.imagePullSecrets = imagePullSecrets;
                data.metadata.annotations['w7.cc.app/ports'] = JSON.stringify(hostPorts);
                
                return data;
            })
        },
        submit(hideMessage){
            return this.validate().then(()=>{
                
                let data = this.formTodata();

                let {
                    initContainers,
                    containers,
                    hostPorts,
                    imagePullSecrets,
                } = this.$refs.appformcontainer.formToData();
                
                data.spec.template.spec.volumes = this.volumes || [];
                data.spec.volumeClaimTemplates = this.volumeClaimTemplates || [];
                data.spec.template.spec.initContainers = initContainers;
                data.spec.template.spec.containers = containers;
                
                data.spec.template.spec.imagePullSecrets = imagePullSecrets;
                data.metadata.annotations['w7.cc.app/ports'] = JSON.stringify(hostPorts);

                if(this.id){
                    // 不修改volumeClaimTemplates
                    data.spec.volumeClaimTemplates = this.data?.spec?.volumeClaimTemplates;
                    return k8sproxy.put("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.kind +"/"+ this.id, data,{loading:false}).then(async res=>{
                        if(!res.data){return;}
                        if(!hideMessage){this.$message.success("修改成功");}
                        this.emitInfo({
                            isSubmit: true,
                            submitStatus: true,
                        });
                    })
                }else{
                    data.metadata.annotations['w7.cc/create-svc'] = 'true';
                    data.spec.template.spec.enableServiceLinks = false;
                    // 创建子应用
                    if(this.parent){ data.metadata.labels.parent = this.parent; }
                    return k8sproxy.post("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.form.kind, data,{loading:false}).then(async res=>{
                        if(!res.data){return;}
                        if(!hideMessage){this.$message.success("创建成功");}
                        this.emitInfo({
                            isSubmit: true,
                            submitStatus: true,
                        });
                    }).catch(()=>{
                        this.emitInfo({
                            isSubmit: true,
                            submitStatus: false,
                        });
                    })
                }
            })
        },
    },
}
</script>

<style scoped>
.w_140{width:140px;}
.ftable{width:100%; min-width:750px;}

.app-type-custom-label{padding:8px 20px; border:1px solid var(--color-border-2); border-radius: 4px;}
.app-type-custom-label.custom-radio-card-checked{ color:rgb(var(--primary-6)); border-color:rgb(var(--primary-6)); background-color:var(--color-primary-light-1);}
.app-type-custom-label.custom-radio-card-disabled{opacity: 0.8; color: var(--color-text-3);}
.app-type-custom-label.custom-radio-card-checked.custom-radio-card-disabled{border-color:var(--color-primary-light-3);}

.title{font-size:16px; padding:10px; border-bottom:1px solid var(--color-neutral-3);margin-bottom:20px;}
</style>
<style>
#mirror_select_box .arco-select-option-content{display:block; width:100%;}
#mirror_select_box .arco-select-option-content .custom-label{white-space: pre-wrap; word-break: break-all; }
#configmap_select_box .arco-select-option-content{display:block; width:100%;}
#configmap_select_box .arco-select-option-content .custom-label{white-space: pre-wrap; word-break: break-all; }
.app-formclass .arco-form-item-label-col.arco-form-item-label-col-flex{min-width:100px;}
</style>
