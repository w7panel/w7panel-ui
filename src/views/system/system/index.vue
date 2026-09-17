<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="padding-20 bg-white">
            <a-tabs v-model:active-key="tab">
                <a-tab-pane key="4" title="域名解析记录"></a-tab-pane>
                <a-tab-pane v-if="isChildCluster" key="6" title="登录配置"></a-tab-pane>
            </a-tabs>
            <div v-if="tab=='1'">
                <a-form ref="register" :model="register" auto-label-width class="padding-20">
                    <!-- <a-form-item label="默认权限">
                        <a-select v-model="register.defaultPermissionName" placeholder="请选择">
                            <a-option v-for="item in permissionPackageList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                        </a-select>
                    </a-form-item> -->
                    <a-form-item label="开启注册">
                        <a-switch v-model="register.allowConsoleRegister"></a-switch>
                    </a-form-item>
                    <!-- <a-form-item label="上架微擎云市场">
                        <a-switch v-model="register.showInShop"></a-switch>
                        <template #extra>开启后，会将用户组作为服务器套餐上架至微擎云市场</template>
                    </a-form-item> -->
                    <a-form-item label="LOGO">
                        <div class="upload">
                            <img v-if="register.logo" style="height:64px;width:64px;" :src="register.logo" />
                            <a-button v-else >上传</a-button>
                            <input id="uploadlogoinput" type="file" accept="image/*" @change="selectFile" />
                        </div>
                    </a-form-item>
                    <a-form-item label="">
                        <a-button type="primary" @click="submitRegister">确定</a-button>
                    </a-form-item>
                </a-form>
            </div>
            <div v-else-if="tab=='3'">
                <a-form :model="filing" auto-label-width class="padding-20">
                    <div class="c-99 mt-20 mb-20">ICP备案</div>
                    <a-form-item label="备案号">
                        <a-input v-model="filing.icpnumber" placeholder="请输入"></a-input>
                    </a-form-item>
                    <div class="line"></div>
                    <div class="c-99 mt-20 mb-20">联网备案</div>
                    <a-form-item label="备案号">
                        <a-input v-model="filing.locationNumber" placeholder="请输入"></a-input>
                    </a-form-item>
                    <!-- <a-form-item label="备案地">
                        <a-input v-model="filing.location" placeholder="请输入"></a-input>
                    </a-form-item> -->
                    <div class="line"></div>
                    <div class="c-99 mt-20 mb-20">电子执照</div>
                    <a-form-item label="链接">
                        <a-input v-model="filing.license" placeholder="请输入"></a-input>
                    </a-form-item>
                    <div class="line"></div>
                    <div class="c-99 mt-20 mb-20">增值电信业务经营许可证</div>
                    <a-form-item label="备案号">
                        <a-input v-model="filing.tbol" placeholder="请输入"></a-input>
                    </a-form-item>
                    
                    <a-form-item label="">
                        <a-button type="primary" @click="submitFiling">确定</a-button>
                    </a-form-item>
                </a-form>
            </div>
            <div v-else-if="tab=='4'">
                <a-form :model="domainParse" auto-label-width class="padding-20">
                    <a-form-item label="记录类型">
                        <a-radio-group v-model="domainParse.type">
                            <a-radio value="A">A记录</a-radio>
                            <a-radio value="cname">CNAME记录</a-radio>
                        </a-radio-group>
                    </a-form-item>
                    <a-form-item label="记录值">
                        <a-checkbox-group v-if="domainParse.type=='A'" v-model="domainParse.ips">
                            <a-checkbox v-for="(item,index) in domainParse.alist" :key="index" :value="item">{{ item }}</a-checkbox>
                        </a-checkbox-group>
                        <a-input v-if="domainParse.type=='cname'" v-model="domainParse.cname" placeholder="请输入" style="width:300px;"></a-input>
                    </a-form-item>
                    <a-form-item label="">
                        <a-button type="primary" @click="submitdomainParse">确定</a-button>
                    </a-form-item>
                </a-form>
            </div>
            <div v-else-if="tab=='5'">
                <contact-us></contact-us>
            </div>
            <div v-else-if="tab=='6'" class="padding-20">
                <a-card title="微擎云端登录" :bordered="false" class="login-provider-card">
                    <a-form auto-label-width>
                        <a-form-item label="状态">
                            <a-switch :model-value="true" disabled />
                            <span class="ml-10 c-99">内置登录方式，默认开启且不可修改</span>
                        </a-form-item>
                    </a-form>
                </a-card>
                <a-card title="OIDC 登录" :bordered="false" class="login-provider-card mt-20">
                    <a-form :model="loginConfig.oidc" auto-label-width>
                        <a-form-item label="启用 OIDC"><a-switch v-model="loginConfig.oidc.enabled" /></a-form-item>
                        <template v-if="loginConfig.oidc.enabled">
                            <a-form-item label="Discovery URL" required><a-input v-model="loginConfig.oidc.discoveryUrl" placeholder="https://主集群/panel-api/v1/oidc/.well-known/openid-configuration" /></a-form-item>
                            <a-form-item label="Client ID" required><a-input v-model="loginConfig.oidc.clientId" placeholder="主集群预先创建的 OIDC Client ID" /></a-form-item>
                            <a-form-item label="Scopes"><a-input v-model="loginConfig.oidc.scopesText" placeholder="openid profile" /></a-form-item>
                            <a-alert type="info">请在主集群 OIDCClient 中预先登记 callback URL：{{ oidcCallbackUrl }}</a-alert>
                        </template>
                        <a-form-item class="mt-20"><a-button type="primary" @click="submitLoginConfig">保存</a-button></a-form-item>
                    </a-form>
                </a-card>
            </div>
        </div>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';
