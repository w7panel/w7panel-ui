<template>
    <div style="height:100%;">
        <div v-show="downOk" id="appmicro" style="height:100%;transform:translate(0,0);"></div>

        <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
            <div style="height:100%;" class="bg-white"></div>
        </a-spin>
        
        <job-log :show="joblogData.show" :name="joblogData.name" @close="joblogData.show=false"></job-log>
        
        <a-modal width="1200px" v-model:visible="fileDialog.show" :fullscreen="fileDialog.fullscreen" :closable="false" :footer="false" class="micro-iframe-modal">
            <template #title>
                <div class="df ai-c jc-b fc model-title">
                    <span class="fs-18">文件管理</span>
                    <div class="df ai-c btns">
                        <div class="btn ml-20 cursor" @click="fileDialog.fullscreen=!fileDialog.fullscreen">
                            <icon-fullscreen v-if="!fileDialog.fullscreen" class="fs-20 c-66" />
                            <icon-fullscreen-exit v-else class="fs-20 c-66" />
                        </div>
                        <div class="btn ml-20 cursor" @click="fileDialog.show=false;">
                            <icon-close class="fs-20 c-66" />
                        </div>
                    </div>
                </div>
            </template>
            <div :style="{height:fileDialog.fullscreen?'100%':'600px'}">
                <app-file
                    v-if="fileDialog.show"
                    :componentData="fileDialog.componentData"
                    :is_component="true"
                ></app-file>
            </div>
            <!-- <iframe v-if="fileDialog.show" :src="fileDialog.src" frameborder="0" style="width:100%;display:block;" ></iframe> -->
        </a-modal>
    
        <a-modal width="1200px" v-model:visible="pageDialog.show" :fullscreen="pageDialog.fullscreen" :footer="false" class="micro-iframe-modal" :closable="false">
            <template #title>
                <div class="df ai-c jc-b fc model-title">
                    <span class="fs-18">{{ pageDialog.title || '' }}</span>
                    <div class="df ai-c btns">
                        <div class="btn ml-20 cursor" @click="pageDialog.fullscreen=!pageDialog.fullscreen">
                            <icon-fullscreen v-if="!pageDialog.fullscreen" class="fs-20 c-66" />
                            <icon-fullscreen-exit v-else class="fs-20 c-66" />
                        </div>
                        <div class="btn ml-20 cursor" @click="pageDialog.show=false;">
                            <icon-close class="fs-20 c-66" />
                        </div>
                    </div>
                </div>
            </template>
            <iframe v-if="pageDialog.show" :src="pageDialog.src" frameborder="0" style="width:100%;display:block;" :style="{height:pageDialog.fullscreen?'100%':'600px'}"></iframe>
        </a-modal>

        <a-modal width="1200px" v-model:visible="appDialog.show" :fullscreen="appDialog.fullscreen" :mask-closable="false" :closable="false"  :footer="false" class="micro-iframe-modal">
            <template #title>
                <div class="df ai-c jc-b fc model-title">
                    <span class="fs-18">{{ appDialog.title || '' }}</span>
                    <div class="df ai-c btns">
                        <div class="btn ml-20 cursor" @click="appDialog.fullscreen=!appDialog.fullscreen">
                            <icon-fullscreen v-if="!appDialog.fullscreen" class="fs-20 c-66" />
                            <icon-fullscreen-exit v-else class="fs-20 c-66" />
                        </div>
                        <div class="btn ml-20 cursor" @click="appDialog.show=false;">
                            <icon-close class="fs-20 c-66" />
                        </div>
                    </div>
                </div>
            </template>
            <iframe v-if="appDialog.show" :src="appDialog.src" frameborder="0" style="width:100%;display:block;" :style="{height:appDialog.fullscreen?'100%':'600px'}"></iframe>
        </a-modal>

        <domain-cert :data="domainCertData"></domain-cert>
        
        <pod-log :show="logCpn.show" :data="logCpn.data" @close="logCpn.show=false;"></pod-log>

        <micro-app-form :show="maf.show" :yaml="maf.yaml" :callback="callback" @close="maf.show=false;"></micro-app-form>

    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore,useLoadingStore } from '@/store';
