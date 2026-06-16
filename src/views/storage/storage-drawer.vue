<template>
    <a-drawer :width="800" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="$popupContainer">
        <template #title>{{id?'修改存储':'创建存储'}}</template>
        <div class="mt-10 bg-white df jc-b">
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" auto-label-width class="ml-20">
                <a-form-item label="存储类" field="storage_class">
                    <a-select v-model="form.storage_class" @change="yamlData=formTodata()" style="width:500px;" placeholder="请选择">
                        <a-option v-for="item in storageLs" :key="item" :label="item" :value="item"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="标识" field="name">
                    <a-input v-model="form.name" @change="yamlData=formTodata()" :disabled="!!id" placeholder="请输入" style="width:500px;" />
                </a-form-item>
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" @change="yamlData=formTodata()" placeholder="请输入" style="width:500px;" ></a-input>
                </a-form-item>
                <a-form-item label="存储大小" field="size">
                    <a-input-number v-model="form.size" @change="yamlData=formTodata()" style="width:500px;">
                        <template #append>
                            <span style="padding:0 10px;">G</span>
                        </template>
                    </a-input-number>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
// import yamlView from '@/components/yaml-view.vue'
import { useNamespaceStore } from '@/store';

export default {
    props: ['show','id'],
    data(){
        return {
            visible: false,
            namespaceActive: "",
            data: {},
            form: {
                name: "",
                title: "",
                size: 1,
                storage_class: "",
            },
            rules:{
                name: [{ required: true, message: '请输入存储名称', trigger: 'blur' }],
                title: [{ required: true, message: '请输入存储名称', trigger: 'blur' }],
                storage_class: [{ required: true, message: '请选择存储类', trigger: 'blur' }],
                size: [{ required: true, message: '请输入存储大小', trigger: 'blur' }],
            },

            yamlData: null,
        }
    },
    // components: { yamlView, },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getType();
        this.init();
    },
    watch:{
        show(v){
            this.visible = v;
            this.init();
        },
        id: 'init',
    },
    methods:{
        init(){
            if(this.id){
                this.getData();
            }else{
                this.form = {
                    name: "",
                    title: "",
                    size: 1,
                    storage_class: "",
                }
                this.yamlData = this.formTodata();
            }
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        getData(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims/'+this.id,{loading:true}).then(res=>{
                let data = res?.data;
                this.data = data;
                if(!data){return}
                this.form.name = data.metadata.name;
                this.form.title = data.metadata.annotations.title || '';
                this.form.storage_class = data.spec.storageClassName;
                this.form.size = Number(data.spec.resources.requests.storage.replace('Gi',''));
                
                this.yamlData = this.formTodata();
            })
        },
        getType(){
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.map(item=>{
                    return item.metadata.name;
                })
                this.storageLs = list;
            })
        },
        formTodata(){
            let data = {};

            if(this.id){
                data = JSON.parse(JSON.stringify(this.data))
                data.metadata.annotations = data.metadata.annotations || {};
                data.metadata.annotations.title = this.form.title;
                data.spec.resources.requests.storage = this.form.size + "Gi";
                data.spec.storageClassName = this.form.storage_class;
            }else{
                data = {
                    "metadata": {
                        "annotations": {
                            "title": this.form.title,
                        },
                        "name": this.form.name,
                    },
                    "spec": {
                        "resources": {
                            "requests": {
                                "storage": this.form.size + "Gi"
                            }
                        },
                        "storageClassName": this.form.storage_class,
                        "accessModes": ["ReadWriteOnce"],
                    }
                }
            }
            return data;
        },

        submit(){
            this.$refs.form.validate((err) => {
                if (err) { return; }
                if(this.id){
                    k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims/'+this.id, this.formTodata(),{loading:true}).then(res=>{
                        if(!res.data){return}
                        this.$message.success('操作成功')
                        setTimeout(()=>{
                            this.closeDrawer(true);
                        },1000)
                    })
                }else{
                    k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims', this.formTodata(),{loading:true}).then(res=>{
                        if(!res.data){return}
                        this.$message.success('操作成功')
                        setTimeout(()=>{
                            this.closeDrawer(true);
                        },1000)
                    })
                }
            });
        },
    },

}
</script>

<style>

</style>