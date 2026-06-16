<template>
    <div class="padding-20">
        <div class="page-title df ai-c">{{$route.params.id?'修改应用':'添加应用'}}</div>
        <div class="bg-white padding-20">
            <div class="bg-padding">
                <div class="bg-white bg-padding df jc-b">
                    <a-form :model="form" label-suffix="" auto-label-width label-width="130px" label-position="left" class="form-33-label">
                        <a-form-item label="应用标识">
                            <a-input type="text" v-model="form.name" @change="yamlData=formTodata()" :disabled="!!$route.params.id" size="large" style="width:500px;" />
                        </a-form-item>
                        <a-form-item label="应用名称">
                            <a-input type="text" v-model="form.title" @change="yamlData=formTodata()" size="large" style="width:500px;" />
                        </a-form-item>
                        <a-form-item label="CPU内核">
                            <a-input type="number" v-model="form.cpu" @change="yamlData=formTodata()" size="large" style="width:500px;">
                                <template #append>
                                    <a-select v-model="form.cpuDw" style="width:80px;">
                                        <a-option value="m" label="毫核"></a-option>
                                        <a-option value="" label="核"></a-option>
                                    </a-select>
                                </template>
                            </a-input>
                        </a-form-item>
                        <a-form-item label="内存大小">
                            <a-input type="number" v-model="form.memory" @change="yamlData=formTodata()" size="large" style="width:500px;">
                                <template #append>MB</template>
                            </a-input>
                        </a-form-item>
                        <a-form-item label="应用镜像">
                            <a-input type="text" size="large" v-model="form.image" @change="yamlData=formTodata()" style="width:500px;"></a-input>
                        </a-form-item>
                        <a-form-item label="镜像拉取策略">
                            <a-select v-model="form.imagePullPolicy" size="large" @change="yamlData=formTodata()" placeholder="请选择" style="width:500px;">
                                <a-option label="总是拉取镜像" value="Always"></a-option>
                                <a-option label="本地有不拉取" value="IfNotPresent"></a-option>
                                <a-option label="不拉取" value="Never"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item label="镜像仓库">
                            <a-select v-model="form.imagePullSecrets" size="large" @change="yamlData=formTodata()" placeholder="请选择" style="width:500px;">
                                <a-option v-for="item in mirror" :key="item.name" :label="(item.title || item.name)+' （'+item.host+'）'" :value="item.name"></a-option>
                            </a-select>
                        </a-form-item>
                        
                        <a-form-item label="环境变量" prop="env">
                            <div>
                                <a-button type="primary" @click="openEnvEdit">批量编辑</a-button>
                                <table class="com-table mt-10" style="width:800px;"><tbody>
                                    <tr class="thead" ><td>类型</td><td>名称</td><td>默认值</td><td>操作</td></tr>
                                    <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;" @click="form.env.push({name:'',value:'', type:'custom'})">
                                        <div class="df ai-c jc-c">
                                            <icon-plus :size="14" class="c-99" />
                                            <span class="c-99 lh-1" style="margin-left:6px;">添加环境变量</span>
                                        </div>
                                    </td></tr>
                                    <tr v-for="(item,index) in form.env" :key="index">
                                        <td>
                                            <a-select v-model="item.type" style="width:120px" size="large" @change="item.value=''">
                                                <a-option label="自定义" value="custom"></a-option>
                                                <a-option label="Field" value="field"></a-option>
                                                <a-option label="ResourceField" value="resource_field"></a-option>
                                            </a-select>
                                        </td>
                                        <td>
                                            <a-input v-model="item.name" @paste="envPaste($event,index)" size="large" style="width:200px;" placeholder="变量名" />
                                        </td>
                                        <td>
                                            <a-input v-if="item.type=='custom'" v-model="item.value" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="变量值" />
                                            <a-select v-else-if="item.type=='field'" @change="yamlData=formTodata()" v-model="item.value" size="large" style="width:200px;">
                                                <a-option value="metadata.name" label="metadata.name"></a-option>
                                                <a-option value="metadata.namespace" label="metadata.namespace"></a-option>
                                                <a-option value="spec.serviceAccountName" label="spec.serviceAccountName"></a-option>
                                                <a-option value="status.hostIP" label="status.hostIP"></a-option>
                                                <a-option value="status.podIP" label="status.podIP"></a-option>
                                                <a-option value="status.podIPs" label="status.podIPs"></a-option>
                                                <a-option value="spec.nodeName" label="spec.nodeName"></a-option>
                                            </a-select>
                                            <a-select v-else-if="item.type=='resource_field'" @change="yamlData=formTodata()" v-model="item.value" size="large" style="width:200px;">
                                                <a-option value="limits.cpu" label="limits.cpu"></a-option>
                                                <a-option value="limits.memory" label="limits.memory"></a-option>
                                                <a-option value="limits.ephemeral-storage" label="limits.ephemeral-storage"></a-option>
                                                <a-option value="requests.cpu" label="requests.cpu"></a-option>
                                                <a-option value="requests.memory" label="requests.memory"></a-option>
                                            </a-select>
                                        </td>
                                        <td>
                                            <span class="c-blue cursor" @click="form.env.splice(index,1);yamlData=formTodata()">删除</span>
                                        </td>
                                    </tr>
                                </tbody></table>
                                <div class="fs-12 mt-10 df ai-c jc-b">
                                    <span style="color:#bbbbbb;">变量名为空时，在变量名称中粘贴一行或多行 key=value 的键值对可以实现快速批量输入</span>
                                </div>
                            </div>
                        </a-form-item>
                        
                        <a-form-item label="暴露端口" prop="ports">
                            <table class="com-table" style="width:800px;"><tbody>
                                <tr class="thead" >
                                    <td>端口</td>
                                    <td>协议</td>
                                    <!-- <td>主机暴露端口</td> -->
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style="box-sizing:border-box; cursor:pointer;" @click="form.ports.push({port:'', nodePort:'', protocol:'TCP'})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加端口</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(item,index) in form.ports" :key="index">
                                    <td>
                                        <a-input v-model="item.containerPort" @change="yamlData=formTodata()" size="large" type="number" style="width:200px;" placeholder="端口号" />
                                    </td>
                                    <td>
                                        <a-select v-model="item.protocol" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="请选择协议">
                                            <a-option label="TCP" value="TCP"></a-option>
                                            <a-option label="UDP" value="UDP"></a-option>
                                        </a-select>
                                    </td>
                                    <!-- <td>
                                        <a-input v-if="item.edit" v-model="item.lbPort" @blur="item.edit=false;" size="large" type="number" style="width:140px;" placeholder="端口号" />
                                        <span v-else >
                                            <span>{{item.lbPort?item.lbPort:'不暴露'}}</span>
                                            <span class="ml-4 c-blue cursor" @click="item.edit=true;">点击修改</span>
                                        </span>
                                    </td> -->
                                    <td>
                                        <span class="c-blue cursor" @click="form.ports.splice(index,1);yamlData=formTodata()">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="挂载目录" prop="volumes">
                            <table class="com-table" style="width:800px;"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <td>目标路径</td>
                                    <td>默认存储</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;" @click="form.mounts.push({name:'', subPath:'', mountPath:''})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加挂载目录</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(item,index) in form.mounts" :key="index">
                                    <td>
                                        <a-input v-model="item.mountPath" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <td>
                                        <a-input v-model="item.subPath" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="目标路径" />
                                    </td>
                                    <td>
                                        <a-select v-model="item.name" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="请选择存储">
                                            <a-option v-for="item in storages" :key="item.name" :label="item.name" :value="item.name"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" @click="form.mounts.splice(index,1);yamlData=formTodata()">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="挂载文件" prop="volumes">
                            <table class="com-table" style="width:800px;"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <td>配置文件</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;" @click="form.mountsFile.push({name:'',  mountPath:''})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加挂载目录</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(item,index) in form.mountsFile" :key="index">
                                    <td>
                                        <a-input v-model="item.mountPath" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <td>
                                        <a-select v-model="item.name" @change="yamlData=formTodata()" size="large" style="width:200px;" placeholder="请选择">
                                            <a-option v-for="item in configmap" :key="item.name" :label="item.title || item.name" :value="item.name"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" @click="form.mountsFile.splice(index,1);yamlData=formTodata()">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="运行命令">
                            <div class="df df-c" style="width:800px;">
                                <div v-for="(item,index) in form.command" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-textarea v-model="form.command[index]" placeholder="请输入命令" style="height:80px;" :spellcheck="false" allow-clear/>
                                    <icon-close class="ml-20 cursor fs-20" @click="form.command.splice(index,1)" />
                                </div>
                                <a-button type="outline" style="width:760px;margin-top:10px;" @click="form.command.push('')">新增</a-button>
                            </div>
                        </a-form-item>

                        <a-form-item label="运行参数">
                            <div class="df df-c" style="width:800px;">
                                <div v-for="(item,index) in form.args" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-textarea v-model="form.args[index]" placeholder="请输入命令" style="height:80px;" :spellcheck="false" allow-clear/>
                                    <icon-close class="ml-20 cursor fs-20"  @click="form.args.splice(index,1)" />
                                </div>
                                <a-button type="outline" style="width:760px;margin-top:10px;" @click="form.args.push('')">新增</a-button>
                            </div>
                        </a-form-item>

                        <a-form-item label="" class="mt-40">
                            <a-button type="primary" @click="submit">提交</a-button>
                        </a-form-item>
                    </a-form>
                    <!-- yaml -->
                    <yaml-view class="ml-30" :data="yamlData"></yaml-view>

                </div>
            </div>
        </div>
        <a-modal width="700px" v-model:visible="envedit.show" @ok="submitEnvEdit" @cancel="envedit.show=false;" :popup-container="$popupContainer">      
            <template #title>环境变量</template>
            <span class="c-66">格式：键=值 #中文说明 : 描述</span>
            <a-textarea
                v-model="envedit.values"
                class="mt-10"
                style="height:160px;"
                :spellcheck="false"
                placeholder="格式：名称=值 #标题:描述"
                :rows="12"
                :input-style="{lineHeight:'24px'}"
            />
        </a-modal>
        <!-- <a-dialog v-model="envedit.show" title="环境变量" width="700px" custom-class="envdialog">
            <span class="c-66">格式：键=值 #中文说明 : 描述</span>
            <a-input
                v-model="envedit.values"
                class="mt-10"
                type="textarea"
                :spellcheck="false"
                placeholder="格式：名称=值 #标题:描述"
                :rows="12"
                :input-style="{lineHeight:'24px'}"
            ></a-input>
            <div class="df ai-c jc-c mt-20">
                <a-button @click="envedit.show=false;">取消</a-button>
                <a-button @click="submitEnvEdit" type="primary">确定</a-button>
            </div>
        </a-dialog> -->
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store';

