<template>
    <div class="rich-editor">
        <Toolbar
            :editor="editor"
            :defaultConfig="toolbarConfig"
            mode="default"
            class="rich-editor__toolbar"
        />
        <Editor
            :model-value="modelValue"
            :defaultConfig="editorConfig"
            mode="default"
            class="rich-editor__body"
            @update:model-value="value=>$emit('update:modelValue', value)"
            @onCreated="handleCreated"
        />
    </div>
</template>

<script>
import '@wangeditor/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';

export default {
    props: {
        modelValue: {
            type: String,
            default: '',
        },
        placeholder: {
            type: String,
            default: '请输入内容',
        },
    },
    emits: ['update:modelValue'],
    components: {
        Editor,
        Toolbar,
    },
    data(){
        return {
            editor: null,
            toolbarConfig: {
                excludeKeys: [
                    'group-image',
                    'group-video',
                    'insertTable',
                    'codeBlock',
                    'fullScreen',
                ],
            },
        }
    },
    computed: {
        editorConfig(){
            return {
                placeholder: this.placeholder,
                MENU_CONF: {},
            };
        },
    },
    beforeUnmount(){
        this.destroyEditor();
    },
    methods: {
        handleCreated(editor){
            this.editor = Object.seal(editor);
        },
        destroyEditor(){
            if(!this.editor){ return; }
            this.editor.destroy();
            this.editor = null;
        },
    },
}
</script>

<style scoped>
.rich-editor{
    width:100%;
    height:100%;
    display:flex;
    flex-direction:column;
    border:1px solid var(--color-border-2);
    border-radius:6px;
    overflow:hidden;
}
.rich-editor__toolbar{
    border-bottom:1px solid var(--color-border-2);
    flex-shrink:0;
}
.rich-editor__body{
    flex:1;
    min-height:0;
    overflow-y:hidden;
}
</style>
