<template>

    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" @open="init()" unmountOnClose :popup-container="$popupContainer">
        <template #title>{{id?'修改配置文件':'添加配置文件'}}</template>
        <div class="mt-10 bg-white df jc-b">
            <a-form ref="form" :rules="rules" :model="form" validate-trigger="blur" auto-label-width class="padding-10">
                <a-form-item label="名称" field="name" >
                    <a-input type="text" :disabled="!!id" v-model="form.name" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item>

                <a-form-item v-if="type!='secret'" label="类型" field="type">
                    <a-select v-model="form.type" placeholder="请选择类型" @change="yamlData=formTodata()" :disabled="typeDisabled" size="large" style="width:500px;">
                        <a-option label="配置文件" value="file"></a-option>
                        <a-option label="环境变量" value="env"></a-option>
                    </a-select>
                </a-form-item>
                
                <a-form-item v-show="form.type=='file'" label="内容" field="value">
                    <div class="df df-c fc" style="width:100%;">
                        <div class="df ai-c jc-b">
                            <div class="df ai-c">
                                <div class="upfile df ai-c jc-c c-blue">
                                    <input type="file" class="fileinput" @change="upfile" />
                                    <icon-upload />
                                    <span>上传配置文件</span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-10">
                            <div id="editor_textarea" style="width:100%;"></div>
                        </div>
                    </div>
                </a-form-item>
                
                <a-form-item v-if="form.type=='env'" label="环境变量" prop="env">
                    <div>
                        <table class="com-table mt-10" style="width:800px;"><tbody>
                            <tr class="thead" ><td>键</td><td>值</td><td>操作</td></tr>
                            <tr><td colspan="3" style=" box-sizing:border-box; cursor:pointer;" @click="form.env.push({key:'',value:''})">
                                <div class="df ai-c jc-c">
                                    <icon-plus :size="14" class="c-99" />
                                    <span class="c-99 lh-1" style="margin-left:6px;">添加</span>
                                </div>
                            </td></tr>
                            <tr v-for="(item,index) in form.env" :key="index">
                                <td style="vertical-align:top;">
                                    <a-input v-model="item.key" @change="yamlData=formTodata()" @paste="envPaste($event,index)" size="large" style="width:200px;" placeholder="变量名" />
                                </td>
                                <td>
                                    <a-textarea v-model="item.value" @change="yamlData=formTodata()" size="large" style="width:400px;" placeholder="变量值" auto-size />
                                </td>
                                <td style="vertical-align:top;">
                                    <span class="c-blue cursor" @click="form.env.splice(index,1);yamlData=formTodata()">删除</span>
                                </td>
                            </tr>
                        </tbody></table>
                        <div class="fs-12 mt-10 df ai-c jc-b">
                            <span style="color:#bbbbbb;">变量名为空时，在变量名称中粘贴一行或多行 key=value 的键值对可以实现快速批量输入</span>
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import {basicSetup, EditorView} from "codemirror"
import { useNamespaceStore } from '@/store';

const dataTemplate = {}

