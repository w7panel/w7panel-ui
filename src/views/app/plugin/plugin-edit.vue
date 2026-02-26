<template>
    <a-drawer :width="1000" :visible="visible" @ok="formSubmit" @cancel="closeDrawer" @open="editorInit" :popup-container="false?'#allmodalbox':'body'">
        <template #title>{{form.name?'修改插件':'添加插件'}}</template>
        <a-form ref="form" class="pluginform" :model="form" :rules="rules" layout="vertical" validate-trigger="blur" auto-label-width>
            <div class="fs-16 b">基础信息</div>
            <a-divider class="mt-4" />
            <div style="padding:0 16px;">
                <a-form-item label="插件名称" field="title">
                    <a-input v-model="form.title" :spellcheck="false" placeholder="包含大小写字母，数字以及特殊字符（-.），且不能以特殊字符开头或结尾" />
                </a-form-item>
                <a-form-item label="插件描述" field="description">
                    <a-textarea v-model="form.description" :spellcheck="false" placeholder="请输入插件描述" style="height:60px;" />
                </a-form-item>
                <a-form-item label="镜像地址" field="image">
                    <template #label>
                        <span>镜像地址</span>                        
                        <a-tooltip content="请输入镜像地址，例如：higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/request-block:1.0.0">
                            <icon-question-circle class="c-99 fs-14 cursor ml-4" />
                        </a-tooltip>
                    </template>
                    <a-input v-model="form.image" :spellcheck="false" placeholder="请输入镜像地址，例如：higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/request-block:1.0.0" />
                </a-form-item>
                <a-form-item label="插件执行阶段" field="phase">
                    <a-select v-model="form.phase" placeholder="执行阶段先后顺序：认证>鉴权>统计>默认">
                        <a-option label="默认阶段" value="UNSPECIFIED_PHASE"></a-option>
                        <a-option label="认证阶段" value="AUTHN"></a-option>
                        <a-option label="鉴权阶段" value="AUTHZ"></a-option>
                        <a-option label="统计阶段" value="STATS"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="插件执行优先级" field="priority">
                    <a-input v-model="form.priority" type="number" :spellcheck="false" placeholder="范围1~1000，值越大越优先" />
                </a-form-item>
            </div>
            <div class="fs-16 b mt-10">全局信息</div>
            <a-divider class="mt-4" />
            <div style="padding:0 16px;">
                <a-form-item label="开启" class="novertical-item">
                    <a-switch v-model="form.disabled" @change="form.switch" :checked-value="false" :unchecked-value="true" />
                </a-form-item>
                <a-form-item label="配置" field="yaml" class="novertical-item">
                    <div id="pluginyamlbox" style="flex:1;"></div>
                </a-form-item>
            </div>
        </a-form>
        <div class="c-99 ml-20">注意：以上配置将会在所有域名和路由上生效。请谨慎配置</div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import {basicSetup, EditorView} from "codemirror";
import { yaml } from "@codemirror/lang-yaml";
import jsyaml from "js-yaml";

let templageYaml = ``;
let myTheme = EditorView.theme({"&": { height: "300px"}}, {dark: false});