import yamlView from '@/components/yaml-view.vue'

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
    data(){
        return {
            namespaceActive: '',

            data: {},
            form: {
                name: '',
                title: '',
                ports: [],
                env: [],
                image: '',
                imagePullPolicy: '',
                cpu: 0,
                cpuDw: '',
                memory: 0,
                mounts: [],
                mountsFile: [],
                imagePullSecrets: "",
                command: [],
                args: [],
            },
            imagePolicy: {
                Always: "总是拉取镜像",
                IfNotPresent: "本地有不拉取",
                Never: "不拉取",
            },
            
            storages: [],
            configmap: [],
            mirror: [],
            services: [],

            envedit:{
                show: false,
                values: '',
            },
            yamlData: {},
            apptype: "deployments",
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;

        this.getConfigmap();
        this.getStorage();
        this.getMirror();
        this.getService();

        if(this.$route?.params?.id){
            this.getData();
        }else{
            this.form.name = this.createName();
            this.data = dataTemplate;
            this.data.kind = 'Deployment';
            this.yamlData = this.formTodata();
        }
    },
    computed:{
        // ...mapState(['namespaceActive']),
    },
    components: { yamlView },
    methods: {
        getService(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/services").then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>({
                    name: i?.metadata?.name,
                    createTime: window.formatDate(i?.metadata?.creationTimestamp),
                    creationTimestamp: new Date(i?.metadata?.creationTimestamp || 0).getTime(),
                }))
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.services = list;
            })
        },
        getMirror(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson').then(res=>{
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
                        title: i?.metadata?.annotations?.title || '',
                        name: i?.metadata?.name || '',
                        namespace: i?.metadata?.namespace || '',
                        created_at: window.formatDate(i?.metadata?.creationTimestamp),
                        username: dockerconfigjson?.username || '',
                        // password: dockerconfigjson?.password || '',
                        host: dockerconfigjson?.host || '',
                    }
                });
                this.mirror = list;
            })
        },
        getConfigmap(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps').then(res=>{
                let list = res?.data?.items || [];
                this.configmap = list.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title,
                        name: i.metadata.name,
                        type: i.metadata?.annotations?.type,
                        createTime: window.formatDate(i.metadata?.creationTimestamp)
                    }
                })
            })
        },
        getStorage(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.filter(i=>!i.metadata.deletionTimestamp).map(item=>{
                    item.created_at = window.formatDate(item.metadata.creationTimestamp);
                    return {
                        title: item?.metadata?.annotations?.title,
                        name: item?.metadata?.name,
                        size: item?.spec?.resources?.requests?.storage,
                        storage_class: item?.spec?.storageClassName,
                        created_at: item.created_at,
                        creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                    };
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.storages = list;
            })
        },
        getData(){
            k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.apptype +"/"+this.$route.params.id).then(res=>{
                this.data = res.data;
                let cpu = this?.data?.spec?.template?.spec?.containers[0]?.resources?.limits?.cpu;
                let cpuDw = /m$/.test(cpu)? 'm' : '';
                cpu = Number(cpu.replace('m',''));
                
                let memory = this?.data?.spec?.template?.spec?.containers[0]?.resources?.limits?.memory;
                if(/Gi$/.test(memory)){
                    memory = Number(memory.replace('Gi','')) * 1024;
                }else if(/Mi$/.test(memory)){
                    memory = Number(memory.replace('Mi',''));
                }
                this.form = {
                    name: this.$route.params.id,
                    title: this.data?.metadata?.annotations?.title || "",
                    ports: this?.data?.spec?.template?.spec?.containers[0]?.ports || [],
                    env: this?.data?.spec?.template?.spec?.containers[0]?.env || [],
                    image: this?.data?.spec?.template?.spec?.containers[0]?.image,
                    imagePullPolicy: this?.data?.spec?.template?.spec?.containers[0]?.imagePullPolicy,
                    imagePullSecrets: this?.data?.spec?.template?.spec?.imagePullSecrets?.[0]?.name,
                    cpu: cpu,
                    cpuDw: cpuDw,
                    memory: memory,
                    command: this?.data?.spec?.template?.spec?.containers[0]?.command || [''],
                    args: this?.data?.spec?.template?.spec?.containers[0]?.args || [''],

                    // gpu: this?.data?.spec?.template?.spec?.containers[0]?.resources?.limits?.nvidia?.gpu,
                }
                this.form.env = this.form.env?.map(v=>({
                    name: v.name,
                    value: v.value || v?.valueFrom?.fieldRef?.fieldPath || v?.valueFrom?.resourceFieldRef?.resource,
                    type: v.value?'custom': (v?.valueFrom?.fieldRef? 'field' : 'resource_field')
                }))
                
                let {mounts,mountsFile} = this.extractVolumeMounts(this.data);
                this.form.mounts = mounts;
                this.form.mountsFile = mountsFile;

                this.yamlData = this.formTodata();
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

        formTodata(){
            let ports = this.form.ports?.map(v=>({
                containerPort: Number(v.containerPort),
                name: "port-"+v.containerPort,
                protocol: v.protocol,
            }))

            let env = this.form.env.map(v=>{
                let o = {
                    name: v.name,
                };
                if(v.type=='custom'){
                    o.value = v.value;
                }else if(v.type=='field'){
                    o.valueFrom = {
                        fieldRef: {
                            apiVersion: 'v1',
                            fieldPath: v.value,
                        }
                    }
                }else if(v.type=='resource_field'){
                    o.valueFrom = {
                        resourceFieldRef: {
                            containerName: this.$route.params.id? this?.data?.spec?.template?.spec?.containers[0]?.name : this.form.name,
                            resource: v.value,
                            divisor: '0',
                        }
                    }
                }
                return o;
            })

            let volumes = [];
            let volumeMounts = [];
            this.form.mounts?.map(v=>{
                let name = this.createName(10);
                volumes.push({
                    name: name,
                    persistentVolumeClaim: {
                        claimName: v.name,
                    }
                })
                volumeMounts.push({
                    ...v,
                    name: name,
                });
            })
            this.form.mountsFile?.map(v=>{
                let subPath = v.mountPath.replace(/^.*\/([^/]+)$/,'$1')
                volumes.push({
                    name: v.name + '-volume',
                    configMap: {
                        name: v.name,
                        items: [{
                            key: 'default-cnf',
                            path: subPath,
                        }],
                        defaultMode: 420,
                    }
                });
                volumeMounts.push({
                    name: v.name + '-volume',
                    mountPath: v.mountPath,
                    subPath: subPath,
                });
            });

            let data = JSON.parse(JSON.stringify(this.data));
            data.metadata.annotations = data.metadata?.annotations || {}
            data.metadata.annotations.title = this.form.title;
            data.metadata.annotations['w7.cc.app/title'] = this.form.title;

            let spec = data?.spec?.template?.spec || {};
            spec.volumes = volumes;
            // 镜像仓库
            if(this.form.imagePullSecrets){
                spec.imagePullSecrets = [{name: this.form.imagePullSecrets}];
            }else{
                delete spec.imagePullSecrets;
            }

            let ctn = spec?.containers?.[0] || {};
            ctn.ports = ports;
            ctn.env = env;
            ctn.image = this.form.image?.trim();
            ctn.imagePullPolicy = this.form.imagePullPolicy;
            ctn.args = this.form.args?.filter(i=>i) || [];
            ctn.command = this.form.command?.filter(i=>i) || [];

            ctn.resources = ctn.resources || {};
            ctn.resources.limits = ctn.resources?.limits || {};
            ctn.resources.limits.cpu = (Number(this.form.cpu) || 0) + this.form.cpuDw;
            ctn.resources.limits.memory = (Number(this.form.memory) || 0) + 'Mi';
            // 挂载
            ctn.volumeMounts = volumeMounts;
            if(!this.$route.params.id){
                data.metadata.name = this.form.name;
                ctn.name = this.form.name;
                data.metadata.labels.app = this.form.name;
                data.spec.selector.matchLabels.app = this.form.name;
                data.spec.template.metadata.labels.app = this.form.name;
            }
            return data;
        },

        submit(){
            let data = this.formTodata();
            if(this.$route.params.id){
                k8sproxy.put("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.apptype +"/"+this.$route.params.id, data).then(async res=>{
                    if(!res.data){return;}
                    await this.setService(false);
                    this.$message.success("修改成功");
                    setTimeout(()=>{
                        this.$router.push({name:this.apptype, params:{namespaces:this.namespaceActive}})
                    },1000);
                })
            }else{
                k8sproxy.post("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.apptype, data).then(async res=>{
                    if(!res.data){return;}
                    await this.setService(true);
                    this.$message.success("创建成功");
                    setTimeout(()=>{
                        this.$router.push({name:this.apptype, params:{namespaces:this.namespaceActive}})
                    },1000);
                })
            }
        },
        // 服务
        async setService(create){
            // 创建服务
            let ports = this.form.ports?.filter(i=>i.containerPort)?.map(v=>({
                port: Number(v.containerPort),
                targetPort: Number(v.containerPort),
                name: "port-"+v.containerPort,
                protocol: v.protocol,
            }))
            let find = this.services.find(i=>i.name==this.form.name);

            let service = {
                metadata:{
                    apiVersion: 'v1',
                    kind: 'Service',
                    name: this.form.name,
                    namespace: this.namespaceActive,
                },
                spec: {
                    ports: ports,
                    selector: {app:this.form.name},
                }
            }
            if(find){
                return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/services/"+ this.form.name, service)
            } else {
                return k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/services", service)
            }
        },
        // 挂载信息
        extractVolumeMounts(data) {
            const mounts = [];
            const templateSpec = data?.spec?.template?.spec;

            if (templateSpec && templateSpec?.containers) {
                templateSpec.containers.forEach(container => {
                    if (container.volumeMounts) {
                        container.volumeMounts.forEach(mount => {
                            mounts.push({
                                'mountPath': mount.mountPath,
                                'name': mount.name,
                                'subPath': mount.subPath || ''
                            });
                        });
                    }
                });
            }

            let volumes = templateSpec.volumes;
            let o = {
                mounts: [],
                mountsFile: []
            }
            mounts.forEach(m=>{
                let find = volumes.find(v=>v.name==m.name);
                if(find?.persistentVolumeClaim?.claimName){
                    o.mounts.push({
                        name: find?.persistentVolumeClaim?.claimName,
                        mountPath: m.mountPath,
                        subPath: m.subPath || ''
                    });
                }else if(find?.configMap?.name){
                    o.mountsFile.push({
                        name: find?.configMap?.name,
                        mountPath: m.mountPath,
                        subPath: m.subPath || ''
                    })
                }
            })
            return o;
        },

        submitEnvEdit(){
            let values = this.envedit.values.split('\n');
            let arr = [];
            values.map(i=>{
                let match = i.match(/^([^\s=#]+)\s*=\s*([^\s=#]+)\s*(#([^:：]*)(\s*[:：]\s*(.*))?)?$/);
                if(!match){return}
                arr.push({
                    name: match[1],
                    value: match[2],
                    title: match[4] || '',
                    description: match[6] || '',
                    env_type: 'custom',
                    type: 'custom',
                });
            })
            arr = this.form.env.filter(i=>i.env_type!='custom').concat(arr);
            this.form.env = arr;
            this.envedit.show = false;
        },

        openEnvEdit(){
            this.envedit.show = true;
            let values = this.form.env.filter(i=>i.env_type=='custom').map(i=>`${i.name}=${i.value} #${i.title}${i.description?':'+i.description:''}`);
            this.envedit.values = values.join('\n');
        },
        
        // 粘贴 环境变量
        envPaste(e,index){
            let value = e.clipboardData.getData('text/plain');
            if(!/^\s*(\S+\s?[=:]\s?\S+\s*)+$/.test(value)){return}
            e.preventDefault();
            let arr = value.match(/(\S+\s?[=:]\s?\S+)/g);
            let obj = [];
            for(let i=0; i<arr.length; i++){
                let o = arr[i];
                obj.push({
                    type:'custom',
                    name:o.replace(/\s?[=:]\s?\S+/,''),
                    value:o.replace(/\S+\s?[=:]\s?/,''),
                });
            }
            this.form.env.splice(index,this.form.env.length-index,...obj);
        },
    },
}
</script>

<style scoped>

.back{ height:50px; padding:0 20px; line-height:50px; background:#fff; box-shadow:0 0 10px rgba(0,0,0,0.1); }
.table{width:100%;}
.table td{padding:10px; box-sizing:border-box; min-height:50px; line-height:1.4; border:1px solid #f2f2f2; border-left:0; border-right:0;}
 /* background:#F0F3FA; */
.table tr:first-child td{background:#f3f3f3; border-top:0; color:#999;}
.table tr.bg-gray td{background:#f9f9f9;}
.table .viptab{font-size:12px; height:24px; line-height:24px; display:block; padding:0 6px; border-radius:3px; background-image: linear-gradient(to right, #72655c , #3d2d25); color:rgba(255,255,255,0.8); }

</style>
