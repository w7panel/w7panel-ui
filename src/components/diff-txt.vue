<template>
    <div>
        <a-drawer
            :visible="showDrower"
            :width="800"
            unmount-on-close
            :footer="false"
            @cancel="cancel"
        >
            <template #title> {{ title||'版本对比' }} </template>
            <div class="box" ref="box">
                <pre id="diffresult"></pre>
            </div>
        </a-drawer>
    </div>
</template>

<script>
import jsyaml from 'js-yaml'
import * as Diff from 'diff'

export default {
    props: ['title', 'new', 'old', 'show'],
    data() {
        return {
            newStr: '',
            oldStr: '',
            showDrower: false,
        }
    },
    created(){
        this.showDrower = this.show;
        this.toDiff();
    },
    watch: {
        show(v){
            this.showDrower = v;
            this.toDiff();
        },
        new: "toDiff",
        old: "toDiff",
    },
    methods: {
        toDiff(){
            if(this.new && this.old && this.show){
                this.newStr = this.new;
                this.oldStr = this.old;
                if(typeof this.new == 'object'){ this.newStr = jsyaml.dump(this.new, { indent: 4 }); }
                if(typeof this.old == 'object'){ this.oldStr = jsyaml.dump(this.old, { indent: 4 });}
                this.$nextTick(()=>{
                    this.getContent();
                })
            }
        },
        getContent(){
            var result = document.getElementById('diffresult');
            
            var diff = Diff.diffLines(this.oldStr, this.newStr, {
                // ignoreWhitespace: true,
                newlineIsToken: false,
            });
            var fragment = document.createDocumentFragment();
            for (let i=0; i < diff.length; i++) {

                if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
                    var swap = diff[i];
                    diff[i] = diff[i + 1];
                    diff[i + 1] = swap;
                }

                var node;
                if (diff[i].removed) {
                    node = document.createElement('del');
                    node.classList.add('diff-remove');
                    node.appendChild(document.createTextNode(diff[i].value));
                } else if (diff[i].added) {
                    node = document.createElement('ins');
                    node.classList.add('diff-add');
                    node.appendChild(document.createTextNode(diff[i].value));
                } else {
                    node = document.createTextNode(diff[i].value);
                }
                fragment.appendChild(node);
            }

            result.textContent = '';
            result.appendChild(fragment);
            this.$refs.box.scrollTop = 0;

        },
        cancel(){
            this.$emit('cancel');
        },
    },
}
</script>

<style>
.yaml-drawer .el-drawer__header{margin-bottom:0!important; padding:10px 20px!important;}
.yaml-drawer .el-drawer__body{padding:10px 20px 20px;}
.diff-remove{color:#b30000;background:#fadad7; text-decoration: none;}
.diff-add{color:#008000;background:#e0ffe0; text-decoration: none;}
#diffresult{margin:0; unicode-bidi: isolate; display:block; text-align:left; line-height:20px; white-space: pre-wrap; text-indent: initial;}
</style>
<style scoped>
.box{overflow:auto; height:100%;}
</style>