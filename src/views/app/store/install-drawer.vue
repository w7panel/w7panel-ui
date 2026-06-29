<template>
    <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
        <template #title>安装应用</template>
        <store-install v-if="module_identifie" :is_component="true" @needInstall="needInstall" :path_identifie="'https://zpk.w7.cc/zpk/respo/info/'+module_identifie" @installed="installed" @close="closeDrawer(true)" />
    </a-drawer>
</template>

<script>
import storeInstall from '@/components/store-install.vue'
export default {
    props: ['show','module_name'],
    data(){
        return {
            visible: false,
            module_identifie: '',
        }
    },
    watch:{
        show(v){
            this.visible = v;
            this.init();
        },
    },
    components: { storeInstall },
    methods: {
        init(){
            if(!this.visible){
                this.module_identifie = '';
                return;
            }
            this.module_identifie = this.module_name;
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        installed(){
            this.$emit('installed',this.module_name);
            // this.module_identifie = '';
            // this.closeDrawer();
        },
        needInstall(module_name,callback){
            this.$emit('needInstall',module_name,callback);
        },
    },

}
</script>

<style>

</style>