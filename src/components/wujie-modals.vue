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
        @reject="buildContainerImage.rejectCallback"
        @close="buildContainerImage.show=false;"
    ></build-image-status>

    <buy-service-dialog
        :show="buyServiceDialog.show"
        :data="buyServiceDialog.data"
        @update:show="buyServiceDialog.show = $event"
        @success="handleBuyServiceSuccess"
        @close="handleBuyServiceClose"
    />

    <a-modal
        v-model:visible="payDialog.show"
        title="确认支付"
        :width="860"
        :footer="false"
        :mask-closable="false"
        :popup-container="$popupContainer"
        modal-class="wujie-pay-dialog"
        @close="handlePayClose"
    >
        <a-spin :loading="payDialog.loading" class="wujie-pay-dialog__spin">
            <iframe
                v-if="payDialog.show && payDialog.url"
                ref="payIframe"
                :src="payDialog.url"
                frameborder="0"
                class="wujie-pay-dialog__iframe"
                @load="payDialog.loading = false"
            />
        </a-spin>
    </a-modal>

    <a-modal
        v-model:visible="moduleVersion.show"
        title="版本列表"
        :width="760"
        :footer="false"
        :popup-container="$popupContainer"
        modal-class="module-version-dialog"
    >
        <a-spin :loading="moduleVersion.loading" class="module-version-dialog__spin">
            <a-empty v-if="!moduleVersion.loading && !moduleVersion.list.length" description="暂无版本记录" />
            <div v-else class="module-version-list">
                <div
                    v-for="item in moduleVersion.list.slice(0, moduleVersion.showLength)"
                    :key="item.id || `${item.version}-${item.createtime}`"
                    class="module-version-list__item"
                >
                    <div class="module-version-list__date">
                        <div class="module-version-list__day">{{ item.t.date }}</div>
                        <div>{{ `${item.t.year}-${item.t.month}` }}</div>
                    </div>
                    <div class="module-version-list__line"><div class="module-version-list__point" /></div>
                    <div class="module-version-list__content">
                        <div class="module-version-list__header">
                            <span>版本号：{{ item.version }} - {{ item.version_status }}</span>
                            <span>{{ `${item.t.hour}:${item.t.minute}` }}</span>
                        </div>
                        <div class="module-version-list__description" v-html="item.description" />
                    </div>
                </div>
                <div
                    v-if="moduleVersion.showLength < moduleVersion.list.length"
                    class="module-version-list__more"
                    @click="moduleVersion.showLength += 10"
                >点击显示更多</div>
            </div>
        </a-spin>
    </a-modal>

    <install-drawer
        :show="storeInstallDrawer.show"
        :path="storeInstallDrawer.path"
        @needInstall="needStoreInstall"
        @installedStatusSuccess="handleStoreInstallSuccess"
        @close="closeStoreInstallDrawer"
    />

    <template v-for="(item, dependencyKey) in storeInstallDependencies" :key="dependencyKey">
        <install-drawer
            :show="item.show"
            :module_name="item.dependency.identifie || item.dependency.name"
            :dependency="item.dependency"
            @needInstall="needStoreInstall"
            @installedStatusSuccess="item.callback"
            @close="item.show = false"
        />
    </template>

</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getRefreshToken, getToken } from '@/utils/auth';
import axios from 'axios';
import { compressFiles } from '@/api/cluster';
import { registerWujieEvent, unregisterWujieEvent } from '@/hooks/use-wujie-events';
import { legacyConsoleRequestConfig } from '@/utils/legacy-console-request';
import { getThirdpartyPayIframeUrl } from '@/utils/thirdparty-pay';

import podLog from '@/components/pod-log.vue';
import jobLog from '@/components/job-log.vue';
import domainCert from '@/components/domain-cert.vue';
import appFile from '@/views/app/pages/files.vue';
import microAppForm from '@/components/micro-app-form.vue';
import domainMicroEdit from '@/components/domain-micro-edit.vue';
import domainStrategy from '@/components/domain-strategy.vue';
import containerPlugin from '@/components/container-plugin.vue';
import buildImageStatus from '@/views/cluster/nodes/build-image-status.vue';
import buyServiceDialog from '@/components/buy-service-dialog.vue';
import installDrawer from '@/views/app/store/install-drawer.vue';

