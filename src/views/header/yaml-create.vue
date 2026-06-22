<template>
    <div class="padding-20" style="height:100%;box-sizing:border-box;">
        <div id="yamleditordom" class="df df-c" style="height:100%; height:max(400px, 100%)">
            <yaml-input domid="yamlinput" class="fc" @submit="v=>txt=v"></yaml-input>
            <div class="mt-16 df-s0">
                <a-button type="primary" @click="submit" style="width:100px;">创建</a-button>
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';

import yamlInput from "@/components/yaml-input.vue"
import { useNamespaceStore } from "@/store";

export default {
    data(){
        return {
            namespaceActive: '',
            loading: false,
            txt: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    mounted(){},
    components: {yamlInput},
    methods: {
        submit(){
            if(!this.txt){return}
            this.loading = true;
            panelApi.post('/yaml?namespace='+this.namespaceActive,this.txt).then(res=>{
                if(res?.data){
                    this.$message.success('操作成功');
                }
            }).finally(()=>{
                this.loading = false;
            })
        },
    }
}
</script>

<style>

</style>