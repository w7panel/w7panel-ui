<template>
    <a-drawer :width="1200" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :mask-closable="false">
        <template #title>编辑应用</template>
        <app-form
            ref="appform"
            :default-data="defaultData"
        ></app-form>
    </a-drawer>
</template>
<script>
import jsyaml from "js-yaml";
import appForm from "@/components/app-form.vue";

export default{
    props: ['show','yaml','json','callback'],
    data(){
        return {
            visible: false,
            defaultData: null,
        }
    },
    created(){
        this.visible = this.show;
        if(this.visible){ this.init(); }
    },
    components: {
        appForm,
    },
    watch: {
        show(v){
            this.visible = v;
            v && this.init();
        },
        yaml: 'init',
        json: 'init',
    },
    methods: {
        init(){
            if(this.json){
                this.defaultData = JSON.parse(JSON.stringify(this.json));
            }else if(this.yaml){
                this.defaultData = jsyaml.load(this.yaml);
            }
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        submit(){
            this.$refs.appform.exportFormData().then(data=>{
                if(this.callback){
                    this.callback(data);
                    this.closeDrawer();
                }
            }).catch(()=>{});
        },
    }
}
</script>
<style scoped>
</style>