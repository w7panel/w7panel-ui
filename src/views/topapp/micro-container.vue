<template>
    <div style="height:100%;">
        <div v-show="downOk" id="appmicro" style="height:100%;transform:translate(0,0);"></div>

        <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
            <div style="height:100%;" class="bg-white"></div>
        </a-spin>

        <wujie-modals @changeLogin="loginPanel=true" />

    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken, getK8sinfo, clearIframeToken } from '@/utils/auth';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import wujieModals from '@/components/wujie-modals.vue';

export default{
    props: ['menuActive','appgroup'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            extra: {},
            page: '',
            downOk: true,
            loginPanel: false,
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
                this.getFront(v)
            })
        },
        loginPanel(v){
            this.$nextTick(()=>{
                this.getFront(this.appgroup)
            })
            if(!v){clearIframeToken()}
        },
    },
    beforeUnmount(){
        this.destroyMicro();
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}
        if(this.loginPanel){
            clearIframeToken();
        }
    },
    methods: {
        routeChange(v){
            bus.$emit("routeChange", v);
        },
        getFront(appgroup){
            if(this.loginPanel){
                this.openLoginPanel();
                return;
            }
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
                    
                    let appmicro = this.$route.query?.appmicro;
                    appmicro = appmicro? decodeURIComponent(appmicro) : '';
                    appmicro = appmicro?.replace(this.info.frontendUrl,'');
                    this.page = appmicro || this.menuActive || '';

                    this.wujieInit();
                })
            })
        },
        async wujieInit(){
            let is_register = false;
            let thirdparty_cd_token = '';
            await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.name,
            }}).then(res=>{
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
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://218.23.2.48:9090' + this.info.frontendUrl + (this.page || ''),
// url: 'http://localhost:8080' + (this.page || ''),
                exec: true,
                el: '#appmicro',
                sync: true,
                props: props,
            })
        },
        openLoginPanel(){
            startApp({
                name: "appmicro",
                url: '/cluster/panel',
                exec: true,
                el: '#appmicro',
                sync: true,
            })
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