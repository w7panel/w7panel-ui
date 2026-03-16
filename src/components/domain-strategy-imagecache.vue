<template>
    <div>
        <div v-show="info.exist" id="imagecachemicroapp"></div>
        <div v-show="!info.exist" class="mt-40 df df-c ai-c">
            <div>镜像缓存应用未安装</div>
            <div class="mt-20">
                <a-button type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_registrycache')">去安装</a-button>
            </div>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import { getToken,getK8sinfo } from '@/utils/auth';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default{
    props: ['data','activeName'],
    data(){
        return {
            namespaceActive: '',
            // imageCache: {
            //     exist: false,
            // },
            // microappInfo: {},
            info: {},
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        
        // 注册 wujie 事件（自动处理空值检查）
        registerWujieEvent("submit", this.submit);
        registerWujieEvent("close", this.close);
    },
    watch: {
        data: 'init',
        activeName(){
            if(this.activeName=='imageCache'){
                this.wujieInit();
            }else{
                try{
                    destroyApp('imagecachemicroapp');
                }catch{}
            }
        },
    },
    mounted(){
        this.init();
    },
    beforeUnmount(){
        try{
            destroyApp('imagecachemicroapp');
        }catch{}
        // 使用统一清理函数（自动处理空值检查）
        clearAllWujieEvents();
    },
    methods: {
        init(){
            this.testImageCache();
        },
        testImageCache(){
            if(!this.data||!Object.keys(this.data).length){return}
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie=w7-registrycache',{loading:true}).then(res=>{
                if(!res?.data){return Promise.reject();}
                let app = res?.data?.items?.[0];
                if(!app || !app.spec){return}
//                 this.imageCache = {
//                     backendUrl: app.spec.backendUrl,
//                     token: app?.spec?.config?.props?.OAUTH_TOKEN,
//                     exist: true,
//                 }
//                 this.microappInfo = {
//                     frontendUrl: app?.spec?.frontendUrl + '#/setting'
//                         + '?group=' + this.data?.spec?.rules?.[0]?.host + this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path
//                         + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name),
// // frontendUrl: 'http://218.23.2.55:9090' + app?.spec?.frontendUrl + '#/setting?group=' + this.data?.spec?.rules?.[0]?.host + this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name),
//                     backendUrl: app?.spec?.backendUrl,
//                     username: app?.spec?.config?.props?.username,
//                     password: app?.spec?.config?.props?.password,
//                     appImage: app?.spec?.config?.props?.image,
//                 }
                
                let userRole = getK8sinfo()['w7.cc/role'];
                let roleProps = app?.spec?.['config-v2']?.props?.roleConfig?.[userRole] || {};
                if(roleProps.frontend_props){
                    roleProps = {
                        ...roleProps,
                        ...roleProps.frontend_props,
                    }
                }

                this.info = {
                    exist: true,
                    frontendUrl: app?.spec?.frontendUrl + '#/setting'
                        + '?group=' + this.data?.spec?.rules?.[0]?.host + this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path
                        + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name),
// frontendUrl: 'http://172.16.1.162:9090' + app?.spec?.frontendUrl + '#/setting?group=' + this.data?.spec?.rules?.[0]?.host + this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name),
                    backendUrl: app?.spec?.backendUrl,
                    username: app?.spec?.config?.props?.username,
                    password: app?.spec?.config?.props?.password,
                    appImage: app?.spec?.config?.props?.image,
                    ...app?.spec?.config?.props,
                    ...roleProps,
                }
            })
        },
        wujieInit(){

            if(!this.info.exist){return}
            
            setupApp({
                name: "imagecachemicroapp",
                url: this.info.frontendUrl,
                exec: true,
                el: '#imagecachemicroapp',
                sync: true,
                props: {
                    // url: (/^\//.test(this.info.backendUrl)? window.location.origin : '') + this.info.backendUrl,
                    // Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                    // appImage: this.info.appImage,
                    // domain: this.info.domain,
                    // OAUTH_TOKEN: this.imageCache.token,
                    // is_component: true,
                    // paneltoken: getToken(),
                    
                    url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                    Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                    is_component: true,
                    paneltoken: getToken(),
                    ...this.info,
                },
            })
            startApp({name:'imagecachemicroapp'})
        },
        submit(data){
            console.log(data)
            if(data.from!='image-cache'){return}

            this.$emit('submit');
        },
        close(){
            this.$emit('cancel');
        },
    }
}
</script>
<style scoped>
</style>
