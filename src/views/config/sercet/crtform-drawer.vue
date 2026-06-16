<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="$popupContainer">
        <template #title>{{id?'修改证书':'创建证书'}}</template>
        <div class="mt-20 bg-white df jc-b">
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" auto-label-width>
                <a-form-item label="标识" field="name">
                    <a-input type="text" v-model="form.name" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item>
                <a-form-item label="别名" field="title">
                    <a-input type="text" v-model="form.title" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item>
                <a-form-item label="证书" field="crt">
                    <a-textarea v-model="form.crt" @change="yamlData=formTodata()" placeholder="请输入" style="height:120px;" :spellcheck="false" allow-clear/>
                </a-form-item>
                <a-form-item label="密钥" field="key">
                    <a-textarea v-model="form.key" @change="yamlData=formTodata()" placeholder="请输入" style="height:120px;" :spellcheck="false" allow-clear/>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store';

const templateData = {
    data: {
        "tls.crt": "",
        "tls.key": "",
    },
    metadata:{
        annotations: {
            title: "",
        },
        name: '',
        namespace: '',
    },
    type: "kubernetes.io/tls",
}

export default {
    props: ['show','id'],
    data(){
        return {
            visible: false,
            namespaceActive: "",
            data: {},
            form:{
                title: '',
                name: '',
                crt: '',
                key: '',
            },
            rules: {
                title: [{ required: true, message: '请输入别名', trigger: 'blur' }],
                name: [{ required: true, message: '请输入标识', trigger: 'blur' }],
                crt: [{ required: true, message: '请输入证书', trigger: 'blur' }],
                key: [{ required: true, message: '请输入密钥', trigger: 'blur' }],
            },
            yamlData: null,
        }
    },
    // components: { yamlView },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    watch:{
        show(v){
            this.visible = v;
            this.init();
        },
        id: 'init',
    },
    methods: {
        init(){
            if(this.id){
                this.getData();
            }else{
                this.form = {
                    title: '',
                    name: '',
                    crt: '',
                    key: '',
                }
                this.data = templateData;
                this.yamlData = this.formTodata();
            }
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        getData(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+this.id,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.data = data;
                let key = atob((data?.data && data?.data['tls.key']) || '');
                let crt = atob((data?.data && data?.data['tls.crt']) || '');
                this.form.title = data.metadata.annotations.title;
                this.form.name = data.metadata.name;
                this.form.crt = crt;
                this.form.key = key;

                this.yamlData = this.formTodata();
            });
        },
        formTodata(){
            let data = JSON.parse(JSON.stringify(this.data));
            data.metadata.annotations.title = this.form.title;
            data.metadata.name = this.form.name;
            data.data['tls.crt'] = btoa(this.form.crt);
            data.data['tls.key'] = btoa(this.form.key);
            return data;
        },
        submit(){
            this.$refs.form.validate((valid) => {
                if (valid) return;
                let data = this.formTodata();
                if(this.id){
                    k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+this.id, data,{loading:true}).then(res=>{
                        this.$message.success("修改成功");
                        setTimeout(()=>{
                            this.$emit('submit')
                            this.closeDrawer(true);
                        },300)
                    })
                }else{
                    k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/secrets', data,{loading:true}).then(res=>{
                        this.$message.success("创建成功");
                        setTimeout(()=>{
                            this.$emit('submit')
                            this.closeDrawer(true);
                        },300)
                    })
                }
            });
        },
    },
}
</script>

<style>

</style>