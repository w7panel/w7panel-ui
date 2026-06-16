<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="$popupContainer">
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

                <app-form-volumes
                    :data="containerEditor.data"
                    ref="appformvolumes"
                    @submit="v=>containerEditor.volumes = v.volumes"
                />

                <app-form-container
                    ref="appformcontainer"
                    layout="cronjob"
                    :data="containerEditor.data"
                    :volumes="containerEditor.volumes"
                    @addVolumes="addVolumes"
                ></app-form-container>

            </a-form>
        </div>

        <form-drawer :show="cmform.show" :id="cmform.id" @submit="cmform.show=false;getConfigmap();" @close="cmform.show=false;"></form-drawer>

    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import cronJob from "@/components/cron-job.vue"
import axios from "axios"
import {useNamespaceStore} from "@/store";
import appForm from '@/components/app-form.vue';
import appFormVolumes from '@/components/app-form-volumes.vue';
import CryptoJS  from 'crypto-js';
import formDrawer from '@/views/config/configmap/form-drawer.vue';
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
                containers: [{}],
                imagePullSecrets: [{"name": ""}],
                volumes: [],
            }
        }
    }
}
const containerTemplate = {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: 'my-container'
                }]
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


            configmap: [],
            configmapKeys: [],

            form: {
                title: '',
                runtype: '1',
                schedule: '0 0 1 * ?',
                sequence: 1,
            },
            mirror: [],

            customStorages: [],
            
            cmform: {
                show: false,
                id: '',
            },

            containerEditor: {
                data: null,
                volumes: [],
            },
        }
    },
    components: {
        cronJob,
        appForm,
        appFormVolumes,
        formDrawer,
        appFormContainer,
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
        addVolumes(val){
            this.$nextTick(()=>{
                this.$refs.appformvolumes.addItemFromOut(val);
            });
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
                    this.containerEditor.data = JSON.parse(JSON.stringify(containerTemplate));
                }else{
                    let data = this.defaultData;
                    this.data = JSON.parse(JSON.stringify(this.defaultData));
                    this.form.title = data?.metadata?.annotations?.title || '';
                    this.form.recordApp = JSON.parse(data?.metadata?.annotations?.recordApp || '[]');
                    this.form.template = data;
                    this.containerEditor.data = JSON.parse(JSON.stringify(this.defaultData));
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
                    this.form.template = data?.spec?.jobTemplate;
                    this.form.schedule = data?.spec?.schedule;
                    this.containerEditor.data = this.data?.spec?.jobTemplate;
                    
                })
            }else if(this.type=='job'){
                k8sproxy.get('/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs/'+this.id).then(res=>{
                    let data = res?.data || {};
                    this.data = JSON.parse(JSON.stringify(data));
                    this.form.title = data?.metadata?.annotations?.title || '';
                    this.form.recordApp = JSON.parse(data?.metadata?.annotations?.recordApp || '[]');
                    this.form.template = data;
                    this.containerEditor.data = this.data;
                })
            }
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


            let {
                initContainers,
                containers,
                hostPorts,
                imagePullSecrets,
                saveSelectContainerLabels,
            } = this.$refs.appformcontainer.formToData();
            
            let affObj = {};
            if(Object.keys(saveSelectContainerLabels?.[0]||{})?.length>0){
                affObj = {
                    affinity: {
                        podAffinity: {
                            requiredDuringSchedulingIgnoredDuringExecution: [{
                                labelSelector: {
                                    matchExpressions: Object.keys(saveSelectContainerLabels[0]).map(i=>{
                                        return {
                                            key: i,
                                            operator: 'In',
                                            values: [
                                                saveSelectContainerLabels[0][i]
                                            ],
                                        }
                                    })
                                },
                                topologyKey: 'kubernetes.io/hostname',
                            }]
                        }
                    }
                }
            }
            
            let jobSpec = {
                template: {
                    spec: {
                        initContainers: initContainers ,
                        containers: containers,
                        volumes: this.containerEditor.volumes || [],
                        restartPolicy: "Never",
                        imagePullSecrets: this.mirror,
                        ...affObj,
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