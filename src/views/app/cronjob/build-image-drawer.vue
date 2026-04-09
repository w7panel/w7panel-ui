<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" >
        <template #title>构建镜像</template>
        <div>
            <a-form ref="form" :model="form" :rules="rules" auto-label-width>
                <a-form-item label="DockerfilePath" field="dockerfilePath">
                    <a-input v-model="form.dockerfilePath" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="构建源" field="downloadUrl">
                    <a-input v-model="form.downloadUrl" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="推送配置">
                    <div class="df df-c" style="flex:1;">
                        <a-form-item label="推送地址" field="address">
                            <a-input v-model="form.address" placeholder="请输入"></a-input>
                        </a-form-item>
                        <a-form-item label="用户名">
                            <a-input v-model="form.username" placeholder="请输入"></a-input>
                        </a-form-item>
                        <a-form-item label="密码">
                            <a-input v-model="form.password" placeholder="请输入"></a-input>
                        </a-form-item>
                    </div>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import {useNamespaceStore} from "@/store";

let templateData = {
    apiVersion: "buildimage.w7.cc/v1alpha1",
    kind: "BuildImage",
    metadata: {
        name: "",
        namespace: "default"
    },
    spec: {
        taskId: "",
        namespace: "default",
        source: {
            dockerfilePath: "",
            downloadUrl: "",
            dockerContext: ".",
        },
        targetImage: {
            address: "",
            auth: {
                username: "",
                password: ""
            }
        }
    }
}

export default{
    props: ['show','data'],
    data(){
        return {
            namespaceActive: '',
            visible: false,
            currentData: {},
            form: {},

            rules: {
                dockerfilePath: [{ required: true, message: '请输入DockerfilePath' }],
                downloadUrl: [{ required: true, message: '请输入构建源' }],
                address: [{ required: true, message: '请输入推送地址' }],
            }
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    watch: {
        show(v){
            this.visible = v;
            v && this.init();
        },
    },
    methods: {
        init(){
            if(this.data){
                this.currentData = JSON.parse(JSON.stringify(this.data));
            }else{
                this.currentData = JSON.parse(JSON.stringify(templateData));
                this.currentData.metadata.name = 'buildimage-' + this.createName();
                this.currentData.spec.taskId = this.currentData.metadata.name;
                this.currentData.metadata.namespace = this.namespaceActive;
                this.currentData.spec.namespace = this.namespaceActive;
            }
            this.dataToForm();
        },
        dataToForm(){
            this.form = {
                ...this.form,
                dockerfilePath: this.currentData?.spec?.source?.dockerfilePath || '',
                downloadUrl: this.currentData?.spec?.source?.downloadUrl || '',
                address: this.currentData?.spec?.targetImage?.address || '',
                username: this.currentData?.spec?.targetImage?.auth?.username || '',
                password: this.currentData?.spec?.targetImage?.auth?.password || '',
            }
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {return;}
                if(this.data){
                    let operation = [
                        {
                            op: 'replace',
                            path: '/spec/source/dockerfilePath',
                            value: this.form.dockerfilePath,
                        },
                        {
                            op: 'replace',
                            path: '/spec/source/downloadUrl',
                            value: this.form.downloadUrl,
                        },
                        {
                            op: 'replace',
                            path: '/spec/targetImage/address',
                            value: this.form.address,
                        },
                        {
                            op: 'replace',
                            path: '/spec/targetImage/auth/username',
                            value: this.form.username,
                        },
                        {
                            op: 'replace',
                            path: '/spec/targetImage/auth/password',
                            value: this.form.password,
                        },
                    ];
                    k8sproxy.patch('/apis/buildimage.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/buildimages/'+this.currentData.metadata.name, operation, {
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(()=>{
                        this.$message.success('操作成功');
                        this.closeDrawer(true);
                    });
                }else{
                    
                    this.currentData.spec.source.dockerfilePath = this.form.dockerfilePath;
                    this.currentData.spec.source.downloadUrl = this.form.downloadUrl;
                    this.currentData.spec.targetImage.address = this.form.address;
                    this.currentData.spec.targetImage.auth.username = this.form.username;
                    this.currentData.spec.targetImage.auth.password = this.form.password;
                    k8sproxy.post('/apis/buildimage.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/buildimages',this.currentData).then(res=>{
                        this.$message.success('操作成功')
                        this.closeDrawer(true);
                    });
                }
            });
        },
        createName(length){
            let len = length || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
    }
}
</script>
<style scoped>
</style>