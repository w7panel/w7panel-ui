<template>
    <div>
        <a-drawer :width="1000" :visible="visible" :mask-closable="false" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="$popupContainer">
            <template #title>安装应用</template>
            <store-install
                v-if="zpkUrl"
                :is_component="true"
                :path_identifie="zpkUrl"
                :release_name="installParams.releaseName || installParams.releasename || ''"
                :start_params="installParams.startParams || installParams.start_params || {}"
                :install_params="installParams"
                @needInstall="needInstall"
                @installed="installed"
                @installedStatusSuccess="installedStatusSuccess"
                @close="closeDrawer"
            />
        </a-drawer>
        
        <template v-for="(value,key) in idObj" :key="key">
            <install-drawer :show="value.show" :module_name="key" :dependency="value.dependency" @needInstall="needInstall" @installedStatusSuccess="value.callback" @close="value.show=false;"></install-drawer>
        </template>
    </div>
</template>

<script>
import storeInstall from '@/components/store-install.vue';
import installDrawer from '@/views/app/store/install-drawer.vue';

export default {
    props: {
        show: Boolean,
        path: {
            type: String,
            default: '',
        },
        params: {
            type: Object,
            default: ()=>({}),
        },
    },
    data(){
        return {
            visible: false,
            zpkUrl: '',
            installParams: {},
            idObj: {},
        }
    },
    watch:{
        show(v){
            this.visible = v;
            v && this.init();
        },
        path(){
            this.visible && this.init();
        },
        params: {
            deep: true,
            handler(){
                this.visible && this.init();
            },
        },
    },
    components: { storeInstall,installDrawer },
    methods: {
        init(){
            if(!this.visible){
                this.zpkUrl = '';
                this.installParams = {};
                return;
            }
            this.installParams = {...(this.params || {})};
            this.zpkUrl = this.normalizeInstallPath(this.path || this.installParams.path || this.installParams.repoUrl);
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
        closeDrawer(){
            this.visible = false;
            this.$emit('close');
        },
        installed(moduleName){
            this.$emit('installed',moduleName);
            // this.closeDrawer();
        },
        installedStatusSuccess(moduleName){
            this.$emit('installedStatusSuccess',moduleName);
        },
        needInstall(dependency, callback){
            dependency = typeof dependency === 'string' ? {identifie:dependency, name:dependency} : dependency;
            const key = dependency.releaseName || dependency.identifie || dependency.name;
            this.idObj[key] = {
                show: false,
                callback: callback,
                dependency,
            }
            this.$nextTick(()=>{
                this.idObj[key].show = true;
            });
        },
    },

}
</script>

<style>

</style>
