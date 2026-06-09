<template>
    <div style="height:100%;">
        <iframe v-if="info.load_mode === 'iframe'" :src="info.iframeSrc" style="display:block;width:100%;height:100%;border:0;"></iframe>
        <template v-else >
            <div v-show="downOk" id="appmicro" style="height:100%;transform:translate(0,0);"></div>

            <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
                <div style="height:100%;" class="bg-white"></div>
            </a-spin>

            <wujie-modals @changeLogin="$emit('changeLogin', $event)" />
        </template>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken, getK8sinfo } from '@/utils/auth';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import wujieModals from '@/components/wujie-modals.vue';
import { normalizeWujieSyncRoute } from '@/utils/wujie-route';

export default{
    props: ['menuActive','appgroup'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            extra: {},
            page: '',
            downOk: true,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
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
            this.routeChange(v);
        },
    },
    beforeUnmount(){
        this.destroyMicro();
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
    },
    methods: {
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
        },
        getFront(appgroup){
            // k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/'+appgroup).then(res=>{

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
                this.$nextTick(()=>{
                    
                    const appmicro = normalizeWujieSyncRoute(this.$route.query?.appmicro, {
                        frontend: this.info.frontendUrl,
                    });
                    this.page = appmicro || this.menuActive || '';

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
            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + this.page,
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://218.23.2.48:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://localhost:8080' + (this.page || ''),
// url: 'https://idc.w7.com' + this.info.frontendUrl + (this.page || ''),
                exec: true,
                el: '#appmicro',
                sync: true,
                prefix: {
                    frontend: this.info.frontendUrl,
                },
                props: props,
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
</style>
