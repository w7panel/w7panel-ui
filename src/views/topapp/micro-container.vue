<template>
    <div class="micro-container">
        <!-- <iframe v-if="info.load_mode === 'iframe'" :src="info.iframeSrc" style="display:block;width:100%;height:100%;border:0;"></iframe> -->
        <!-- <template> -->
            <div id="appmicro" style="height:100%;transform:translate(0,0);"></div>

            <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
                <div style="height:100%;" class="bg-white"></div>
            </a-spin>
            <a-spin v-if="microLoading" class="micro-loading" :loading="microLoading" :size="32">
                <div style="height:100%;"></div>
            </a-spin>

            <wujie-modals ref="wujieModals" :exclude-wujie-events="modalExcludeWujieEvents" />
        <!-- </template> -->
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken, getK8sinfo } from '@/utils/auth';
import { bus, startApp, destroyApp } from "wujie";
import wujieModals from '@/components/wujie-modals.vue';
import { getWujieRoutePrefix, normalizeWujieSyncRoute, normalizeWujieNavigationRoute, joinWujieUrlRoute } from '@/utils/wujie-route';
import { appendWujieModalHandles } from '@/utils/wujie-modal-handles';
import { appendWujieProxyRequestQuery, getWujieProxyBackendUrl } from '@/utils/wujie-proxy-request';
import { createWujieRequirePlugin } from '@/utils/wujie-require-plugin';
import { createWujieRequestCredentialsPlugin } from '@/utils/wujie-request-credentials-plugin';
import { wujieFetch } from '@/utils/wujie-cors-fetch';
import { runningFirstPod } from '@/utils/running-first-pod';
import { podShell } from '@/utils/pod-shell';
import { createK8sProxy, createMicroappProxy, createPanelProxy } from '@/utils/microapp-proxy';

