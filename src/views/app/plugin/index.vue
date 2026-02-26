<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新增</a-button>
            <a-button type="primary" @click="openNewForm()" class="ml-20"><template #icon><icon-plus /></template>微擎代理</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <a-table :data="list" :bordered="false" :pagination="false" class="cptable">
                <template #columns>
                    <a-table-column title="名称">
                        <template #cell="{ record }">{{record.title}}</template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="编辑">
                                <i class="opt-icon" @click="openForm(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm :content="'确认要删除吗'" @ok="toDelete(record)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <a-drawer :width="800" :visible="form.show" @ok="submit" @cancel="form.show=false;" @open="editorInit" :popup-container="false?'#allmodalbox':'body'">
            <template #title>{{form.name?'修改插件':'添加插件'}}</template>
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" auto-label-width >
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" :disabled="form.edit" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
                <a-form-item label="镜像地址" field="image">
                    <a-input v-model="form.image" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
                <a-form-item label="配置内容" field="yaml">
                    <div id="pluginyamlbox" style="flex:1;"></div>
                </a-form-item>
                <a-form-item label="描述" field="description">
                    <a-textarea v-model="form.description" :spellcheck="false" placeholder="请输入" style="height:100px;" />
                </a-form-item>
                <a-form-item label="优先级" field="priority">
                    <a-input v-model="form.priority" type="number" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
            </a-form>
        </a-drawer>
        <a-drawer :width="800" :visible="newForm.show" @ok="newSubmit" @cancel="newForm.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>添加插件</template>
            <a-form ref="newform" :model="newForm" :rules="rules" validate-trigger="blur" auto-label-width >
                <a-form-item label="名称" field="title">
                    <a-input v-model="newForm.title" :disabled="form.edit" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
                <a-form-item label="镜像地址" field="image">
                    <a-input v-model="newForm.image" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
                <a-form-item label="access_key">
                    <a-input v-model="newForm.access_key" :spellcheck="false" placeholder="请输入" />
                    <template #extra>s3 access_key</template>
                </a-form-item>
                <a-form-item label="secret_key">
                    <a-input v-model="newForm.secret_key" :spellcheck="false" placeholder="请输入" />
                    <template #extra>s3 secret_key</template>
                </a-form-item>
                <a-form-item label="bucket">
                    <a-input v-model="newForm.bucket" :spellcheck="false" placeholder="请输入" />
                    <template #extra>s3 bucket</template>
                </a-form-item>
                <a-form-item label="host">
                    <a-input v-model="newForm.host" :spellcheck="false" placeholder="请输入" />
                    <template #extra>s3的host地址必须为集群应用内网地址</template>
                </a-form-item>
                <a-form-item label="地区">
                    <a-input v-model="newForm.region" :spellcheck="false" placeholder="请输入" />
                    <template #extra>地区</template>
                </a-form-item>
                <a-form-item label="缓存header">
                    <a-switch v-model="newForm.cache_header" />
                    <template #extra>是否缓存header</template>
                </a-form-item>
                <a-form-item label="过期时间">
                    <a-input v-model="newForm.cache_ttl" type="number" :spellcheck="false" placeholder="请输入">
                        <template #suffix>秒</template>
                    </a-input>
                    <template #extra>0为不过期，默认300秒</template>
                </a-form-item>
                <a-form-item label="描述" field="description">
                    <a-textarea v-model="newForm.description" :spellcheck="false" placeholder="请输入" style="height:100px;" />
                </a-form-item>
                <a-form-item label="优先级" field="priority">
                    <a-input v-model="newForm.priority" type="number" :spellcheck="false" placeholder="请输入" />
                </a-form-item>
            </a-form>
        </a-drawer>
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import {basicSetup, EditorView} from "codemirror";
import { yaml } from "@codemirror/lang-yaml";
import yamlDrawer from '@/components/yaml-drawer.vue';
import jsyaml from "js-yaml";
import { getUserInfo } from '@/utils/auth';

let templageYaml = `access_key: "" # s3 access_key
secret_key: "" # s3 secret_key
bucket: "" # s3bucket
host: "" # s3的host地址必须为集群应用内网地址
region: ""  # s3 地区
cache_header: false # 是否缓存header
cache_ttl: 300 # 0为不过期，默认300秒`

