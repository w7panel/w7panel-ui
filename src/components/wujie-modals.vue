<template>
    <jobLog :show="joblogData.show" :name="joblogData.name" @close="joblogData.show=false"></jobLog>

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

    <a-modal width="1200px" v-model:visible="appDialog.show" :fullscreen="appDialog.fullscreen" :mask-closable="false" :closable="false" :footer="false" class="micro-iframe-modal">
        <template #title>
            <div class="df ai-c jc-b fc model-title">
                <span class="fs-18">{{ appDialog.title || '' }}</span>
                <div class="df ai-c btns">
                    <div class="btn ml-20 cursor" @click="appDialog.fullscreen=!appDialog.fullscreen">
                        <icon-fullscreen v-if="!appDialog.fullscreen" class="fs-20 c-66" />
                        <icon-fullscreen-exit v-else class="fs-20 c-66" />
                    </div>
                    <div class="btn ml-20 cursor" @click="closeAppDialog">
                        <icon-close class="fs-20 c-66" />
                    </div>
                </div>
            </div>
        </template>
        <iframe v-if="appDialog.show" ref="openappIframe" :src="appDialog.src" frameborder="0" style="width:100%;display:block;" :style="{height:appDialog.fullscreen?'100%':'600px'}"></iframe>
    </a-modal>

    <domain-cert :data="domainCertData"></domain-cert>

    <podLog :show="logCpn.show" :data="logCpn.data" @close="logCpn.show=false;"></podLog>

    <micro-app-form :show="maf.show" :yaml="maf.yaml" :callback="maf.callback" @close="maf.show=false;"></micro-app-form>

    <a-modal :visible="appDialogConfirm.show" @ok="appDialog.show=false;appDialogConfirm.show=false;" @cancel="appDialogConfirm.show=false;">
        <template #title>提示</template>
        <div>{{ appDialogConfirm.txt }}</div>
    </a-modal>

    <!-- 修改域名 -->
    <domain-micro-edit
        :show="editDomain.show"
        :ingress="editDomain.data"
        :appList="editDomain.appList"
        :appPorts="editDomain.appPorts"
        @submit="handleDomainEditSubmit"
        @close="editDomain.show=false;"
    ></domain-micro-edit>

    <!-- 策略 -->
    <domain-strategy
        :show="strategy.show"
        :data="strategy.data"
        :hideRewrite="true"
        :isMicroComponents="true"
        @submit="handleStrategySubmit"
        @cancel="strategy.show=false;"
    ></domain-strategy>

    <!-- 应用配置 -->
    <a-drawer title="应用配置" :visible="containerDrawer.show"  @ok="containerDrawer.submit" @cancel="containerDrawer.show=false;" :width="1000" unmountOnClose :mask-closable="false">
        <container-plugin
            ref="containerDrawer"
            :propsData="containerDrawer.data"
            @submit="handleContainerSubmit"
            @close="containerDrawer.show=false;"
        ></container-plugin>
    </a-drawer>

    <build-image-status
        :show="buildContainerImage.show"
        :data="buildContainerImage.data"
        :serverInfo="buildContainerImage.serverInfo"
        @complete="buildContainerImage.callback"
        @close="buildContainerImage.show=false;"
    ></build-image-status>

</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getRefreshToken, getToken } from '@/utils/auth';
import axios from 'axios';
import { compressFiles } from '@/api/cluster';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

import podLog from '@/components/pod-log.vue';
import jobLog from '@/components/job-log.vue';
import domainCert from '@/views/topapp/domain-cert.vue';
import appFile from '@/views/app/pages/files.vue';
import microAppForm from '@/components/micro-app-form.vue';
import domainMicroEdit from '@/components/domain-micro-edit.vue';
import domainStrategy from '@/components/domain-strategy.vue';
import containerPlugin from '@/components/container-plugin.vue';
import buildImageStatus from '@/views/cluster/nodes/build-image-status.vue';