export default {
    props: ['show','id','type'],
    data(){
        return {
            visible: false,
            namespaceActive: '',
            data: {},
            editor: null,
            form: {
                title: '',
                value: '',
                type: 'env',
                env: [],
            },
            rules: {
                name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                // value: [{ required: true, message: '请输入内容', trigger: 'blur' }],
            },
            yamlData: null,
        }
    },
    mounted(){
        // this.init();
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initPage();
    },
    // components: { yamlView },
    watch:{
        show(v){
            this.visible = v;
            this.initPage();
        },
        id: 'initPage',
    },
    methods: {
        closeDrawer(V){
            this.visible = false;
            this.$emit('close',V);
        },
        initPage(){
            if(this.id){
                this.getData();
            }else{
                this.form = {
                    name: '',
                    title: '',
                    value: '',
                    type: 'env',
                    env: [],
                }
                this.data = dataTemplate;
                this.yamlData = this.formTodata();
            }
        },
        getData(){
            let type = {configmap:'configmaps',secret:'secrets'}?.[this.type] || 'configmaps';
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/"+ type +"/"+ this.id,{loading:true}).then(res=>{
                let d = res?.data || {};
                this.data = d;
                let cont = "";
                let type = "env";
                let env = [];
                if(d.data && d.data['default-cnf']){
                    type = "file";
                    cont = d.data['default-cnf']
                }else if(d.data){
                    Object.keys(d.data).map(i=>{
                        env.push({
                            key:i,
                            value: this.type=='secret'? atob(d.data[i]) : d.data[i]
                        })
                    })
                }
                this.form = {
                    title: d.metadata?.annotations?.title,
                    name: d.metadata.name,
                    type: type,
                    value: cont,
                    env: env,
                }
                if(this.editor){
                    let txt = this.editor.state.doc.toString();
                    this.editor.dispatch({
                        changes: {from: 0, to:txt.length, insert:this.form.value}
                    });
                }
                this.yamlData = this.formTodata();
            })
        },
        formTodata(){
            let data = {};
            if(this.id){
                data = this.createConfig(JSON.parse(JSON.stringify(this.data)), this.form);
            }else{
                data = this.createConfig(null, this.form);
            }
            console.log(data)
            return data;
        },
        submit(){
            let type = {configmap:'configmaps',secret:'secrets'}?.[this.type] || 'configmaps';
            this.$refs.form.validate((err) => {
                if (err) {return;}
                let data = this.formTodata();
                if(this.id){
                    k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/"+ type +"/"+this.id, data,{loading:true}).then(res=>{
                        if(!res?.data){return}
                        this.$message.success("修改成功");
                        this.$emit('submit')
                        setTimeout(()=>{
                            this.closeDrawer(true);
                        },800)
                    })
                }else{
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/"+ type, data,{loading:true}).then(res=>{
                        if(!res?.data){return}
                        this.$message.success("创建成功");
                        this.$emit('submit')
                        setTimeout(()=>{
                            this.closeDrawer(true);
                        },800)
                    })
                }
            });
        },

        createConfig(config,form){
            let type = {configmap:'ConfigMap',secret:'Secret'}?.[this.type] || 'ConfigMap';
            let o = config || {
                apiVersion: 'v1',
                kind: type,
                metadata: {
                    name: '',
                    labels: {
                        type: 'file'
                    },
                    annotations: {
                        title: 'title',
                        type: 'file'
                    }
                },
                data: {}
            }
            o.metadata = o.metadata || {};
            o.metadata.name = this.form.name || this.createName();
            o.metadata.labels = {...o.metadata.labels, type:form.type}
            o.metadata.annotations = {...o.metadata.annotations, title:form.title, type:form.type};
            if(form.type == 'file'){
                o.data = {...o.data, 'default-cnf':form.value};
            }else{
                let obj = {};
                form.env.filter(i=>i.key&&i.value).map(i=>{
                    obj[i.key] = this.type=='secret'? btoa(i.value) : i.value;
                })
                o.data = obj;
            }
            return o
        },

        createName(){
            let len = 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
        
        // 上传配置文件
        upfile(file){
            var file = file.target.files[0];
            const reader = new FileReader();
            reader.onload = ()=>{
                this.form.value = reader.result;
                let txt = this.editor.state.doc.toString();
                this.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:reader.result}
                });
                this.yamlData = this.formTodata();
            };
            reader.readAsText(file);
        },

        onekeyCopy(text){
            var textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.style.position = 'fixed';
            textarea.style.clip = 'rect(0 0 0 0)';
            textarea.style.top = '10px';
            textarea.value = text;
            textarea.select();
            let copy = document.execCommand('copy', true);
            document.body.removeChild(textarea);
            if(copy){
                this.$message.success("复制成功");
            }else{
                this.$message.warning('复制失败，请手动复制');
            }
        },

        // 粘贴 环境变量
        envPaste(e,index){
            let value = e.clipboardData.getData('text/plain');
            if(!/^\s*(\S+\s?[=:]\s?\S+\s*)+$/.test(value)){return}
            e.preventDefault();
            let arr = value.match(/(\S+\s?[=:]\s?\S+)/g);
            let obj = [];
            for(let i=0; i<arr.length; i++){
                let o = arr[i];
                obj.push({
                    key:o.replace(/\s?[=:]\s?\S+/,''),
                    value:o.replace(/\S+\s?[=:]\s?/,''),
                });
            }
            this.form.env.splice(index,this.form.env.length-index,...obj);
        },
        
        init(){
            if(this.detail){return}
            const ivory = "#abb2bf",
                stone = "#7d8799", 
                darkBackground = "#21252b",
                highlightBackground = "#2c313a",
                background = "#282c34",
                tooltipBackground = "#353a42",
                selection = "#3E4451",
                cursor = "#528bff";

            let myTheme = EditorView.theme({
                "&": {
                    color: ivory,
                    backgroundColor: background,
                    // height: "300px"
                },
                ".cm-content": { caretColor: cursor },
                ".cm-cursor, .cm-dropCursor": {borderLeftColor: cursor},
                "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {backgroundColor: selection},

                ".cm-panels": {backgroundColor: darkBackground, color: ivory},
                ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
                ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},

                ".cm-searchMatch": { backgroundColor: "#72a1ff59", outline: "1px solid #457dff" },
                ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#6199ff2f" },

                ".cm-activeLine": {backgroundColor: highlightBackground},
                ".cm-selectionMatch": {backgroundColor: "#aafe661a"},

                "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bad0f847", outline: "1px solid #515a6b"},

                ".cm-gutters": { backgroundColor: background, color: stone, border: "none" },

                ".cm-activeLineGutter": { backgroundColor: highlightBackground },

                ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "#ddd" },

                ".cm-tooltip": { border: "none", backgroundColor: tooltipBackground },
                ".cm-tooltip .cm-tooltip-arrow:before": { borderTopColor: "transparent", borderBottomColor: "transparent" },
                ".cm-tooltip .cm-tooltip-arrow:after": { borderTopColor: tooltipBackground, borderBottomColor: tooltipBackground },
                ".cm-tooltip-autocomplete": {
                    "& > ul > li[aria-selected]": {
                        backgroundColor: highlightBackground,
                        color: ivory
                    }
                },
                // ".cm-scroller": {overflow: "auto"},
                ".cm-content, .cm-gutter": {minHeight: "300px"},
            }, {dark: true});
            
            this.editor = null;
            document.getElementById("editor_textarea").innerHTML = "";
            this.$nextTick(()=>{
                this.editor = new EditorView({
                    doc: "",
                    extensions: [
                        basicSetup,
                        myTheme,
                        // StreamLanguage.define(yaml), 
                        // keymap.of([indentWithTab]),
                        
                        EditorView.updateListener.of((v) => {
                            if (v.docChanged) {
                                setTimeout(()=>{
                                    this.yamlData = this.formTodata();
                                },100)
                            }
                        }),
                    ],
                    parent: document.getElementById("editor_textarea"),
                });
    
                var observe=new MutationObserver(()=>{
                    let txt = this.editor.state.doc.toString();
                    if(txt==this.form.value){return}
                    this.form.value = txt;
                });
                observe.observe(document.getElementById("editor_textarea"),{childList:true, characterData:true, subtree:true});
            }).then(res=>{
                let txt = this.editor.state.doc.toString();
                if(!txt && this.form.value){
                    this.editor.dispatch({
                        changes: {from: 0, insert:this.form.value}
                    });
                    let txt = this.editor.state.doc.toString();
                    this.form.value = txt;
                    
                    this.yamlData = this.formTodata();
                }
            })
        },
    },
}
</script>

<style scoped>

.upfile{position:relative; width:120px; box-sizing:border-box; height:32px; padding:5px; cursor:pointer;}
.upfile .fileinput{width:100%; min-width:100px; position:absolute; z-index:9; left:0; right:0; top:0; bottom:0; opacity:0; cursor:pointer;}
.upfile .fileinput::file-selector-button{display:none;}

.table{width:100%;}
.table td{padding:10px; box-sizing:border-box; min-height:50px; line-height:1.4; border:1px solid #f2f2f2; border-left:0; border-right:0;}
 /* background:#F0F3FA; */
.table tr:first-child td{background:#f3f3f3; border-top:0; color:#999;}
.table tr.bg-gray td{background:#f9f9f9;}
.table .viptab{font-size:12px; height:24px; line-height:24px; display:block; padding:0 6px; border-radius:3px; background-image: linear-gradient(to right, #72655c , #3d2d25); color:rgba(255,255,255,0.8); }

</style>