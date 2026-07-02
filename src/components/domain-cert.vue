<template>
    <!-- 证书 -->
    <a-drawer :width="800" :visible="tlsForm.show" @ok="submitTls" @cancel="closeDrawer" :popup-container="$popupContainer">
        <template #title>证书</template>
        <a-form :model="tlsForm" ref="tlsForm" auto-label-width class="padding-20" >
            <a-form-item label="域名">
                <div class="df df-c">
                    <a-select v-model="tlsForm.domainName" @change="v=>getSecrets(v)">
                        <a-option v-for="item in tlsForm.list" :key="item.name" :label="(item.autoSsl?'https://':'http://')+item.domain" :value="item.name"></a-option>
                    </a-select>
                    <!-- <a-input v-model="tlsForm.domain" disabled></a-input> -->
                    <div class="df ai-c mt-16">
                        <a-checkbox v-model="tlsForm.auto_ssl">自动https</a-checkbox>
                        <span v-if="tlsForm.testStatus && tlsForm.auto_ssl" class="ml-10">
                            <icon-check-circle v-if="tlsForm.testStatus.status=='success'" class="c-green fs-16"/>
                            <span v-else-if="tlsForm.testStatus.status=='warning'" class="df ai-c">
                                <icon-info-circle class="c-orange fs-16"/>
                                <span class="c-orange ml-2">签发中</span>
                            </span>
                            <span v-else-if="tlsForm.testStatus.status=='issuing'" class="df ai-c">
                                <icon-info-circle class="c-orange fs-16"/>
                                <span class="c-orange ml-2">获取中</span>
                            </span>
                            <a-popover v-else-if="tlsForm.testStatus.status=='error'" position="bottom">
                                <span class="cursor df ai-c" @click="retryTestStatus">
                                    <icon-close-circle class="c-red lh-1 fs-16"/>
                                    <span class="c-red ml-2 lh-1 fs-12">重试</span>
                                </span>
                                <template #content>
                                    <div>时间：{{ tlsForm.testStatus.time }}</div>
                                    <div>原因：{{ tlsForm.testStatus.reason }}</div>
                                </template>
                            </a-popover>
                        </span>
                        <span class="c-99 ml-10">（如果您想使用自有证书，请先关闭https功能）</span>
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
import dayjs from 'dayjs';

const AUTO_SSL_ISSUER = 'w7-letsencrypt-prod';
const AUTO_SSL_RENEW_BEFORE = '30m';

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

const getDefaultTlsForm = () => ({
    show: false,
    list: [],
    auto_ssl: false,
    domainName: "",
    domain: "",
    tlsName: "",
    crt: "",
    key: "",
    redirect: false,
    exist: false,
    testStatus: null,
});

