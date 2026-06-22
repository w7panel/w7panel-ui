<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div v-if="permission.includes('app-rvproxy-add')" class="mb-20">
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新增</a-button>
        </div>
        <div class="bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>Name</td>
                    <td>域名</td>
                    <td>转发目标地址</td>
                    <td style="width:300px;">操作</td>
                </tr>
                <tr v-for="(item,index) in list" :key="index">
                    <td>{{item.name}}</td>
                    <td>
                        <span class="df df-c ai-s">
                            <!-- <span>{{item.label}}</span> -->
                            <a v-if="item.md && item.md.length==1" class="cursor c-blue" target="_blank" :href="item.md[0]">{{item.md[0]}}</a>
                            <a-popover v-if="item.md && item.md.length>1">
                                <div class="df df-c lh-1 cursor">
                                    <a class="cursor c-blue" target="_blank" :href="item.md[0]">{{item.md[0]}}</a>
                                    <span class="c-blue fs-12 mt-2">等{{item.md.length}}个域名</span>
                                </div>
                                <template #content>
                                    <div class="df df-c">
                                        <a v-for="domain in item.md" :key="domain" :href="domain" class="cursor c-blue lh-1" style="margin-bottom:10px;white-space:nowrap;" target="_blank">{{ domain }}</a>
                                    </div>
                                </template>
                            </a-popover>
                            <span v-if="!item.md || item.md.length==0">-</span>
                        </span>
                    </td>
                    <td>
                        <span class="df df-c">
                            <span v-for="item in item.host" class="c-33" :key="item.host">{{item}}</span>
                        </span>
                    </td>
                    <td>
                        <!-- <a-tooltip content="yaml">
                            <span class="opt-icon" @click="openYaml(item.name)">
                                <icon-code />
                            </span>
                        </a-tooltip>
                        <a-tooltip content="域名管理">
                            <i class="opt-icon" @click="toDomain(item)"><icon-link /></i>
                        </a-tooltip>
                        <a-tooltip content="编辑">
                            <i class="opt-icon" @click="openForm(item)"><icon-edit /></i>
                        </a-tooltip>
                        <a-popconfirm :content="'确认要删除吗'" @ok="toDelete(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm> -->
                        
                        <span class="cursor c-blue" @click="openYaml(item.name)">YAML</span>
                        <span class="ml-16 cursor c-blue" @click="toDomain(item)">域名管理</span>
                        <span v-if="permission.includes('app-rvproxy-edit')" class="ml-16 cursor c-blue" @click="openForm(item)">编辑</span>
                        <a-popconfirm v-if="permission.includes('app-rvproxy-delete')" :content="'确认要删除吗'" @ok="toDelete(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span :id="'rvproxy-'+item.name" class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!list || !list.length">
                    <td colspan="3"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>
        <a-drawer :width="1000" :visible="form.show" @ok="validate" @cancel="form.show=false;" :popup-container="$popupContainer">
            <template #title>反向代理</template>
            <a-tabs type="card-gutter" v-model:active-key="form.edit_index" :editable="true" @add="formAddItem" @delete="toDeleteItem" show-add-button auto-switch>
                <a-tab-pane v-for="(item, index) of form.form" :key="index" :title="item.beforename+item.aftername" :closable="index!==0">
                    <a-form :ref="'form'+index" :model="item" label-width="80px" auto-label-width class="padding-20" :rules="rules">
                        <a-form-item v-if="form.is_create" label="访问域名">
                            <div class="df ai-c" style="flex:1;">
                                <a-input type="text" v-model="item.crtDomain" placeholder="请输入域名">
                                    <template #prepend>{{item.crtSsl?'https://':'http://'}}</template>
                                    <template v-if="whiteList.length" #append>
                                        <a-select v-model="item.whiteDomain">
                                            <a-option v-for="(wd,wdid) in whiteList" :key="wdid" :label="'.'+wd.domain" :value="wdid"></a-option>
                                        </a-select>
                                    </template>
                                </a-input>
                                <a-checkbox v-model="item.crtSsl" class="ml-16 df-s0">https证书</a-checkbox>
                            </div>
                        </a-form-item>
                        
                        <!-- <a-form-item label="标题" field="title">
                            <a-input type="text" v-model="item.title" size="large" placeholder="请输入标题" />
                        </a-form-item> -->
                        <a-form-item label="标识" field="beforename">
                            <a-input type="text" v-model="item.beforename" size="large" placeholder="请输入标识">
                                <template #append>{{item.aftername}}</template>
                            </a-input>
                        </a-form-item>
                        <a-form-item label="类型">
                            <a-select v-model="item.type" size="large" placeholder="请选择">
                                <a-option v-for="(value,key) in formtypes" :key="key" :label="value" :value="key"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item v-if="item.type=='dns'" label="端口" field="port">
                            <a-input type="number" v-model="item.port" size="large" />
                        </a-form-item>
                        <a-form-item v-if="item.type=='dns'" label="协议">
                            <a-select v-model="item.protocol">
                                <a-option label="HTTP" value="HTTP"></a-option>
                                <a-option label="HTTPS" value="HTTPS"></a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item :label="formtypes[item.type]" field="domains">
                            <div class="df df-c" style="flex:1;">
                                <div v-for="(dm,index) in item.domains" :key="index" class="df ai-c" style="margin-bottom:10px;">
                                    <a-input v-model="dm.value" type="text" size="large" style="width:700px;" :placeholder="typePh[item.type]" />
                                    <div>
                                        <span @click="item.domains.length<=1?item.domains=[{value:''}]:item.domains.splice(index,1)" class="ml-10 cursor c-blue">删除</span>
                                        <span v-if="index+1==item.domains.length" @click="item.domains.push({value:''})" class="ml-10 cursor c-blue">添加</span>
                                    </div>
                                </div>
                                <div class="c-99">填写多个地址后，每次请求将按负载均衡策略转发到某个地址上</div>
                            </div>
                        </a-form-item>
                    </a-form>
                </a-tab-pane>
            </a-tabs>
        </a-drawer>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore, useLoadingStore } from '@/store';

