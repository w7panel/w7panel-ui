<template>
    <div style="height:100%;">
        <div id="appmicro" style="height:100%;transform:translate(0,0);"></div>
        
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
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default{
    props: ['menuActive','appgroup'],
    data(){
        return {
            namespaceActive: '',
            info: {},
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
            domainCertData: null,
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
        registerWujieEvent('domainCert', this.setDomainCert);
        registerWujieEvent('podLog', this.openPodLog);
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
                let roleProps = item?.spec?.['config-v2']?.props?.roleConfig?.[userRole] || {};

                this.info = {
                    ...this.info,
                    ...item?.spec?.config?.props,
                    ...roleProps,
                    appgroup: appgroup,
                    frontendUrl: item?.spec?.frontendUrl,
                    backendUrl: item?.spec?.backendUrl,
                    username: item?.spec?.config?.props?.username,
                    password: item?.spec?.config?.props?.password,
                    appImage: item?.spec?.config?.props?.image,
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
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let props = {
                ...this.info,
                url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
            }
            console.log(props)
            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + this.page,
                exec: true,
                el: '#appmicro',
                sync: true,
                props: props,
            })
            startApp({name:'appmicro'})
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
        async zip(data){
            // data {pid:{...}, output:'',input:''}
            let input = data.input.join(' ');
            let output = data.output;

            let pidData = await this.getPid(data.pid);
            let preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
            let command = `${preCmd} --pid=${pidData?.pid} --subPid=${pidData?.subPid} --cmd=zip --srcPath='${output}' ${input}`;
            
            await panelApi.post(`/panel-api/v1/exec2`,{
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
            
            data?.callback?.({
                link: link,
            })
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
                return {
                    pod_name: res.data?.podName,
                    containerName: res.data?.containerName,
                    namespace: res.data?.namespace,
                    subPid: res.data.subPid,
                    pid: res.data.pid,
                }
            }).catch(()=>({}))
        },
        async exec(data){
            // data: {pid:{...}, command:'...'}
            let pidData = await this.getPid(data.pid);
            
            let preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
            let command = `${preCmd} --pid=${pidData?.pid} --subPid=${pidData?.subPid} ${data.command}`;
            
            return panelApi.post(`/panel-api/v1/exec2`,{
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