export default {
    props: ['show','id'],
    data(){
        return {
            visible: false,
            data: null,
            form: {},
            rules: {
                title: [{ required: true, message: '请输入标题'}],
                // description: [{ required: true, message: '请输入'}],
                phase: [{ required: true, message: '请选择执行阶段'}],
                image: [{ required: true, message: '请输入镜像仓库'}],
                priority: [{ required: true, message: '请输入优先级'}],
                // yaml: [{ required: true, message: '请输入配置'}],
            },
        }
    },
    created(){
        if(this.id){this.getData();}
    },
    watch:{
        show(v){
            this.visible = v;
            if(!v){return}
            this.getData();
        }
    },
    methods: {
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        getData(){
            if(this.id){
                k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+this.id).then(res=>{
                    let data = res?.data;
                    this.data = data;

                    let yaml = '';
                    try{
                        yaml = jsyaml.dump(data?.spec?.defaultConfig);
                    }catch{}
                    this.form = {
                        ...this.form,
                        name: data.metadata.name,
                        title: data.metadata?.annotations?.['higress.io/wasm-plugin-title'] || data.metadata.name,
                        description: data.metadata?.annotations?.['higress.io/wasm-plugin-description'] || '',
                        image: data.spec?.url || '',
                        priority: data?.spec?.priority || '',
                        disabled: data?.spec?.defaultConfigDisable===false? false : true,
                        phase: data?.spec?.phase,
                        yaml: yaml,
                    }
                    if(this.form.editor){
                        let txt = this.form.editor.state.doc.toString();
                        this.form.editor.dispatch({
                            changes: {from:0, to:txt.length, insert:this.form.yaml || ''}
                        });
                        this.form.switch(this.form.disabled);
                    }
                })
            }else{
                this.form = {
                    ...this.form,
                    name: '',
                    title: '',
                    image: '',
                    disabled: true,
                    description: '',
                    priority: '',
                    phase: '',
                    yaml: templageYaml,
                }
                if(this.form.editor){
                    let txt = this.form.editor.state.doc.toString();
                    this.form.editor.dispatch({
                        changes: {from:0, to:txt.length, insert:this.form.yaml || ''}
                    });
                    this.form.switch(this.form.disabled);
                }
            }
        },
        editorInit(){
            this.$nextTick(()=>{
                if(!this.form.editor){
                    this.form.editor = new EditorView({
                        doc: "",
                        extensions: [
                            basicSetup,
                            myTheme,
                            yaml(),
                            EditorView.editable.of(!this.form.disabled),
                        ],
                        parent: document.getElementById("pluginyamlbox"),
                    });
                }
                let txt = this.form.editor.state.doc.toString();
                this.form.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:this.form.yaml || ''}
                });
                
            });
            
            this.form.switch = (v)=>{
                if(!this.form.editor){return}
                this.form.editor.destroy();  // 销毁旧的编辑器实例
                // 创建新的编辑器实例
                let txt = this.form.editor.state.doc.toString();
                this.form.editor = new EditorView({
                    doc: txt,
                    extensions: [
                        basicSetup,
                        myTheme,
                        yaml(),
                        EditorView.editable.of(!v),
                    ],
                    parent: document.getElementById('pluginyamlbox'),
                });
            }
        },
        formToData(){
            this.form.yaml = this.form.editor.state.doc.toString();
            let data = null;
            if(this.form.name){
                data = JSON.parse(JSON.stringify(this.data));

                data.metadata.annotations = data.metadata?.annotations || {};
                data.metadata.annotations['higress.io/wasm-plugin-description'] = this.form.description;
                data.metadata.annotations['higress.io/wasm-plugin-title'] = this.form.title;

                data.spec = data?.spec || {};
                data.spec.defaultConfigDisable = this.form.disabled;
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
                        name: this.createName(6),
                    },
                    spec: {
                        defaultConfig: {},
                        defaultConfigDisable: this.form.disabled,
                        failStrategy: 'FAIL_OPEN',
                        phase: 'AUTHZ',
                        priority: Number(this.form.priority),
                        url: this.form.image,
                    }
                }
            }
            try{
                data.spec.defaultConfig = jsyaml.load(this.form.yaml);
                // data.spec.defaultConfig['rewrite_host'] = 'cdn.w7.cc';
            }catch{}
            return data;
        },
        formSubmit(){
            this.$refs.form.validate(err=>{
                if(err){
                    this.$refs.form.scrollToField(Object.keys(err)[0]);
                    return
                }
                let data = this.formToData();
                if(this.form.name){
                    k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+this.form.name, data).then(res=>{
                        this.$message.success("操作成功");
                        this.closeDrawer(true);
                    });
                }else{
                    k8sproxy.post('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins', data).then(res=>{
                        this.$message.success("操作成功");
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

<style>
.pluginform .novertical-item{display:flex;}
.pluginform .novertical-item .arco-form-item-label-col{margin-bottom:0;}
.pluginform .novertical-item .arco-form-item-label{height:32px; line-height:32px; width:60px; text-align:right; padding-right:20px;}

</style>