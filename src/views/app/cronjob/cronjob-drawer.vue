<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="false?'#allmodalbox':'body'">
        <template #title>{{id?'修改定时任务':'添加任务'}}</template>
        <div class="bg-white bg-padding df jc-b">
            <a-form ref="form" :model="form" label-suffix="" label-width="130px" class="form-33-label mt-20 fc" auto-label-width>
                <a-form-item label="任务名称" field="title" :rules="[{required:true, message:'请输入名称'}]">
                    <a-input type="text" v-model="form.title" size="large" :spellcheck="false" placeholder="请输入任务名称" />
                </a-form-item>
                <a-form-item label="执行方式">
                    <div class="df df-c">
                        <a-radio-group :disabled="!!id" v-model="form.runtype" size="large" style="width:100%;">
                            <a-radio value="1">周期执行</a-radio>
                            <a-radio value="2">单次执行</a-radio>
                        </a-radio-group>
                        <cron-job v-if="form.runtype=='1'" :value="defaultSchedule" @change="v=>{form.schedule=v;}" />
                    </div>
                </a-form-item>

                <a-form-item label="执行顺序">
                    <a-radio-group v-model="form.sequence" size="large" style="width:100%;">
                        <a-radio :value="1">并发执行</a-radio>
                        <a-radio :value="2">顺序执行</a-radio>
                    </a-radio-group>
                </a-form-item>

                <a-tabs v-model:active-key="form.ctActive" type="card-gutter" :editable="true" @add="addContiner" @delete="deleteContiner" show-add-button auto-switch>
                    <a-tab-pane v-for="item in form.container" :key="item.key" :title="'item'+(item.key+1)" style="padding:0 20px;" :closable="item.key!=0">
                        <a-form-item label="选择应用">
                            <select-container @complete="onSelectContainer" />
                            <a-select v-model="item.app" size="large" @change="changeApp(item)" placeholder="请选择应用" class="mt-10">
                                <a-option label="默认应用" value=""></a-option>
                                <a-option v-for="item in apps" :key="item.name" :label="item.title" :value="item.name"></a-option>
                            </a-select>
                            <span @click="openEditApp(item.app)" class="ml-20 cursor c-blue" style="flex-shrink:0;">编辑</span>
                        </a-form-item>
                        <a-form-item label="脚本内容">
                            <div class="df df-c" style="width:100%;">
                                <div class="df ai-c df-ww">
                                    <!-- <span class="c-blue cursor mr-20" @click="scriptMysql(item.key)">MYSQL备份</span> -->
                                    <span class="c-blue cursor mr-20" @click="scriptRc(item.key)">触发远程连接</span>
                                    <span class="c-blue cursor mr-20" @click="scriptSyslog(item.key)">清理失败pod</span>
                                </div>
                                <div>
                                    <!-- <a-textarea v-model="form.commandInput" placeholder="请输入脚本内容" class="mt-10" style="height:80px;width:500px;" :spellcheck="false" allow-clear/> -->
                                    <div :id="'command_textarea'+item.key" style="background:#fff;height:180px;"></div>
                                </div>
                            </div>
                        </a-form-item>
                        
                        <a-form-item label="环境变量" prop="env">
                            <a-table style="flex:1" :data="item.startParams" :pagination="false" :bordered="false">
                                <template #columns>
                                    <a-table-column title="名称">
                                        <template #cell="{ record }">
                                            <span class="va-middle">{{record.title}}</span>
                                            <a-popover v-if="record.description">
                                                <icon-question-circle class="ml-4 fs-18 cursor c-66 va-middle" />
                                                <template #content>
                                                    <div>{{record.description}}</div>
                                                </template>
                                            </a-popover>
                                        </template>
                                    </a-table-column>
                                    <a-table-column title="键">
                                        <template #cell="{ record }">
                                            {{record.name}}
                                        </template>
                                    </a-table-column>
                                    <a-table-column title="值">
                                        <template #cell="{ record }">
                                            <a-input v-model="record.value" type="text" @input="inputStartParams" @change="inputStartParams" placeholder="请输入值" />
                                        </template>
                                    </a-table-column>
                                </template>
                            </a-table>
                        </a-form-item>

                        
                        <a-form-item label="临时目录" prop="volumes">
                            <table class="com-table ftable"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <!-- <td>存储类型</td> -->
                                    <td>操作</td>
                                </tr>

                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="item.mountsLs.push({name:'lsml-'+createName(10),  mountPath:''})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加临时目录</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(mitem,index) in item.mountsLs" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-input v-model="mitem.mountPath" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <!-- <td>default</td> -->
                                    <td>
                                        <span class="c-blue cursor" @click="item.mountsLs.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="挂载目录" prop="volumes">
                            <table class="com-table ftable"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <td>默认存储</td>
                                    <td>目标路径</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="item.mounts.push({name:'', subPath:computedSubMd5(''), mountPath:''})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加挂载目录</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(sitem,index) in item.mounts" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-input v-model="sitem.mountPath" @input="sitem.subPath=computedSubMd5(sitem.mountPath)" @blur="sitem.subPath=computedSubMd5(sitem.mountPath)" @change="sitem.subPath=computedSubMd5(sitem.mountPath)" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <td>
                                        <a-select v-model="sitem.name" size="large" style="width:200px;" placeholder="请选择存储">
                                            <a-option v-for="sitem in customStorages" :key="sitem.name" :label="sitem.name" :value="sitem.name"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <span v-if="!sitem.edit">
                                            <span class="va-middle" style="max-width:100px;white-space: pre-wrap;display:inline-block;word-break:break-all;">{{sitem.subPath}}</span>
                                            <span class="va-middle ml-10 c-blue cursor" @click="sitem.edit=true;">修改</span>
                                        </span>
                                        <!-- 空字符显示'/', '/'提交空字符 -->
                                        <a-input v-if="sitem.edit" v-model="sitem.subPath" @blur="sitem.edit=false;sitem.subPath=sitem.subPath?sitem.subPath:computedSubMd5(sitem.mountPath);" size="large" style="width:200px;" placeholder="目标路径" />
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" style="white-space:nowrap;" @click="item.mounts.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="挂载主机目录" prop="volumes">
                            <table class="com-table ftable"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <td>主机路径</td>
                                    <td>检查类型</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="item.hostPath.push({type:'DirectoryOrCreate', path:'', mountPath:''})">
                                    <span class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加挂载主机目录</span>
                                    </span>
                                </td></tr>
                                <tr v-for="(sitem,index) in item.hostPath" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-input v-model="sitem.mountPath" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <td>
                                        <a-input v-model="sitem.path" size="large" style="width:200px;" placeholder="主机路径" />
                                    </td>
                                    <td>
                                        <a-select v-model="sitem.type" size="large" style="width:200px;" placeholder="请选择">
                                            <a-option label="DirectoryOrCreate" value="DirectoryOrCreate"></a-option>
                                            <a-option label="Directory" value="Directory"></a-option>
                                            <a-option label="FileOrCreate" value="FileOrCreate"></a-option>
                                            <a-option label="File" value="File"></a-option>
                                            <a-option label="Socket" value="Socket"></a-option>
                                        </a-select>
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" @click="item.hostPath.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                        <a-form-item label="挂载文件" prop="volumes">
                            <table class="com-table ftable"><tbody>
                                <tr class="thead" >
                                    <td>挂载路径</td>
                                    <td>配置文件</td>
                                    <td>操作</td>
                                </tr>
                                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="item.mountsFile.push({name:'',  mountPath:''})">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 lh-1" style="margin-left:6px;">添加挂载目录</span>
                                    </div>
                                </td></tr>
                                <tr v-for="(sitem,index) in item.mountsFile" :key="index" style="background:var(--color-neutral-1);">
                                    <td>
                                        <a-input v-model="sitem.mountPath" size="large" style="width:200px;" placeholder="挂载路径" />
                                    </td>
                                    <td>
                                        <!-- <a-select v-model="item.name" size="large" style="width:200px;" placeholder="请选择">
                                            <a-option v-for="item in configmap" :key="item.name" :label="item.title || item.name" :value="item.name"></a-option>
                                        </a-select> -->
                                        <a-select v-model="sitem.name" :options="configmap" @change="sitem.key=(configmapKeys[sitem.name] && configmapKeys[sitem.name].length==1)?configmapKeys[sitem.name][0]:'';" size="large" popup-container="#configmap_select_box" style="width:200px;" placeholder="请选择">
                                            <template #label="{ data }">
                                                <span>{{data?.label}}</span>
                                            </template>
                                            <template #option="{data}">
                                                <div class="df ai-c jc-b">
                                                    <span class="custom-label lh-1" >{{ data.label }}</span>
                                                    <span>
                                                        <span v-if="data.value" class="df-s0 ml-10 c-blue cursor" @click.stop="cmform.show=true;cmform.id=data.value;">编辑</span>
                                                        <span v-if="data.value" class="df-s0 ml-10 c-blue cursor" @click.stop="delConfigmap(data.value)">删除</span>
                                                    </span>
                                                </div>
                                            </template>
                                        </a-select>
                                        <a-select v-model="sitem.key" size="large" style="width:170px;margin-left:10px;">
                                            <a-option v-for="option in (configmapKeys[sitem.name]||[])" :key="option" :value="option" :label="option"></a-option>
                                        </a-select>
                                        <span class="ml-10 c-blue cursor" @click="cmform.show=true;cmform.id='';">新建</span>
                                    </td>
                                    <td>
                                        <span class="c-blue cursor" @click="item.mountsFile.splice(index,1);">删除</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </a-form-item>

                    </a-tab-pane>
                </a-tabs>
            </a-form>
        </div>
        
        <a-drawer :width="1000" :visible="editApp.show" @ok="editAppSubmit" @cancel="editApp.show=false;" unmountOnClose :popup-container="false?'#allmodalbox':'body'">
            <template #title>编辑</template>
            <app-form ref="editappref" :defaultData="editApp.defaultData" :parent="false" />
        </a-drawer>

        <form-drawer :show="cmform.show" :id="cmform.id" @submit="cmform.show=false;getConfigmap();" @close="cmform.show=false;"></form-drawer>

    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import cronJob from "@/components/cron-job.vue"
