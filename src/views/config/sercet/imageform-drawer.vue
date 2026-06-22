<template>
    <a-drawer :width="800" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="$popupContainer">
        <template #title>{{id?'修改镜像仓库':'添加镜像仓库'}}</template>
        <div class="mt-10 bg-white pb-24 df jc-b">
            <a-form ref="form" :model="form" :rules="rules" auto-label-width class="form-33-label" validate-trigger="blur">
                <!-- <a-form-item label="仓库名称" field="title">
                    <a-input type="text" v-model="form.title" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item> -->
                <a-form-item label="访问域名" field="host">
                    <a-input type="text" v-model="form.host" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item>
                <a-form-item label="镜像仓库用户名" field="username">
                    <a-input type="text" v-model="form.username" @change="yamlData=formTodata()" size="large" placeholder="请输入" style="width:500px;" />
                </a-form-item>
                <a-form-item label="镜像仓库密码" field="password">
                    <a-input v-model="form.password" @change="yamlData=formTodata()" :type="password?'password':'text'" size="large" style="width:500px;" placeholder="请输入">
                        <template #suffix>
                            <a-icon v-if="password" :size="20" @click="password=false"><Hide /></a-icon>
                            <a-icon v-else :size="20" @click="password=true"><View /></a-icon>
                        </template>
                    </a-input>
                </a-form-item>
                <a-form-item label="命名空间" prop="namespace" field="namespace">
                    <a-input v-model="form.namespace" size="large" style="width:500px;" placeholder="请输入" />
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';
// import yamlView from '@/components/yaml-view.vue'
import { useNamespaceStore } from '@/store';

const dataTemplate = {}

export default {
    props: ['show','id'],
    data(){
        return {
            namespaceActive: "",
            password: true,
            data: {},
            form: {
                title: '',
                host: '',
                username: '',
                password: '',
                namespace: '',
            },
            rules: {
                title:  [{required: true, message: '请输入仓库名称'}],
                host: [{ required: true, message: '请输入访问域名'}],
                username: [{ required: true, message: '请输入镜像仓库用户名'}],
                password: [{ required: true, message: '请输入镜像仓库密码'}],
                namespace: [{ required: true, message: '请输入命名空间'}],
            },
            yamlData: null,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    // components: { yamlView },
    watch:{
        show(v){
            this.visible = v;
            if(v){this.init();}
        },
        id: 'init',
    },
    methods: {
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        init(){
            if(this.id){
                this.getData();
            }else{
                this.form = {
                    title: '',
                    host: '',
                    username: '',
                    password: '',
                    namespace: '',
                }
                this.data = dataTemplate;
                this.yamlData = this.formTodata();
            }
        },
        getData(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+this.id,{loading:true}).then(res=>{
                let d = res?.data || {};
                this.data = d;
                let dockerconfigjson = {};
                if(d?.data['.dockerconfigjson']){
                    let dj = {}
                    try{
                        dj = JSON.parse(atob(d?.data['.dockerconfigjson']));
                    } catch(e){}
                    if(dj?.auths){
                        let o = Object.keys(dj?.auths).map(i=>({
                            host: i,
                            username: dj?.auths[i]?.username || '',
                            password: dj?.auths[i]?.password || '',
                        }));
                        o.length && (dockerconfigjson = o[0]);
                    }
                }
                this.form = {
                    title: d?.metadata?.annotations?.title || '',
                    host: dockerconfigjson?.host || '',
                    username: dockerconfigjson?.username || '',
                    namespace: atob(d?.data?.namespace || '') || '',
                    password: dockerconfigjson?.password || '',
                }
                this.yamlData = this.formTodata();
            })
        },
        formTodata(){
            let data = {};
            if(this.id){
                data = this.registry(JSON.parse(JSON.stringify(this.data)), this.form);
            }else{
                data = this.registry(null, this.form);
            }
            return data;
        },
        submit(){
            this.$refs.form.validate(v=>{
                if(v){return;}
                let data = this.formTodata();
                if(this.id){
                    k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+this.id, data,{loading:true}).then(res=>{
                        this.$message.success("修改成功");
                        setTimeout(()=>{
                            this.$emit('submit');
                            this.closeDrawer(true);
                        },300)
                    })
                }else{
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/secrets", data,{loading:true}).then(res=>{
                        this.$message.success("创建成功");
                        setTimeout(()=>{
                            this.$emit('submit');
                            this.closeDrawer(true);
                        },300)
                    })
                }
            })
        },
        registry(data,form){
            let secret = data || {
                apiVersion: "v1",
                data: {
                    ".dockerconfigjson": '',
                    namespace: '',
                },
                metadata: {
                    name: '',
                    namespace: '',
                    annotations: {
                        title: '',
                    }
                },
                type: "kubernetes.io/dockerconfigjson",
            };

            secret.metadata = {
                name: secret.metadata.name || '',
            };
            secret.metadata.name = secret.metadata.name || (form.host + "." + this.form.namespace);
            secret.metadata.namespace = this.namespaceActive || "default";
            secret.metadata.annotations = secret.metadata.annotations || {};
            secret.metadata.annotations.title = form.title || this.createName();

            secret.data = secret.data || {};
            secret.data.namespace = btoa(form.namespace || "default");
            secret.data['.dockerconfigjson'] =  btoa(JSON.stringify({
                auths: {
                    [form.host]: {
                        username: form.username,
                        password: form.password,
                        auth: btoa(form.username + ":" + form.password)
                    }
                }
            }))

            return secret;
        },
        createName(length){
            let len = length || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
    },
}
</script>

<style scoped>

</style>