export default {
    name: 'WujieModals',
    data() {
        return {
            namespaceActive: '',

            joblogData: {
                show: false,
                name: '',
            },
            fileDialog: {
                show: false,
                src: '',
                fullscreen: false,
                componentData: {},
            },
            pageDialog: {
                show: false,
                src: '',
                title: '',
                fullscreen: false,
            },
            appDialog: {
                show: false,
                src: '',
                title: '',
                fullscreen: false,
            },
            appDialogConfirm: {
                show: false,
                txt: '',
            },
            logCpn: {
                show: false,
                data: {},
            },
            maf: {
                show: false,
                yaml: null,
                json: null,
                callback: null,
            },
            domainCertData: null,

            editDomain: {
                show: false,
                data: null,
            },
            strategy: {
                show: false,
                data: null,
            },
            containerDrawer: {
                show: false,
                data: {},
            },

            buildContainerImage: {
                show: false,
                data: {},
                serverInfo: {},
            },
        };
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;

        // 注册 wujie 事件
        registerWujieEvent('toStoreInstall', this.toStoreInstall);
        registerWujieEvent('openPage', this.openPage);
        registerWujieEvent('openApp', this.openApp);
        registerWujieEvent('toFile', this.toFile);
        registerWujieEvent('openFile', this.openFile);
        registerWujieEvent('buildImage', this.buildImage);
        registerWujieEvent('buildImageLog', this.buildImageLog);
        registerWujieEvent('closeBuildImageLog', this.closeBuildImageLog);
        registerWujieEvent('zip', this.zip);
        registerWujieEvent('uploadFile', this.uploadFile);
        registerWujieEvent('domainCert', this.setDomainCert);
        registerWujieEvent('podLog', this.openPodLog);
        registerWujieEvent('openAppForm', this.openAppForm);
        registerWujieEvent('ingressEdit', this.openDomainEdit);
        registerWujieEvent('ingressStrategy', this.openStrategy);
        registerWujieEvent('checkSession', this.checkSession);
        registerWujieEvent('containerPlugin', this.openContainerPlugin);
        registerWujieEvent('buildContainerImage', this.openBuildContainerImage);

// 测试
// setTimeout(()=>{
//     this.openBuildContainerImage({
//         imageName: 'registry.local.w7.cc/php:7.2-fpm-alpine-1776927989',
//         containerName: 'copy-qnub-w7-phpbeta-72',
//         podName: 'copy-qnub-w7-phpbeta-72-5665d7f577-zsrfz',
//     },(v)=>{alert(JSON.stringify(v))})
// },3000)

    },
    beforeUnmount() {
        clearAllWujieEvents();
    },
    components: {
        jobLog,
        podLog,
        domainCert,
        appFile,
        microAppForm,
        domainMicroEdit,
        domainStrategy,
        containerPlugin,
        buildImageStatus,
    },
    methods: {
        async openBuildContainerImage({podName,cmd,containerName,imageName},callback){
            console.log({podName,cmd,containerName,imageName})
            let {containerID,ip} = await k8sproxy.get("/api/v1/namespaces/" + this.namespaceActive + "/pods/" + podName,{
                loading: true,
            }).then(res=>{
                return {
                    containerID: res?.data?.status?.containerStatuses?.[0]?.containerID,
                    ip: res?.data?.status?.hostIP,
                };
            }).catch(()=>({}));

            if(!containerID || !ip){
                console.error({title:'Error',content:'获取 Pod 信息失败'});
                return;
            }

            let o = {
                cmd,
                containerName,
                podName,
                containerID,
            }
            let image = imageName?.replace?.(/^([a-zA-Z0-9.-]+)(:\d+)?\//, '') || '';
            o.namespace = /^.+\/.+$/.test(image)? image.replace?.(/\/[^\/]*$/, '') : this.namespaceActive;
            o.imageName = image.replace?.(/^[^\/]*\//, '');
            this.buildContainerImage.data = o;
            
            await panelApi.get('/registry/server-info',{
                params:{hostIp: ip},
                loading: true,
            }).then(res=>{
                this.buildContainerImage.serverInfo = {
                    agentUrl: res.data?.requestUrl || '',
                    registryDomain: res.data?.requestHost || '',
                };
            }).catch(()=>{})

            this.buildContainerImage.callback = (v)=>{
                callback && callback({
                    ...v,
                    imageName: imageName,
                });
            }
            this.buildContainerImage.show = true;
        },
        // 制品库应用配置
        openContainerPlugin(data,callback){
            this.containerDrawer = {
                show: true,
                data: data,
                submit: ()=>{
                    this.$refs.containerDrawer.submit(callback)
                    this.containerDrawer.show = false;
                }
            };
        },
        checkSession(callback){
            axios.post('/panel-api/v1/auth/refresh-token2',{token: getRefreshToken()},{
                customToken: '',
                noAlert: true,
                timeout: 3000,
            }).then(res=>{
                // let refreshToken = res.data.refreshToken;
                let token = res.data.token;
                callback && callback(token);
            }).catch(()=>{})
        },
        // ========== 域名编辑 ==========
        openDomainEdit(data) {
            this.editDomain = {
                show: true,
                data: data.ingress,
                appList: data.appList,
                appPorts: data.appPorts,
                callback: data.callback,
            };
        },
        handleDomainEditSubmit(v) {
            this.editDomain.show = false;
            this.editDomain?.callback && this.editDomain.callback(v);
        },

        // ========== 策略 ==========
        openStrategy(data) {
            this.strategy = {
                show: true,
                data: data.ingress?.backend?.strategy || {},
                callback: data.callback,
            };
        },
        handleStrategySubmit(v) {
            let data = v[0].value;
            this.strategy.data = data;
            this.strategy.callback && this.strategy.callback(data);
        },

        // ========== 应用弹窗 ==========
        openApp(data) {
            this.appDialog = {
                show: true,
                src: '/dialog/appgroup/' + data.appgroup + '/micro?path=' + encodeURIComponent(data?.path || ''),
                title: data?.title || '',
                fullscreen: false,
            };
        },
        closeAppDialog() {
            let str = localStorage.microDialogCloseAlertText;
            if (str) {
                this.appDialogConfirm = {
                    show: true,
                    txt: str,
                };
                localStorage.setItem('microDialogCloseAlertText', '');
                return false;
            }
            this.appDialog.show = false;
        },

        // ========== 应用表单 ==========
        openAppForm(data, callback) {
            this.maf = {
                show: true,
                yaml: data.yaml,
                json: data.json,
                callback: callback,
            };
        },

        // ========== 文件管理 ==========
        openFile(data) {
            this.fileDialog = {
                show: true,
                src: '/dialog/appgroup/' + this.$route.params.group + '/' + data?.kind + '/' + data?.appname + '/files#path=' + (data?.path || ''),
                fullscreen: false,
                componentData: {
                    kind: data?.kind,
                    id: data?.appname,
                    path: data?.path || '',
                },
            };
        },
        toFile(data) {
            this.$router.push('/app/appgroup/' + this.$route.params.group + '/' + data?.kind + '/' + data?.appname + '/files#path=' + (data?.path || ''));
        },

        // ========== 页面弹窗 ==========
        openPage(data) {
            this.pageDialog = {
                show: true,
                src: data.src,
                title: data.title || '',
                fullscreen: false,
            };
        },

        // ========== Pod 日志 ==========
        openPodLog(data) {
            this.logCpn = {
                show: true,
                data: {
                    name: data.name,
                    container: data.container,
                    containerList: data.containerList,
                },
            };
        },

        // ========== 域名证书 ==========
        setDomainCert(data) {
            this.domainCertData = data;
        },

        // ========== 构建镜像 ==========
        buildImage(data, callback) {
            panelApi.post('/zpk/buildimage/job', {
                ...data,
            }, { loading: true }).then(() => {
                callback && callback();
            });
        },
        buildImageLog(data) {
            this.joblogData = {
                show: true,
                name: data.buildJobName,
            };
        },
        closeBuildImageLog() {
            this.joblogData.show = false;
        },

        // ========== 文件上传 ==========
        async uploadFile(data, callback) {
            let outEditorInfo = await this.getPid(data.pid);

            useLoadingStore().loading = true;
            try {
                const reader = new FileReader();
                reader.onload = () => {
                    let value = reader.result;

                    axios.put(`${outEditorInfo.origin}${outEditorInfo.webdavUrl}${encodeURIComponent(data.path + data.file.name)}`, value, {
                        headers: {
                            "content-type": "application/octet-stream",
                            "Authorization": `Bearer ${outEditorInfo.webdavToken}`,
                            'Content-Length': data.file.size,
                        },
                        transformRequest: [(data) => data],
                    }).then(res => {
                        try { callback?.(); } catch {}
                    }).catch(err => {
                        this.$message.error('保存失败: ' + (err.response?.data?.message || err.message || '未知错误'));
                        try { callback?.(err); } catch {}
                    }).finally(() => {
                        useLoadingStore().loading = false;
                    });
                    return;
                };
                reader['readAsArrayBuffer'](data.file);
            } catch (error) {
                callback?.(error);
                console.log('上传失败', error);
            }
        },

        // ========== 压缩下载 ==========
        async zip(data, callback) {
            let pidData = await this.getPid(data.pid);

            await compressFiles(pidData.compressUrl, data.input, data.output);

            let link = await this.downLink({
                pidData: pidData,
                path: data.output,
                name: data.output.replace(/^.*\//, ''),
            });

            data?.callback?.({ link: link });
            callback?.({ link: link });
        },

        // ========== PID 获取 ==========
        getPid(data) {
            return panelApi.get('/pid', {
                params: {
                    namespace: data?.namespace,
                    HostIp: data?.HostIp,
                    containerId: data?.containerId,
                    containerName: data?.containerName,
                    podName: data?.podName,
                },
                loading: true,
            }).then(res => {
                let origin = window.location.origin;
                return {
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
                };
            }).catch(() => ({}));
        },

        // ========== 远程执行 ==========
        async exec(data) {
            let pidData = await this.getPid(data.pid);

            let preCmd = '$KO_DATA_PATH/shell/filesys.sh sh';
            let command = `${preCmd} --pid=${pidData?.pid} --subPid=${pidData?.subPid} ${data.command}`;

            return panelApi.post(`/exec2`, {
                podName: pidData?.pod_name,
                containerName: pidData?.containerName,
                tty: false,
                namespace: pidData?.namespace,
                command: ['sh', '-c', command],
            }, { responseType: 'text', loading: true, noAlert: true });
        },

        // ========== 下载链接 ==========
        downLink(data) {
            let pidData = data.pidData;
            let obj = {
                from: '/proc/' + pidData?.pid + '/root' + (pidData?.subPid ? `/proc/${pidData.subPid}/root` : '') + data.path,
                to: data.name,
                upload: 0,
                namespace: this.namespaceActive,
                podName: pidData?.pod_name,
            };
            const params = new URLSearchParams();
            for (let key in obj) {
                params.append(key, obj[key]);
            }
            return panelApi.post('/cp', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }).then(res => {
                const token = getToken();
                return '/panel-api/v1/download/' + data.name + '?api-token=' + token;
            });
        },

        // ========== 应用商店安装 ==========
        toStoreInstall(path) {
            this.$router.push('/app/store-install?path=' + path);
        },
    },
};
</script>

<style>
.micro-iframe-modal .arco-modal-body{padding:0;}
.micro-iframe-modal .model-title{position:relative; height:44px;}
.micro-iframe-modal .model-title .btns{position:absolute; right:0; top:0; height:100%;}
.micro-iframe-modal .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 48px);}
</style>