import ContactUs from './contact-us.vue';

export default{
    data(){
        return {
            namespaceActive: 'default',
            tab: '4',
            register: {},
            filing: {},
            domainParse: {},
            loginConfig: {exist: false, providers: [], oidc: {enabled: false, discoveryUrl: '', clientId: '', scopesText: 'openid profile'}},
            isChildCluster: false,
            permissionPackageList: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initDomainparse();
        this.initLoginConfig();
        panelApi.get('/noauth/site/login-config',{noAlert:true}).then(res=>{
            const data = res.data?.data || res.data || {};
            this.isChildCluster = data.childCluster === true || data.childCluster === 'true';
        }).catch(()=>{});
    },
    components: {
        ContactUs,
    },
    watch: {
        tab(v){
            if(v=='4'){this.initDomainparse()}
            if(v=='6'){this.initLoginConfig()}
        }
    },
    methods: {
        oidcCallbackUrl(){ return window.location.origin + '/panel-api/v1/auth/oidc/callback'; },
        initLoginConfig(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/loginconfigs/default',{noAlert:true}).then(res=>{
                const providers = res.data?.spec?.providers || [];
                const oidc = providers.find(item=>item.type === 'oidc') || {};
                this.loginConfig = {exist: true, providers, oidc: {enabled: Boolean(oidc.enabled), discoveryUrl: oidc.discoveryUrl || '', clientId: oidc.clientId || '', scopesText: (oidc.scopes || ['openid','profile']).join(' ')}};
            }).catch(()=>{ this.loginConfig = {exist: false, providers: [], oidc: {enabled: false, discoveryUrl: '', clientId: '', scopesText: 'openid profile'}}; });
        },
        submitLoginConfig(){
            const oidc = this.loginConfig.oidc;
            if(oidc.enabled && (!oidc.discoveryUrl || !oidc.clientId)){ this.$message.error('启用 OIDC 时请填写 Discovery URL 和 Client ID'); return; }
            const provider = {type: 'oidc', enabled: Boolean(oidc.enabled), discoveryUrl: oidc.discoveryUrl, clientId: oidc.clientId, scopes: oidc.scopesText.split(/[\s,]+/).filter(Boolean)};
            const providers = (this.loginConfig.providers || []).filter(item=>item.type !== 'oidc');
            providers.push(provider);
            const body = {spec: {providers}};
            const request = this.loginConfig.exist
                ? k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/loginconfigs/default', body, {headers: {'Content-Type': 'application/merge-patch+json'}})
                : k8sproxy.post('/apis/w7panel.w7.com/v1alpha1/loginconfigs', {apiVersion: 'w7panel.w7.com/v1alpha1', kind: 'LoginConfig', metadata: {name: 'default'}, ...body});
            request.then(()=>{ this.$message.success('操作成功'); this.initLoginConfig(); }).catch(()=>{});
        },
        selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            
            if(files.length==1){
                const reader = new FileReader();
                reader.onload = ()=>{
                    let value = reader.result;
                    this.register.logo = value;
                };
                reader.readAsDataURL(files[0]);
            }
        },
        async initDomainparse(){
            await k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                
                let list = data.map(item=>{
                    return item.metadata.labels?.['w7.public-ip']
                });
                list = list.filter(i=>i);
                this.domainParse.alist = list;
            }).catch(()=>{});
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/domainparseconfigs/domain-parse',{noAlert:true,loading:true}).then(res=>{
                let spec = res.data?.spec || {};
                this.domainParse = {
                    ...this.domainParse,
                    exist: true,
                    type: spec.type || 'A',
                    cname: spec.cname || '',
                    ips: spec.ips || [],
                }
            }).catch(()=>{
                this.domainParse = {
                    ...this.domainParse,
                    exist: false,
                    type: 'A',
                    cname: '',
                    ips: [],
                }
            })
        },
        initFiling(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/filingconfigs/beian',{noAlert:true}).then(res=>{
                let spec = res.data?.spec || {};
                this.filing = {
                    exist: true,
                    icpnumber: spec.icpnumber || '',
                    number: spec.number || '',
                    location: spec.location || '',
                    locationNumber: spec.location || '',
                    license: spec.license || '',
                    tbol: spec.tbol || '',
                }
            }).catch(()=>{
                this.filing = {
                    exist: false,
                    domain: '',
                    icpnumber: '',
                    number: '',
                    location: '',
                    locationNumber: '',
                    license: '',
                }
            })
        },
        initRegister(){
            
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/permissions',{
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.filter(i=>i.spec?.type === 'builtin' || i.metadata?.labels?.typemode === 'in').map(i=>{
                    return {
                        name: i.metadata?.name,
                        title: i.spec?.title || i.metadata?.annotations?.title || i.metadata?.name,
                    }
                })
                this.permissionPackageList = list;
            });
            
            // k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps?labelSelector=type=permission',{
            //     noAlert: true
            // }).then(res=>{
            //     let list = res?.data?.items || [];
            //     list = list.filter(i=>i.metadata?.labels?.typemode=='custom').map(i=>{
            //         return {
            //             name: i.metadata?.name,
            //             title: i.metadata?.annotations?.title || i.metadata?.name,
            //         }
            //     })
            //     this.permissionPackageList = list;
            // });
            
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/config',{noAlert:true}).then(res=>{
                this.register = {
                    ...this.register,
                    allowConsoleRegister: res?.data?.spec?.data?.allowConsoleRegister === 'true',
                    // showInShop: res?.data?.spec?.data?.showInShop === 'true',
                    defaultPermissionName: 'normal',
                    // defaultPermissionName: res?.data?.spec?.data?.defaultPermissionName,
                }
            }).catch((err)=>{
                if(err?.response?.status != 404){
                    if(err?.response?.data?.message){
                        this.$message.error(err?.response?.data?.message);
                    }
                    return;
                }
                
                let o = {
                    apiVersion: 'w7panel.w7.com/v1alpha1',
                    kind: 'K3kConfig',
                    metadata: {
                        name: 'config',
                        labels: {},
                        annotations: {},
                    },
                    spec: {
                        data: {},
                    },
                }
                k8sproxy.post("/apis/w7panel.w7.com/v1alpha1/k3kconfigs", o,{loading:true}).then(res=>{
                    this.register = {
                        ...this.register,
                        allowConsoleRegister: false,
                        // showInShop: false,
                        defaultPermissionName: 'normal',
                    }
                });
            })
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3k.logo.config',{noAlert:true}).then(res=>{
                this.register = {
                    ...this.register,
                    logo: (res.data?.metadata?.annotations?.imagetype || '') + (res.data?.binaryData?.['default-cnf'] || ''),
                    logoConfigmapExist: true,
                };
            }).catch(()=>{});
        },
        submitdomainParse(){
            let spec = {
                type: this.domainParse.type,
                ...(this.domainParse.type=='A'?{
                    ips: this.domainParse.ips || [],
                }:{
                    cname: this.domainParse.cname,
                })
            }
            if(this.domainParse.exist){
                k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/domainparseconfigs/domain-parse', {
                    spec,
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'}
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }else{
                k8sproxy.post('/apis/w7panel.w7.com/v1alpha1/domainparseconfigs',{
                    kind: 'DomainParseConfig',
                    apiVersion: 'w7panel.w7.com/v1alpha1',
                    metadata: {
                        name: 'domain-parse',
                    },
                    spec,
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }
        },
        async submitRegister(){
            await k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/config',{
                spec:{
                    data:{
                        allowConsoleRegister: String(this.register.allowConsoleRegister),
                        // showInShop: String(this.register.showInShop),
                        defaultPermissionName: this.register.defaultPermissionName,
                    },
                }
            },{
                headers: {'Content-Type': 'application/merge-patch+json'}
            }).then(res=>{
                if(!this.register.logo){
                    this.$message.success('操作成功');
                    return;
                }
                let logoMatch = this.register.logo.match(/^(.*base64,)(.*)$/)
                if(this.register.logoConfigmapExist){
                    k8sproxy.patch('/api/v1/namespaces/kube-system/configmaps/k3k.logo.config',[{
                        op: 'replace',
                        path: '/binaryData/default-cnf',
                        value: logoMatch?.[2] || '',
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/imagetype',
                        value: logoMatch?.[1] || '',
                    }],{
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(()=>{
                        this.$message.success('操作成功');
                    }).catch(()=>{});
                }else{
                    let o = {
                        apiVersion: 'v1',
                        kind: 'ConfigMap',
                        metadata: {
                            name: 'k3k.logo.config',
                            annotations: {
                                imagetype: logoMatch?.[1] || '',
                            }
                        },
                        binaryData: {
                            'default-cnf': logoMatch?.[2] || '',
                        }
                    }
                    k8sproxy.post('/api/v1/namespaces/kube-system/configmaps',o).then(()=>{
                        this.$message.success('操作成功');
                    }).catch(()=>{});
                }
            }).catch(()=>{})
        },
        submitFiling(){
            let number = this.filing.locationNumber.match(/(\d{14})/)?.[1];
            let location = this.filing.locationNumber;
            let spec = {
                icpnumber: this.filing.icpnumber,
                number: number,
                location: location,
                license: this.filing.license,
                tbol: this.filing.tbol,
            }
            if(this.filing.exist){
                k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/filingconfigs/beian', {
                    spec,
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'}
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }else{
                k8sproxy.post('/apis/w7panel.w7.com/v1alpha1/filingconfigs',{
                    kind: 'FilingConfig',
                    apiVersion: 'w7panel.w7.com/v1alpha1',
                    metadata: {
                        name: 'beian',
                    },
                    spec,
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }
        },
    }
}
</script>
<style scoped>
.line{width:100%;border-top:1px solid var(--color-neutral-4);}

.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

</style>
<style scoped>
.login-provider-card{max-width:760px;}
</style>
