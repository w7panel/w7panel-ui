<template>
    <a-drawer :width="800" :visible="visible" @ok="submit" @cancel="closeDrawer()" >
        <template #title>构建镜像</template>
        <div>
            <a-form ref="form" :model="form" :rules="rules" auto-label-width>
                <a-form-item label="代码包" field="downloadUrl">
                    <a-input v-model="form.downloadUrl" placeholder="请输入"></a-input>
                    
                    <div class="upload ml-10">
                        <!-- <span v-if="form.filename" class="c-blue">{{form.filename}}</span> -->
                        <a-button type="primary">上传</a-button>
                        <input ref="buildImageFileInput" type="file" accept="" @change="selectFile" />
                    </div>
                </a-form-item>

                <!-- <a-form-item label="构建目录" field="dockerContext">
                    <a-input v-model="form.dockerContext" placeholder="请输入构建目录"></a-input>
                </a-form-item> -->
                
                <a-form-item label="构建目录" field="dockerfilePath">
                    <a-input v-model="form.dockerfilePath" placeholder="请输入"></a-input>
                </a-form-item>
                
                <a-form-item label="镜像地址" field="address">
                    
                    <a-input v-model="form.namespace" placeholder="namespace">
                        <template #prepend>{{preAddress}}</template>
                        <template #suffix>/</template>
                    </a-input>
                    <a-input v-model="form.address" style="width:240px;flex-shrink:0;" placeholder="镜像名称 : 版本" />

                </a-form-item>
                <!-- <a-form-item label="用户名">
                    <a-input v-model="form.username" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="密码">
                    <a-input v-model="form.password" placeholder="请输入"></a-input>
                </a-form-item> -->
            </a-form>
        </div>
    </a-drawer>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import {useLoadingStore, useNamespaceStore} from "@/store";
import { getToken } from '@/utils/auth';

let templateData = {
    apiVersion: "buildimage.w7.cc/v1alpha1",
    kind: "BuildImage",
    metadata: {
        name: "",
        namespace: "default",
        labels: {
            "w7.cc/node": "",
            "w7.cc/build-finish": "false",
            "w7.cc/build-from": "image-manager",
        },
        annotations:{
            "w7.cc/node-ip": ""
        }
    },
    spec: {
        taskId: "",
        namespace: "default",
        source: {
            dockerfilePath: "Dockerfile",
            downloadUrl: "",
            dockerContext: "./",
        },
        targetImage: {
            address: "",
            auth: {
                username: "w7panel",
                password: "w7panel"
            }
        }
    }
}

export default{
    props: ['show','data','nodeName','nodeIp'],
    data(){
        return {
            namespaceActive: '',
            visible: false,
            currentData: {},

            preAddress: 'registry.local.w7.cc/',
            form: {},
            upload: {},
            outEditorInfo: {
                agentUrl: '',
            },
            partPath: '',

            rules: {
                dockerfilePath: [{ required: true, message: '请输入构建目录' }],
                downloadUrl: [{ required: true, message: '请输入构建源' }],
                address: [{ required: true, message: '请输入镜像地址' }],
                dockerContext: [{ required: true, message: '请输入构建目录' }],
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
            this.upload.file = null;
            this.upload.filename = '';
            this.upload.noAlert = true;
            this.form.filename = '';
            this.form.pid = '';
            this.form.subPid = '';
            // 清空input
            this.$nextTick(()=>{
                this.$refs.buildImageFileInput.value = '';
            })

            if(this.data){
                this.currentData = JSON.parse(JSON.stringify(this.data));
            }else{
                this.currentData = JSON.parse(JSON.stringify(templateData));
                this.currentData.metadata.name = 'buildimage-' + this.createName();
                this.currentData.metadata.annotations['w7.cc/node-ip'] = this.nodeIp || '';
                this.currentData.metadata.labels['w7.cc/node'] = this.nodeName || '';
                this.currentData.spec.taskId = this.currentData.metadata.name;
                this.currentData.metadata.namespace = this.namespaceActive;
                this.currentData.spec.namespace = this.namespaceActive;
            }
            // console.log(this.currentData)
            this.dataToForm();
        },
        dataToForm(){
            this.form = {
                ...this.form,
                dockerfilePath: this.currentData?.spec?.source?.dockerfilePath || '',
                downloadUrl: this.currentData?.spec?.source?.downloadUrl || '',
                namespace: this.currentData?.spec?.targetImage?.address?.match?.(/^registry\.local\.w7\.cc\/(.*?)\//)?.[1] || this.namespaceActive,
                address: this.currentData?.spec?.targetImage?.address?.replace?.(/^registry\.local\.w7\.cc\/([^\/]+\/)?/,'') || `build:${this.createName()}`,
                username: this.currentData?.spec?.targetImage?.auth?.username || '',
                password: this.currentData?.spec?.targetImage?.auth?.password || '',
                dockerContext: this.currentData?.spec?.source?.dockerContext || './',
            }
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        
        async selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            this.upload.file = files[0];
            this.upload.filename = files[0].name.replace(/\s/g,'');
            this.form.filename = files[0].name.replace(/\s/g,'');

            useLoadingStore().loading = true;
            try{
                const { handleFileUpload } = await import('@/views/app/pages/files.upload.js');
                await handleFileUpload(this);
                
                this.form.downloadUrl = `${window.location.origin}/panel-api/v1/download/${this.upload.filename}?api-token=${getToken()}`

                useLoadingStore().loading = false;
            }catch(err){
                useLoadingStore().loading = false;
                this.$message.error('导入失败');
                console.log(err);
            }
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
                            path: '/spec/source/dockerContext',
                            value: this.form.dockerContext,
                        },
                        {
                            op: 'replace',
                            path: '/spec/targetImage/address',
                            value: this.preAddress + this.form.namespace + '/' + this.form.address,
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
                        this.closeDrawer({
                            ...this.form,
                            address: this.preAddress + this.form.namespace + '/' + this.form.address,
                        });
                    });
                }else{
                    
                    this.currentData.spec.source.dockerfilePath = this.form.dockerfilePath;
                    this.currentData.spec.source.downloadUrl = this.form.downloadUrl;
                    this.currentData.spec.source.dockerContext = this.form.dockerContext;
                    this.currentData.spec.targetImage.address = this.preAddress + this.form.namespace + '/' + this.form.address;
                    this.currentData.spec.targetImage.auth.username = this.form.username;
                    this.currentData.spec.targetImage.auth.password = this.form.password;
                    
                    k8sproxy.post('/apis/buildimage.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/buildimages',this.currentData).then(res=>{
                        this.$message.success('操作成功')
                        this.closeDrawer({
                            ...this.form,
                            address: this.preAddress + this.form.namespace + '/' + this.form.address,
                        });
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

.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

</style>