<template>
    <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
        <template #title>安装应用</template>
        <store-install
            v-if="installPath"
            :key="installPath"
            :is_component="true"
            :path_identifie="installPath"
            @needInstall="needInstall"
            @installed="installed"
            @installedStatusSuccess="installedStatusSuccess"
            @close="closeDrawer(true)"
        />
    </a-drawer>
</template>

<script>
import storeInstall from '@/components/store-install.vue'
export default {
    props: {
        show: Boolean,
        module_name: {
            type: String,
            default: '',
        },
        path: {
            type: String,
            default: '',
        },
    },
    data(){
        return {
            visible: false,
            installPath: '',
        }
    },
    watch:{
        show(v){
            this.visible = v;
            this.init();
        },
        module_name(){
            this.visible && this.init();
        },
        path(){
            this.visible && this.init();
        },
    },
    components: { storeInstall },
    methods: {
        init(){
            if(!this.visible){
                this.installPath = '';
                return;
            }
            this.installPath = this.normalizeInstallPath(this.path)
                || (this.module_name ? 'https://zpk.w7.cc/zpk/respo/info/' + this.module_name : '');
        },
        normalizeInstallPath(path){
            let value = String(path || '').trim();
            if(/^https?%3A%2F%2F/i.test(value)){
                try{
                    value = decodeURIComponent(value);
                }catch{}
            }
            return value;
        },
        getModuleName(){
            if(this.module_name){return this.module_name}
            try{
                const pathname = new URL(this.installPath).pathname;
                return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
            }catch{
                return '';
            }
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        installed(){
            this.$emit('installed',this.getModuleName());
        },
        installedStatusSuccess(){
            this.$emit('installedStatusSuccess',this.getModuleName());
        },
        needInstall(module_name,callback){
            this.$emit('needInstall',module_name,callback);
        },
    },

}
</script>

<style>

</style>
