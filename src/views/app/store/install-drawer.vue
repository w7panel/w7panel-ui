<template>
    <a-drawer :width="1000" :visible="visible" :mask-closable="false" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
        <template #title>安装应用</template>
        <store-install
            v-if="installPath"
            :key="installKey"
            :is_component="true"
            :path_identifie="installPath"
            :release_name="dependencyConfig.releaseName || ''"
            :start_params="dependencyConfig.startParams || {}"
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
        dependency: {
            type: [Object, String],
            default: null,
        },
    },
    data(){
        return {
            visible: false,
            module_identifie: '',
            dependencyConfig: {},
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
        dependency(){
            this.visible && this.init();
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
        installKey(){
            return `${this.installPath}:${this.dependencyConfig.releaseName || ''}:${this.dependencyConfig.order_sn || ''}`;
        },
    },
    methods: {
        init(){
            if(!this.visible){
                this.module_identifie = '';
                this.dependencyConfig = {};
                this.installPath = '';
                return;
            }
            this.dependencyConfig = typeof this.dependency === 'string'
                ? {identifie:this.dependency, name:this.dependency}
                : (this.dependency || {identifie:this.module_name, name:this.module_name});
            this.module_identifie = this.dependencyConfig.identifie || this.module_name;
            this.installPath = this.normalizeInstallPath(this.path)
                || (this.module_identifie ? this.dependencyPath : '');
            if(this.dependencyConfig.order_sn){
                this.installPath = this.appendOrderSn(this.installPath, this.dependencyConfig.order_sn);
            }
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
        appendOrderSn(path, orderSn){
            const value = String(path || '').trim();
            const sn = String(orderSn || '').trim();
            if(!value || !sn){return value;}
            try{
                const url = new URL(value, window.location.origin);
                url.searchParams.set('order_sn', sn);
                return /^https?:\/\//i.test(value) ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
            }catch{
                return value;
            }
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
        installed(moduleName){
            this.$emit('installed',moduleName || this.getModuleName());
        },
        installedStatusSuccess(moduleName){
            this.$emit('installedStatusSuccess',moduleName || this.getModuleName());
        },
        needInstall(dependency,callback){
            this.$emit('needInstall',dependency,callback);
        },
    },

}
</script>

<style>

</style>