export default{
    props: ['menuActive','appgroup'],
    emits: ['getBindings', 'getinfo', 'changeAppMenu'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            microAppBaseInfo: {},
            microAppRoleConfig: {},
            bindings: [],
            extra: {},
            page: '',
            downOk: true,
            microLoading: false,
            lastMicroRoute: '',
            ignoreAppmicroOnce: false,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;

        bus.$on('changeAppMenu', this.changeAppMenu);
    },
    mounted(){
        if(this.appgroup){
            this.getFront(this.appgroup);
        }
    },
    components: {
        wujieModals,
    },
    watch: {
        appgroup(v){
            this.$nextTick(()=>{
                this.resetMicro();
                this.getFront(v)
            })
        },
        menuActive(v){
            if(!v || this.page==v){return}
            const previousBinding = this.getMenuBindingName(this.page);
            this.page = v;
            this.rememberMicroRoute(v);
            const currentBinding = this.applyMenuRuntimeConfig(v);
            this.$emit('getinfo',{...this.info});
            if(previousBinding !== currentBinding){
                this.destroyMicro();
                this.wujieInit();
                return;
            }
            this.routeChange(v);
        },
        '$route.query.appmicro'(){
            this.rememberCurrentMicroRoute();
        },
    },
    beforeUnmount(){

        bus.$off('changeAppMenu', this.changeAppMenu);

        this.destroyMicro();
        this.clearSyncedAppmicroUrl();
        setTimeout(this.clearSyncedAppmicroUrl, 0);
        setTimeout(this.clearSyncedAppmicroUrl, 100);
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
    },
    computed: {
        modalExcludeWujieEvents(){
            const appgroup = this.info?.appgroup || '';
            const identifie = this.extra?.identifie || '';
            if(/^w7panel-ckm-/.test(appgroup) || /^w7panel-ckm($|-)/.test(identifie)){
                return ['toStoreInstall'];
            }
            return [];
        },
    },
    methods: {
        changeAppMenu(show){
            this.$emit('changeAppMenu', show);
        },
        buildIframeSrc(path, route){
            const token = getToken();
            const base = joinWujieUrlRoute(path, route);
            if(!token){ return base; }
            return base + (base.includes('?') ? '&' : '?') + 'api-token=' + token;
        },
        getMicroAppBaseUrl(){
            if(this.info.load_mode === 'iframe'){
                return this.info.iframePath || this.info.serverUrl || this.info.url || this.info.frontendUrl || '';
            }
            return this.info.frontendUrl || '';
        },
        buildMicroAppUrl(route){
            const targetRoute = route || '';
            if(/^https?:\/\//i.test(targetRoute)){
                return targetRoute;
            }
            return joinWujieUrlRoute(this.getMicroAppBaseUrl(), targetRoute);
        },
        getNavigateMicroRoute(payload){
            const href = typeof payload === 'object'
                ? (payload?.href || payload?.url || payload?.route)
                : payload;
            return normalizeWujieNavigationRoute(href, this.getMicroAppBaseUrl()) || href || '';
        },
        navigateMicro(payload){
            const route = this.getNavigateMicroRoute(payload);
            if(!route){
                return false;
            }

            this.page = route;
            this.rememberMicroRoute(route);
            this.destroyMicro();
            this.wujieInit();
            return true;
        },
        getMenuBindingName(route){
            return this.bindings.find(binding=>(binding.menu || []).some(menu=>menu.do === route))?.name || '';
        },
        normalizeMicroMenuRoute(value){
            const bases = [
                this.getMicroAppBaseUrl(),
                this.microAppBaseInfo?.frontendUrl,
                ...Object.values(this.microAppRoleConfig || {}).flatMap(config=>[config?.serverUrl, config?.url]),
            ].filter(Boolean);
            for(const base of [...new Set(bases)]){
                const route = normalizeWujieSyncRoute(value, getWujieRoutePrefix(base));
                if(this.getMenuBindingName(route)){
                    return route;
                }
            }
            return normalizeWujieSyncRoute(value, getWujieRoutePrefix(this.getMicroAppBaseUrl()));
        },
        applyMenuRuntimeConfig(route){
            const userRole = getK8sinfo()['w7.cc/role'];
            const bindingName = this.getMenuBindingName(route);
            const roleProps = this.microAppRoleConfig?.[bindingName]
                || this.microAppRoleConfig?.[userRole]
                || this.microAppRoleConfig?.founder
                || {};
            this.info = {
                ...this.microAppBaseInfo,
                ...roleProps,
                ...(roleProps.frontend_props || {}),
            };
            return bindingName;
        },
        routeChange(v){
            if(this.info.load_mode === 'iframe'){
                this.destroyMicro();
                this.wujieInit();
                return;
            }
            bus.$emit("routeChange", (v || '').replace(/^#/,''));
            this.rememberMicroRoute(v);
        },
        resetMicro(){
            try{
                this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
            }catch{}
            this.destroyMicro();
            this.info = {};
            this.microAppBaseInfo = {};
            this.microAppRoleConfig = {};
            this.bindings = [];
            this.extra = {};
            this.page = '';
            this.downOk = true;
            this.microLoading = false;
        },
        rememberCurrentMicroRoute(){
            this.rememberMicroRoute(this.normalizeMicroMenuRoute(this.$route.query?.appmicro));
        },
        rememberMicroRoute(route){
            if(!route){ return; }
            this.lastMicroRoute = route;
        },
        getFront(appgroup){

            panelApi.get(`/microapp/${appgroup}/info`).then(res=>{
                let item  = res?.data;
                if(!item){return}

                let roleConfig = item?.spec?.['config-v2']?.props?.roleConfig || {};
                this.microAppRoleConfig = roleConfig;
                this.bindings = item?.spec?.bindings || [];
                this.microAppBaseInfo = {
                    appgroup: appgroup,
                    // frontendUrl: item?.spec?.frontendUrl,
                    // 测试短路径
                    frontendUrl: item?.spec?.frontendUrl.replace(/\/index\.html$/, '/'),
                    backendUrl: item?.spec?.backendUrl,
                    username: item?.spec?.config?.props?.username,
                    password: item?.spec?.config?.props?.password,
                    appImage: item?.spec?.config?.props?.image,
                    ...item?.spec?.config?.props,
                };
                this.applyMenuRuntimeConfig('');
                this.extra = {
                    identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                    version: item.metadata?.labels?.['w7.cc/version'] || '',
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                }
                this.$emit('getBindings',this.bindings)
                this.$emit('getinfo',{...this.info})
                this.rememberCurrentMicroRoute();
                this.$nextTick(()=>{
                    const appmicro = this.ignoreAppmicroOnce ? '' : this.normalizeMicroMenuRoute(this.$route.query?.appmicro);
                    this.ignoreAppmicroOnce = false;
                    this.page = appmicro || this.menuActive || '';
                    this.applyMenuRuntimeConfig(this.page);
                    this.$emit('getinfo',{...this.info});
                    this.rememberMicroRoute(this.page);

                    this.wujieInit();
                })
            })
        },
        async wujieInit(){
            let is_register = false;
            let thirdparty_cd_token = '';
            let {data} = await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.name,
            }}).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
                return res;
            })

            if(this.info.load_mode=='iframe'){
                this.info.iframePath = this.getMicroAppBaseUrl();
                this.info.iframeRoute = this.page || '';
                this.info.iframeSrc = this.buildIframeSrc(this.info.iframePath, this.info.iframeRoute);
                // return;
            }

            if(!this.downOk){
                this.info.frontendUrl = data.proxyUrl;
                //未下载问题
                if (this.info.frontendUrl) {
                    this.info.frontendUrl = this.info.frontendUrl.replace(/\/index\.html$/, '/')
                }
                this.downOk = true;
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.name}`)
                // this.extra.setTimeout = setTimeout(()=>{
                //     this.wujieInit();
                //     clearTimeout(this.extra.setTimeout);
                // }, 5000)
                // return;
            }
            const isIframeMode = this.info.load_mode == 'iframe';
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let frontProps = {};
            await panelApi.get(`/microapp/${this.info.appgroup}/frontprops`, { noAlert: true }).then(res=>{
                frontProps = res?.data || {};
            }).catch(()=>{});
            const loginCloud = (componentAppId)=>{
                const appId = typeof componentAppId === 'object' ? componentAppId?.componentAppId : componentAppId;
                return panelApi.get('/js-cloud-code', {
                    params: { componentAppId: appId },
                    noAlert: true,
                }).then(res=>res.data);
            };
            if(this.info.frontend_props) {
                this.info.frontend_props = {
                    ...this.info.frontend_props,
                    ...frontProps
                }
            }
            const proxyBackendUrl = getWujieProxyBackendUrl(this.info.backendUrl);
            let props = {
                url: proxyBackendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                // domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
                ...frontProps,
                loginCloud,
                runningFirstPod,
                podShell,
                microappProxy: createMicroappProxy(proxyBackendUrl),
                k8sproxy: createK8sProxy(),
                panelProxy: createPanelProxy(),
                navigateMicro: (payload) => this.navigateMicro(payload),
                restartMicroApp: (payload) => this.navigateMicro(payload),
            }
            appendWujieModalHandles(props, () => this.$refs.wujieModals);
            console.log(props)
            this.microLoading = true;
            const baseUrl = isIframeMode? (this.info.iframeSrc) : this.buildMicroAppUrl(this.page)
            const url = isIframeMode
                ? appendWujieProxyRequestQuery(baseUrl, {
                    proxyRequest: this.info.proxy_request,
                    frontProps,
                    backendUrl: proxyBackendUrl,
                    group: this.info.appgroup,
                    role: getK8sinfo()['w7.cc/role'],
                })
                : baseUrl;
            startApp({
                name: "appmicro",
                url: url,
// 测试
// url: 'http://218.23.2.48:9090' + url,
                exec: true,
                el: '#appmicro',
                degrade: this.info.load_mode === 'iframe',
                degradeAttrs: { style: 'border:0;display:block;' },
                sync: true,
                prefix: getWujieRoutePrefix(this.getMicroAppBaseUrl()),
                props: props,
                plugins: this.info.load_mode === 'iframe' ? [createWujieRequestCredentialsPlugin(), createWujieRequirePlugin()] : [],
                fetch: this.info.load_mode === 'iframe' ? wujieFetch : null,
            }).then(()=>{
                console.log('app success')
            }).catch(()=>{
                console.log('app error')
            }).finally(()=>{
                this.microLoading = false;
            })
            setTimeout(()=>{
                requestAnimationFrame(() => {
                    window.dispatchEvent(new Event('resize'));
                });
            }, 500)
        },
        destroyMicro(){
            try{
                destroyApp('appmicro');
            }catch{}
        },
        clearSyncedAppmicroUrl(){
            try{
                const url = new URL(window.location.href);
                let changed = false;

                if(url.searchParams.has('appmicro')){
                    url.searchParams.delete('appmicro');
                    changed = true;
                }

                if(url.hash && /([?&])appmicro=/.test(url.hash)){
                    const [hashPath, hashQuery = ''] = url.hash.split('?');
                    const params = new URLSearchParams(hashQuery);
                    if(params.has('appmicro')){
                        params.delete('appmicro');
                        url.hash = params.toString() ? `${hashPath}?${params.toString()}` : hashPath;
                        changed = true;
                    }
                }

                if(changed){
                    const nextUrl = url.pathname + url.search + url.hash;
                    const currentState = window.history.state || {};
                    window.history.replaceState({
                        ...currentState,
                        back: currentState.back ?? null,
                        current: nextUrl,
                        forward: currentState.forward ?? null,
                        replaced: currentState.replaced ?? true,
                        position: currentState.position ?? Math.max(window.history.length - 1, 0),
                        scroll: currentState.scroll ?? null,
                    }, '', nextUrl);
                }
            }catch{}
        },
    }
}
</script>
<style scoped>
</style>
<style>
.micro-container{
    position:relative;
    height:100%;
}
.micro-loading{
    position:absolute;
    inset:0;
    z-index:10;
    display:flex;
    align-items:center;
    justify-content:center;
    background:var(--color-bg-1);
}
</style>
