<template>
    <div style="padding:10px 20px;">
        <div class="df ai-c jc-b">
            <div class="df ai-c">
                <a-button v-if="!showEditYaml" type="primary" size="small" @click="initEditor();">编辑YAML</a-button>
                <a-button v-else size="small" type="outline" @click="setYaml()">取消</a-button>

                <a-button v-if="showEditYaml" type="primary" size="small" class="ml-20" @click="submit()">提交</a-button>
            </div>
            <div v-if="showEditYaml" class="upfile df ai-c jc-c c-blue">
                <input type="file" class="fileinput" @change="upfile" />
                <img src="@/assets/image/upload.png" class="icon" alt="" />
                <span>上传配置文件</span>
            </div>
        </div>
        <div class="mt-10">
            <div v-show="!showEditYaml" class="yamldom hljs df" v-html="yamlDom"></div>
            <div v-show="showEditYaml">
                <div id="editor_textarea" style="background:#fff;"></div>
                <div class="mt-20">
                    <a-button type="primary" @click="submit()">提交</a-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import hljs from 'highlight.js'
import jsyaml from "js-yaml"
import axios from "axios"

import {basicSetup, EditorView} from "codemirror"
import { yaml } from "@codemirror/lang-yaml";
import { keymap } from '@codemirror/view';

import { useNamespaceStore } from '@/store'

