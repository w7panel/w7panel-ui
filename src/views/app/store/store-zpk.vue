<template>
    <div class="padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="df df-c bg-white" style="height: calc(100% - 46px);">
            <div v-if="!isInstall" class="df df-c jc-c mt-40">
                <a-empty>制品库应用未安装，<span class="c-blue cursor" @click="toInstall">点击安装</span></a-empty>
            </div>
            <a-spin v-else-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:100%;">
                <div style="height:100%;"></div>
            </a-spin>
            <div v-else>
                <div id="zpkstore"></div>
            </div>
        </div>
    </div>
</template>
<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getK8sinfo, getToken } from '@/utils/auth';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";

export default{
    data(){
        return {
            isInstall: true,
            downOk: false,
            namespaceActive: '',
            identifie: 'w7-zpkv2',
            info: {},
            extra: {},
            menuActive: '#/zpk-store-list',
        }
    },
    beforeUnmount(){
        try{
            destroyApp('appmicro');
        }catch{}
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}

    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getZpk();
    },
    methods: {
        getZpk(){
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie='+ this.identifie +'&limit=500',{
                loading: true,
            }).then(res=>{
                if(!res?.data?.items?.[0]){
                    this.isInstall = false;
                    return;
                }
                this.getInfo();
            });
        },
        getInfo(){
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/'+this.identifie,{noAlert:true}).then(res=>{
                let item  = res?.data;
                if(!item){ return; }
                
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
                    appgroup: this.identifie,
                    frontendUrl: item?.spec?.frontendUrl,
                    backendUrl: item?.spec?.backendUrl,
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
                this.wujieInit();
            }).catch(()=>{})
        },
        
        async wujieInit(){
            try{
                destroyApp('appmicro');
            }catch(e){console.log('destroy err')}

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
                domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
            }
            console.log(props)
            
            await new Promise(resolve=>{this.$nextTick(resolve)})

            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + (this.menuActive || ''),
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.menuActive || ''),
                el: '#zpkstore',
                sync: true,
                props: props,
            })
        },
        toInstall(){
            this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_zpkv2');
        },
        
    }
}
</script>
<style scoped>
</style>