export default {
    name: 'WujieModals',
    props: {
        excludeWujieEvents: {
            type: Array,
            default: () => [],
        },
    },
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
            buyServiceDialog: {
                show: false,
                data: {},
            },
            buyServiceCallback: null,
            payDialog: {
                show: false,
                loading: false,
                url: '',
            },
            payCallback: null,
            moduleVersion: {
                show: false,
                loading: false,
                list: [],
                showLength: 5,
            },
            storeInstallDrawer: {
                show: false,
                path: '',
                callback: null,
            },
            storeInstallDependencies: {},
            wujieEventHandlers: [],
        };
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;

        this.registerHostWujieEvents();

// 测试
// setTimeout(()=>{
//     this.openBuildContainerImage({
//         imageName: 'registry.local.w7.cc/php:7.2-fpm-alpine-1776927989',
//         containerName: 'copy-qnub-w7-phpbeta-72',
//         podName: 'copy-qnub-w7-phpbeta-72-5665d7f577-zsrfz',
//     },(v)=>{alert(JSON.stringify(v))})
// },3000)

    },
    mounted(){
        window.addEventListener('message', this.iframeMessage)
    },
    beforeUnmount() {
        window.removeEventListener('message', this.iframeMessage)
        this.unregisterHostWujieEvents();
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
        buyServiceDialog,
        installDrawer,
    },
    methods: {
        registerHostWujieEvents() {
            const excludeEvents = new Set(this.excludeWujieEvents);
            const events = [
                ['toStoreInstall', this.toStoreInstall],
                ['openStoreInstall', this.openStoreInstall],
                ['openPage', this.openPage],
                ['openApp', this.openApp],
                ['toFile', this.toFile],
                ['openFile', this.openFile],
                ['buildImage', this.buildImage],
                ['buildImageLog', this.buildImageLog],
                ['closeBuildImageLog', this.closeBuildImageLog],
                ['zip', this.zip],
                ['uploadFile', this.uploadFile],
                ['domainCert', this.setDomainCert],
                ['podLog', this.openPodLog],
                ['openAppForm', this.openAppForm],
                ['ingressEdit', this.openDomainEdit],
                ['ingressStrategy', this.openStrategy],
                ['checkSession', this.checkSession],
                ['containerPlugin', this.openContainerPlugin],
                ['buildContainerImage', this.openBuildContainerImage],
                ['getOidcCode', this.getOidcCode],
                ['getRole', this.getRole],
                ['toStoreInstallWithOrder', this.toStoreInstallWithOrder]
            ];

            this.wujieEventHandlers = events.filter(([event]) => !excludeEvents.has(event));
            this.wujieEventHandlers.forEach(([event, handler]) => {
                registerWujieEvent(event, handler);
            });
        },
        unregisterHostWujieEvents() {
            this.wujieEventHandlers.forEach(([event, handler]) => {
                unregisterWujieEvent(event, handler);
            });
            this.wujieEventHandlers = [];
        },
        iframeMessage(e){
            if(e?.data?.type=='zpk-store:open-install'){
                this.toStoreInstallWithOrder({
                    path: e.data.payload?.path,
                    orderSn: e.data.payload?.orderSn,
                });
            }
            if(
                e?.data?.type === 'payCallback'
                && this.payDialog.show
                && e.source === this.$refs.payIframe?.contentWindow
            ){
                this.handlePaySuccess(e.data);
            }
        },
        getRole(callback){
            callback([{
                name: 'founder',
                title: '创始人',
            },{
                name: 'normal',
                title: '普通用户',
            },{
                name: 'super',
                title: '管理员',
            }])
        },
        async getOidcCode(data,callback){
            panelApi.post('/oidc/js-code',{
                client_id: data?.client_id || 'default',
                redirect_uri: data?.redirect_uri || 'http://127.0.0.1:3000/callback',
                scope: data?.scope || 'openid',
                state: data?.state,
                code_challenge: data?.code_challenge,
                code_challenge_method: data?.code_challenge_method,
            }).then(res=>{
                callback?.(res.data.code);
            }).catch(()=>{
                callback?.('');
            })
        },
        async openBuildContainerImage({podName,cmd,containerName,imageName,pinned,updateImage},callback,rejectCallback){
            console.log({podName,cmd,containerName,imageName})
            let {containerID,ip,ownerRef} = await k8sproxy.get("/api/v1/namespaces/" + this.namespaceActive + "/pods/" + podName,{
                loading: true,
            }).then(res=>{
                return {
                    ownerRef: res?.data?.metadata?.ownerReferences?.[0],
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
                updateImage,
                pinned,
                ownerRef,
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
                    agentUrl: res.data?.requestUrl?.replace?.(/\/$/,'') || '',
                    registryDomain: res.data?.requestHost || '',
                };
            }).catch(()=>{})

            this.buildContainerImage.callback = (v)=>{
                callback && callback({
                    ...v,
                    imageName: imageName,
                });
            }
            this.buildContainerImage.rejectCallback = rejectCallback||(()=>{});
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

        // ========== 购买应用/服务 ==========
        openBuyServiceDialog(data = {}, callback) {
            const mode = data.mode || 'branch_package';
            if (mode !== 'service_fee' && !['module_service', 'module_plugin'].includes(data.type)) {
                console.warn(`[wujie-modals] unsupported module purchase type: ${data.type || ''}`);
                return;
            }
            this.buyServiceCallback = typeof callback === 'function' ? callback : null;
            this.buyServiceDialog = {
                show: true,
                data: {
                    ...data,
                    mode,
                    type: data.type || 'module_service',
                    site_key: data.site_key || this.$route.params.siteKey || '',
                },
            };
        },
        handleBuyServiceSuccess(payload) {
            const callback = this.buyServiceCallback;
            this.buyServiceCallback = null;
            callback?.(payload?.response ?? payload);
        },
        handleBuyServiceClose() {
            if (!this.buyServiceDialog.show) {
                this.buyServiceCallback = null;
            }
        },

        // ========== 支付 ==========
        openPay(ticket, callback) {
            if (!ticket) {
                this.$message.warning('缺少支付票据');
                return;
            }
            this.payCallback = typeof callback === 'function' ? callback : null;
            this.payDialog = {
                show: true,
                loading: true,
                url: getThirdpartyPayIframeUrl(ticket),
            };
        },
        handlePaySuccess(result) {
            const callback = this.payCallback;
            this.payCallback = null;
            this.payDialog.show = false;
            callback?.(result);
        },
        handlePayClose() {
            this.payDialog.loading = false;
            this.payCallback = null;
        },

        // ========== 模块版本 ==========
        async getModuleVersion(data = {}) {
            if (!data.module_name) {
                this.$message.warning('缺少模块标识');
                return [];
            }
            this.moduleVersion = {
                show: true,
                loading: true,
                list: [],
                showLength: 5,
            };
            try {
                const res = await axios.get(
                    '/api/console2/module-version',
                    legacyConsoleRequestConfig({
                        baseURL: '/v1',
                        params: { module_name: data.module_name },
                    })
                );
                const list = Array.isArray(res?.data) ? res.data : [];
                this.moduleVersion.list = list.map((item) => ({
                    ...item,
                    t: this.formatModuleVersionDate(item.createtime),
                }));
                return this.moduleVersion.list;
            } finally {
                this.moduleVersion.loading = false;
            }
        },
        formatModuleVersionDate(timestamp) {
            const date = new Date((Number(timestamp) || 0) * 1000);
            const pad = (value) => String(value).padStart(2, '0');
            return {
                year: date.getFullYear(),
                month: pad(date.getMonth() + 1),
                date: pad(date.getDate()),
                hour: pad(date.getHours()),
                minute: pad(date.getMinutes()),
            };
        },

        // ========== 应用弹窗 ==========
        openApp(data) {
            this.appDialog = {
                show: true,
                src: '/dialog/appgroup/' + data.appgroup + '/micro?do=' + encodeURIComponent(data?.path || ''),
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
                    namespace: data.namespace,
                    container: data.container,
                    containerList: data.containerList,
                },
            };
        },

        // ========== 域名证书 ==========
        setDomainCert(data) {
            this.domainCertData = data ? {...data, __updateTime: Date.now()} : data;
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
            return this.$router.push('/app/store-install?path=' + path);
        },
        toStoreInstallWithOrder(data) {
            let path = data.path + '?order_sn=' + data.orderSn;
            path = encodeURIComponent(path);
            return this.toStoreInstall(path);
        },
        openStoreInstall(path, callback) {
            const installPath = this.normalizeStoreInstallPath(path);
            if(!installPath){
                this.$message.warning('缺少应用安装地址');
                return false;
            }
            this.storeInstallDrawer = {
                show: false,
                path: '',
                callback: null,
            };
            this.storeInstallDependencies = {};
            this.$nextTick(()=>{
                this.storeInstallDrawer = {
                    show: true,
                    path: installPath,
                    callback: typeof callback === 'function' ? callback : null,
                };
            });
            return true;
        },
        normalizeStoreInstallPath(path) {
            let value = String(path || '').trim();
            if(/^https?%3A%2F%2F/i.test(value)){
                try{
                    value = decodeURIComponent(value);
                }catch{}
            }
            return value;
        },
        closeStoreInstallDrawer() {
            this.storeInstallDrawer = {
                show: false,
                path: '',
                callback: null,
            };
            this.storeInstallDependencies = {};
        },
        handleStoreInstallSuccess(moduleName) {
            const callback = this.storeInstallDrawer.callback;
            this.storeInstallDrawer.callback = null;
            callback?.(moduleName);
        },
        needStoreInstall(dependency, callback) {
            dependency = typeof dependency === 'string'
                ? {identifie: dependency, name: dependency}
                : dependency;
            if(!dependency){return}
            const key = dependency.releaseName || dependency.identifie || dependency.name;
            if(!key){return}
            this.storeInstallDependencies[key] = {
                show: false,
                callback,
                dependency,
            };
            this.$nextTick(()=>{
                this.storeInstallDependencies[key].show = true;
            });
        },
    },
};
</script>

