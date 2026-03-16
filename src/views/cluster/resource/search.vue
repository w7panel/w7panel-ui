<template>
    <div class="padding-20 df df-c" style="height:calc(100vh - 60px); overflow:auto;">
        <route-breadcrumb class="df-s0" />
        <div class="df df-c bg-white fc padding-20">
            <div class="df">
                <a-input v-model="path" placeholder="请输入请求地址" :spellcheck="false" style="width:500px;"></a-input>
                <a-button type="primary" class="ml-20" @click="toRequest()">确定</a-button>
            </div>
            <div class="mt-20 df df-c fc">
                <div id="json_editor" class="fc"></div>
                <div v-if="value" class="df mt-20">
                    <a-button type="primary" @click="submit">确定</a-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import {basicSetup} from "codemirror"
import {EditorView, } from "codemirror"
import axios from 'axios'
import { json } from "@codemirror/lang-json";

export default {
    data(){
        return {
            editor: null,
            path: '',
            targetPath: '',
            value: '',
        }
    },
    methods: {
        submit(){
            let value = this.getValue();
            let data = JSON.parse(value);
            
            if(/^\/api\/v1\//.test(this.targetPath)){
                return k8sproxy.put(this.targetPath, data).then(res=>{
                    if(!res?.data){return}
                    this.$message.success("修改成功");
                })
            }
            return panelApi.post('/yaml', data).then(res=>{
                if(!res?.data){return}
                this.$message.success("修改成功");
                this.path = this.targetPath;
                this.toRequest();
            })
        },
        toRequest(){
            if(!this.path){return}
            axios.get(this.path,{loading:true}).then(res=>{
                let data = res.data;
                this.value = JSON.stringify(data, null, 4);
                this.targetPath = this.path;
                this.init();
            })
        },
        getValue(){
            this.value = this.editor.state.doc.toString();
            return this.value;
        },
        init(){
            let height = document.getElementById('json_editor').offsetHeight - 54;
            
            let myTheme = EditorView.theme({
                "&": {
                    height: height + "px"
                },
            }, {dark: false});
            
            if(!this.editor){
                document.getElementById("json_editor").innerHTML = "";
                this.editor = new EditorView({
                    doc: "",
                    extensions: [
                        basicSetup,
                        myTheme,
                        json(),
                    ],
                    parent: document.getElementById("json_editor"),
                });

                var observe=new MutationObserver(()=>{
                    let txt = this.editor.state.doc.toString();
                    if(txt==this.value){return}
                    this.value = txt;
                });
                observe.observe(document.getElementById("json_editor"),{childList:true, characterData:true, subtree:true});
            }

            if(this.value){
                let tl = this.editor.state.doc.toString();
                this.editor.dispatch({ changes: {from: 0, to:tl.length, insert:this.value}});
            }
        },
    }
}
</script>

<style>

</style>