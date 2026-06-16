<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" class="dcform-drawer" unmountOnClose :popup-container="$popupContainer">
        <template #title>K8sYaml创建</template>
        <div id="yamleditordom" class="df df-c" style="height:100%; height:max(400px, 100%)">
            <yaml-input domid="yamlinput" class="fc" @submit="v=>txt=v"></yaml-input>
        </div>
    </a-drawer>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from "axios";
import yamlInput from "@/components/yaml-input.vue"
import {useNamespaceStore} from "@/store";

export default {
    props: ['show'],
    data(){
        return {
            visible: false,
            namespaceActive: '',
            txt: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    watch:{
        show(){
            this.visible = this.show;
        },
    },
    mounted(){},
    components: {yamlInput},
    methods: {
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        },
        submit(){
            if(!this.txt){return}
            panelApi.post('/yaml?namespace='+this.namespaceActive,this.txt,{loading:true}).then(res=>{
                if(res?.data){
                    this.$message.success('创建成功');
                    this.closeDrawer(true);
                }
            })
        },
    }
}
</script>

<style>

</style>