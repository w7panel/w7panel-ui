<template>
    <default-layout>
    </default-layout>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import defaultLayout from '@/components/default-layout.vue'
import { useNamespaceStore } from '@/store';
import axios from 'axios';

export default {
    components: {
        defaultLayout,
    },
    data(){
        return {
            useNamespaceStore: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getZpk();
    },
    methods:{
        getZpk(){
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie=kubeblocks-v2&limit=500').then(res=>{
                if(!res?.data?.items?.[0]){
                    this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/kubeblocks-v2');
                    return;
                }
                // let url = res.data.items[0]?.spec?.frontendUrl;

                this.$router.push('/app/appgroup/kubeblocks-v2/micro2');
            });
        },
    }
}
</script>

<style>

</style>