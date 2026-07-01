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
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/w7-zpkv2', {noAlert:true}).then(res=>{
                // let url = res.data.items[0]?.spec?.frontendUrl;

                this.$router.push('/app/appgroup/w7-zpkv2/micro2');
            }).catch(()=>{
                this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_zpkv2');
            });
        },
    }
}
</script>

<style>

</style>
