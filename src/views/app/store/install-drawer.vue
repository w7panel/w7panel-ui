<template>
    <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
        <template #title>安装应用</template>
        <store-install v-if="module_identifie" :is_component="true" @needInstall="needInstall" :path_identifie="pathIdentifie" @installed="installed" @close="closeDrawer(true)" />
    </a-drawer>
</template>

<script>
import storeInstall from '@/components/store-install.vue'
export default {
    props: ['show','module_name','repo_prefix'],
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
    computed: {
        pathIdentifie(){
            return this.normalizeRepoPrefix(this.repo_prefix) + this.module_identifie;
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
        normalizeRepoPrefix(prefix){
            let url = prefix || 'https://zpk.w7.cc/zpk/respo/info/';
            url = String(url).trim();
            if(!/^https?:\/\//.test(url)){
                url = 'https://' + url;
            }
            let match = url.match(/^(https?:\/\/[^/]+\/(?:zpk\/)?respo\/info)(?:\/|$)/);
            if(match?.[1]){ return match[1] + '/'; }
            url = url.replace(/\/+$/, '') + '/';
            if(/\/zpk\/$/.test(url)){
                return url + 'respo/info/';
            }
            return url + 'zpk/respo/info/';
        },
        needInstall(module_name,callback,repo_prefix){
            this.$emit('needInstall',module_name,callback,repo_prefix);
        },
    },

}
</script>

<style>

</style>