import selectContainer from '@/components/select-container.vue';
import axios from "axios"
import {useNamespaceStore} from "@/store";
import {basicSetup, EditorView} from "codemirror"
import appForm from '@/components/app-form.vue';
import CryptoJS  from 'crypto-js';
import formDrawer from '@/views/config/configmap/form-drawer.vue';

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
                containers: [{}],
                imagePullSecrets: [{"name": ""}],
                volumes: [],
            }
        }
    }
}

export default {
    props: ['id','show','defaultData','type'],
    data(){
        return {
            visible: false,
            namespaceActive: '',
            data: {},
            defaultSchedule: '0 0 1 * ?',

            app: "",
            apps: [],
            editApp: {
                show: false,
                title: '',
                id: '',
                defaultData: null,
            },

            configmap: [],
            configmapKeys: [],

            form: {
                title: '',
                runtype: '1',
                schedule: '0 0 1 * ?',
                sequence: 1,

                ctActive: 0,
                container: [
                    {
                        key: 0,
                        app: '',
                        commandInput: '',
                        appVolumes: [],
                        
                        mountsLs: [],
                        mounts: [],
                        hostPath: [],
                        mountsFile: [],
                    }
                ],
                ctnData: [{}],
                volumes: [],
                recordApp: [],
            },
            mirror: [],

            customStorages: [],
            
            cmform: {
                show: false,
                id: '',
            },
        }
    },
    components: {
        cronJob,
        selectContainer,
        appForm,
        formDrawer,
    },
    watch: {
        show(v){
            this.visible = v;
            this.defaultSchedule = '0 0 1 * ?';
            this.form = {
                title: '',
                runtype: '1',
                schedule: '0 0 1 * ?',
                sequence: 1,
                ctActive: 0,
                // 表单
                container: [
                    {
                        key: 0,
                        app: '',
                        commandInput: '',
                        appVolumes: [],

                        mountsLs: [],
                        mounts: [],
                        hostPath: [],
                        mountsFile: [],
                    }
                ],
                // container数据
                ctnData: [{}],
                volumes: [],
                recordApp: [],
            }
            this.getData();
        },
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        await this.getApps();
        this.getData();
        this.getMirror();
        this.getStorage();
        this.getConfigmap();
    },
    methods: {
        onSelectContainer(val){
            console.log('select-container:', val);
        },
        delConfigmap(name){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.getConfigmap();
            });
        },
        computedSubMd5(v){
            return CryptoJS.MD5(v + this.form.name).toString();
        },
        getConfigmap(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps').then(res=>{
                let list = res?.data?.items || [];
                this.configmap = list.map(i=>{
                    return {
                        label: i.metadata.name, //i.metadata?.annotations?.title || i.metadata.name,
                        value: i.metadata.name,
                        // title: i.metadata?.annotations?.title,
                        // name: i.metadata.name,
                        // type: i.metadata?.annotations?.type,
                        // createTime: window.formatDate(i.metadata?.creationTimestamp)
                    }
                })
                this.configmapKeys = {};
                list.map(i=>{
                    this.configmapKeys[i.metadata.name] = Object.keys(i?.data||{});
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
                // console.log(this.storages)
            }).then(()=>{
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{noAlert:true}).then(res=>{
                    if(!res?.data){return}
                    let arr = res.data?.data?.customs?.split(',');
                    let customsDefault = res?.data?.data?.default || '';
                    this.storages.map(i=>{
                        i.isCustom = arr.includes(i.name);
                        i.isDefault = i.name == customsDefault;
                    });
                    let customStorages = this.storages.filter(i=>i.isCustom);
                    this.customStorages = customStorages;
                })
            })
        },
        getMirror(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>i.metadata.name);
                this.mirror = list.map(i=>({name:i}));
            })
        },
        editAppSubmit(){
            this.editApp.show = false;
            let data = this.$refs.editappref.formTodata();
            let container = data?.spec?.template?.spec?.containers?.[0];
            this.form.ctnData[this.form.ctActive] = container;

            this.form.container[this.form.ctActive].appVolumes = data?.spec?.template?.spec?.volumes || [];
            this.form.container[this.form.ctActive].startParams = this.comStartParams(this.editApp.id, this.form.ctnData[this.form.ctActive].env || []);
        },
        async openEditApp(name){
            let defaultData = {};
            if(name){
                let {data} = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments/"+name)
                defaultData = data;
            }else{
                defaultData = JSON.parse(JSON.stringify(dataTemplate));
            }
            try{
                defaultData.spec.template.spec.containers[0] = JSON.parse(JSON.stringify(this.form.ctnData[this.form.ctActive]));
                let vm = defaultData.spec.template.spec.containers[0]?.volumeMounts || [];

                let volume = this.form.container[this.form.ctActive].appVolumes || [];
                volume = volume.concat(this.form.volumes);
                defaultData.spec.template.spec.volumes = volume.filter(i=>{
                    return vm.find(v=>v.name==i.name);
                });
                
                // defaultData.spec.template.spec.containers[0].command = [];
            }catch{}
            this.editApp.defaultData = defaultData;
            this.editApp.id = name;
            this.editApp.show = true;
        },
        deleteContiner(v){
            let index = this.form.container.findIndex(i=>i.key==v);
            if(this.form.ctActive==v){
                this.form.ctActive = this.form.container[index-1].key;
            }
            this.form.container.splice(index,1);
            this.form.ctnData.splice(index,1);
            this.form.recordApp?.splice(index,1);
        },
        addContiner(){
            this.form.container.push({
                key: Math.max(...this.form.container.map(item=>item.key)) + 1,
                app: '',
                commandInput: '',
                appVolumes: [],

                mountsLs: [],
                mounts: [],
                hostPath: [],
                mountsFile: [],
            })
            this.form.ctnData.push({
                env: [],
                image: 'ccr.ccs.tencentyun.com/afan-public/busybox:curl',
                command: [],
            });
            this.editorInit();
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        changeApp(item){
            let index = this.form.container.findIndex(v=>v.key==item.key);
            this.form.recordApp[index] = item.app;
            this.getAppData(item.app, index);
        },
        getAppData(name,index){
            let form = this.form.container[index];
            if(!name){
                this.form.ctnData[index] = {
                    image: 'ccr.ccs.tencentyun.com/afan-public/busybox:curl',
                    env: [],
                    command: this.form.ctnData[index]?.command || [],
                };
                form.appVolumes = [];
                form.startParams = [];
                return
            }
            k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments/"+name).then(res=>{
                let data = res?.data || {};
                this.form.ctnData[index] = data?.spec?.template?.spec?.containers?.[0] || {};
                
                form.appVolumes = data?.spec?.template?.spec?.volumes || [];
                form.startParams = this.comStartParams(name, this.form.ctnData[index].env || []);
                let {mounts, mountsFile, mountsLs, hostPath} = this.extractVolumeMounts(form.appVolumes, this.form.ctnData[index]?.volumeMounts);
                this.form.container[index] = {
                    ...this.form.container[index],
                    mounts,
                    mountsFile,
                    mountsLs,
                    hostPath,
                }
            })
        },

        getData(){
            this.form.runtype = this.type=='job'?'2':'1';
            if(!this.id){
                if(!this.defaultData){
                    this.editorInit();
                }else{
                    let data = this.defaultData;
                    this.data = JSON.parse(JSON.stringify(this.defaultData));
                    this.form.title = data?.metadata?.annotations?.title || '';
                    this.form.recordApp = JSON.parse(data?.metadata?.annotations?.recordApp || '[]');
                    this.form.volumes = data?.spec?.template?.spec?.volumes || [];

                    let initContainers = data?.spec?.template?.spec?.initContainers || [];
                    let container = data?.spec?.template?.spec?.containers || [];
                    this.formContainer(initContainers, container);
                }
                
                return;
            }
            if(this.type=='cronjob'){
                k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/cronjobs/'+this.id).then(res=>{
                    let data = res?.data || {};
                    
                    this.data = JSON.parse(JSON.stringify(data));
                    this.defaultSchedule = data?.spec?.schedule;
                    this.form.title = data?.metadata?.annotations?.title || '';
                    this.form.recordApp = JSON.parse(data?.metadata?.annotations?.recordApp || '[]');
                    this.form.schedule = data?.spec?.schedule;
                    this.form.volumes = data?.spec?.jobTemplate?.spec?.template?.spec?.volumes || [];

                    let initContainers = data?.spec?.jobTemplate?.spec?.template?.spec?.initContainers || [];
                    let container = data?.spec?.jobTemplate?.spec?.template?.spec?.containers || [];

                    this.formContainer(initContainers, container);
                })
            }else if(this.type=='job'){
                k8sproxy.get('/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs/'+this.id).then(res=>{
                    let data = res?.data || {};
                    this.data = JSON.parse(JSON.stringify(data));
                    this.form.title = data?.metadata?.annotations?.title || '';
                    this.form.recordApp = JSON.parse(data?.metadata?.annotations?.recordApp || '[]');
                    this.form.volumes = data?.spec?.template?.spec?.volumes || [];

                    let initContainers = data?.spec?.template?.spec?.initContainers || [];
                    let container = data?.spec?.template?.spec?.containers || [];
                    this.formContainer(initContainers, container);
                })
            }
        },
        
        // 合并挂载信息
        mergeVolumeMounts(form){
            let volumes = [];
            let volumeMounts = [];

            form.mounts?.map(v=>{
                if(v.subPath=='/'){ v.subPath = ''; }
                let name = v?.name || ('gzml-'+this.createName(10));
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
            });
            // 如果挂载目录的存储一样，合并volumes
            volumes.forEach((item,index)=>{
                if(!item){return}
                volumes.forEach((fitem,findex)=>{
                    if(!fitem || findex==index){return}
                    if(fitem?.persistentVolumeClaim?.claimName == item?.persistentVolumeClaim?.claimName){
                        let find = volumeMounts.find(i=>i.name==fitem.name);
                        find && (find.name = item.name);
                        volumes[findex] = null;
                    };
                })
            })
            volumes = volumes.filter(i=>i);
            
            form.mountsFile?.map(v=>{
                let subPath = v.mountPath.replace(/^.*\/([^/]+)$/,'$1');
                let vname = v?.name || (this.createName(6) + '-' + v.name.replace(/\./g,'') + '-volume');
                volumes.push({
                    name: vname,
                    configMap: {
                        name: v.name,
                        items: [{
                            key: v.key || 'default-cnf',
                            path: subPath,
                        }],
                        defaultMode: 420,
                    }
                });
                volumeMounts.push({
                    name: vname,
                    mountPath: v.mountPath,
                    subPath: subPath,
                });
            });
            form.mountsLs?.map(v=>{
                volumes.push({
                    name: v.name,
                    emptyDir: {},
                });
                volumeMounts.push({
                    name: v.name,
                    mountPath: v.mountPath,
                });
            });
            form.hostPath?.filter(v=>(v.path && v.mountPath && v.type))?.map(v=>{
                let name = v?.name || (this.createName(6) + '-volume');
                volumes.push({
                    name: name,
                    hostPath: {
                        path: v.path,
                        type: v.type,
                    }
                });
                volumeMounts.push({
                    name: name,
                    mountPath: v.mountPath,
                });
            });
            // console.log(volumes)
            return {
                volumes,
                volumeMounts,
            }
        },
        // 挂载信息
        extractVolumeMounts(volumes,volumeMounts) {
            const mounts = [];

            volumeMounts?.forEach(mount => {
                mounts.push({
                    'mountPath': mount.mountPath,
                    'name': mount.name,
                    'subPath': mount.subPath || ''
                });
            });
            
            let o = {
                mounts: [],
                mountsFile: [],
                mountsLs: [],
                hostPath: [],
            }

            mounts.forEach(m=>{
                let find = volumes?.find(v=>v.name==m.name);

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
                        key: find.configMap?.items?.[0]?.key,
                        subPath: m.subPath || ''
                    })
                }else if(find?.emptyDir){
                    o.mountsLs.push({
                        name: m.name,
                        mountPath: m.mountPath
                    });
                }else if(find?.hostPath){
                    o.hostPath.push({
                        name: m.name,
                        mountPath: m.mountPath,
                        path: find?.hostPath?.path,
                        type: find?.hostPath?.type,
                    })
                }
            })
            return o;
        },
        formContainer(initContainers,container){
            this.form.ctnData = [];
            this.form.container = [];
            let initArr = [];
            initContainers.map((item,index)=>{
                this.form.ctnData.push({...item});
                let app = this.form?.recordApp?.[index] || '';
                let env = item?.env?.length? item.env : [];

                let {mounts, mountsFile, mountsLs, hostPath} = this.extractVolumeMounts(this.form.volumes, item?.volumeMounts || []);

                initArr.push({
                    key: index,
                    app: app,
                    commandInput: item?.command?.[2] || '',
                    startParams: this.comStartParams(app, env),
                    mounts,
                    mountsFile,
                    mountsLs,
                    hostPath
                })
            })
            this.form.container = initArr;

            let arr = [];
            container.map((item,index)=>{
                this.form.ctnData.push({...item});
                
                let app = this.form?.recordApp?.[index + initContainers.length] || '';
                let env = item?.env?.length? item.env : [];
                
                let {mounts, mountsFile, mountsLs, hostPath} = this.extractVolumeMounts(this.form.volumes, item?.volumeMounts);

                arr.push({
                    key: index + initContainers.length,
                    app: app,
                    commandInput: item?.command?.[2] || '',
                    startParams: this.comStartParams(app,env),
                    
                    mounts,
                    mountsFile,
                    mountsLs,
                    hostPath
                })
            })
            this.form.container = this.form.container.concat(arr);
            
            this.form.sequence = (initArr.length && arr.length==1)? 2 : 1;
            this.editorInit();
        },
        comStartParams(app,env){
            let sp = this.apps?.find(i=>i.name==app)?.startParams;
            if(!sp?.length){return [];}
            
            let startParams = sp.map(item=>{
                let value = env.find(v=>v.name==item.name);
                item.value = value?.value || item?.values_text || '';
                return item;
            });
            return startParams;
        },
        inputStartParams(){
            let env = this.form.ctnData[this.form.ctActive]?.env || [];
            this.form.container[this.form.ctActive].startParams.map(sp=>{
                env.find(i=>i.name==sp.name).value = sp.value;
            })
        },
        
        formTodata(){
            let data = null;
            if(this.id){
                data = JSON.parse(JSON.stringify(this.data));
            }else if(this.defaultData){
                data = JSON.parse(JSON.stringify(this.defaultData));
            }else{
                if(this.form.runtype=='1'){
                    data = {
                        apiVersion: 'batch/v1',
                        kind: 'CronJob',
                        metadata: {
                            name: this.createName(12),
                            namespace: this.namespaceActive,
                            annotations: {
                                title: this.form.title,
                            },
                        },
                    };
                }else{
                    data = {
                        kind: 'Job',
                        apiVersion: 'batch/v1',
                        metadata: {
                            name: this.createName(12),
                            namespace:  this.namespaceActive,
                            annotations: {
                                title: this.form.title,
                            },
                        }
                    }
                }
            }

            data.metadata.annotations = data.metadata?.annotations || {};
            data.metadata.annotations.recordApp = JSON.stringify(this.form.recordApp);
            data.metadata.annotations.title = this.form.title;

            let cts = this.form.container.map((i,index)=>{
                i.commandInput = i.editor?.state?.doc?.toString();
                let o = this.form.ctnData[index];
                o = {
                    ...o,
                    name: 'job'+i.key,
                    image: o?.image || 'alpine/curl', //'ccr.ccs.tencentyun.com/afan-public/busybox:curl',
                    command: i.commandInput? ["/bin/sh","-c",i.commandInput] : [],
                    volumeMounts: o?.volumeMounts || [],
                }
                return o
            })
            // console.log(cts);

            let volumes = [];
            let volumesNames = [];
            let vname = 'lsml-'+ this.createName();

            this.form.container.map((i,index)=>{
                let o = this.mergeVolumeMounts(i);
                volumes = volumes.concat(o.volumes||[]);
                cts[index].volumeMounts = o.volumeMounts || [];
            })
            
            this.form.container.map((i,index)=>{
                let cvn = cts[index].volumeMounts.map(vm=>vm.name) || [];
                volumesNames = volumesNames.concat(cvn);
                volumes = volumes.concat(i?.appVolumes||[]);
                // 新建container或修改后的container 添加临时目录/data
                let vmdata = cts[index].volumeMounts?.find(i=>i.mountPath=='/tmp-w7-data');
                //  || !volumes?.find(i=>i.name==vmdata.name)?.emptyDir
                if(!vmdata){
                    cts[index].volumeMounts.push({name: vname, mountPath: '/tmp-w7-data'});
                    volumes.push({name: vname, emptyDir: {}})
                    volumesNames.push(vname);
                }
                // console.log('container'+index, cts[index].volumeMounts)
            })
            volumes = volumes.filter(i=>volumesNames.includes(i.name));
            volumes = Array.from(new Set(volumes.map(JSON.stringify))).map(JSON.parse);
            
            let jobSpec = {
                template: {
                    spec: {
                        initContainers: (this.form.sequence==1||cts.length<2)? [] : cts.slice(0,cts.length-1) ,
                        containers: this.form.sequence==1? cts : [cts[cts.length-1]],
                        volumes: volumes,
                        restartPolicy: "Never",
                        imagePullSecrets: this.mirror,
                    },
                },
            }
            let cronjobSpec = {
                concurrencyPolicy: "Allow",
                jobTemplate: {
                    metadata: {
                        annotations: {
                            title: this.form.title,
                            "w7.cc/job-source": 'cronjob',
                            "w7.cc/job-source-name": data.metadata?.annotations?.['w7.cc/job-source-name'] || data.metadata.name,
                            "w7.cc/job-source-title": data.metadata?.annotations?.['w7.cc/job-source-title'] || this.form.title,
                        },
                        labels: {
                            "searchJob": this.createName(10),
                        },
                    },
                    spec: jobSpec,
                },
            }

            // data.kind = this.form.runtype=='1'? 'CronJob' : 'PodTemplate';
            data.kind = this.form.runtype=='1'? 'CronJob' : 'Job';
            if(this.form.runtype=='1'){
                data.spec = cronjobSpec;
                data.spec.jobTemplate.metadata.labels['w7.cc/job-source'] = 'cronjob';
                data.spec.schedule = this.form.schedule;
            }else{
                data.spec = jobSpec;
                // data.template = jobSpec.template;
                data.metadata.annotations = data.metadata.annotations || {};
                data.metadata.annotations["w7.cc/job-source"] = 'custom';
                data.metadata.annotations["w7.cc/job-source-name"] = data.metadata?.annotations?.['w7.cc/job-source-name'] || data.metadata.name;
                data.metadata.annotations["w7.cc/job-source-title"] = data.metadata?.annotations?.['w7.cc/job-source-title'] || this.form.title;
                data.metadata.labels = data.metadata?.labels || {};
                data.metadata.labels.searchJob = data.metadata?.labels?.searchJob || this.createName(10);
                data.metadata.labels.type = 'job';
            }
            
            return data;
        },
        
        submit(){
            this.$refs.form.validate((err) => {
                if (err) { this.$refs.form.scrollToField(Object.keys(err)[0]); return;}
                let data = this.formTodata();
// console.log(data);
// return;

                if(this.id){
                    if(this.form.runtype=='2'){
                        // data.metadata.annotations["w7.cc/job-source-name"] = data.metadata.name;
                        data.metadata.name = this.createName(12);
                        data.metadata.annotations = data.metadata.annotations || {};
                        data.metadata.labels = data.metadata?.labels || {};
                        // data.metadata.labels.searchJob = this.createName(10);
                        delete data.metadata.resourceVersion;
                        k8sproxy.post('/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs', data ,{loading:true}).then(res=>{
                            if(res?.data){
                                this.$message.success('操作成功');
                                this.closeDrawer(true);
                            }
                        })
                        return;
                    }
                    let url = '/k8s-proxy/apis/batch/v1/namespaces/'+ this.namespaceActive +'/cronjobs/'+this.id;
                    axios.put(url, data ,{loading:true}).then(res=>{
                        if(res?.data){
                            this.$message.success('操作成功');
                            this.closeDrawer(true);
                        }
                    })
                }else{
                    let url = '/k8s-proxy/apis/batch/v1/namespaces/'+this.namespaceActive+'/cronjobs';
                    if(this.form.runtype=='2'){
                        // url = '/k8s-proxy/api/v1/namespaces/'+this.namespaceActive+'/podtemplates';
                        url = '/k8s-proxy/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs';
                    }
                    axios.post(url, data, {loading:true}).then(res=>{
                        if(res?.data){
                            this.$message.success('操作成功');
                            this.closeDrawer(true);
                        }
                    })
                }
            });
        },
        getApps(){
            return k8sproxy.get('/apis/apps/v1/namespaces/'+ this.namespaceActive +'/deployments').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let startParams = i?.metadata?.annotations?.['w7.cc/start-params'];
                    try{
                        startParams = JSON.parse(startParams);
                    }catch(e){
                        startParams = [];
                    }
                    return {
                        title: i?.metadata?.annotations?.title || '',
                        name: i?.metadata?.name || '',
                        namespace: i?.metadata?.namespace || '',
                        created_at: window.formatDate(i?.metadata?.creationTimestamp),
                        replicas: i?.spec?.replicas || 0,
                        selector: i?.spec?.selector?.matchLabels || {},
                        template: i?.spec?.template?.metadata?.labels || {},
                        image: i?.spec?.template?.spec?.containers?.[0]?.image || '',
                        startParams: startParams,
                    }
                });
                this.apps = list;
            })
        },
        scriptRc(key){
            let index = this.form.container.findIndex(v=>v.key==key);
            let form = this.form.container[index];
            let ctnData = this.form.ctnData[index];
            ctnData.command = ["/bin/sh", "-c", "curl -i -k 'https://www.baidu.com'"];
            form.commandInput = ctnData.command[2];
            if(form.editor){
                let txt = form.editor.state.doc.toString();
                form.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:form.commandInput}
                });
            }
        },
        scriptSyslog(key){
            let index = this.form.container.findIndex(v=>v.key==key);
            let form = this.form.container[index];
            let ctnData = this.form.ctnData[index];
            ctnData.image = 'ccr.ccs.tencentyun.com/afan-public/k8s:kubectl';
            ctnData.command = ["/bin/sh", "-c", "kubectl get pods --field-selector=status.phase==Failed -o json | jq '.items[].metadata.name' | tr -d '\"' | xargs -I {} kubectl delete pod {}"];
            ctnData.env = [];
            form.commandInput = ctnData.command[2];
            form.startParams = [];

            if(form.editor){
                let txt = form.editor.state.doc.toString();
                form.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:form.commandInput}
                });
            }
        },
        editorInit(){
            this.$nextTick(()=>{
                let myTheme = EditorView.theme({
                    "&": { height: "160px"},
                }, {dark: false});
    
                this.form.container.map(item=>{
                    if(item.editor){return}
                    
                    item.editor = new EditorView({
                        doc: "",
                        extensions: [
                            basicSetup,
                            myTheme,
                        ],
                        parent: document.getElementById("command_textarea"+item.key),
                    });
                    
                    if(item.commandInput){
                        let txt = item.editor.state.doc.toString();
                        item.editor.dispatch({
                            changes: {from:0, to:txt.length, insert:item.commandInput}
                        });
                    }
                })
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
    }
}
</script>

<style scoped>
.delicon{cursor:pointer; width:24px;height:24px; box-sizing:border-box; border:1px solid; border-radius:50%; padding:2px;}
</style>