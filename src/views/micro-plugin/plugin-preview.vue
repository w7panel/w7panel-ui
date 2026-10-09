<template>
    <div class="padding-0">
        <!-- <route-breadcrumb /> -->
        <div id="plugin-preview"></div>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
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
        async appStart(){
            const frontProps = await panelApi.get('/microapp/global-frontprops', { noAlert: true })
                .then(res => res?.data || {}).catch(() => ({}));
            setupApp({
                name: "plugin-preview",
                url: this.url,
                el: "#plugin-preview",
                props: {
                    token: getToken(),
                    isSubCluster: frontProps.isSubCluster === true,
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