export default {
    name: 'DomainCert',
    props: {
        data: {
            type: Object,
            default: null,
        },
        dataList: {
            type: Array,
            default: () => [],
        },
        domainList: {
            type: Array,
            default: () => [],
        },
        namespace: {
            type: String,
            default: '',
        },
    },
    emits: ['success', 'close'],
    data(){
        return {
            namespaceActive: '',
            localDataList: [],
            localDomainList: [],
            tlsForm: getDefaultTlsForm(),
        }
    },
    created(){
        this.namespaceActive = this.namespace || useNamespaceStore().namespace;
        if(this.data){this.domainCert(this.data)}
    },
    watch: {
        namespace(v){
            this.namespaceActive = v || useNamespaceStore().namespace;
        },
        data: {
            handler(v){
                if(v){this.domainCert(v)}
            },
            deep: true,
        },
    },
    methods: {
        open(item, options = {}){
            if(!item){return}
            this.namespaceActive = options.namespace || this.namespace || this.namespaceActive || useNamespaceStore().namespace;
            this.localDataList = options.dataList || this.dataList || this.localDataList || [];
            this.localDomainList = options.domainList || this.domainList || this.localDomainList || [];

            let children = item?.children?.map?.(i=>({
                name: item.name+'-'+i.name,
                domain: i.host,
                parent: item.name,
                autoSsl: i.autoSsl,
                sslRedirect: i.sslRedirect,
            })) || [];

            this.tlsForm = {
                ...getDefaultTlsForm(),
                list: [
                    ...children,
                    {
                        name: item.name,
                        domain: item?.domain || item?.host,
                        autoSsl: item?.is_auto_ssl || item?.autoSsl || false,
                        sslRedirect: item?.redirect || item?.sslRedirect || false,
                    },
                ],
                domainName: item?.name || "",
                domain: item?.domain || item?.host || "",
                tlsName: item?.secretName || "",
                auto_ssl: item?.is_auto_ssl || item?.autoSsl || false,
                redirect: item?.redirect || item?.sslRedirect || false,
            };
            this.getSecrets(this.tlsForm.domainName);
        },
        async domainCert(data){
            if(!data){return}
            let domainName = data?.domainName || data?.name;
            if(!domainName){return}

            this.namespaceActive = data?.namespace || this.namespace || this.namespaceActive || useNamespaceStore().namespace;
            let domain = null;
            let ingressList = [];

            await Promise.all([
                k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/' + domainName,{loading:true}).then(res=>{
                    domain = res?.data || null;
                }),
                k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses', {noAlert:true}).then(res=>{
                    ingressList = res?.data?.items || [];
                }).catch(()=>{}),
            ]);

            if(!domain){return}
            if(!ingressList.find(i=>i?.metadata?.name == domain?.metadata?.name)){
                ingressList.push(domain);
            }
            this.localDataList = ingressList;

            let host = domain?.spec?.rules?.[0]?.host;
            let autoSsl = domain?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == AUTO_SSL_ISSUER;
            let sslRedirect = domain?.metadata?.annotations?.['w7.cc/ssl-redirect'] == 'true';
            let secretName = domain?.spec?.tls?.[0]?.secretName || '';
            let children = this.parseChildren(domain);

            this.localDomainList = [{
                name: domain.metadata.name,
                children: children,
            }];

            this.open({
                name: domain.metadata.name,
                domain: host,
                host: host,
                children: children,
                secretName: secretName,
                is_auto_ssl: autoSsl,
                redirect: sslRedirect,
            }, {
                dataList: this.localDataList,
                domainList: this.localDomainList,
                namespace: this.namespaceActive,
            });
        },
        closeDrawer(){
            this.tlsForm.show = false;
            this.$emit('close');
        },
        parseChildren(domain){
            try{
                let children = JSON.parse(domain?.metadata?.annotations?.['w7.cc/child-hosts'] || '[]');
                return Array.isArray(children) ? children : [];
            }catch(e){
                return [];
            }
        },
        domainToname(str){
            return (str || '').replace(/\*/g,'x').replace(/(\.|\/|_)/g,'-').toLowerCase();
        },
        getIngressList(){
            let map = new Map();
            let list = [
                ...(this.localDataList || []),
                ...(this.dataList || []),
            ];
            list.forEach(i=>{
                if(!i?.metadata?.name){return}
                if(!map.has(i.metadata.name)){
                    map.set(i.metadata.name, i);
                }
            })
            return [...map.values()];
        },
        findIngress(name){
            return this.getIngressList().find(i=>i?.metadata?.name == name);
        },
        findDomainItem(name){
            let list = [
                ...(this.localDomainList || []),
                ...(this.domainList || []),
            ];
            return list.find(i=>i?.name == name);
        },
        async fetchIngress(name){
            if(!name){return null}
            let {data} = await k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+ this.namespaceActive +'/ingresses/' + name,{loading:true});
            if(data){
                let index = this.localDataList.findIndex(i=>i?.metadata?.name == data?.metadata?.name);
                if(index >= 0){
                    this.localDataList.splice(index, 1, data);
                }else{
                    this.localDataList.push(data);
                }
            }
            return data || null;
        },
        getCertificateStatus(data){
            let readyItem = data?.status?.conditions?.find?.(i=>i.type == 'Ready');
            let status = 'warning';
            let failedIssuanceAttempts = data?.status?.failedIssuanceAttempts;

            if(readyItem && String(readyItem.status).toLowerCase() == 'true'){
                status = 'success';
            }else{
                if(failedIssuanceAttempts > 0){
                    status = 'error'
                }else{
                    status = 'issuing';
                }
            }

            return {
                status: status,
                reason: readyItem?.message || '',
                time: dayjs(readyItem?.lastTransitionTime || '').format('YYYY-MM-DD HH:mm:ss'),
            };
        },
        loadCertificateStatus(secretName){
            if(!secretName){return}
            return k8sproxy.get('/apis/cert-manager.io/v1/namespaces/'+ this.namespaceActive +'/certificates/'+secretName, {noAlert:true,loading:true}).then(res=>{
                this.tlsForm = {
                    ...this.tlsForm,
                    testStatus: this.getCertificateStatus(res?.data),
                }
            }).catch(()=>{
                this.tlsForm = {
                    ...this.tlsForm,
                    testStatus: null,
                }
            })
        },
        async retryTestStatus(){
            let operation1 = [{
                op: 'remove',
                path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
            },{
                op: 'remove',
                path: '/metadata/annotations/cert-manager.io~1renew-before',
            }]
            let operation2 = [{
                op: 'replace',
                path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                value: AUTO_SSL_ISSUER
            },{
                op: 'replace',
                path: '/metadata/annotations/cert-manager.io~1renew-before',
                value: AUTO_SSL_RENEW_BEFORE
            }];
            let url = "/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+this.tlsForm.domainName;

            useLoadingStore().loading = true;

            await k8sproxy.patch(url, operation1,{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(()=>{}).catch(()=>{})

            await new Promise(r => setTimeout(r, 2000));

            await k8sproxy.patch(url, operation2, {
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(()=>{}).catch(()=>{})

            useLoadingStore().loading = false;

            this.loadCertificateStatus(this.tlsForm.tlsName);
        },
        getSecrets(name){
            let o = {
                crt: '',
                key: '',
                exist: false,
                show: true,
                testStatus: null,
            }

            this.tlsForm.domainName = name;
            let inChild = this.tlsForm.list.find(i=>i.name==name) || {};
            let data = this.findIngress(inChild.parent || name);
            let secretName = "";

            if(inChild.parent){
                this.tlsForm.auto_ssl = inChild.autoSsl;
                this.tlsForm.redirect = inChild.sslRedirect;
                this.tlsForm.domain = inChild.domain;
                secretName = this.domainToname(this.tlsForm.domain) + "-tls-secret";
            }else{
                let is_auto_ssl = data?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == AUTO_SSL_ISSUER;
                let redirect = data?.metadata?.annotations?.['w7.cc/ssl-redirect'] == 'true';

                this.tlsForm.auto_ssl = is_auto_ssl;
                this.tlsForm.redirect = redirect;

                this.tlsForm.domain = data?.spec?.rules?.[0]?.host || inChild.domain;
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

            this.tlsForm = {
                ...this.tlsForm,
                ...o,
            }

            this.loadCertificateStatus(secretName);
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+secretName, {noAlert:true,loading:true}).then(res=>{
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
        getParentChildren(parentName){
            let parent = this.findDomainItem(parentName);
            if(parent?.children?.length){
                return JSON.parse(JSON.stringify(parent.children));
            }

            let parentIngress = this.findIngress(parentName);
            return this.parseChildren(parentIngress);
        },
        updateLocalChildren(parentName, children){
            let parent = this.findDomainItem(parentName);
            if(parent){
                parent.children = JSON.parse(JSON.stringify(children));
            }

            let parentIngress = this.findIngress(parentName);
            if(parentIngress){
                parentIngress.metadata = parentIngress.metadata || {};
                parentIngress.metadata.annotations = parentIngress.metadata.annotations || {};
                parentIngress.metadata.annotations['w7.cc/child-hosts'] = JSON.stringify(children);
            }
        },
        getAutoSslOperation(data){
            let operation = [];
            if(this.tlsForm.auto_ssl != (data?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == AUTO_SSL_ISSUER)){
                if(this.tlsForm.auto_ssl){
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1cluster-issuer',
                        value: AUTO_SSL_ISSUER
                    })
                    operation.push({
                        op: 'replace',
                        path: '/metadata/annotations/cert-manager.io~1renew-before',
                        value: AUTO_SSL_RENEW_BEFORE
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
            return operation;
        },
        async submitTls(){
            let selected = this.tlsForm?.list?.find?.(i=>i.name==this.tlsForm.domainName) || {};
            let parentName = selected?.parent;
            let data = this.findIngress(parentName || this.tlsForm.domainName);

            if(!data){
                data = await this.fetchIngress(parentName || this.tlsForm.domainName).catch(()=>null);
            }
            if(!data){
                console.log('no domain', this.tlsForm.domainName)
                return;
            }

            let operation = [];
            this.tlsForm.tlsName = this.tlsForm.tlsName || (this.domainToname(this.tlsForm.domain) + "-tls-secret");

            if(!parentName){
                operation = operation.concat(this.getAutoSslOperation(data));
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
            }

            // 修改证书
            let formdata = JSON.parse(JSON.stringify(this.tlsForm.exist || templateData));
            formdata.metadata = formdata.metadata || {};
            formdata.metadata.annotations = formdata.metadata.annotations || {};
            if(!formdata.metadata.annotations.title){
                formdata.metadata.annotations.title = this.tlsForm.domainName;
            }
            formdata.metadata.name = this.tlsForm.tlsName;
            formdata.metadata.namespace = this.namespaceActive;
            formdata.data = formdata.data || {};
            formdata.data['tls.crt'] = btoa(this.tlsForm.crt);
            formdata.data['tls.key'] = btoa(this.tlsForm.key);

            if(parentName){
                let children = this.getParentChildren(parentName);
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
                    }).then(()=>{
                        this.updateLocalChildren(parentName, children);
                    }).catch(()=>{})
                }
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
                }).then(()=>{
                    this.$message.success("操作成功");
                    this.tlsForm.show = false;
                    this.$emit('success');
                })
            }else{
                this.$message.success("操作成功")
                this.tlsForm.show = false;
                this.$emit('success');
            }
        },
        // 设置子域名证书
        setSubdomainTls(){
            useLoadingStore().loading = true;
            let list = this.getIngressList().filter(i=>i?.metadata?.labels?.parents==this.tlsForm.domainName)

            return Promise.all(list.map(i=>{
                let data = JSON.parse(JSON.stringify(i))
                let operation = [];

                operation = operation.concat(this.getAutoSslOperation(data));
                operation.push({
                    op: 'replace',
                    path: '/spec/tls',
                    value: [{
                        hosts: [data?.spec?.rules?.[0]?.host,],
                        secretName: this.tlsForm.tlsName,
                    }]
                })
                operation.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1ssl-redirect',
                    value: this.tlsForm.redirect? 'true' : 'false'
                })
                return k8sproxy.patch("/apis/networking.k8s.io/v1/namespaces/"+ this.namespaceActive +"/ingresses/"+data.metadata.name, operation, {
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            })).finally(()=>{
                useLoadingStore().loading = false;
            });
        },
    }
}
</script>
