<template>
    <!-- 证书 -->
    <a-drawer :width="800" :visible="tlsForm.show" @ok="submitTls" @cancel="tlsForm.show=false;" :popup-container="$popupContainer">
        <template #title>证书</template>
        <a-form :model="tlsForm" ref="tlsForm" auto-label-width class="padding-20" >
            <a-form-item label="域名">
                <div class="df df-c">
                    <a-select v-model="tlsForm.domainName" @change="v=>getSecrets(v)">
                        <a-option v-for="item in tlsForm.list" :key="item.name" :label="(item.autoSsl?'https://':'http://')+item.domain" :value="item.name"></a-option>
                    </a-select>
                    <!-- <a-input v-model="tlsForm.domain" disabled></a-input> -->
                    <div>
                        <a-checkbox v-model="tlsForm.auto_ssl" class="mt-16">自动https</a-checkbox>
                        <span class="c-99">（如果您想使用自有证书，请先关闭https功能）</span>
                    </div>
                </div>
            </a-form-item>
            <a-form-item label="证书（crt文件）">
                <a-textarea v-model="tlsForm.crt" :disabled="tlsForm.auto_ssl" placeholder="请输入" style="height:120px;" :spellcheck="false" allow-clear/>
            </a-form-item>
            <a-form-item label="私钥（key文件）">
                <a-textarea v-model="tlsForm.key" :disabled="tlsForm.auto_ssl" placeholder="请输入" style="height:120px;" :spellcheck="false" allow-clear/>
            </a-form-item>
            <a-form-item label="强制跳转">
                <a-switch v-model="tlsForm.redirect" >强制跳转</a-switch>
                <div class="c-99 ml-10">根据配置将用户访问强制跳转为https或http</div>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
<script>
import { k8sproxy } from '@/utils/api';
    

import { useNamespaceStore, useLoadingStore } from '@/store';

