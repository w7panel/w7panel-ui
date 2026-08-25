<template>
    <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
        <template #title>安装应用</template>
        <store-install v-if="module_identifie" :is_component="true" @needInstall="needInstall" :path_identifie="dependencyPath" :release_name="dependencyConfig.releaseName || ''" :start_params="dependencyConfig.startParams || {}" @installed="installed" @close="closeDrawer(true)" />
    </a-drawer>
</template>

<script>
import storeInstall from '@/components/store-install.vue'
export default {
    props: ['show','module_name','dependency'],
    data(){
        return {
            visible: false,
            module_identifie: '',
            dependencyConfig: {},
        }
    },
    watch:{
        show(v){
            this.visible = v;
            this.init();
        },
    },
    components: { storeInstall },
    computed: {
        dependencyPath(){
            const identify = this.dependencyConfig.subidentifie
                ? `${this.dependencyConfig.identifie}/${this.dependencyConfig.subidentifie}`
                : (this.dependencyConfig.identifie || this.module_identifie);
            const from = String(this.dependencyConfig.from || '').replace(/\/$/, '');
            const base = from
                ? `${from}/zpk/respo/info/${identify}`
                : `https://zpk.w7.cc/zpk/respo/info/${identify}`;
            return base;
        },
    },
    methods: {
        init(){
            if(!this.visible){
                this.module_identifie = '';
                this.dependencyConfig = {};
                return;
            }
            this.dependencyConfig = this.dependency || {identifie:this.module_name, name:this.module_name};
            this.module_identifie = this.dependencyConfig.identifie || this.module_name;
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
        needInstall(dependency,callback){
            this.$emit('needInstall',dependency,callback);
        },
    },

}
</script>

<style>

</style>