<style>
.micro-iframe-modal .arco-modal-body{padding:0;}
.micro-iframe-modal .model-title{position:relative; height:44px;}
.micro-iframe-modal .model-title .btns{position:absolute; right:0; top:0; height:100%;}
.micro-iframe-modal .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 48px);}
.wujie-pay-dialog .arco-modal-body{padding:0;}
.wujie-pay-dialog__spin{display:block;width:100%;height:700px;}
.wujie-pay-dialog__spin > .arco-spin-children{height:100%;}
.wujie-pay-dialog__iframe{display:block;width:100%;height:700px;}
.module-version-dialog .arco-modal-body{padding:0;}
.module-version-dialog__spin{display:block;min-height:180px;}
.module-version-list{height:560px;overflow:auto;padding:0 20px;}
.module-version-list__item{position:relative;display:flex;padding:20px 0;}
.module-version-list__date{display:flex;flex:0 0 100px;flex-direction:column;align-items:center;justify-content:center;margin-right:50px;color:var(--color-text-2);}
.module-version-list__day{font-size:24px;color:rgb(var(--primary-6));}
.module-version-list__line{position:absolute;top:0;bottom:0;left:100px;width:50px;}
.module-version-list__line::before,.module-version-list__line::after{content:" ";position:absolute;left:25px;width:1px;background:var(--color-border-1);}
.module-version-list__line::before{top:0;bottom:50%;}
.module-version-list__line::after{top:50%;bottom:0;}
.module-version-list__item:first-child .module-version-list__line::before{display:none;}
.module-version-list__item:last-child .module-version-list__line::after{display:none;}
.module-version-list__point{position:absolute;top:50%;left:50%;z-index:1;width:13px;height:13px;border-radius:50%;background:rgb(var(--primary-6));transform:translate(-6px,-50%);}
.module-version-list__content{flex:1;min-width:0;border:1px solid var(--color-border-2);border-radius:5px;overflow:hidden;}
.module-version-list__header{display:flex;align-items:center;justify-content:space-between;min-height:40px;padding:0 20px;background:var(--color-fill-2);color:rgb(var(--primary-6));font-size:14px;}
.module-version-list__header span:first-child{font-size:16px;}
.module-version-list__description{padding:20px;color:var(--color-text-2);}
.module-version-list__more{height:40px;padding-bottom:20px;line-height:40px;text-align:center;color:var(--color-text-3);cursor:pointer;}
.module-version-list__more:hover{color:rgb(var(--primary-6));}
</style>