const templateData = {
    data: {
        "tls.crt": "",
        "tls.key": "",
    },
    metadata:{
        annotations: {
            title: "",
        },
        name: '',
        namespace: '',
    },
    type: "kubernetes.io/tls",
}
export default{
    props: ['data'],
    data(){
        return {
            namespaceActive: '',
            tlsForm: {
                show: false,
                list: [],
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        if(this.data){this.domainCert(this.data)}
    },
    watch: {
        data(){this.domainCert(this.data)}
    },
    methods: {
        async domainCert(data){
            if(!data){return}
            let {data:domain} = await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/' + data.domainName,{loading:true});
            this.tlsForm.domainData = domain;
            
            let host = domain?.spec?.rules?.[0]?.host;
            let autoSsl = domain?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
            let sslRedirect = domain?.metadata?.annotations?.['w7.cc/ssl-redirect'] == 'true';
            let secretName = domain?.spec?.tls?.[0]?.secretName || '';

            this.tlsForm.domainName = data.domainName;
            this.tlsForm.auto_ssl = autoSsl;
            this.tlsForm.redirect = sslRedirect;
            this.tlsForm.tlsName = secretName || "";

            let list = [{name:data.domainName, domain:host, autoSsl:autoSsl, sslRedirect:sslRedirect}];
            let children = [];
            try{
                children = JSON.parse(domain.metadata.annotations?.['w7.cc/child-hosts'])
            }catch{}
            children.map(c=>{
                list.push({
                    name: data.domainName+'-'+c.name,
                    domain: c.host,
                    parent: data.domainName,
                    autoSsl: c.autoSsl,
                    sslRedirect: c.sslRedirect,
                })
            })
            this.tlsForm.list = list;
            
            this.getSecrets(data.domainName);
        },
        domainToname(str){
            return str.replace(/\*/g,'x').replace(/(\.|\/|_)/g,'-').toLowerCase();
        },
        getSecrets(name){
            let o = {
                crt: '',
                key: '',
                exist: false,
                show: true,
            }

            let data = this.tlsForm.domainData;
            let inChild = this.tlsForm.list.find(i=>i.name==name);
            let secretName = "";

            if(inChild.parent){
                this.tlsForm.auto_ssl = inChild.autoSsl;
                this.tlsForm.redirect = inChild.sslRedirect;
                this.tlsForm.domain = inChild.domain;
                secretName = this.domainToname(this.tlsForm.domain) + "-tls-secret";
            }else{
                
                this.tlsForm.auto_ssl = data?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                this.tlsForm.redirect = data?.metadata?.annotations?.['w7.cc/ssl-redirect'] == 'true';
                this.tlsForm.domain = data?.spec?.rules?.[0]?.host;

                secretName = data?.spec?.tls?.[0]?.secretName || '';
            }
            this.tlsForm.tlsName = secretName || "";

            if(!secretName){
                this.tlsForm = {
                    ...this.tlsForm,
                    ...o,
                }
                return;
            }
            
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/'+secretName, {noAlert:true,loading:true}).then(res=>{
                if(!res?.data){return}
                this.tlsForm.crt = atob(res?.data?.data?.['tls.crt'] || '');
                this.tlsForm.key = atob(res?.data?.data?.['tls.key'] || '');
                this.tlsForm.exist = res.data;
                this.tlsForm.show = true;
            }).catch(()=>{
                this.tlsForm = {
                    ...this.tlsForm,
                    ...o,
                }
            })
        },
        async submitTls(){
            let {data} = await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/' + this.tlsForm.domainName,{loading:true});
            
            if(!data){
                console.log('no domain', this.tlsForm.domainName)
                return;
            }

            let operation = [];
            this.tlsForm.tlsName = this.tlsForm.tlsName || (this.domainToname(this.tlsForm.domain) + "-tls-secret");

            let parentName = this.tlsForm?.list?.find?.(i=>i.name==this.tlsForm.domainName)?.parent;
            
            // 自动https
            if(this.tlsForm.auto_ssl != (data?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod')){
                if(this.tlsForm.auto_ssl){
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                        value: 'w7-letsencrypt-prod'
                    })
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1renew-before',
                        value: '30m'
                    })
                }else{
                    operation.push({
                        op: 'remove',
                        path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                    })
                    operation.push({
                        op: 'remove',
                        path: '/metadata/annotations/cert-manager.io~1renew-before',
                    })
                }
            }
            operation.push({
                op: 'replace',
                path: '/spec/tls',
                value: [{
                    hosts: [data?.spec?.rules?.[0]?.host,],
                    secretName: this.tlsForm.tlsName,
                }]
            })
            // 强制跳转
            // data.metadata.annotations['w7.cc/ssl-redirect'] = this.tlsForm.redirect? 'true' : 'false';
            operation.push({
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1ssl-redirect',
                value: this.tlsForm.redirect? 'true' : 'false'
            })
            // 修改证书
            let formdata = JSON.parse(JSON.stringify(this.tlsForm.exist || templateData));
            if(!formdata.metadata.annotations.title){
                formdata.metadata.annotations.title = this.tlsForm.domainName;
            }
            formdata.metadata.name = this.tlsForm.tlsName;
            formdata.data['tls.crt'] = btoa(this.tlsForm.crt);
            formdata.data['tls.key'] = btoa(this.tlsForm.key);

            
            let children = [];
            if(parentName){
                try{
                    children = JSON.parse(this.tlsForm.domainData.metadata.annotations?.['w7.cc/child-hosts']);
                }catch{}
            }
            
            if(children.length){
                children.map(i=>{
                    if(parentName+'-'+i.name!==this.tlsForm.domainName){return}
                    i.autoSsl = this.tlsForm.auto_ssl;
                    i.sslRedirect = this.tlsForm.redirect;
                })
                await k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+parentName,[{
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1child-hosts',
                    value: JSON.stringify(children)
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(()=>{}).catch(()=>{})
            }

            let exist = false;
            try {
                await k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+this.tlsForm.tlsName, {noAlert:true})
                exist = true;
            }catch(e){}
            if(exist){
                await k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+this.tlsForm.tlsName, formdata, {loading:true})
            }else{
                await k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/secrets', formdata, {loading:true})
            }
            
            if(!parentName){
                k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.tlsForm.domainName, operation,{
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(()=>{
                    return this.setSubdomainTls();
                }).then(res=>{
                    this.$message.success("操作成功");
                    this.tlsForm.show = false;
                })
            }else{
                this.$message.success("操作成功")
                this.tlsForm.show = false;
            }
        },
        // 设置子域名证书
        setSubdomainTls(){
            useLoadingStore().loading = true;
            let list = [];
            try{
                list = JSON.parse(this.tlsForm.domainData.metadata.annotations?.['w7.cc/child-hosts'])
            }catch{}
            return Promise.all(list.map(i=>{
                
                let operation = [];

                if(this.tlsForm.auto_ssl){
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                        value: 'w7-letsencrypt-prod'
                    })
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1renew-before',
                        value: '30m'
                    })
                }else{
                    operation.push({
                        op: 'remove',
                        path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                    })
                    operation.push({
                        op: 'remove',
                        path: '/metadata/annotations/cert-manager.io~1renew-before',
                    })
                }
                operation.push({
                    op: 'replace',
                    path: '/spec/tls',
                    value: [{
                        hosts: [i?.host,],
                        secretName: this.tlsForm.tlsName,
                    }]
                })
                operation.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1ssl-redirect',
                    value: this.tlsForm.redirect? 'true' : 'false'
                })
                return k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+ this.tlsForm.domainName +'-'+ i.name, operation, {
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            })).finally(()=>{
                useLoadingStore().loading = false;
            });
        },
    }
}
</script>
<style scoped>
</style>