export default {
    data(){
        return {
            namespaceActive: '',
            list: [],
            form: {
                show: false,
                name: '',
                title: '',
                description: '',
                image: '',
                priority: '',
                yaml: templageYaml,
                editor: null,
            },
            newForm: {},
            rules: {
                title: [{ required: true, message: '请输入'}],
                description: [{ required: true, message: '请输入'}],
                image: [{ required: true, message: '请输入'}],
                priority: [{ required: true, message: '请输入'}],
                yaml: [{ required: true, message: '请输入'}],
            },
            yamlData: {},
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: { yamlDrawer },
    methods: {
        getList(){
            k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins').then(res=>{
                let list = res?.data?.items || [];
                this.datas = list;
                this.list = list.map(i=>{
                    let dc = i.spec?.defaultConfig;
                    try{
                        dc = JSON.parse(JSON.stringify(dc));
                        delete dc.rewrite_host;
                    }catch{}
                    return {
                        name: i.metadata.name,
                        title: i.metadata?.annotations?.['higress.io/wasm-plugin-title'],
                        description: i.metadata?.annotations?.['higress.io/wasm-plugin-description'],
                        image: i.spec?.url,
                        priority: i.spec?.priority,
                        yaml: jsyaml.dump(dc),
                    }
                })
            })
        },
        toDelete(row){
            k8sproxy.delete('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        openNewForm(){
            this.newForm = {
                show: true,
                name: '',
                title: '微擎代理',
                description: '',
                image: 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/waf:latest',
                priority: '',
                access_key: "",
                secret_key: "",
                bucket: "",
                host: "",
                region: "",
                cache_header: false,
                cache_ttl: 300,
            }
        },
        openForm(row){
            if(row){
                this.form = {
                    ...this.form,
                    name: row.name,
                    title: row.title || '',
                    description: row.description || '',
                    image: row.image || '',
                    priority: row.priority || '',
                    yaml: row.yaml || '',
                }
            }else{
                this.form = {
                    ...this.form,
                    name: '',
                    title: '',
                    description: '',
                    image: '',
                    priority: '',
                    yaml: templageYaml,
                }
            }
            this.form.show = true;
        },
        formToData(){
            let data = null;
            if(this.form.name){
                let find = this.datas.find(i=>i.metadata.name==this.form.name);
                data = JSON.parse(JSON.stringify(find));

                data.metadata.annotations = data.metadata?.annotations || {};
                data.metadata.annotations['higress.io/wasm-plugin-description'] = this.form.description;
                data.metadata.annotations['higress.io/wasm-plugin-title'] = this.form.title;

                data.spec = data?.spec || {};
                data.spec.priority = Number(this.form.priority);
                data.spec.url = this.form.image;
            }else{
                data = {
                    apiVersion: 'extensions.higress.io/v1alpha1',
                    kind: 'WasmPlugin',
                    metadata: {
                        annotations: {
                            'higress.io/wasm-plugin-description': this.form.description,
                            'higress.io/wasm-plugin-title': this.form.title,
                        },
                        name: this.createName(),
                    },
                    spec: {
                        defaultConfig: {},
                        defaultConfigDisable: true,
                        failStrategy: 'FAIL_OPEN',
                        phase: 'AUTHZ',
                        priority: Number(this.form.priority),
                        url: this.form.image,
                    }
                }
            }
            try{
                data.spec.defaultConfig = jsyaml.load(this.form.yaml);
                data.spec.defaultConfig['rewrite_host'] = 'cdn.w7.cc';
            }catch{}
            return data;
        },
        newSubmit(){
            this.$refs.newform.validate(err=>{
                if(err){return}
                let data = {
                    apiVersion: 'extensions.higress.io/v1alpha1',
                    kind: 'WasmPlugin',
                    metadata: {
                        annotations: {
                            'higress.io/wasm-plugin-description': this.newForm.description,
                            'higress.io/wasm-plugin-title': this.newForm.title,
                        },
                        name: this.createName(),
                    },
                    spec: {
                        defaultConfig: {
                            access_key: this.newForm.access_key,
                            secret_key: this.newForm.secret_key,
                            bucket: this.newForm.bucket,
                            host: this.newForm.host,
                            region: this.newForm.region,
                            cache_header: this.newForm.cache_header,
                            cache_ttl: Number(this.newForm.cache_ttl),
                            rewrite_host: 'cdn.w7.cc',
                        },
                        defaultConfigDisable: true,
                        failStrategy: 'FAIL_OPEN',
                        phase: 'AUTHZ',
                        priority: Number(this.newForm.priority),
                        url: this.newForm.image,
                    }
                }
                
                k8sproxy.post('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins', data).then(res=>{
                    this.$message.success("修改成功");
                    this.newForm.show = false;
                    this.getList();
                });
            })
        },
        submit(){
            this.form.yaml = this.form.editor.state.doc.toString();
            this.$refs.form.validate(err=>{
                if(err){return}
                let data = this.formToData();
                if(this.form.name){
                    k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+this.form.name, data).then(res=>{
                        this.$message.success("修改成功");
                        this.form.show = false;
                        this.getList();
                    });
                }else{
                    k8sproxy.post('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins', data).then(res=>{
                        this.$message.success("修改成功");
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        openYaml(row){
            k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+row.name).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        });
                    }
                }
            });
        },
        editorInit(){
            this.$nextTick(()=>{
                if(!this.form.editor){
                    let myTheme = EditorView.theme({
                        "&": { height: "300px"},
                    }, {dark: false});
                    this.form.editor = new EditorView({
                        doc: "",
                        extensions: [basicSetup, myTheme, yaml()],
                        parent: document.getElementById("pluginyamlbox"),
                    });
                }
                let txt = this.form.editor.state.doc.toString();
                this.form.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:this.form.yaml || ''}
                });
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
    },
}
</script>

<style>

</style>