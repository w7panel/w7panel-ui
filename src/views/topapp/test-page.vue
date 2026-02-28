<template>
    <div class="padding-20" style="height:100%;">
        <div class="padding-20 df df-c bg-white" style="height:100%;">
            <div>
                <a-form auto-label-width>
                    <a-form-item label="前端地址">
                        <a-input v-model="frontUrl" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="页面地址">
                        <a-input v-model="path" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="后端地址">
                        <a-input v-model="backendUrl" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item>
                        <a-button type="primary" @click="wujieInit">确定</a-button>
                    </a-form-item>
                </a-form>
            </div>
            
            <div id="appmicrotest" style="margin-top:20px;flex:1;transform:translate(0,0);"></div>
        </div>
    </div>
</template>
<script>
import { getToken,getK8sinfo } from '@/utils/auth';
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";

export default{
    data(){
        return {
            frontUrl: '/ui/microapp/w7-zpkv2/index.html',
            path: '#/zpk',
            backendUrl: '/k8s/v1/namespaces/default/services/w7-zpkv2/proxy-no/zpk',
        }
    },
    created(){

    },
    methods: {
        
        async wujieInit(){
            
            destroyApp('appmicro');
            
            let is_register = false;
            let thirdparty_cd_token = '';
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let props = {
                url: /^\//.test(this.backendUrl)? window.location.origin + this.backendUrl : this.backendUrl,
                Authorization: 'Basic '+ btoa('undefind:undefind'),
                // domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
            }
            console.log(props)
            console.log('http://218.23.2.48:9090' + this.frontUrl + this.path)
            startApp({
                name: "appmicrotest",
                url: 'http://218.23.2.48:9090' + this.frontUrl + this.path,
                exec: true,
                el: '#appmicrotest',
                sync: true,
                props: props,
            })
            startApp({name:'appmicrotest'})
        },
    }
}
</script>
<style scoped>
</style>