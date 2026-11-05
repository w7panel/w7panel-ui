<template>
    <div class="padding-20 site-setting-page">
        <route-breadcrumb />
        <app-direct v-if="isSubCluster !== null"
            setting-name="default"
            global-mode
            show-contact
            show-homepage
            :main-cluster-read-only="isSubCluster"
            class="site-setting-panel"
        />
    </div>
</template>

<script>
import AppDirect from '@/views/topapp/app-direct.vue';
import { panelApi } from '@/utils/api';

export default {
    components: {
        AppDirect,
    },
    data(){ return { isSubCluster: null }; },
    created(){
        panelApi.get('/app-info', { noAlert: true }).then(res=>{
            this.isSubCluster = res.data?.isSubCluster === true;
        }).catch(()=>{ this.isSubCluster = true; });
    },
}
</script>

<style scoped>
.site-setting-panel{
    margin-top:20px;
}
</style>
