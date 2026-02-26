<template>
    <div class="padding-0">
        <!-- <route-breadcrumb /> -->
        <div id="plugin-preview"></div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import { getToken } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: '',
            url: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        if(this.$route.query.name){
            this.getConfigmap();
        }
    },
    methods: {
        getConfigmap(){
            let pluginName = this.$route.query.name;
            
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+pluginName,{loading:true}).then(res=>{
                this.url = res?.data?.data?.['micro_html'];
                this.appStart();
            });
        },
        appStart(){
            setupApp({
                name: "plugin-preview",
                url: this.url,
                el: "#plugin-preview",
                props: {
                    token: getToken(),
                },
                sync: true,
                alive: false,
            })
            startApp({ name: "plugin-preview" });
        }
    },
}
</script>

<style>

</style>