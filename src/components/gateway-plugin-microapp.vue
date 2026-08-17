<template>
    <div class="gateway-plugin-microapp">
        <div :id="containerId" class="gateway-plugin-microapp__container"></div>
        <a-spin v-if="loading" class="gateway-plugin-microapp__loading" :loading="loading" :size="32" />
        <wujie-modals ref="wujieModals" />
    </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { startApp, destroyApp } from 'wujie';
import { panelApi } from '@/utils/api';
import { getK8sinfo, getToken } from '@/utils/auth';
import { appendWujieModalHandles } from '@/utils/wujie-modal-handles';
import { appendWujieProxyRequestQuery, getWujieProxyBackendUrl } from '@/utils/wujie-proxy-request';
import { createWujieRequirePlugin } from '@/utils/wujie-require-plugin';
import { createWujieRequestCredentialsPlugin } from '@/utils/wujie-request-credentials-plugin';
import { joinWujieUrlRoute, getWujieRoutePrefix } from '@/utils/wujie-route';
import { wujieFetch } from '@/utils/wujie-cors-fetch';
import { runningFirstPod } from '@/utils/running-first-pod';
import { podShell } from '@/utils/pod-shell';
import { createK8sProxy, createMicroappProxy, createPanelProxy } from '@/utils/microapp-proxy';

// wujie-modals 会间接引用 domain-strategy-plugin。使用异步组件打断
// domain-strategy-plugin -> gateway-plugin-config -> gateway-plugin-microapp
// -> wujie-modals -> domain-strategy-plugin 的静态循环依赖。
const wujieModals = defineAsyncComponent(() => import('@/components/wujie-modals.vue'));

