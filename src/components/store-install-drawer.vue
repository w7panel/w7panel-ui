<template>
    <div>
        <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" @open="init()" unmountOnClose :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <template #title>安装应用</template>
            <store-install v-if="zpkUrl" :is_component="true" @needInstall="needInstall" :path_identifie="zpkUrl" @installed="installed" @installedStatusSuccess="installedStatusSuccess" @close="closeDrawer" />
        </a-drawer>
        
        <template v-for="(value,key) in idObj" :key="key">
            <install-drawer :show="value.show" :module_name="key" @needInstall="needInstall" @installed="value.callback" @close="value.show=false;"></install-drawer>
        </template>
    </div>
</template>

<script>
import storeInstall from '@/components/store-install.vue';
import installDrawer from '@/views/app/store/install-drawer.vue';

export default {
    props: ['show','path'],
    data(){
        return {
            visible: false,
            zpkUrl: '',
            idObj: {},
        }
    },
    watch:{
        show(v){
            this.visible = v;
            v && this.init();
        },
    },
    components: { storeInstall,installDrawer },
    methods: {
        init(){
            if(!this.visible){
                this.zpkUrl = '';
                return;
            }
            this.zpkUrl = this.path;
        },
        closeDrawer(){
            this.visible = false;
            this.$emit('close');
        },
        installed(){
            this.$emit('installed');
            // this.closeDrawer();
        },
        installedStatusSuccess(){
            this.$emit('installedStatusSuccess');
        },
        needInstall(module_name, callback){
            this.idObj[module_name] = {
                show: false,
                callback: callback,
            }
            this.$nextTick(()=>{
                this.idObj[module_name].show = true;
            });
        },
    },

}
</script>

<style>

</style>