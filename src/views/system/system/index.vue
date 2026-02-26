<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="padding-20 bg-white">
            <a-tabs v-model:active-key="tab">
                <a-tab-pane key="1" title="系统配置"></a-tab-pane>
                <a-tab-pane key="2" title="超卖配置"></a-tab-pane>
                <a-tab-pane key="3" title="ICP/域名备案信息"></a-tab-pane>
                <a-tab-pane key="4" title="域名解析记录"></a-tab-pane>
            </a-tabs>
            <div v-if="tab=='1'">
                <a-form ref="register" :model="register" auto-label-width class="padding-20">
                    <a-form-item label="默认用户组">
                        <a-select v-model="register.defaultPolicyName" placeholder="请选择">
                            <a-option v-for="item in groupList" :key="item.name" :label="item.title" :value="item.name"></a-option>
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
        </div>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';

export default{
    data(){
        return {
            namespaceActive: 'default',
            tab: '1',
            oversold: {},
            register: {},
            filing: {},
            domainParse: {},
            groupList: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initRegister();
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
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-parse',{noAlert:true,loading:true}).then(res=>{
                this.domainParse = {
                    ...this.domainParse,
                    exist: true,
                    type: res.data?.data?.type || 'A',
                    cname: res.data?.data?.cname || '',
                    ips: res.data?.data?.ips?.split?.(',') || [],
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
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/beian',{noAlert:true}).then(res=>{
                this.filing = {
                    exist: true,
                    icpnumber: res.data?.data?.icpnumber || '',
                    number: res.data?.data?.number || '',
                    location: res.data?.data?.location || '',
                    locationNumber: res.data?.data?.location || '',
                    license: res.data?.data?.license || '',
                    tbol: res.data?.data?.tbol || '',
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
            k8sproxy.get('/apis/k3k.io/v1alpha1/virtualclusterpolicies',{
                params:{ limit:500, },
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        name: i.metadata?.name,
                        title: i.metadata?.annotations?.title || i.metadata?.name,
                    }
                })
                this.groupList = list;
            });
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3k.config',{noAlert:true}).then(res=>{
                this.register = {
                    ...this.register,
                    allowConsoleRegister: res?.data?.data?.allowConsoleRegister === 'true',
                    // showInShop: res?.data?.data?.showInShop === 'true',
                    defaultPolicyName: res?.data?.data?.defaultPolicyName,
                    indexpage: res?.data?.data?.indexpage || 'login',
                }
            }).catch((err)=>{
                if(err?.response?.status != 404){
                    if(error?.response?.data?.message){
                        this.$message.error(error?.response?.data?.message);
                    }
                    return;
                }
                
                let o = {
                    apiVersion: 'v1',
                    kind: 'ConfigMap',
                    metadata: {
                        name: 'k3k.config',
                        labels: {},
                        annotations: {},
                    },
                    data: {},
                }
                k8sproxy.post("/api/v1/namespaces/kube-system/configmaps", o,{loading:true}).then(res=>{
                    this.register = {
                        ...this.register,
                        allowConsoleRegister: false,
                        // showInShop: false,
                        defaultPolicyName: '',
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
            let o = {
                type: this.domainParse.type,
                ...(this.domainParse.type=='A'?{
                    ips: this.domainParse.ips?.join(','),
                }:{
                    cname: this.domainParse.cname,
                })
            }
            if(this.domainParse.exist){
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-parse', {
                    data: o
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'}
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }else{
                k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'domain-parse',
                        namespace: this.namespaceActive,
                    },
                    data: o,
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }
        },
        async submitRegister(){
            await k8sproxy.patch('/api/v1/namespaces/kube-system/configmaps/k3k.config',{
                data:{
                    allowConsoleRegister: String(this.register.allowConsoleRegister),
                    // showInShop: String(this.register.showInShop),
                    defaultPolicyName: this.register.defaultPolicyName,
                    indexpage: this.register.indexpage,
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
            let o = {
                icpnumber: this.filing.icpnumber,
                number: number,
                location: location,
                license: this.filing.license,
                tbol: this.filing.tbol,
            }
            if(this.filing.exist){
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/beian', {
                    data: o
                },{
                    headers: {'Content-Type': 'application/merge-patch+json'}
                }).then(()=>{
                    this.$message.success('操作成功');
                }).catch(()=>{});
            }else{
                k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'beian',
                        namespace: this.namespaceActive,
                    },
                    data: o,
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
            await k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3k.overselling.config',{noAlert:true}).then(res=>{
                this.oversold.exist = true;
                let data = res.data.data;
                this.oversold.cpuPercent = Number(data.cpu);
                this.oversold.memoryPercent = Number(data.memory);
                this.oversold.storagePercent = Number(data.storage);
                this.oversold.bandwidthPercent = Number(data.bandwidth);
                this.oversold.bandwidth = Number(data.bandwidthNum);
            }).catch(()=>{
                this.oversold.exist = false;
            });
        },
        async submitOversold(){
            let exist = this.oversold.exist;
            
            let o = {
                cpu: String(this.oversold.cpuPercent),
                memory: String(this.oversold.memoryPercent),
                storage: String(this.oversold.storagePercent),
                bandwidth: String(this.oversold.bandwidthPercent),
                bandwidthNum: String(this.oversold.bandwidth),
            }

            if(exist){
                k8sproxy.patch("/api/v1/namespaces/kube-system/configmaps/k3k.overselling.config",{data:o},{
                    loading: true,
                    headers: {'Content-Type': 'application/strategic-merge-patch+json'},
                }).then(()=>{
                    this.$message.success('操作成功');
                })
            }else{
                k8sproxy.post("/api/v1/namespaces/kube-system/configmaps", {
                    apiVersion: 'v1',
                    kind: 'ConfigMap',
                    metadata: {
                        name: 'k3k.overselling.config',
                        labels: {},
                        annotations: {},
                    },
                    data: o
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