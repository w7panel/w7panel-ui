<template>
    <div>
        <a-drawer
            :visible="showDrower"
            title="灰度发布"
            direction="rtl"
            @ok="submit"
            :width="1200"
            @cancel="close()"
        >
            <a-form style="padding:20px 0;" auto-label-width>
                <a-form-item label="流量切分模式">
                    <a-select v-model="form.type" placeholder="请选择" style="width:200px;">
                        <a-option label="Header" value="header"></a-option>
                        <a-option label="Cookie" value="cookie"></a-option>
                        <a-option label="权重" value="weight"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="规则配置">
                    <table class="com-table"><tbody>
                        <tr class="thead">
                            <td v-if="inRvproxy">代理/应用</td>
                            <td v-else>应用</td>
                            <td><span class="nowrap">子目录</span></td>
                            <td v-if="form.type=='weight'">权重</td>
                            <td v-if="form.type!='weight'">name / value</td>
                            <td><span class="nowrap">开启/关闭</span></td>
                            <td>操作</td>
                        </tr>
                        <tr v-for="(item,index) in form.list" :key="index" style="background:var(--color-neutral-1);">
                            <td v-if="inRvproxy">
                                <div class="df df-c">
                                    <a-select v-model="item.type" :disabled="index==0&&!multiple" placeholder="请选择">
                                        <a-option :value="1" label="代理"></a-option>
                                        <a-option :value="2" label="应用"></a-option>
                                    </a-select>
                                    <a-select v-if="item.type==1" v-model="item.agent" class="mt-10" :disabled="index==0" placeholder="请选择代理">
                                        <a-option v-for="agent in allAgent" :key="agent.name" :value="agent.name" :label="agent.name"></a-option>
                                    </a-select>
                                    <div v-if="item.type==2" class="df mt-10" style="gap:10px;">
                                        <a-select v-model="item.appgroup" :disabled="index==0&&!multiple" @change="item.app=''" placeholder="请选择appgroup">
                                            <a-option v-for="i in allGroup" :key="i.name" :label="i.title" :value="i.name"></a-option>
                                        </a-select>
                                        <a-select v-model="item.app" :disabled="index==0&&!multiple" @change="item.port='';checkAllAppPorts(item.appgroup,item.app,(v)=>{item.appPorts=v});" placeholder="请选择应用" class="ml-10">
                                            <a-option v-for="i in allAppList[item.appgroup]" :key="i.name" :label="i.title" :value="i.name"></a-option>
                                        </a-select>
                                        <a-select v-model="item.port" :disabled="index==0&&!multiple" placeholder="请选择端口">
                                            <a-option v-for="i in item.appPorts" :key="i" :label="i" :value="i"></a-option>
                                        </a-select>
                                    </div>
                                </div>
                            </td>
                            <td v-else>
                                <div class="df">
                                    <a-select v-model="item.app" :disabled="index==0&&!multiple" @change="v=>{item.port='';item.appPorts=appPorts[v];}" placeholder="请选择应用" style="min-width:150px;" >
                                        <a-option v-for="i in appList" :key="i.name" :label="i.title" :value="i.name"></a-option>
                                    </a-select>
                                    <a-select v-model="item.port" :disabled="index==0&&!multiple" placeholder="请选择端口" class="ml-10 df-s0" style="width:120px;">
                                        <a-option v-for="i in item.appPorts" :key="i" :label="i" :value="i"></a-option>
                                    </a-select>
                                </div>
                            </td>
                            <td>{{parentPath || '-'}}</td>
                            <td v-if="form.type=='weight'">
                                <a-input v-model="item.weight" :disabled="index==0&&!multiple" type="number" @input="computeWeight" placeholder="请输入权重" style="width:120px;"></a-input>
                            </td>
                            <td v-if="form.type!=='weight'">
                                <div class="df df-c">
                                    <div class="df ai-c">
                                        <!-- <span v-if="index==0">默认</span> -->
                                        <a-input v-if="index==0&&!multiple" default-value="默认" disabled>
                                            <template #prefix>name:</template>
                                        </a-input>
                                        <a-input v-else v-model="item.name" :disabled="index==0&&!multiple" placeholder="请输入">
                                            <template #prefix>name:</template>
                                        </a-input>
                                    </div>
                                    <div class="df ai-c mt-4">
                                        <!-- <span v-if="index==0">默认</span> -->
                                        <a-input v-if="index==0&&!multiple" default-value="默认" disabled>
                                            <template #prefix>value:</template>
                                        </a-input>
                                        <a-input v-else-if="form.type=='header'" :disabled="index==0&&!multiple" v-model="item.value" placeholder="请输入" >
                                            <template #prefix>value:</template>
                                        </a-input>
                                        <a-input v-else readonly default-value="always" placeholder="请输入" >
                                            <template #prefix>value:</template>
                                        </a-input>
                                    </div>
                                </div>
                                
                            </td>
                            <td>
                                <a-switch v-model="item.canary" :disabled="index==0&&!multiple" checked-value="true" unchecked-value="false"></a-switch>
                            </td>
                            <td>
                                <span v-if="index!=0||multiple" class="c-blue cursor nowrap" @click="item.exist?delList.push(item.id):null;form.list.splice(index,1);computeWeight();">删除</span>
                            </td>
                        </tr>
                        <tr style="background:var(--color-neutral-1);">
                            <td colspan="6" class="cursor" @click="addRow">
                                <div class="df ai-c jc-c">
                                    <icon-plus :size="14" class="c-99" />
                                    <span class="c-99 lh-1" style="margin-left:6px;">添加</span>
                                </div>
                            </td>
                        </tr>
                    </tbody></table>
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import CryptoJS  from 'crypto-js';

