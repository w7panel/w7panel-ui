<template>
    <a-layout style="height:100%;">
        <a-layout-sider :width="100">
            <div class="df df-c" style="height:calc(100vh - 60px);">
                <a-tabs :active-key="$route.meta.routekey" @tab-click="changeKey" class="app-detailmenu fc" position="left" hide-content>
                    <a-tab-pane key="config-sercet-all" title="全部"></a-tab-pane>
                    <a-tab-pane key="config-sercet-image" title="镜像仓库"></a-tab-pane>
                    <a-tab-pane key="config-sercet-crt" title="证书管理"></a-tab-pane>
                </a-tabs>
            </div>
        </a-layout-sider>
        <a-layout-content>
            <router-view />
        </a-layout-content>
    </a-layout>
</template>

<script>
import { useNamespaceStore } from '@/store';
export default {
    data(){
        return {
            namespaceActive: '',
            data: {},
        }
    },
    watch: {
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        // this.getData();
    },
    methods: {
        changeKey(val){
            this.$router.push({name:val, params: this.$route.params});
        }
    }
}
</script>

<style>
.app-detailmenu{width:100%;}
.app-detailmenu .arco-tabs-nav{width:100%; padding-top:10px;}
</style>
<style scoped>
.content{height:100%;}
</style>