<template>
    <a-drawer :width="900" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="$popupContainer">
        <template #title>Helm创建</template>
        <div class="mt-10">
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" auto-label-width class="app-formclass">
                <a-form-item label="">
                    <label class="helm-form-custom-label">
                        <input v-model="type" name="type" value="1" type="radio" />
                        <span class="cursor">Helm仓库</span>
                    </label>
                    <label class="helm-form-custom-label">
                        <input v-model="type" name="type" value="2" type="radio" />
                        <span class="cursor">Helm下载包</span>
                    </label>
                </a-form-item>

                <a-form-item v-if="type=='1'" label="Chart仓库" field="repo">
                    <a-input v-model="form.repo" type="text" :spellcheck="false" @blur="getYaml" placeholder="Helm Chart 仓库地址" />
                </a-form-item>

                <a-row v-if="type=='1'" :gutter="20" style="margin-bottom:10px;">
                    <a-col flex="auto">
                        <a-form-item label="Chart名称" field="chart">
                            <!-- <a-input v-model="form.chart" type="text" placeholder="Helm Chart 应用名称" /> -->
                            <a-auto-complete v-model="form.chart" :data="match.apps" placeholder="Helm Chart 应用名称" strict />
                            <template #help>
                                <div>如果版本号为空，将下载安装最新版本</div>
                            </template>
                        </a-form-item>
                    </a-col>
                    <a-col flex="300px">
                        <a-form-item label="" field="version" :hide-label="true">
                            <!-- <a-input v-model="form.version" type="text" placeholder="版本号" /> -->
                            <a-auto-complete v-model="form.version" :data="match.versions[form.chart] || []" placeholder="版本号" strict />
                        </a-form-item>
                    </a-col>
                </a-row>

                <a-form-item v-if="type=='2'" label="Chart包地址" field="chart">
                    <a-input v-model="form.chart" type="text" placeholder="指向图表存档 (.tgz) 的完整 HTTPS URL" />
                    <div class="upload ml-20">
                        <a-button :loading="upload.uploading" type="primary" ><icon-upload />{{upload.uploading? '上传中' : '上传'}}</a-button>
                        <input id="uploadfileinput" type="file" :disabled="upload.uploading" @change="selectFile" />
                    </div>
                </a-form-item>

                <a-form-item label="安装配置" field="set">
                    <table class="com-table ftable" ><tbody>
                        <tr class="thead"><td>键</td><td>值</td><td>操作</td></tr>
                        <tr><td colspan="3" style="box-sizing:border-box; cursor:pointer;" @click="form.set.push({key:'',value:''})">
                            <div class="df ai-c jc-c">
                                <icon-plus :size="14" class="c-99" />
                                <span class="c-99 lh-1" style="margin-left:6px;">添加配置</span>
                            </div>
                        </td></tr>
                        <tr v-for="(item,index) in form.set" :key="index">
                            <td>
                                <a-input v-model="item.key" size="large" style="width:200px;" placeholder="请输入" />
                            </td>
                            <td>
                                <a-input v-model="item.value" size="large" style="width:200px;" placeholder="请输入" />
                            </td>
                            <td>
                                <span v-if="!item.disabled" class="c-blue cursor" @click="form.set.splice(index,1);">删除</span>
                            </td>
                        </tr>
                    </tbody></table>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { panelApi } from '@/utils/api';

import { useNamespaceStore } from '@/store';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import jsyaml from "js-yaml";

