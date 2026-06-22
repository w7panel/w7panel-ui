<template>
    <div style="padding-top:100px;">
        <div class="df df-c ai-c">
            <icon-loading class="c-66" style="font-size:60px;"/>
            <div class="mt-20 fs-16 c-99">资源加载中，请耐心等待</div>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';

export default{
    data(){
        return {
            namespaceActive: '',
            interval: null,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.test();
    },
    beforeUnmount(){
        clearInterval(this.interval);
    },
    methods: {
        test(){
            this.interval = setInterval(()=>{
                k8sproxy.get('/api/v1/namespaces/default/services/kubernetes', {loading:true, noAlert:true}).then(res=>{
                    this.$router.push({name:'cluster-panel'});
                }).catch(()=>{});
            },3000)
        },
    }
}
</script>
<style scoped>
</style>
