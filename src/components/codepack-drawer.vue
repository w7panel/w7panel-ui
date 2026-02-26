<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="false?'#allmodalbox':'body'">
        <template #title>代码包创建</template>
        <a-form ref="codepack" :model="form" validate-trigger="blur" auto-label-width class="app-formclass mt-10">
            <a-form-item label="选择环境">
                <div>
                    <div class="df df-ww">
                        <div v-for="(item,index) in envs" :key="index" hoverable class="df ai-c card cursor" @click="form.env=index" :class="{active:form.env==index}">
                            <img :src="item.icon" class="cardimg" alt="" />
                            <div class="ml-10 one-hide fs-14">{{item.title}}</div>
                        </div>
                    </div>
                    <a-alert class="fs-14 codepack-readme" :show-icon="false">
                        <v-md-preview :text="mdtxt"></v-md-preview>
                    </a-alert>
                </div>
            </a-form-item>
            <a-form-item label="代码包地址" field="filename" :rules="[{required:true, message:'请选择文件'}]">
                <div class="upload">
                    <div v-if="form.filename" class="c-blue" style="height:32px; line-height:32px; min-width:60px;">{{form.filename}}</div>
                    <a-button v-else >上传zip文件</a-button>
                    <input id="uploadfileinput" type="file" accept=".zip" @change="selectFile" />
                </div>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script>
import { panelApi } from '@/utils/api';
import appForm from '@/components/app-form.vue';
import axios from 'axios';
import { useLoadingStore } from '@/store';

export default {
    props: ['show', 'tabs', 'activeName'],
    emits: ['close'],
    data(){
        return {
            visible: false,
            form: {
                env: 0,
                file: null,
                filename: '',
            },
            envs: [],
            mdtxt: '',
        }
    },
    components: {appForm},
    watch:{
        show(v){
            this.visible = v;
            v && this.getEnv();
        },
        'form.env'(){
            this.getReadme(this.envs[this.form.env].detailUrl)
        },
    },
    methods:{
        getEnv(){
            panelApi.get('/zpk/trandition/env').then(res=>{
                if(!res?.data){return}
                let list = [];
                for(let i in res.data){
                    list.push({
                        ...res.data[i],
                    })
                }
                this.envs = list;
                if(this.envs.length){
                    this.getReadme(this.envs?.[this.form.env]?.detailUrl)
                }
            })
        },
        submit(){
            this.$refs.codepack.validate((err)=>{
                if(err){return}
                let data = new FormData();
                data.append('file',this.form.file);
                let exname = /\.\w+$/.test(this.form.filename)? this.form.filename.replace(/^.*(\.\w+)$/,'$1') : '';
                let upname = Date.now() + exname
                data.append('key', 'upload/' + upname );
                
                useLoadingStore().loading = true;
                axios.post('/s3bucket',data,).then(res=>{
                    useLoadingStore().loading = false;
                    let origin = window.origin;
                    if(window.__MICRO_APP_ENVIRONMENT__){origin = window.microApp?.getData()?.requestUrl?.replace(/\/$/,'') || '';}
                    let zip = origin + '/panel-api/v1/download/'+ 'upload/' + upname;
                    let zpkUrl = this.envs[this.form.env].zpkUrl;
                    this.$router.push(`/app/store-install?path=${encodeURIComponent(zpkUrl)}&zipUrl=${encodeURIComponent(zip)}&isTrandition=true`)
                }).catch(()=>{
                    useLoadingStore().loading = false;
                    this.$message.error('上传失败');
                })
            })
        },
        selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            if(!/\.zip$/.test(files[0].name)){
                this.$message.error('请选择zip文件');
                return;
            }
            this.form.file = files[0];
            this.form.filename = files[0].name.replace(/\s/g,'');
        },
        getReadme(detailUrl){
            if(!detailUrl){return}
            axios.get(detailUrl).then(res=>{
                this.mdtxt = res.data?.data?.content;
            })
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    },
}
</script>

<style scoped>
.card{width:240px; margin-right:10px; margin-bottom:10px; border-radius:4px; padding:10px; border:1px solid var(--color-border-2);}
.card:hover{border-color:rgb(var(--primary-6)); color:rgba(var(--primary-6));}
.card.active{border-color:rgb(var(--primary-6)); background-color:var(--color-primary-light-1); color:rgba(var(--primary-6));}
.cardimg{width:30px; height:30px; border-radius:4px;}

.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

</style>
<style>
.codepack-readme .github-markdown-body{padding:0; padding-top:10px; font-size:14px;}
</style>