export default {
    components: { wujieModals },
    props: {
        microapp: { type: Object, required: true },
        route: { type: String, default: '' },
        instanceName: { type: String, required: true },
        contextProps: { type: Object, default: () => ({}) },
    },
    emits: ['error'],
    data(){
        return {
            loading: false,
            restartTimer: null,
        };
    },
    computed: {
        safeInstanceName(){
            return String(this.instanceName || 'gateway-plugin').replace(/[^a-zA-Z0-9_-]/g, '-');
        },
        appName(){
            return `gateway-plugin-${this.safeInstanceName}`;
        },
        containerId(){
            return `gateway-plugin-container-${this.safeInstanceName}`;
        },
    },
    mounted(){
        this.start();
    },
    watch: {
        route(){ this.restart(); },
        microapp: { deep: true, handler(){ this.restart(); } },
    },
    beforeUnmount(){
        if(this.restartTimer){ clearTimeout(this.restartTimer); }
        this.destroy();
    },
    methods: {
        restart(){
            if(this.restartTimer){ clearTimeout(this.restartTimer); }
            this.restartTimer = setTimeout(()=>{
                this.destroy();
                this.$nextTick(()=>this.start());
            }, 0);
        },
        destroy(){
            try{ destroyApp(this.appName); }catch{}
        },
        buildIframeSrc(path, route){
            const base = joinWujieUrlRoute(path, route);
            const token = getToken();
            if(!token){ return base; }
            return base + (base.includes('?') ? '&' : '?') + 'api-token=' + token;
        },
        async start(){
            const item = this.microapp;
            const spec = item?.spec || {};
            const identifie = item?.metadata?.labels?.['w7.cc/identifie'] || '';
            const version = item?.metadata?.labels?.['w7.cc/version'] || '';
            const releaseName = item?.metadata?.name || '';
            const namespace = item?.metadata?.namespace || '';
            const appgroup = releaseName;

            let frontendUrl = String(spec.frontendUrl || '').replace(/\/index\.html$/, '/');
            const userRole = this.contextProps?.microappRole || getK8sinfo()?.['w7.cc/role'];
            const roleConfig = spec?.['config-v2']?.props?.roleConfig || {};
            const roleProps = roleConfig?.[userRole] || roleConfig?.founder || {};
            const configProps = spec?.config?.props || {};
            const loadMode = roleProps.load_mode || configProps.load_mode || spec?.['config-v2']?.props?.load_mode || '';
            const iframeUrl = roleProps.url || configProps.url || spec?.['config-v2']?.props?.url || '';
            frontendUrl = roleProps.frontendUrl || frontendUrl;
            if(!frontendUrl && !iframeUrl){
                this.$emit('error');
                return;
            }

            this.loading = true;
            try{
                if(identifie){
                    const status = await panelApi.get(`/static/${identifie}/status`, {
                        params: { version, releaseName },
                        noAlert: true,
                    });
                    const bindings = status?.data?.bindings || this.microapp?.spec?.bindings || [];
                    const isArtifactMenu = bindings.some(binding=>binding.name === 'other' && (binding.menu || []).some(menu=>menu.do === this.route));
                    if(status?.data?.repoUrl && !isArtifactMenu){
                        await panelApi.get('/zpk/config', {
                            params: { repoUrl: status.data.repoUrl },
                            noAlert: true,
                        });
                    }
                    if(status?.data?.status === 'no_download'){
                        frontendUrl = status?.data?.proxyUrl || frontendUrl;
                        panelApi.post(`/static/${namespace}/download/${releaseName}`, null, { noAlert: true }).catch(()=>{});
                    }
                }

                const [consoleInfo, frontProps] = await Promise.all([
                    panelApi.get('/auth/console/info', { noAlert: true }).then(res=>res?.data || {}).catch(()=>({})),
                    panelApi.get(`/microapp/${appgroup}/frontprops`, { noAlert: true }).then(res=>res?.data || {}).catch(()=>({})),
                ]);

                const backendUrl = spec?.backendUrl || '';
                const proxyBackendUrl = getWujieProxyBackendUrl(backendUrl);
                const isIframe = loadMode === 'iframe';
                const baseUrl = isIframe
                    ? this.buildIframeSrc(iframeUrl || frontendUrl, this.route)
                    : joinWujieUrlRoute(frontendUrl, this.route);
                const url = isIframe
                    ? appendWujieProxyRequestQuery(baseUrl, {
                        proxyRequest: configProps.proxy_request || roleProps.proxy_request,
                        frontProps,
                        backendUrl: proxyBackendUrl,
                        group: appgroup,
                        role: userRole,
                    })
                    : baseUrl;

                const pluginConfig = this.contextProps?.pluginConfig;
                const pluginEnabled = this.contextProps?.pluginEnabled
                    ?? this.contextProps?.pluginConfigEnabled
                    ?? true;
                const configScope = this.contextProps?.configScope === 'rule' ? 'rule' : 'global';

                const props = {
                    url: proxyBackendUrl,
                    Authorization: configProps.username
                        ? 'Basic ' + btoa(`${configProps.username}:${configProps.password || ''}`)
                        : '',
                    isRegister: Boolean(consoleInfo?.is_register),
                    w7PanelToken: consoleInfo?.thirdparty_cd_token || '',
                    paneltoken: getToken(),
                    appgroup,
                    ...configProps,
                    ...roleProps,
                    ...(roleProps.frontend_props || {}),
                    ...frontProps,
                    ...this.contextProps,
                    // 网关插件配置前端的 Wujie 宿主协议。
                    pluginConfig: pluginConfig && typeof pluginConfig === 'object'
                        ? JSON.parse(JSON.stringify(pluginConfig))
                        : {},
                    pluginEnabled: Boolean(pluginEnabled),
                    configScope,
                    savePluginConfig: this.contextProps?.savePluginConfig,
                    runningFirstPod,
                    podShell,
                    microappProxy: createMicroappProxy(proxyBackendUrl),
                    k8sproxy: createK8sProxy(),
                    panelProxy: createPanelProxy(),
                };
                appendWujieModalHandles(props, () => this.$refs.wujieModals);
                await startApp({
                    name: this.appName,
                    url,
                    exec: true,
                    el: `#${this.containerId}`,
                    degrade: isIframe,
                    degradeAttrs: { style: 'border:0;display:block;width:100%;height:100%;' },
                    sync: false,
                    alive: false,
                    prefix: getWujieRoutePrefix(frontendUrl),
                    props,
                    plugins: isIframe ? [createWujieRequestCredentialsPlugin(), createWujieRequirePlugin()] : [],
                    fetch: isIframe ? wujieFetch : null,
                });
            }catch{
                this.$emit('error');
            }finally{
                this.loading = false;
                requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
            }
        },
    },
};
</script>

<style scoped>
.gateway-plugin-microapp{position:relative;height:100%;min-height:480px;}
.gateway-plugin-microapp__container{height:100%;transform:translate(0,0);}
.gateway-plugin-microapp__loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--color-bg-2);z-index:2;}
</style>
