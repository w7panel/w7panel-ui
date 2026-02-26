<template>
    <div class="box df-s0" :style="{width:show?'500px':'auto'}">
        <div v-show="show" class="yamldom hljs df" v-html="yamlDom"></div>
        <a-button v-show="!show" class="yamlbtn" @click="show=true;">YAML</a-button>
        <a-button v-if="show" class="btn" @click="show=false;">收起</a-button>
    </div>
</template>

<script>
import jsyaml from "js-yaml";
import hljs from 'highlight.js/lib/common'

export default {
    props: ['data'],
    data() {
        return {
            show: false,
            yaml: '',
            yamlDom: null,
        }
    },
    created(){},
    mounted(){
        try{
            let yaml = jsyaml.dump(this.data, { indent: 4 });
            this.setYaml(yaml);
        }catch(e){}
    },
    watch: {
        data(){
            try{
                let yaml = jsyaml.dump(this.data, { indent: 4 });
                this.setYaml(yaml);
            }catch(e){}
        },
    },
    methods: {
        setYaml(yaml){
            this.yaml = yaml;
            this.yamlDom = hljs.highlight(this.yaml, {language: 'yaml'}).value;
            let len = this.yamlDom.split(/\r?\n/).map((i,id)=>`<div>${id+1}</div>`).join('');
            this.yamlDom = `<div class="gutters">${len}</div><pre class='pre fc'><code class='language-yaml'>${this.yamlDom}</code></pre>`;
        }
    }
}
</script>

<style scoped>
.box{position:relative; height:100%;}
.box .yamlbtn{margin-right:10px; margin-top:10px;}
.box .btn{position:absolute; display:block; top:10px; right:10px;}
.box .yamldom{line-height:24px; overflow-x:auto; border:1px solid #ddd;}
.box .yamldom>>>.gutters{
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

.box>>>pre{margin:0;}
</style>