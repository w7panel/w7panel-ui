<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="padding-20 bg-white">
            <a-tabs v-model:active-key="tab">
                <a-tab-pane key="1" title="系统配置"></a-tab-pane>
                <a-tab-pane key="2" title="超卖配置"></a-tab-pane>
                <a-tab-pane key="3" title="ICP/域名备案信息"></a-tab-pane>
                <a-tab-pane key="4" title="域名解析记录"></a-tab-pane>
                <a-tab-pane key="5" title="联系方式"></a-tab-pane>
            </a-tabs>
            <div v-if="tab=='1'">
                <a-form ref="register" :model="register" auto-label-width class="padding-20">
                    <a-form-item label="默认权限">
                        <a-select v-model="register.defaultPermissionName" placeholder="请选择">
                            <a-option v-for="item in permissionPackageList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                        </a-select>
                    </a-form-item>
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
                    <a-form-item label="首页配置">
                        <a-radio-group v-model="register.indexpage">
                            <a-radio value="login">登录页</a-radio>
                            <a-radio value="resource">云资源聚合页</a-radio>
                        </a-radio-group>
                    </a-form-item>
                    <a-form-item label="">
                        <a-button type="primary" @click="submitRegister">确定</a-button>
                    </a-form-item>
                </a-form>
            </div>
            <div v-else-if="tab=='2'">
                <a-form :model="oversold" auto-label-width>
                    <a-form-item label="CPU">
                        <div class="df fc">
                            <a-form-item label="节点资源">
                                <a-input v-model="oversold.cpu" disabled>
                                    <template #append>核</template>
                                </a-input>
                            </a-form-item>
                        </div>
                        <div class="df fc ml-20">
                            <a-form-item label="超卖比例">
                                <a-input-number v-model="oversold.cpuPercent" :min="100">
                                    <template #append>%</template>
                                </a-input-number>
                            </a-form-item>
                        </div>
                    </a-form-item>
                    <a-form-item label="内存">
                        <div class="df fc">
                            <a-form-item label="节点资源">
                                <a-input v-model="oversold.memory" disabled>
                                    <template #append>Gi</template>
                                </a-input>
                            </a-form-item>
                        </div>
                        <div class="df fc ml-20">
                            <a-form-item label="超卖比例">
                                <a-input-number v-model="oversold.memoryPercent" :min="100">
                                    <template #append>%</template>
                                </a-input-number>
                            </a-form-item>
                        </div>
                    </a-form-item>
                    <a-form-item label="存储">
                        <div class="df fc">
                            <a-form-item label="节点资源">
                                <a-input v-model="oversold.storage" disabled>
                                    <template #append>Gi</template>
                                </a-input>
                            </a-form-item>
                        </div>
                        <div class="df fc ml-20">
                            <a-form-item label="超卖比例">
                                <a-input-number v-model="oversold.storagePercent" :min="100">
                                    <template #append>%</template>
                                </a-input-number>
                            </a-form-item>
                        </div>
                    </a-form-item>
                    <a-form-item label="带宽">
                        <div class="df fc">
                            <a-form-item label="节点资源">
                                <a-input v-model="oversold.bandwidth">
                                    <template #append>Mbps</template>
                                </a-input>
                            </a-form-item>
                        </div>
                        <div class="df fc ml-20">
                            <a-form-item label="超卖比例">
                                <a-input-number v-model="oversold.bandwidthPercent" :min="100">
                                    <template #append>%</template>
                                </a-input-number>
                            </a-form-item>
                        </div>
                    </a-form-item>
                    <a-form-item label="">
                        <a-button type="primary" @click="submitOversold">确定</a-button>
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
            tab: '1',
            oversold: {},
            register: {},
            filing: {},
            domainParse: {},
            permissionPackageList: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initRegister();
    },
    components: {
        ContactUs,
    },
    watch: {
        tab(v){
            if(v=='1'){this.initRegister()}
            if(v=='2'){this.initOversold()}
            if(v=='3'){this.initFiling()}
            if(v=='4'){this.initDomainparse()}
        }
    },
    methods: {
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
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/k3k.config',{noAlert:true}).then(res=>{
                this.register = {
                    ...this.register,
                    allowConsoleRegister: res?.data?.spec?.data?.allowConsoleRegister === 'true',
                    // showInShop: res?.data?.spec?.data?.showInShop === 'true',
                    defaultPermissionName: res?.data?.spec?.data?.defaultPermissionName,
                    indexpage: res?.data?.spec?.data?.indexpage || 'login',
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
                        name: 'k3k.config',
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
                        defaultPermissionName: '',
                        indexpage: 'login',
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
            await k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3kconfigs/k3k.config',{
                spec:{
                    data:{
                        allowConsoleRegister: String(this.register.allowConsoleRegister),
                        // showInShop: String(this.register.showInShop),
                        defaultPermissionName: this.register.defaultPermissionName,
                        indexpage: this.register.indexpage,
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
        async initOversold(){
            
            await panelApi.get('/metrics/usage/normal',{loading:true}).then(res=>{
                let data = res.data;

                let cpu = data?.cpu?.total || 0;
                cpu = cpu / 1000;
                cpu = Number(cpu.toFixed(2));
                this.oversold.cpu = cpu;
                
                let memory = data?.memory?.total || 0;
                memory = memory / 1024 / 1024 / 1024;
                memory = Number(memory.toFixed(2));
                this.oversold.memory = memory;

            })
            
            await panelApi.get('/metrics/usage/disk').then(res=>{
                let data = res?.data;

                let fs = data?.disk?.total || 0;
                fs = fs / 1024 / 1024 / 1024;
                fs = Number(fs.toFixed(2));
                this.oversold.storage = fs;
            });
            
            this.oversold = {
                ...this.oversold,
                cpuPercent: 1000,
                memoryPercent: 1000,
                storagePercent: 1000,
                bandwidth: 1000,
                bandwidthPercent: 1000,
            };
            await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/oversellingconfigs/k3k.overselling.config',{noAlert:true}).then(res=>{
                this.oversold.exist = true;
                let spec = res.data.spec;
                this.oversold.cpuPercent = Number(spec.cpu);
                this.oversold.memoryPercent = Number(spec.memory);
                this.oversold.storagePercent = Number(spec.storage);
                this.oversold.bandwidthPercent = Number(spec.bandwidth);
                this.oversold.bandwidth = Number(spec.bandwidthNum);
            }).catch(()=>{
                this.oversold.exist = false;
            });
        },
        async submitOversold(){
            let exist = this.oversold.exist;
            
            let spec = {
                cpu: Number(this.oversold.cpuPercent),
                memory: Number(this.oversold.memoryPercent),
                storage: Number(this.oversold.storagePercent),
                bandwidth: Number(this.oversold.bandwidthPercent),
                bandwidthNum: Number(this.oversold.bandwidth),
            }

            if(exist){
                k8sproxy.patch("/apis/w7panel.w7.com/v1alpha1/oversellingconfigs/k3k.overselling.config",{spec},{
                    loading: true,
                    headers: {'Content-Type': 'application/merge-patch+json'},
                }).then(()=>{
                    this.$message.success('操作成功');
                })
            }else{
                k8sproxy.post("/apis/w7panel.w7.com/v1alpha1/oversellingconfigs", {
                    apiVersion: 'w7panel.w7.com/v1alpha1',
                    kind: 'OverSellingConfig',
                    metadata: {
                        name: 'k3k.overselling.config',
                        labels: {},
                        annotations: {},
                    },
                    spec,
                },{loading:true}).then(res=>{
                    this.$message.success('操作成功');
                });
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
