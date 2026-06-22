<template>
    <div class="padding-20">
        <route-breadcrumb />
        <!-- <div class="page-title df ai-c">配置文件</div> -->
        <div>
            <div>
                <a-button type="primary" @click="openForm($route.params.id)"><template #icon><icon-edit /></template>修改</a-button>
            </div>
            <div class="mt-20 padding-20 bg-white">
                <a-form :model="form" auto-label-width class="ml-20">
                    <a-form-item label="名称">{{form.title}}</a-form-item>
                    <a-form-item v-if="form.type=='file'" label="内容">
                        <div class="df mt-10" style="width:100%; position:relative;">
                            <pre class="fc" style="max-width:100%; overflow:auto; background:#282c34;"><code>{{form.cont}}</code></pre>
                            <a-button v-if="form.cont" class="copybtn" @click="onekeyCopy(form.cont)">一键复制</a-button>
                        </div>
                    </a-form-item>
                    <a-form-item v-if="form.type=='env'" label="环境变量" prop="env">
                        <div>
                            <table v-if="form.type=='env'" class="com-table mt-10" style="width:800px;"><tbody>
                                <tr class="thead" ><td>键</td><td>值</td></tr>
                                <tr v-for="(item,index) in form.env" :key="index">
                                    <td>{{item.key}}</td>
                                    <td>{{item.value}}</td>
                                </tr>
                            </tbody></table>
                        </div>
                    </a-form-item>
                    <a-form-item label="类型">{{form.type=='file'?'配置文件':'环境变量'}}</a-form-item>
                </a-form>
            </div>
        </div>
        <form-drawer :show="editForm.show" :id="editForm.id" @close="closeDrawer"></form-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import hljs from 'highlight.js';
import { useNamespaceStore } from '@/store';
import formDrawer from './form-drawer.vue';

export default {
    data(){
        return {
            namespaceActive: "",
            data: {},
            form: {},
            editForm: {},
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
    },
    computed:{
    },
    components: { formDrawer, },
    methods: {
        openForm(v){
            this.editForm.id = v || '';
            this.editForm.show = true;
        },
        closeDrawer(v){
            this.editForm.show = false;
            if(v){ this.getData(); }
        },
        getData(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+this.$route.params.id,{loading:true}).then(res=>{
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
                        env.push({key:i, value:d.data[i]})
                    })
                }
                this.form = {
                    title: d.metadata?.annotations?.title,
                    type: type,
                    cont: cont,
                    env: env,
                }
                this.$nextTick(()=>{
                    hljs.highlightAll();
                })
            })
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
    },
}
</script>

<style scoped>

.back{ height:50px; padding:0 20px; line-height:50px; background:#fff; box-shadow:0 0 10px rgba(0,0,0,0.1); }

pre{margin:0; margin:0; border:0; outline:0; display:block; border-radius:0 4px 4px 0;}
pre code{margin:0; border:0; padding:14px; outline:0; line-height:26px; border-radius:0 4px 4px 0;}
.copybtn{position:absolute; right:20px; top:12px;}

</style>
