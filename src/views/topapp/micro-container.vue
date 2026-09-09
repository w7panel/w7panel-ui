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
import { panelApi, k8sproxy } from '@/utils/api';
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
import { RESOURCE_GROUP_LABEL, resourceListWithLabelSelector } from '@/utils/w7panel-resource';

export default{
    props: ['menuActive','appgroup'],
    emits: ['getMicroApps', 'getinfo', 'menuResolved', 'changeAppMenu'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            microAppBaseInfo: {},
            microAppRoleConfig: {},
            bindings: [],
            microApps: [],
            appGroupName: '',
            activeMicroAppName: '',
            loadingMicroApps: false,
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
            if(!v || this.loadingMicroApps){return}
            this.selectMicroMenu(v);
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
        findMenuInTree(menus, value, microAppName){
            for(const menu of menus || []){
                const key = `${microAppName}:${menu.do}`;
                if(key === value || menu.do === value){ return menu; }
                const child = this.findMenuInTree(menu.children, value, microAppName);
                if(child){ return child; }
            }
            return null;
        },
        findMicroMenu(value, microAppName = ''){
            const userRole = getK8sinfo()['w7.cc/role'];
            for(const item of this.microApps){
                const itemName = item?.metadata?.name || '';
                if(microAppName && itemName !== microAppName){ continue; }
                for(const binding of item?.spec?.bindings || []){
                    if(binding?.support !== 'thirdparty_cd'){ continue; }
                    if(userRole !== 'founder' && binding?.name !== userRole){ continue; }
                    const menu = this.findMenuInTree(binding.menu, value, itemName);
                    if(menu){
                        return {
                            ...menu,
                            key: `${itemName}:${menu.do}`,
                            microAppName: itemName,
                            bindingName: binding.name,
                        };
                    }
                }
            }
            return null;
        },
        getMenuBindingName(value){
            return this.findMicroMenu(value, this.activeMicroAppName)?.bindingName || '';
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
                appgroup: this.appGroupName,
                group: this.appGroupName,
                microappName: this.activeMicroAppName,
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
            this.microApps = [];
            this.appGroupName = '';
            this.activeMicroAppName = '';
            this.loadingMicroApps = false;
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
        syncMicroAppQuery(){
            if(!this.activeMicroAppName || this.$route.query?.microapp === this.activeMicroAppName){ return; }
            this.$router.replace({
                query: {
                    ...this.$route.query,
                    microapp: this.activeMicroAppName,
                },
            }).catch(()=>{});
        },
        applyMicroApp(item){
            if(!item){ return; }
            const microAppName = item?.metadata?.name || '';
            const groupName = item?.metadata?.labels?.[RESOURCE_GROUP_LABEL]
                || String(this.appgroup || microAppName).replace(/-root$/, '');
            this.appGroupName = groupName;
            this.activeMicroAppName = microAppName;
            this.bindings = item?.spec?.bindings || [];
            this.microAppRoleConfig = item?.spec?.['config-v2']?.props?.roleConfig || {};
            this.microAppBaseInfo = {
                appgroup: groupName,
                group: groupName,
                microappName: microAppName,
                frontendUrl: (item?.spec?.frontendUrl || '').replace(/\/index\.html$/, '/'),
                backendUrl: item?.spec?.backendUrl,
                username: item?.spec?.config?.props?.username,
                password: item?.spec?.config?.props?.password,
                appImage: item?.spec?.config?.props?.image,
                ...item?.spec?.config?.props,
            };
            this.extra = {
                identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                version: item.metadata?.labels?.['w7.cc/version'] || '',
                releaseName: groupName,
                namespace: item.metadata?.namespace,
            };
            this.applyMenuRuntimeConfig('');
            this.$emit('getinfo', {...this.info});
        },
        async loadMicroApps(appgroup){
            const selected = await panelApi.get(`/microapp/${appgroup}/info`).then(res=>res?.data);
            if(!selected){ return []; }
            const groupName = selected?.metadata?.labels?.[RESOURCE_GROUP_LABEL]
                || String(selected?.metadata?.name || appgroup).replace(/-root$/, '');
            const api = `/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/microapps`;
            const [namedResponse, groupedResponse] = await Promise.all([
                k8sproxy.get(`${api}/${encodeURIComponent(groupName)}`, {noAlert:true}).catch(()=>null),
                k8sproxy.get(resourceListWithLabelSelector(api, `${RESOURCE_GROUP_LABEL}=${groupName}`), {noAlert:true}).catch(()=>null),
            ]);
            const resources = [selected, namedResponse?.data, ...(groupedResponse?.data?.items || [])];
            const result = [];
            const names = new Set();
            resources.forEach(item=>{
                const name = item?.metadata?.name;
                const normalizedName = item === selected && item?.metadata?.labels?.['microapp.w7.cc/from'] === 'root'
                    ? String(name || '').replace(/-root$/, '')
                    : String(name || '');
                const hasMenu = (item?.spec?.bindings || []).some(binding=>
                    binding?.support === 'thirdparty_cd' && Array.isArray(binding?.menu) && binding.menu.length > 0
                );
                if(!name || names.has(normalizedName) || !hasMenu){ return; }
                names.add(normalizedName);
                result.push(item);
            });
            return result;
        },
        async getFront(appgroup){
            this.loadingMicroApps = true;
            const items = await this.loadMicroApps(appgroup).catch(()=>[]);
            if(!items.length){
                this.loadingMicroApps = false;
                return;
            }
            this.microApps = items;
            const requestedMicroAppName = this.$route.query?.microapp;
            let item = items.find(item=>item?.metadata?.name===requestedMicroAppName)
                || items.find(item=>item?.metadata?.name===appgroup)
                || items[0];
            this.applyMicroApp(item);
            this.$emit('getMicroApps', items);
            await this.$nextTick();

            const appmicro = this.ignoreAppmicroOnce ? '' : this.normalizeMicroMenuRoute(this.$route.query?.appmicro);
            this.ignoreAppmicroOnce = false;
            const requestedMenu = appmicro || this.menuActive || '';
            const menu = this.findMicroMenu(requestedMenu, requestedMicroAppName)
                || this.findMicroMenu(requestedMenu, this.activeMicroAppName)
                || this.findMicroMenu(requestedMenu);
            if(menu && menu.microAppName !== this.activeMicroAppName){
                item = items.find(item=>item?.metadata?.name===menu?.microAppName) || item;
                this.applyMicroApp(item);
            }
            this.page = menu?.do || requestedMenu;
            this.applyMenuRuntimeConfig(menu?.key || this.page);
            this.syncMicroAppQuery();
            this.$emit('menuResolved', menu?.key || this.page);
            this.$emit('getinfo', {...this.info});
            this.rememberMicroRoute(this.page);
            this.loadingMicroApps = false;
            this.wujieInit();
        },
        selectMicroMenu(value){
            const menu = this.findMicroMenu(value, this.activeMicroAppName) || this.findMicroMenu(value);
            if(!menu || (this.page === menu.do && this.activeMicroAppName === menu.microAppName)){ return; }
            const previousMicroAppName = this.activeMicroAppName;
            const previousBinding = this.getMenuBindingName(this.page);
            if(menu.microAppName !== this.activeMicroAppName){
                this.applyMicroApp(this.microApps.find(item=>item?.metadata?.name===menu.microAppName));
            }
            this.page = menu.do;
            this.rememberMicroRoute(this.page);
            const currentBinding = this.applyMenuRuntimeConfig(menu.key);
            this.syncMicroAppQuery();
            this.$emit('menuResolved', menu.key);
            this.$emit('getinfo', {...this.info});
            if(previousMicroAppName !== this.activeMicroAppName || previousBinding !== currentBinding){
                this.destroyMicro();
                this.wujieInit();
                return;
            }
            this.routeChange(this.page);
        },
        async wujieInit(){
            let is_register = false;
            let thirdparty_cd_token = '';
            let {data} = await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.releaseName,
            }}).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
                return res;
            })

            const isArtifactMenu = this.bindings.some(binding=>binding.name === 'other' && (binding.menu || []).some(menu=>menu.do === this.page));
            const repoUrl = data?.respoUrl;
            if(repoUrl && !isArtifactMenu){
                await panelApi.get('/zpk/config', {
                    params: { repoUrl },
                    noAlert: true,
                });
            }

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
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.releaseName}`)
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
            await panelApi.get(`/microapp/${this.activeMicroAppName}/frontprops`, { noAlert: true }).then(res=>{
                frontProps = res?.data || {};
            }).catch(()=>{});
            const microappName = this.activeMicroAppName;
            const appGroupName = this.appGroupName;
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
                    ...frontProps,
                    group: appGroupName,
                }
            }
            const runtimeFrontProps = {
                ...frontProps,
                group: appGroupName,
            };
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
                appgroup: appGroupName,
                group: appGroupName,
                microappName,
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
                    frontProps: runtimeFrontProps,
                    backendUrl: proxyBackendUrl,
                    group: appGroupName,
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