export default {
    props: ['show'],
    data(){
        return {
            type: '1',
            namespaceActive: '',
            visible: false,
            form: {},
            rules: {
                repo: [{ required: true, message: '请输入图表库地址', trigger: 'blur' }],
                chart: [{ required: true, message: '请输入图表名称', trigger: 'blur' }],
                // version: [{ required: true, message: '请输入版本', trigger: 'blur' }],
                namespace: [{ required: true, message: '请输入命名空间', trigger: 'blur' }],
            },

            upload:{
                show: false,
                file: '',
                filenmae: '',
                uploading: false,
            },

            match: {
                apps: [],
                versions: {},
            }
        }
    },
    watch: {
        show(v){
            this.visible = v;
            if(!v){return}
            this.init();
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    methods: {
        init(){
            this.form = {
                repo: '',
                chart: '',
                version: '',
                set: [],
                valuesContent: '',
                namespace: this.namespaceActive,
                editor: null,
            }
        },
        getYaml(){
            if(!this.form.repo){return;}
            // /k8s/v1/https:project-hami.github.io:443/proxy/HAMi/index.yaml
            panelApi.get('/proxy-url/',{
                params: {proxyUrl:this.form.repo.replace(/\/$/,'')+'/index.yaml'},
                noAlert: true
            }).then(res=>{
                let data = {};
                try{
                    data = jsyaml.load(res.data);
                }catch{}
                this.match.apps = [];
                this.match.versions = {};
                this.match.icons = {};
                for(let i in data?.entries || {}){
                    let item = data.entries[i];
                    this.match.apps.push(i);
                    this.match.versions[i] = item.map(v=>v.version);
                    this.match.icons[i] = item?.[0]?.icon;
                }
            })
        },
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        },
        // input file 选择文件
        selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            if(files.length>1){this.$message.warning('请选择一个文件');return;}
            if(!/\.tgz$/.test(files[0].name)){this.$message.warning('上传文件必须为.tgz格式');return;}
            this.upload.file = files[0];
            this.upload.filename = files[0].name.replace(/\s/g,'');
            this.upload.uploading = false;
            
            let data = new FormData();
            data.append('file',this.upload.file);
            // data.append('X-Amz-Credential', 'AKIAIOSFODNN7EXAMPLE/20151229/us-east-1/s3/aws4_request');
            // data.append('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
            data.append('key', 'upload/helm/'+this.upload.filename);

            this.upload.uploading = true;
            axios.post('/s3bucket',data).then(res=>{
                this.upload.uploading = false;
                let host = window?.microApp?.getData()?.baseURL || window.location.origin;
                let url = host + '/panel-api/v1/download/upload/helm/' + this.upload.filename + '?api-token=' + getToken();
                this.form.chart = url;
            }).catch(()=>{this.upload.uploading = false;})
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }
                let kv = this.form.set.filter(i=>i.key&&i.value).map(i=>({name:i.key,value:i.value}));
                let obj = {
                    "identifie": this.type=='1'? this.form.chart : '',
                    "title":  this.type=='1'? this.form.chart : '',
                    "icon": this.match.icons?.[this.form.chart] || '',
                    "chartName": this.form.chart,
                    "repository": this.type=='1'? this.form.repo : '',
                    "kv": kv,
                    "version": this.type=='1'? this.form.version : '',
                    "description": "",
                };
                panelApi.post('/zpk/helm/memory',obj).then(res=>{
                    let zpkUrl = res.data?.zpkUrl;
                    if(zpkUrl){
                        this.$router.push(`/app/store-install?path=${encodeURIComponent(zpkUrl)}`)
                        this.closeDrawer();
                    }
                });
            })
        },
        // submit(){
        //     let setObj = {};
        //     this.form.set.filter(i=>i.key&&i.value).map(i=>{setObj[i.key] = i.value});
        //     let data = {
        //         apiVersion: 'helm.cattle.io/v1',
        //         kind: 'HelmChart',
        //         metadata: {
        //             name: this.createName(),
        //             namespace: 'kube-system',
        //         },
        //         spec: {
        //             repo: this.form.repo,
        //             chart: this.form.chart,
        //             targetNamespace: this.form.namespace,
        //             createNamespace: true,
        //             set: setObj,
        //         },
        //     }
        //     if(this.type=='1' && this.form.version){ data.spec.version = this.form.version; }
        //     this.$refs.form.validate((err)=>{
        //         if (err) {
        //             this.$refs.form.scrollToField(Object.keys(err)[0]);
        //             return;
        //         }
        //         k8sproxy.post('/apis/helm.cattle.io/v1/namespaces/kube-system/helmcharts/'+data.metadata.name, data).then(res=>{
        //             this.$message.success('操作成功');
        //             this.closeDrawer(true);
        //         });
        //     })
        // },
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
.helm-form-custom-label{margin-right:10px;}
.helm-form-custom-label input[type='radio']{display:none;}
.helm-form-custom-label input[type='radio']+span{padding:8px 20px; border:1px solid var(--color-border-2); border-radius: 4px;}
.helm-form-custom-label input[type='radio']:checked+span{color:rgb(var(--primary-6)); border-color:rgb(var(--primary-6)); background-color:var(--color-primary-light-1);}

.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

</style>