export default {
    props: ['data'],
    data(){
        return {
            // data: {},
            showEditYaml: false,
            yaml: '',
            editYaml: '',
            editor: null,
            yamlDom: '',
            namespaceActive: 'default',
        }
    },
    watch:{
        data(v,ov){
            this.setYaml();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.setYaml();
    },
    methods:{
        submit(){
            let txt = this.editor.state.doc.toString();
            
            let data = jsyaml.load(txt);
            delete data.metadata.resourceVersion
            delete data.metadata.uid
            delete data.metadata.creationTimestamp
            
            k8sproxy.put("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, data,{loading:true}).then(async res=>{
                if(!res.data){return;}
                this.$message.success("修改成功");
                setTimeout(()=>{
                    this.$emit('refresh');
                },1000);
            })
        },
        initEditor(){
            this.showEditYaml = true;
            this.editYaml = this.yaml;
            this.$nextTick(()=>{
                if(!this.editor){
                    document.getElementById("editor_textarea").innerHTML = "";
                    this.editor = new EditorView({
                        doc: "",
                        extensions: [
                            basicSetup,
                            yaml(),
                            this.createTabKeymap(),
                        ],
                        parent: document.getElementById("editor_textarea"),
                    });
    
                    var observe=new MutationObserver(()=>{
                        let txt = this.editor.state.doc.toString();
                        if(txt==this.editYaml){return}
                        this.editYaml = txt;
                    });
                    observe.observe(document.getElementById("editor_textarea"),{childList:true, characterData:true, subtree:true});
                }

                if(this.editYaml){
                    let txt = this.editor.state.doc.toString();
                    this.editor.dispatch({
                        changes: {from: 0, to:txt?.length||0, insert:this.editYaml}
                    });
                }
            })
        },
        setYaml(){
            this.showEditYaml = false;
            if(!this.data){return}
            let data = JSON.parse(JSON.stringify(this.data));
            if(data.metadata?.managedFields){
                delete data.metadata?.managedFields;
            }
            this.yaml = jsyaml.dump(data, { indent: 4 });
            this.yamlDom = hljs.highlight(this.yaml, {language: 'yaml'}).value;
            let len = this.yamlDom.split(/\r?\n/).map((i,id)=>`<div>${id+1}</div>`).join('');
            this.yamlDom = `<div class="gutters">${len}</div><pre class='pre fc'><code class='language-yaml'>${this.yamlDom}</code></pre>`;
        },
        // 上传配置文件
        upfile(file){
            var file = file.target.files[0];
            const reader = new FileReader();
            reader.onload = ()=>{
                this.editYaml = reader.result;
                let txt = this.editor.state.doc.toString();
                this.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:reader.result}
                });
            };
            reader.readAsText(file);
        },
        // 定义Tab键扩展
        createTabKeymap(){
            const INDENT_SPACES = '  ';
            const INDENT_LEN = 2;
            return keymap.of([
                // 1. Tab键：单行插入缩进+光标后移 | 多行缩进+光标移到最后一行末尾
                {
                key: 'Tab',
                run: (view) => {
                    const { state, dispatch } = view;
                    const { selection } = state;

                    // 场景1：无选中（单行）
                    if (selection.main.empty) {
                    const currentPos = selection.main.from;
                    dispatch({
                        // 插入缩进内容
                        changes: { from: currentPos, to: currentPos, insert: INDENT_SPACES },
                        // 光标后移缩进长度
                        selection: {
                        anchor: currentPos + INDENT_LEN,
                        head: currentPos + INDENT_LEN
                        }
                    });
                    return true;
                    }

                    // 场景2：有选中（多行）
                    const ranges = selection.ranges;
                    const changes = [];
                    let lastLineEnd = 0; // 记录最后一行的结束位置

                    ranges.forEach(range => {
                    const startLine = state.doc.lineAt(range.from);
                    const endLine = state.doc.lineAt(range.to);
                    lastLineEnd = endLine.to; // 更新最后一行位置

                    // 遍历选中的每一行，在行首插入缩进
                    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
                        const line = state.doc.line(lineNum);
                        changes.push({ from: line.from, insert: INDENT_SPACES });
                    }
                    });

                    dispatch({
                    changes,
                    // 光标移到最后一行缩进后的位置
                    selection: {
                        anchor: lastLineEnd + INDENT_LEN,
                        head: lastLineEnd + INDENT_LEN
                    }
                    });
                    return true;
                },
                preventDefault: true // 阻止浏览器默认Tab行为（焦点切换）
                },

                // 2. Shift+Tab键：单行取消缩进+光标前移 | 多行取消缩进+光标移到最后一行末尾
                {
                key: 'Shift-Tab',
                run: (view) => {
                    const { state, dispatch } = view;
                    const { selection } = state;

                    // 场景1：无选中（单行）
                    if (selection.main.empty) {
                    const currentPos = selection.main.from;
                    const line = state.doc.lineAt(currentPos);
                    const lineStart = line.from;
                    const lineText = line.text.slice(0, currentPos - lineStart);

                    // 检查行首是否有缩进可取消
                    if (lineText.startsWith(INDENT_SPACES)) {
                        dispatch({
                        // 删除行首的缩进
                        changes: { from: lineStart, to: lineStart + INDENT_LEN },
                        // 光标前移缩进长度（若光标在缩进后，否则移到行首）
                        selection: {
                            anchor: Math.max(currentPos - INDENT_LEN, lineStart),
                            head: Math.max(currentPos - INDENT_LEN, lineStart)
                        }
                        });
                        return true;
                    }
                    return false; // 无缩进可取消，不阻止默认行为
                    }

                    // 场景2：有选中（多行）
                    const ranges = selection.ranges;
                    const changes = [];
                    let lastLineEnd = 0;

                    ranges.forEach(range => {
                    const startLine = state.doc.lineAt(range.from);
                    const endLine = state.doc.lineAt(range.to);
                    lastLineEnd = endLine.to;

                    // 遍历选中的每一行，删除行首的缩进（若有）
                    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
                        const line = state.doc.line(lineNum);
                        // 仅当行首有缩进时删除
                        if (line.text.startsWith(INDENT_SPACES)) {
                        changes.push({ from: line.from, to: line.from + INDENT_LEN });
                        }
                    }
                    });

                    // 有缩进可删除时才执行dispatch
                    if (changes.length > 0) {
                    dispatch({
                        changes,
                        // 光标移到最后一行取消缩进后的位置
                        selection: {
                        anchor: Math.max(lastLineEnd - INDENT_LEN, state.doc.lineAt(lastLineEnd).from),
                        head: Math.max(lastLineEnd - INDENT_LEN, state.doc.lineAt(lastLineEnd).from)
                        }
                    });
                    return true;
                    }
                    return false;
                },
                preventDefault: true
                }
            ]);
        }
    }

}
</script>

<style scoped>
.upfile{position:relative; width:120px; box-sizing:border-box; height:32px; padding:5px; cursor:pointer;}
.upfile .fileinput{width:100%; min-width:100px; position:absolute; z-index:9; left:0; right:0; top:0; bottom:0; opacity:0; cursor:pointer;}
.upfile .fileinput::file-selector-button{display:none;}
.upfile .icon{width:16px; height:16px; margin-right:6px; border-radius:0;}
</style>

<style>

.yamldom{line-height:24px; overflow-x:auto; border:1px solid #ddd;}
.yamldom .gutters{
    position:sticky;
    left:0;
    font-size:12px;
    line-height:24px;
    border-right: 1px solid #ddd;
    padding:0 10px 0 10px;
    margin-right:10px;
    text-align:right;

    /* background-color:#f5f5f5;
    color:#6c6c6c; */
    background-color:#282c34;
    color:#abb2bf;
}
.yamldom pre{margin:0;}
</style>