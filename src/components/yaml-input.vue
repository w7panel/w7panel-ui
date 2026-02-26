<template>
    <div :id="domid" class="bg-white yaml-input"></div>
</template>

<script>
import {basicSetup, EditorView} from "codemirror"
import { yaml } from "@codemirror/lang-yaml";

export default {
    props: ['domid', 'value'],
    emits: ['submit'],
    data(){
        return {
            editor: null,
            loading: false,
            txt: '',
            timeout: null,
        }
    },
    beforeUnmount(){
        window.removeEventListener('resize', this.resize);
        if(this.timeout){
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        if(this.editor){
            this.editor.destroy();
            this.editor = null;
        }
    },
    mounted(){
        this.txt = this.value || '';
        this.init();

        window.addEventListener('resize', this.resize);
    },
    watch: {
        value(val){
            this.txt = val;
            let tl = this.editor.state.doc.toString();
            this.editor.dispatch({ changes: {from: 0, to:tl.length, insert:val}});
        }
    },
    methods: {
        resize(){
            if(!this.editor){return}
            if(this.timeout){ clearTimeout(this.timeout); }
            this.timeout = setTimeout(()=>{
                this.timeout = null;
                this.editor = null;
                document.getElementById(this.domid).innerHTML = "";
                this.$nextTick(()=>{
                    this.init();
                })
            }, 300);
        },
        submit(){
            let txt = this.editor.state.doc.toString();
            this.txt = txt;
            this.$emit('submit', txt);
        },
        init(){
            let height = document.getElementById(this.domid).offsetHeight;
            // console.log(height)
            let myTheme = EditorView.theme({
                "&": {height: height-2 + "px"},
            }, {dark: false});
            
            document.getElementById(this.domid).innerHTML = "";
            this.editor = new EditorView({
                doc: "",
                extensions: [
                    basicSetup,
                    myTheme,
                    yaml(),
                    
                    EditorView.updateListener.of((v) => {
                        if (!v.docChanged) {return}
                        this.submit();
                    }),
                ],
                parent: document.getElementById(this.domid),
            });
            
            if(this.txt){
                let tl = this.editor.state.doc.toString();
                this.editor.dispatch({ changes: {from: 0, to:tl.length, insert:this.txt}});
            }
        },
    }
}
</script>

<style>
.yaml-input .cm-focused{outline:none!important;}
</style>