import { getToken,getK8sinfo } from '@/utils/auth';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import axios from 'axios';
import jobLog from '@/components/job-log.vue';
import domainCert from '@/views/topapp/domain-cert.vue';
import appFile from '@/views/app/pages/files.vue';
import podLog from '@/views/app/pages/pod-log.vue';
import microAppForm from '@/components/micro-app-form.vue';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default{
    props: ['menuActive','appgroup'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            extra: {},
            page: '',

            
            joblogData: {
                show: false,
                name: '',
            },
            fileDialog: {
                show: false,
                src: '',
            },
            pageDialog: {
                show: false,
                src: '',
            },
            appDialog: {
                show: false,
                src: '',
                title: '',
            },
            logCpn: {
                show: false,
                data: {},
            },
            maf: {
                show: false,
                yaml: null,
                json: null,
            },
            domainCertData: null,
            downOk: true,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        
        // 注册 wujie 事件（自动处理空值检查）
        registerWujieEvent('toStoreInstall', this.toStoreInstall);
        registerWujieEvent('openPage', this.openPage);
        registerWujieEvent('openApp', this.openApp);
        registerWujieEvent('toFile', this.toFile);
        registerWujieEvent('openFile', this.openFile);
        registerWujieEvent('buildImage', this.buildImage);
        registerWujieEvent('buildImageLog', this.buildImageLog);
        registerWujieEvent('closeBuildImageLog', this.closeBuildImageLog);
        registerWujieEvent('zip', this.zip);
        registerWujieEvent('uploadFile',this.uploadFile);
        registerWujieEvent('domainCert', this.setDomainCert);
        registerWujieEvent('podLog', this.openPodLog);
        registerWujieEvent('openAppForm', this.openAppForm);
    },
    mounted(){
        if(this.appgroup){
            this.getFront(this.appgroup);
        }
    },
    components: {
        jobLog,
        domainCert,
        appFile,
        podLog,
        microAppForm,
    },
    watch: {
        appgroup(v){
            this.$nextTick(()=>{
                this.getFront(v)
            })
        },
    },
    beforeUnmount(){
        this.destroyMicro();
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
    },
    methods: {
        routeChange(v){
            bus.$emit("routeChange", v);
        },
        getFront(appgroup){
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/'+appgroup).then(res=>{
                let item  = res?.data;
                if(!item){return}

                let userRole = getK8sinfo()['w7.cc/role'];
                let roleConfig = item?.spec?.['config-v2']?.props?.roleConfig || {};
                let roleProps = roleConfig?.[userRole] || {};
                if(roleConfig.founder && !roleConfig?.[userRole]){
                    roleProps = roleConfig.founder;
                }
                if(roleProps.frontend_props){
                    roleProps = {
                        ...roleProps,
                        ...roleProps.frontend_props,
                    }
                }

                this.info = {
                    ...this.info,
                    appgroup: appgroup,
                    frontendUrl: item?.spec?.frontendUrl,
                    backendUrl: item?.spec?.backendUrl,
                    username: item?.spec?.config?.props?.username,
                    password: item?.spec?.config?.props?.password,
                    appImage: item?.spec?.config?.props?.image,
                    ...item?.spec?.config?.props,
                    ...roleProps,
                }
                this.extra = {
                    identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                    version: item.metadata?.annotations?.['w7.cc/version'] || '',
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                }
                this.$emit('getBindings',item?.spec?.bindings||[])
                this.$emit('getinfo',{...this.info})
                this.$nextTick(()=>{
                    
                    let appmicro = this.$route.query?.appmicro;
                    appmicro = appmicro? decodeURIComponent(appmicro) : '';
                    appmicro = appmicro?.replace(this.info.frontendUrl,'');
                    this.page = appmicro || this.menuActive || '';

                    this.wujieInit();
                })
            })
        },
        destroyMicro(){
            try{
                destroyApp('appmicro');
            }catch{}
            // 使用统一清理函数（自动处理空值检查）
            clearAllWujieEvents();
        },
        async wujieInit(){
            let is_register = false;
            let thirdparty_cd_token = '';
            await panelApi.get("/static/"+ this.extra.identifie +"/status?version="+this.extra.version).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
            })
            if(!this.downOk){
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.name}`)
                this.extra.setTimeout = setTimeout(()=>{
                    this.wujieInit();
                    clearTimeout(this.extra.setTimeout);
                }, 5000)
                return;
            }
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let props = {
                url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                // domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
            }
            console.log(props)
            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + this.page,
// // 测试
// url: 'http://218.23.2.48:9090' + this.info.frontendUrl + (this.page || ''),
                exec: true,
                el: '#appmicro',
                sync: true,
                props: props,
            })
        },
        openAppForm(data,callback){
            this.maf = {
                show: true,
                yaml: data.yaml,
                json: data.json,
                callback: callback,
            }
        },
        openPodLog(data){
            this.logCpn = {
                show: true,
                data: {
                    name: data.name,
                    container: data.container,
                    containerList: data.containerList,
                }
            }
        },
        setDomainCert(data){
            this.domainCertData = data;
        },
        async uploadFile(data,callback){
            /**
             * data: {
             *      pid: {...},
             *      file: ...,
             *      path: xxx
             * }
             */
            let outEditorInfo = await this.getPid(data.pid);
            
            useLoadingStore().loading = true;
            try{
                const reader = new FileReader();
                reader.onload = ()=>{
                    let value = reader.result;
                    console.log(value)
                    
                    axios.put(`${outEditorInfo.origin}${outEditorInfo.webdavUrl}${encodeURIComponent(data.path+data.file.name)}`, value, {
                        headers: {
                            "content-type": "application/octet-stream",
                            "Authorization": `Bearer ${outEditorInfo.webdavToken}`,
                            'Content-Length': data.file.size // 确保传输长度和文件大小一致
                        },
                        transformRequest: [(data) => data],
                    }).then(res=>{
                        try{callback?.()}catch{}
                    }).catch(err=>{
                        this.$message.error('保存失败: ' + (err.response?.data?.message || err.message || '未知错误'));
                        try{callback?.(err)}catch{}
                    }).finally(()=>{
                        useLoadingStore().loading = false;
                    })
                    return;
                };
                reader['readAsArrayBuffer'](data.file);
            }catch(error){
                callback?.(error)
                console.log('上传失败',error);
            }
        },
        async zip(data,callback){
            // data {pid:{...}, output:'',input:''}
            let input = data.input.join(' ');
            let output = data.output;

            let pidData = await this.getPid(data.pid);
            let preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
            let command = `${preCmd} --pid=${pidData?.pid} --subPid=${pidData?.subPid} --cmd=zip --srcPath='${output}' ${input}`;
            
            await panelApi.post(`/exec2`,{
                podName: pidData?.pod_name,
                containerName: pidData?.containerName,
                tty: false,
                namespace: pidData?.namespace,
                command: ['sh', '-c', command],
            },{responseType: 'text', loading:true, noAlert:true})

            let link = await this.downLink({
                pidData: pidData,
                path: output,
                name: output.replace(/^.*\//,''),
            })
            
            data?.callback?.({link: link})
            callback?.({link:link})
        },
        getPid(data){
            return panelApi.get('/pid',{
                params:{
                    namespace: data?.namespace,
                    HostIp: data?.HostIp,
                    containerId: data?.containerId,
                    containerName: data?.containerName,
                    podName: data?.podName,
                },
                loading: true,
            }).then(res=>{
                let origin = window.location.origin;
                return {
                    // pod_name: res.data?.podName,
                    // containerName: res.data?.containerName,
                    // namespace: res.data?.namespace,
                    subPid: res.data.subPid,
                    pid: res.data.pid,
                    
                    origin: origin,
                    webdavUrl: res.data.webdavUrl,
                    webdavToken: res.data.webdavToken,
                    webdavBasePath: res.data.webdavBasePath,
                    compressUrl: res.data.compressUrl,
                    permissionUrl: res.data.permissionUrl,
                    pod_name: res.data?.podName,
                    containerName: res.data?.containerName,
                    namespace: res.data?.namespace,
                }
            }).catch(()=>({}))
        },
        async exec(data){
            // data: {pid:{...}, command:'...'}
            let pidData = await this.getPid(data.pid);
            
            let preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
            let command = `${preCmd} --pid=${pidData?.pid} --subPid=${pidData?.subPid} ${data.command}`;
            
            return panelApi.post(`/exec2`,{
                podName: pidData?.pod_name,
                containerName: pidData?.containerName,
                tty: false,
                namespace: pidData?.namespace,
                command: ['sh', '-c', command],
            },{responseType: 'text', loading:true, noAlert:true})
        },
        downLink(data){
            // data {pidData:{...}, path:'...', name:'xx'}
            let pidData = data.pidData;
            let obj = {
                from: '/proc/'+ pidData?.pid+'/root' + (pidData?.subPid?`/proc/${pidData.subPid}/root`:'') + data.path,
                to: data.name,
                upload: 0,
                namespace: this.namespaceActive,
                podName: pidData?.pod_name,
            }
            const params = new URLSearchParams();
            for (let key in obj) {
                params.append(key, obj[key]);
            }
            return panelApi.post('/cp',params.toString(),{
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(res=>{
                const token = getToken();
                return '/panel-api/v1/download/'+data.name+'?api-token='+token;
            })
        },

        openApp(data){
            this.appDialog = {
                show: true,
                src: '/dialog/appgroup/'+ data.appgroup +'/micro?path='+ encodeURIComponent(data?.path||''),
                title: data?.title || '',
                fullscreen: false,
            }
        },
        openFile(data){
            this.fileDialog = {
                show: true,
                src: '/dialog/appgroup/'+this.$route.params.group+'/'+data?.kind+'/'+data?.appname+'/files#path='+(data?.path||''),
                fullscreen: false,
                componentData: {
                    kind: data?.kind,
                    id: data?.appname,
                    path: data?.path || '',
                },
            }
        },
        toFile(data){
            this.$router.push('/app/appgroup/'+this.$route.params.group+'/'+data?.kind+'/'+data?.appname+'/files#path='+(data?.path||''))
        },
        openPage(data){
            this.pageDialog = {
                show: true,
                src: data.src,
                title: data.title || '',
                fullscreen: false,
            }
        },
        toStoreInstall(path){
            this.$router.push('/app/store-install?path=' + path);
        },
        closeBuildImageLog(){
            this.joblogData.show = false;
        },
        buildImage(data,callback){
            panelApi.post('/zpk/buildimage/job',{
                ...data
            },{loading:true}).then(()=>{
                let jobname = data?.BuildJobName || data?.buildJobName;
                callback && callback();
            })
        },
        buildImageLog(data){
            this.joblogData = {
                show: true,
                name: data.buildJobName,
            }
        },
    }
}
</script>
<style scoped>
</style>
<style>
.micro-iframe-modal .arco-modal-body{padding:0;}
.micro-iframe-modal .model-title{position:relative; height:44px;}
.micro-iframe-modal .model-title .btns{position:absolute; right:0; top:0; height:100%;}
.micro-iframe-modal .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 48px);}
</style>