export default {
    props: ['show','appList','appPorts','parentName','parentPath','checkList','multiple'],
    data(){
        return {
            namespaceActive: '',
            firstItem: null,
            showDrower: false,
            delList: [],
            form: {
                type: 'header',
                list: [],
            },
            inRvproxy: false,

            allAgent: [],
            allGroup: [],
            allAppList: {},
            allAppPorts: {},
        }
    },
    watch: {
        show(val){
            this.showDrower = val;
            if(!val){return}
            this.form.type = 'header';
            this.form.list = [];
            this.delList = [];
            this.getList(()=>{
                this.getData();
            });
        },
    },
    computed: {
        // multiple(){
        //     return !this.parentName && !this.parentPath && this.checkList?.length;
        // }
    },
    created(){
        this.inRvproxy = this.$route.name == 'app-rvproxy-domain';
        this.namespaceActive = useNamespaceStore().namespace;
        if(this.inRvproxy){
            this.getAllAgent();
        }
    },
    methods: {
        multipleAsync(){
            this.form.type = 'header';
            this.form.list = [];
            this.delList = [];
            this.getList(()=>{
                this.getData();
                this.submit();
            });
        },
        // 选择应用获取端口
        async checkAllAppPorts(appGroup,appName,callback){
            if(this.allAppPorts[appName]?.length){
                callback(this.allAppPorts[appName]);
                return;
            }
            let app = this.allAppList?.[appGroup]?.find(i=>i.name==appName)
            if(!app){
                callback([]);
                return;
            }
            let { data } = await k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name);
            this.allAppPorts[app.name] = data?.spec?.template?.spec?.containers?.[0]?.ports?.map(i=>String(i.containerPort)) || [];
            callback(this.allAppPorts[app.name]);
        },
        getAllAgent(){

            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups').then(res=>{
                let allGroup = [];
                let allAppList = {};
                let list = res?.data?.items || [];
                list.map(item=>{
                    allGroup.push({
                        name: item.metadata.name,
                        title: item?.spec?.title || item.metadata.name,
                    })
                    allAppList[item.metadata.name] = item?.status?.items?.map(i=>{
                        return {
                            title: i.title || i.name,
                            name: i.name,
                            kind: i.kind?.toLowerCase()+'s',
                        }
                    });
                })
                this.allGroup = allGroup;
                this.allAppList = allAppList;
            })

            if(this.$route.query.name){
                k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges/'+this.$route.query.name).then(res=>{
                    let sr = res.data.spec?.registries || {};
                    let host = [];
                    let labels = [];
                    let list = [];
                    sr.map(i=>{
                        let h = i.domain.split(',').map(i=>i?.trim()).filter(i=>i)
                        host=host.concat(h);
                        labels.push(i.name+'.'+i.type);
                        list.push({
                            // title: i.title,
                            domain: i.domain,
                            name: i.name + '.' + i.type,
                        })
                    });
                    this.allAgent = list;
                })
            }else{
                k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges').then(res=>{
                    
                    let data = res?.data?.items || [];
    
                    let list = [];
                    data.filter(i=>i.metadata.name!='default').map(i=>{
                        let sr = i.spec?.registries || {};
                        let host = [];
                        let labels = [];
                        sr.map(i=>{
                            let h = i.domain.split(',').map(i=>i?.trim()).filter(i=>i)
                            host=host.concat(h);
                            labels.push(i.name+'.'+i.type);
                            list.push({
                                // title: i.title,
                                domain: i.domain,
                                name: i.name + '.' + i.type,
                            })
                        });
                    })
                    this.allAgent = list;
                    // console.log(list)
                })
            }
        },
        // 获取域名列表
        getList(callback){
            if(this.inRvproxy){
                return k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+ this.namespaceActive +'/mcpbridges/'+this.$route.query.name,{loading:true}).then(async res=>{
                    let sr = res?.data?.spec?.registries || [];
                    let data = [];
                    for(let i=0; i<sr.length; i++){
                        let labelSelector = 'destination=' + sr[i].name + '&higress.io/resource-definer=higress'
                        await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector='+labelSelector).then(res=>{
                            data = data.concat(res?.data?.items || []);
                        })
                    }
                    // console.log(this.agents)
                    this.dataList = data;
                    callback && callback();
                });
            }else{
                let search = 'group=' + this.$route.params?.group;
                return k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses?labelSelector='+search, {loading:true}).then(res=>{
                    let data = res?.data?.items || [];
                    this.dataList = data;
                    callback && callback();
                });
            }
        },
        getData(){
            if(!this.parentName || !this.parentPath){
                this.form.list = [];
                return;
            }
            let list = [null];
            this.dataList.map(i=>{
                let name = i.metadata.name;
                let path = i?.spec?.rules?.[0]?.http?.paths?.[0]?.path;
                if((name==this.parentName) && (path==this.parentPath)){
                    list[0] = i;
                    this.firstItem = i;
                    return ;
                }

                let parents = i.metadata?.labels?.parents;
                let parentsPath = i.metadata?.labels?.parentsPath;
                if(parentsPath===''){
                    parentsPath = this.computedSubMd5('/');
                }
                if((parents===this.parentName) && (parentsPath===this.computedSubMd5(this.parentPath))){
                    list.push(i);
                }
            });
            this.form.list = list.map((i,index)=>{
                let ann = i?.metadata?.annotations || {};
                if(index==0){
                    this.form.type = ann['higress.io/canary-type'] || 'header';
                }
                let s = i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service || {}
                
                let appgroup = '';
                let type = i?.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name? 2 : 1;
                if(type==2 && s.name && this.inRvproxy){
                    let find = this.allGroup.find(i=>{
                        return this.allAppList[i.name].find(a=>a.name==s.name);
                    })
                    if(find){ appgroup = find.name; }
                }
                return {
                    type: type,
                    appgroup: appgroup,
                    id: i.metadata.name,
                    app: s?.name,
                    port: s?.port?.number,
                    agent: i.metadata?.labels?.['higress.io/destination'] || '',
                    weight: ann?.['higress.io/canary-weight'] || '0',
                    name: ann?.['higress.io/canary-by-header'] || ann?.['higress.io/canary-by-cookie'] || '',
                    value: ann?.['higress.io/canary-by-header-value'] || 'always',
                    canary: index==0? 'true' : (ann?.['higress.io/canary'] || 'false'),
                    exist: true,
                }
            })
            this.computeWeight();

        },
        computeWeight(){
            if(!this.form.list?.length){return}
            let firstWeight = 100;
            this.form.list.map((i,index)=>{
                if(index==0){return}
                let w = Number(i.weight || '0');
                firstWeight = firstWeight - w;
            });
            if(firstWeight<0){
                firstWeight = 0;
                this.$message.error('权重和不能大于100');
            }
            this.form.list[0].weight = String(firstWeight);
        },
        async submit(){
            
            for(let i in this.form.list){
                if(i=='0'){ continue; }
                let item = this.form.list[i];
                if(!item.port && !this.inRvproxy){
                    this.$message.error('请选择应用与端口');
                    return;
                }
                if(this.inRvproxy && item.type==1 && !item.agent){
                    this.$message.error('请选择代理');
                    return;
                }
                if(this.inRvproxy && item.type==2 && !item.port){
                    this.$message.error('请选择应用与端口');
                    return;
                }
                if(this.form.type=='header'||this.form.type=='cookie'){
                    if(!item.name){
                        this.$message.error('请输入name');
                        return;
                    }
                    if(this.form.type=='header'&&!item.value){
                        this.$message.error('请输入value');
                        return;
                    }
                }
            }
            if(this.multiple){
                for(let c=0; c<this.checkList.length; c++){
                    let check = this.dataList.find(li=>li.metadata.name==this.checkList[c]);
                    if(!check){continue}
                    // 删除原灰度发布
                    let deleteList = this.dataList.filter(li=>(li.metadata?.labels?.parents == this.checkList[c]) && (li.metadata?.labels?.parentsPath==this.computedSubMd5(check?.spec?.rules?.[0]?.http?.paths?.[0]?.path)))
                    
                    for(let i=0; i<this.form.list.length; i++){
                        let item = this.form.list[i];
                        if(i==0){
                            // 域名本身
                            await k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+check.metadata.name,{
                                metadata: {
                                    annotations: { 'higress.io/canary-type': this.form.type }
                                }
                            },{
                                headers: {'Content-Type': 'application/merge-patch+json'}
                            });
                            continue;
                        }

                        let data = null;
                        data = JSON.parse(JSON.stringify(check));
                        
                        data.metadata.labels = data.metadata.labels || {};
                        data.metadata.labels.parents = data.metadata.name;
                        data.metadata.labels.parentsPath = this.computedSubMd5(data?.spec?.rules?.[0]?.http?.paths?.[0]?.path);

                        data.metadata.name = 'ing-' + this.createName();
                        delete data.metadata.resourceVersion;
                        delete data.metadata.generation;
                        delete data.metadata.creationTimestamp;
                        delete data.metadata.uid;
                        delete data.status;

                        delete data.metadata.creationTimestamp;
                        delete data.metadata.annotations['higress.io/canary-weight'];
                        delete data.metadata.annotations['higress.io/canary-by-cookie'];
                        delete data.metadata.annotations['higress.io/canary-by-header'];
                        delete data.metadata.annotations['higress.io/canary-by-header-value'];

                        data.metadata.annotations['higress.io/canary'] = item.canary;
                        if(this.form.type=='weight'){
                            data.metadata.annotations['higress.io/canary-weight'] = item.weight;
                        }else if(this.form.type=='header'){
                            data.metadata.annotations['higress.io/canary-by-header'] = item.name;
                            if(item.value!='always'){
                                data.metadata.annotations['higress.io/canary-by-header-value'] = item.value;
                            }
                        }else if(this.form.type=='cookie'){
                            data.metadata.annotations['higress.io/canary-by-cookie'] = item.name;
                        }
                        if(item.type==1){
                            data.metadata.labels['higress.io/destination'] = item.agent;
                            data.metadata.annotations['higress.io/destination'] = item.agent;
                            data.spec.rules[0].http.paths[0].backend = {
                                "resource": {
                                    "apiGroup": "networking.higress.io",
                                    "kind": "McpBridge",
                                    "name": "default"
                                }
                            }
                        }
                        if(item.type==2){
                            data.spec.rules[0].http.paths[0].backend = {
                                service: {
                                    name: item.app,
                                    port: {number: Number(item.port)},
                                }
                            }
                            delete data.metadata.labels['higress.io/destination'];
                            delete data.metadata.annotations['higress.io/destination'];
                        }

                        await k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data, {loading:true}).then(()=>{}).catch(()=>{})

                    }
                    for(let i=0; i<deleteList.length; i++){
                        await k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+deleteList[i].metadata.name, {loading:true});
                    }
                }
            }else{
                for(let i=0; i<this.form.list.length; i++){
                    let item = this.form.list[i];
                    if(i=='0'){
                        await k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.firstItem.metadata.name,{
                            metadata: {
                                annotations: { 'higress.io/canary-type': this.form.type }
                            }
                        },{
                            loading: true,
                            headers: {'Content-Type': 'application/merge-patch+json'}
                        });
                        continue;
                    }
                    
                    let data = null;
                    if(item.exist){
                        data = this.dataList.find(i=>i.metadata.name == item.id);
                    }else{
                        data = JSON.parse(JSON.stringify(this.firstItem));
                        data.metadata.labels = data.metadata.labels || {};
                        data.metadata.labels.parents = data.metadata.name;
                        data.metadata.labels.parentsPath = this.computedSubMd5(this.parentPath);
    
                        data.metadata.name = 'ing-' + this.createName();
                        delete data.metadata.resourceVersion;
                        delete data.metadata.generation;
                        delete data.metadata.creationTimestamp;
                        delete data.metadata.uid;
                        delete data.status;
                    }
                    if(!data){continue;}
    
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.annotations['higress.io/canary-weight'];
                    delete data.metadata.annotations['higress.io/canary-by-cookie'];
                    delete data.metadata.annotations['higress.io/canary-by-header'];
                    delete data.metadata.annotations['higress.io/canary-by-header-value'];
    
                    data.metadata.annotations['higress.io/canary'] = item.canary;
                    if(this.form.type=='weight'){
                        data.metadata.annotations['higress.io/canary-weight'] = item.weight;
                    }else if(this.form.type=='header'){
                        data.metadata.annotations['higress.io/canary-by-header'] = item.name;
                        if(item.value!='always'){
                            data.metadata.annotations['higress.io/canary-by-header-value'] = item.value;
                        }
                    }else if(this.form.type=='cookie'){
                        data.metadata.annotations['higress.io/canary-by-cookie'] = item.name;
                    }
    
                    if(!this.inRvproxy){
                        data.spec.rules[0].http.paths[0].backend.service.name = item.app;
                        data.spec.rules[0].http.paths[0].backend.service.port.number = Number(item.port);
                    }else{
                        if(item.type==1){
                            data.metadata.labels['higress.io/destination'] = item.agent;
                            data.metadata.annotations['higress.io/destination'] = item.agent;
                            data.spec.rules[0].http.paths[0].backend = {
                                "resource": {
                                    "apiGroup": "networking.higress.io",
                                    "kind": "McpBridge",
                                    "name": "default"
                                }
                            }
                        }
                        if(item.type==2){
                            data.spec.rules[0].http.paths[0].backend = {
                                service: {
                                    name: item.app,
                                    port: {number: Number(item.port)},
                                }
                            }
                            delete data.metadata.labels['higress.io/destination'];
                            delete data.metadata.annotations['higress.io/destination'];
                        }
                    }
                    
                    if(item.exist){
                        await k8sproxy.put("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+data.metadata.name, data, {loading:true});
                    }else{
                        await k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data, {loading:true})
                    }
                }
                for(let i in this.delList){
                    await k8sproxy.delete("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.delList[i], {loading:true});
                }
                this.delList = [];
                this.$message.success('操作成功');
                this.close(true);
            }
        },
        addRow(){
            this.form.list.push({
                type: this.inRvproxy? 1 : 2,
                agent: '',
                app: '',
                port: '',
                weight: '0',
                name: '',
                value: 'always',
                cannary: 'false',
            })
        },
        close(boo){
            this.$emit('cancel',boo);
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
        computedSubMd5(v){
            return CryptoJS.MD5(v).toString();
        },
    }
}
</script>

<style scoped>
.nowrap{white-space: nowrap;}
</style>