import { getPermission } from '@/utils/auth';
import { getUserInfo } from '@/utils/auth';

let dataTemplate = {
    "apiVersion": "networking.higress.io/v1",
    "kind": "McpBridge",
    "metadata": {
        "name": "default",
        // "namespace": "higress-system",
    },
    "spec": {
        "registries": [
            {
                "domain": "127.0.0.1:80",
                "name": "abc",
                "port": 80,
                "type": "static"
            }
        ]
    }
}

export default {
    data(){
        return {
            namespaceActive: '',
            list: [],
            data: [],
            formtypes: {
                dns: '目标域名',
                static: '目标IP',
            },
            form: {
                show: false,
                name: '',
                edit_index: 0,
                form: [],
            },
            rules: {
                // title: [{required:true, message:'标题不能为空'}],
                beforename: [{required:true, message:'标识不能为空'}],
                port: [{required:true, message:'请输入端口'}],
                domains:[{required:true, validator: (value, cb) => {
                    if(value.filter(i=>i.value).length==0){cb('目标地址不能为空'); return}
                    cb();
                }}]
            },
            typePh: {
                // static: 'ip:port (多个地址请以换行分割)',
                // dns: '服务域名 (多个域名请以换行分割)',
                static: '请输入目标IP（ip:port）',
                dns: '请输入目标域名',
            },
            domains: [],
            yamlData: {
                show: false,
            },
            permission: [],
            debug: false,

            whiteList: [],
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
        this.getWhiteList();
    },
    components: {yamlDrawer},
    methods: {
        async getWhiteList(){
            let userInfo = getUserInfo();
            let wl = userInfo?.['w7.cc/domain-white-list'] || '[]';
            wl = JSON.parse(wl);
            if(wl.length){
                this.whiteList = wl?.filter(i=>!i.disabled);
            }
            return;
            return new Promise((resolve,reject)=>{
                let userInfo = getUserInfo();
                let wl = userInfo?.['w7.cc/domain-white-list'] || '[]';
                wl = JSON.parse(wl);
                if(wl.length){
                    this.whiteList = wl?.filter(i=>!i.disabled);
                    resolve();
                    return;
                }
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{noAlert:true}).then(res=>{
                    if(!res?.data){return}
                    let list = [];
                    try{
                        list = JSON.parse(res?.data?.data?.whiteList)?.filter(i=>!i.disabled)
                    }catch{}
                    this.whiteList = list;
                }).finally(()=>{
                    resolve();
                })
            })
        },
        
        matchWhiteDomain(domain){
            if(domain && this.whiteList.length){
                // -1代表域名与白名单不匹配，不能修改 / 修改必须匹配白名单
                let whiteDomain = -1;
                let whitelist = this.whiteList.map(i=>i.domain);
                const parts = domain.split('.').reverse();
                const n = parts.length;
                let dm = domain;
                for (let i = 0; i < n; i++) {
                    const suffix = parts.slice(0, i + 1).reverse().join('.');
                    const index = whitelist.indexOf(suffix);
                    if (index !== -1) {
                        whiteDomain = index;
                        dm = domain.replace(new RegExp(whitelist[index]+'$'),'');
                        dm = dm.replace(/\.$/,'');
                    }
                }
                domain = dm;
                return {
                    domain: domain,
                    whiteDomain: whiteDomain,
                }
            }else{
                return {
                    domain: domain,
                    whiteDomain: -1,
                }
            }
        },
        openYaml(name){
            k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges/'+name).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        formAddItem(){
            let symbol = this.form.name?.match(/-[^-]+$/)?.[0] || ('-' + this.form.name);
            this.form.form.push({
                crtDomain: '',
                whiteDomain: this.whiteList?.length? 0 : -1,
                crtSsl: false,
                type: 'dns',
                domains: [{value:''}],
                protocol: 'HTTP',
                port: 80,
                beforename: this.createName(6),
                aftername: symbol,
            });
            this.form.edit_index = this.form.form.length - 1;
        },
        toDomain(row){
            this.$router.push('/app/rvproxy-domain?name='+row.name)
        },
        getData(){
            k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges',{loading:true}).then(res => {
                // if(!res?.data?.items?.length){
                //     k8sproxy.post('/apis/networking.higress.io/v1/namespaces/higress-system/mcpbridges', dataTemplate,{loading:true}).then(res => {
                //         this.getData();
                //     });
                //     return;
                // }
                let data = res?.data?.items || [];
                this.data = data;
                let list = data.filter(i=>i.metadata.name!='default').map(i=>{
                    let sr = i.spec?.registries || {};
                    let host = [];
                    let labels = [];
                    sr.map(i=>{
                        let h = i.domain.split(',').map(i=>i?.trim()).filter(i=>i)
                        host=host.concat(h);
                        labels.push(i.name+'.'+i.type);
                    });
                    return {
                        name: i.metadata.name,
                        host: host,
                        labels: labels,
                        sr: sr,
                    }
                })
                this.list = list;
            }).then(()=>{
                return k8sproxy.get('/apis/networking.k8s.io/v1/ingresses?labelSelector=higress.io/resource-definer=higress')
            }).then(res=>{
                this.domains = res?.data?.items || [];

                this.list.map(i=>{
                    i.md = this.domains.filter(d=>{
                        let bs = d?.metadata?.annotations?.['higress.io/destination'];
                        return i.labels.includes(bs);
                    })?.map(i=>{
                        let host = i?.spec?.rules?.[0]?.host;
                        let path = i?.spec?.rules?.[0]?.http?.paths?.[0]?.path;
                        path = path=='/'? '' : path;
                        let ssl = i?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                        return (ssl?'https://':'http://') + host + path;
                    });
                    // i.md = Array.from(new Set(i.md)) || [];
                })
                // console.log(this.list);
            });
        },
        openForm(row){
            if(!row){
                let name = this.createName(6);
                this.form = {
                    show: true,
                    is_create: true,
                    name: name,
                    edit_index: 0,
                    form: [{
                        type: 'dns',
                        beforename: this.createName(6),
                        aftername: '-' + name,
                        port: 80,
                        crtDomain: '',
                        whiteDomain: this.whiteList?.length? 0 : -1,
                        protocol: 'HTTP',
                        domains: [{value:''}],
                    }],
                };
                return;
            }else{
                let form = row.sr.map(i=>{
                    let domains = i.domain.split(",").map(i=>({value:i}));
                    domains = domains.length? domains : [{value:''}];
                    let matchName = i.name?.match(/^(.+)(\-[^-]+)$/);
                    return {
                        type: i.type,
                        name: i.name,
                        beforename: matchName?.[1] || this.createName(6),
                        aftername: matchName?.[2] || ('-'+row.name),
                        port: i?.port || 80,
                        // domain: .join("\n"),
                        protocol: i.protocol || 'HTTP',
                        domains: domains,
                        // title: i.title,
                    }
                })
                this.form = {
                    show: true,
                    is_create: false,
                    name: row.name,
                    edit_index: 0,
                    form: form,
                }
            }
        },
        async toDelete(row){
            useLoadingStore().loading = true;
            for(let i in row.sr){
                let old = row.sr[i];
                let domainarr = this.domains.filter(d=>{
                    let bs = d?.metadata?.annotations?.['destination'];
                    return bs == old?.name;
                })
                for(let i=0; i<domainarr.length; i++){
                    let d = domainarr[i];
                    await k8sproxy.delete('/apis/networking.k8s.io/v1/namespaces/'+d.metadata.namespace+'/ingresses/'+d.metadata.name, {noAlert:true})
                }
            }
            k8sproxy.delete('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges/'+row.name).then(res => {
                this.$message.success('操作成功');
                this.getData();
            }).finally(()=>{
                useLoadingStore().loading = false;
            })
        },
        toDeleteItem(index){
            this.form.form.splice(index,1)
            if(this.form.edit_index>=index){this.form.edit_index--}
        },
        validate(){
            let success = 0;
            for(let i in this.form.form){
                this.$refs['form'+i][0].validate(err=>{
                    if(err){
                        this.form.edit_index = Number(i);
                        return;
                    }
                    success++;
                    if(success==this.form.form.length){
                        this.submit();
                    }
                })
            }
        },
        submit(){
            let data = null;
            if(!this.form.is_create){
                data = this.data.find(i=>i.metadata.name==this.form.name);
                data = JSON.parse(JSON.stringify(data));
                this.editDomainType(data);
            }else{
                data = JSON.parse(JSON.stringify(dataTemplate));
                data.metadata.name = this.form.name;
            }
            let sr = this.form.form.map(i=>{
                let o = {
                    // title: i.title ,
                    domain: i.domains?.map(i=>i.value).join(','), //i.domain.split('\n').filter(i=>i).join(','),
                    name: i.beforename + i.aftername,
                    type: i.type,
                }
                if(i.type=='dns'){
                    o.protocol = i.protocol;
                    o.port = Number(i.port) || 80;
                }
                return o;
            })
            data.spec.registries = sr;
            
            if(!this.form.is_create){
                k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges/'+data.metadata.name, data, {loading:true}).then(res => {
                    this.$message.success('操作成功');
                    this.getData();
                    this.form.show = false;
                });
            }else{
                k8sproxy.post('/apis/networking.higress.io/v1/namespaces/'+this.namespaceActive+'/mcpbridges', data, {loading:true}).then(async res => {    
                    useLoadingStore().loading = true;
                    for(let i in this.form.form){
                        let item = this.form.form[i];
                        let fullDomain = item.crtDomain;
                        if(item.whiteDomain>-1){
                            fullDomain = item.crtDomain.replace(/\.$/,'') + '.' + this.whiteList?.[item.whiteDomain]?.domain;
                        }
                        if(!fullDomain){continue}
                        try{
                            await this.createDomain({
                                name: item.beforename + item.aftername,
                                type: item.type,
                                domain: fullDomain,
                                auto_ssl: item.crtSsl,
                            })
                        }catch{}
                    }
                    useLoadingStore().loading = false;
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.getData();
                    this.form.show = false;
                });
            }
        },
        createDomain(o){
            let backend = {
                "resource": {
                    "apiGroup": "networking.higress.io",
                    "kind": "McpBridge",
                    "name": "default"
                }
            };
            let data = {
                apiVersion: 'networking.k8s.io/v1',
                kind: 'Ingress',
                metadata: {
                    name: 'ing-'+this.createName(),
                    namespace: this.namespaceActive,
                    annotations: {
                        'kubernetes.io/ingress.class': 'higress',
                        'higress.io/resource-definer': 'higress',
                    },
                    labels: {
                        'higress.io/resource-definer': 'higress',
                    },
                },
                spec: {
                    rules: [
                        {
                            host: o.domain,
                            http: {
                                paths: [
                                    {
                                        path: '/',
                                        pathType: 'Prefix',
                                        backend: backend,
                                    },
                                ],
                            },
                        },
                    ],
                },
            }
            if(o.auto_ssl){
                data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                data.metadata.annotations['higress.io/ssl-redirect'] = 'false';
                data.spec.tls = [{
                    hosts: [o.domain],
                    secretName:  this.domainToname(o.domain) + "-tls-secret"
                }]
            }

            data.metadata.annotations['higress.io/destination'] = o.name + '.' + o.type;
            data.metadata.annotations['destination'] = o.name;
            data.metadata.labels['higress.io/destination'] = o.name + '.' + o.type;
            data.metadata.labels['destination'] = o.name;
            
            return k8sproxy.post("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses", data)
        },
        // 修改类型同时修改域名的类型
        async editDomainType(data){
            let sr = data.spec.registries || [];
            for(let i in sr){
                let old = sr[i];
                let domainarr = this.domains.filter(d=>{
                    let bs = d?.metadata?.annotations?.['destination'];
                    return bs == old?.name;
                })
                
                let o = this.form.form?.find(ff=>{
                    return (ff.beforename + ff.aftername) == old.name;
                });
                if(!o){
                    for(let i=0; i<domainarr.length; i++){
                        let d = domainarr[i];
                        await k8sproxy.delete('/apis/networking.k8s.io/v1/namespaces/'+d.metadata.namespace+'/ingresses/'+d.metadata.name, {noAlert:true})
                    }
                }else{
                    for(let i=0; i<domainarr.length; i++){
                        let d = domainarr[i];
                        let annotations = d.metadata.annotations;
                        let labels = d.metadata.labels;
                        
                        let thisType = annotations?.['higress.io/destination']?.replace(/^[^.]*\.$/,'');
                        if(thisType==o.type){continue}

                        annotations['higress.io/destination'] = o.name + '.' + o.type;
                        annotations['destination'] = o.name;
                        labels['higress.io/destination'] = o.name + '.' + o.type;
                        labels['destination'] = o.name;

                        await k8sproxy.patch('/apis/networking.k8s.io/v1/namespaces/'+d.metadata.namespace+'/ingresses/'+d.metadata.name, {
                            metadata: {
                                annotations: annotations,
                                labels: labels,
                            }
                        },{
                            headers: {'Content-Type': 'application/merge-patch+json'},
                            loading: true,
                            noAlert: true,
                        });
                    }
                }
            }
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
        domainToname(str){
            return str.replace(/\*/g,'x').replace(/(\.|\/|_)/g,'-').toLowerCase();
        },
    }
}
</script>

<style>

</style>