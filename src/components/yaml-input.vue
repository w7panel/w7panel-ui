<template>
    <div :id="domid" class="bg-white yaml-input" :class="{'yaml-input--readonly':readonly}"></div>
</template>

<script>
import {basicSetup, EditorView} from "codemirror"
import { yaml } from "@codemirror/lang-yaml";

export default {
    props: {
        domid: { type: String, required: true },
        value: { type: String, default: '' },
        readonly: { type: Boolean, default: false },
    },
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
            this.txt = val || '';
            if(!this.editor){ return; }
            let tl = this.editor.state.doc.toString();
            if(tl === this.txt){ return; }
            this.editor.dispatch({ changes: {from: 0, to:tl.length, insert:this.txt}});
        }
    },
    methods: {
        resize(){
            if(!this.editor){return}
            if(this.timeout){ clearTimeout(this.timeout); }
            this.timeout = setTimeout(()=>{
                this.timeout = null;
                if(!this.editor){ return; }
                this.editor.destroy();
                this.editor = null;
                const element = document.getElementById(this.domid);
                if(!element){ return; }
                element.innerHTML = "";
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
            const element = document.getElementById(this.domid);
            if(!element){ return; }
            let height = element.offsetHeight;
            // console.log(height)
            let myTheme = EditorView.theme({
                "&": {height: height-2 + "px"},
            }, {dark: false});
            
            element.innerHTML = "";
            this.editor = new EditorView({
                doc: "",
                extensions: [
                    basicSetup,
                    myTheme,
                    yaml(),
                    EditorView.editable.of(!this.readonly),
                    
                    EditorView.updateListener.of((v) => {
                        if (!v.docChanged) {return}
                        this.submit();
                    }),
                ],
                parent: element,
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
.yaml-input--readonly .cm-editor{background:var(--color-fill-1);}
</style>
