<template>
    <div class="micro-container">
        <iframe v-if="info.load_mode === 'iframe'" :src="info.iframeSrc" style="display:block;width:100%;height:100%;border:0;"></iframe>
        <template v-else >
            <div id="appmicro" style="height:100%;transform:translate(0,0);"></div>

            <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
                <div style="height:100%;" class="bg-white"></div>
            </a-spin>
            <a-spin v-if="microLoading" class="micro-loading" :loading="microLoading" :size="32">
                <div style="height:100%;"></div>
            </a-spin>

            <wujie-modals />
        </template>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken, getK8sinfo } from '@/utils/auth';
import { bus, startApp, destroyApp } from "wujie";
import wujieModals from '@/components/wujie-modals.vue';
import { normalizeWujieSyncRoute } from '@/utils/wujie-route';

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
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
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
            if(this.info.load_mode === 'iframe'){
                this.info.iframeRoute = v || '';
                this.info.iframeSrc = this.buildIframeSrc(this.info.iframePath, this.info.iframeRoute);
            }else{
                bus.$emit("routeChange", (v || '').replace(/^#/,''));
            }
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
            this.rememberMicroRoute(normalizeWujieSyncRoute(this.$route.query?.appmicro, {
                frontend: this.info.frontendUrl,
            }));
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
                    version: item.metadata?.labels?.['w7.cc/version'] || '',
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                }
                this.$emit('getBindings',item?.spec?.bindings||[])
                this.$emit('getinfo',{...this.info})
                this.rememberCurrentMicroRoute();
                this.$nextTick(()=>{
                    const appmicro = this.ignoreAppmicroOnce ? '' : normalizeWujieSyncRoute(this.$route.query?.appmicro, {
                        frontend: this.info.frontendUrl,
                    });
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
                return;
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
            this.microLoading = true;
            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + this.page,
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://218.23.2.48:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://localhost:8002' + (this.page || ''),
// url: 'https://idc.w7.com' + this.info.frontendUrl + (this.page || ''),
                exec: true,
                el: '#appmicro',
                sync: true,
                prefix: {
                    index: this.info.frontendUrl,
                    other: this.info.frontendUrl.replace(/\/[^/]+$/,'/')
                },
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
