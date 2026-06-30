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
import { getWujieRoutePrefix, normalizeWujieSyncRoute } from '@/utils/wujie-route';
import { appendWujieModalHandles } from '@/utils/wujie-modal-handles';

export default{
    props: ['menuActive','appgroup'],
    emits: ['getBindings', 'getinfo', 'changeAppMenu'],
    data(){
        return {
            namespaceActive: '',
            info: {},
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
            this.page = v;
            this.rememberMicroRoute(v);
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
            const base = (path || '') + (route || '');
            if(!token){ return base; }
            return base + (base.includes('?') ? '&' : '?') + 'api-token=' + token;
        },
        routeChange(v){
            // if(this.info.load_mode === 'iframe'){
            //     // this.info.iframeRoute = v || '';
            //     // this.info.iframeSrc = this.buildIframeSrc(this.info.iframePath, this.info.iframeRoute);
            //     this.destroyMicro();
            //     this.wujieInit();
            // }else{
            // }
            bus.$emit("routeChange", (v || '').replace(/^#/,''));
            this.rememberMicroRoute(v);
        },
        resetMicro(){
            try{
                this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
            }catch{}
            this.destroyMicro();
            this.info = {};
            this.extra = {};
            this.page = '';
            this.downOk = true;
            this.microLoading = false;
        },
        rememberCurrentMicroRoute(){
            this.rememberMicroRoute(normalizeWujieSyncRoute(this.$route.query?.appmicro, getWujieRoutePrefix(this.info.frontendUrl)));
        },
        rememberMicroRoute(route){
            if(!route){ return; }
            this.lastMicroRoute = route;
        },
        getFront(appgroup){

            panelApi.get(`/microapp/${appgroup}/info`).then(res=>{
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
                    // frontendUrl: item?.spec?.frontendUrl,
                    // 测试短路径
                    frontendUrl: item?.spec?.frontendUrl.replace(/\/index\.html$/, '/'),
                    backendUrl: item?.spec?.backendUrl,
                    username: item?.spec?.config?.props?.username,
                    password: item?.spec?.config?.props?.password,
                    appImage: item?.spec?.config?.props?.image,
                    ...item?.spec?.config?.props,
                    ...roleProps,
                }
                this.extra = {
                    identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                    version: item.metadata?.labels?.['w7.cc/version'] || '',
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                }
                this.$emit('getBindings',item?.spec?.bindings||[])
                this.$emit('getinfo',{...this.info})
                this.rememberCurrentMicroRoute();
                this.$nextTick(()=>{
                    const appmicro = this.ignoreAppmicroOnce ? '' : normalizeWujieSyncRoute(this.$route.query?.appmicro, getWujieRoutePrefix(this.info.frontendUrl));
                    this.ignoreAppmicroOnce = false;
                    this.page = appmicro || this.menuActive || '';
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
                this.info.iframePath = this.info.url;
                this.info.iframeRoute = this.page || '';
                this.info.iframeSrc = this.buildIframeSrc(this.info.iframePath, this.info.iframeRoute);
                // return;
            }

            if(!this.downOk){
                this.info.frontendUrl = data.proxyUrl;
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
            let props = {
                url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                // domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
                ...frontProps,
                loginCloud,
            }
            appendWujieModalHandles(props, () => this.$refs.wujieModals);
            console.log(props)
            this.microLoading = true;
            const url = isIframeMode? (this.info.iframeSrc) : (this.info.frontendUrl + this.page)
            startApp({
                name: "appmicro",
                url: url,
// 测试
// url: 'http://218.23.2.48:9090' + url,
                exec: true,
                el: '#appmicro',
                degrade: isIframeMode,
                sync: true,
                prefix: getWujieRoutePrefix(this.info.frontendUrl),
                props: props,
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
