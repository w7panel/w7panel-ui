<template>
    <div style="width:100%;height:100%;">
        <micro-container :appgroup="$route.params.group" :menuActive="menuActive"></micro-container>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
// import { useNamespaceStore,useLoadingStore } from '@/store';
// import axios from 'axios';
import microContainer from '@/views/topapp/micro-container.vue'
export default{
    data(){
        return {
            namespaceActive: '',
            identifie: '',
            menuActive: '',
        }
    },
    created(){
        // this.menuActive = decodeURIComponent(this.$route.query?.path || '');
        // this.namespaceActive = useNamespaceStore().namespace;
        // this.getGroup();
    },
    components: {
        microContainer,
    },
    methods: {
        // getGroup(){
        //     return k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {loading:true}).then(async res=>{
        //         let data = res?.data;
        //         this.identifie = data?.metadata?.annotations?.['w7.cc/identifie'];
        //     });
        // },
    }
}
</script>
<style scoped>
</style>