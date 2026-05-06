<template>
    <div class="df df-c padding-20" style="height:100%;">
        <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加配额</a-button>
            <a-button type="outline" @click="openOversold" class="ml-20">超卖配置</a-button>
        </div>
        
        <div class="mt-20">
            <a-table class="cptable" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="配额" data-index="peie"></a-table-column>
                    <a-table-column title="创建时间" data-index="created"></a-table-column>
                    <a-table-column title="集群模式" data-index="clustermodeTxt"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>

        
        <a-drawer
            :visible="form.show"
            direction="rtl"
            :width="800"
            title="配额"
            @ok="submit"
            @cancel="form.show=false;"
        >
            <a-form :model="form" ref="form" class="label-width-100" auto-label-width>
                <a-form-item label="名称" field="title" :rules="[{required:true,message:'请输入名称', trigger: 'blur' }]">
                    <a-input v-model="form.title" type="text" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="集群模式" :disabled="!!form.name" field="clustermode" :rules="[{required:true,message:'请输入名称', trigger: 'blur' }]">
                    <a-select v-model="form.clustermode" placeholder="请选择集群模式">
                        <a-option label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="form.clustermode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="form.clustermode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="form.clustermode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item>
            </a-form>
            <quota-config
                ref="quotaconfig"
                :data="form"
                :isedit="!!form.name"
                :clustermode="form.clustermode"
            ></quota-config>
        </a-drawer>

        <a-drawer
            :visible="oversold.show"
            direction="rtl"
            :width="800"
            title="超卖"
            @ok="submitOversold"
            @cancel="oversold.show=false;"
        >
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
            </a-form>
        </a-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import quotaConfig from '@/components/quota-config.vue';

const dataTemplate = {
    "kind": "ConfigMap",
    "apiVersion": "v1",
    "metadata": {
        "name": "k3k.quota",
        "namespace": "default",
        "labels": {
            "type": "quota",
        },
        "annotations": {},
    },
    "data": {
        "quota": "{}"
    }
}
export default {
    data(){
        return {
            list: [],
            form: {
                show: false,
                title: '',
                clustermode: 'shared',
                unit: 'hour',
                quantity: '',
                quota: {
                    cpu: '',
                    cpuDw: '',
                    memory: '',
                    memoryDw: 'Gi',
                    bandwidth: '',
                    storageclass: '',
                    storageSize: '',
                    storageSizeDw: 'Gi',
                },
                limit: {
                    cpu: '',
                    cpuDw: '',
                    memory: '',
                    memoryDw: 'Gi',
                },
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            storageLs: [],
            debug: false,

            oversold: {
                show: false,
                exist: false,
                cpu: 16,
                cpuPercent: 100,
                memory: 16,
                memoryPercent: 100,
                storage: 16,
                storagePercent: 100,
                bandwidth: 16,
                bandwidthPercent: 100,
            },
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
        // this.getStorageList();
    },
    components: {
        yamlDrawer,
        quotaConfig,
    },
    methods:{
        async openOversold(){
            
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
            await k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3k.overselling.config',{noAlert:true,loading:true}).then(res=>{
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

            this.oversold.show = true;
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
                    this.oversold.show = false;
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
                    this.oversold.show = false;
                });
            }
        },
        getList(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=quota",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let quota = i?.data?.quota || '{}';
                    quota = JSON.parse(quota);
                    let hard = quota?.hard;
                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        peie: hard? (hard.cpu+'核'+'/'+hard.memory+'/'+hard.bandwidth+'/'+hard['requests.storage']) : '',
                        created: window.formatDate(i.metadata.creationTimestamp),
                        clustermode: i.metadata?.labels?.clustermode,
                        clustermodeTxt: {shared:'共享',virtual:'独享',global:'全局'}?.[i.metadata?.labels?.clustermode],
                        quota: quota,
                    }
                });
                this.list = list;
            })
        },
        
        // getStorageList(){
        //     k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
        //         let data = res?.data || [];
        //         let list = data.items || [];
        //         list = list.map(item=>{
        //             return item.metadata.name;
        //         })
        //         this.storageLs = list;
        //     });
        // },
        add(){
            this.form = {
                show: true,
                name: '',
                title: '',
                clustermode: 'shared',
                quantity: '',
                unit: 'hour',
                quota: {
                    cpu: '',
                    cpuDw: '',
                    memory: '',
                    memoryDw: 'Gi',
                    bandwidth: '',
                    storageclass: '',
                    storageSize: '',
                    storageSizeDw: 'Gi',

                    sysStorage: '',
                    sysStorageDw: 'Gi',
                    dataStorage: '',
                    dataStorageDw: 'Gi',
                },
                limit: {
                    cpu: '',
                    cpuDw: '',
                    memory: '',
                    memoryDw: 'Gi',
                },
            }
        },
        edit(row){
            let data = row.quota;
            this.perseForm(data);
            this.form.title = row.title;
            this.form.clustermode = row.clustermode;
            this.form.name = row.name;
            this.form.show = true;
        },
        perseForm(data){
            let quota = data || {};
            let qd = quota?.hard || {};
            let ql = quota?.limit || {};
            let fd = {
                cpu: qd.cpu?.match(/^[^a-zA-Z]+/)?.[0] || '',
                cpuDw: qd.cpu?.match(/[a-zA-Z]+$/)?.[0] || '',
                memory: qd.memory?.match(/^[^a-zA-Z]+/)?.[0] || '',
                memoryDw: qd.memory?.match(/[a-zA-Z]+$/)?.[0] || 'Gi',
                bandwidth: qd.bandwidth?.match(/^[^a-zA-Z]+/)?.[0] || '',
                storageclass: quota?.storageclass,
                storageSize: qd?.['requests.storage']?.match(/^[^a-zA-Z]+/)?.[0] || '',
                storageSizeDw: qd?.['requests.storage']?.match(/[a-zA-Z]+$/)?.[0] || 'Gi',
                sysStorage: qd?.['sys.storage']?.match(/^[^a-zA-Z]+/)?.[0] || '',
                sysStorageDw: qd?.['sys.storage']?.match(/[a-zA-Z]+$/)?.[0] || 'Gi',
                dataStorage: qd?.['data.storage']?.match(/^[^a-zA-Z]+/)?.[0] || '',
                dataStorageDw: qd?.['data.storage']?.match(/[a-zA-Z]+$/)?.[0] || 'Gi',
            }
            let fl = {
                cpu: ql.cpu?.match(/^[^a-zA-Z]+/)?.[0] || '',
                cpuDw: ql.cpu?.match(/[a-zA-Z]+$/)?.[0] || '',
                memory: ql.memory?.match(/^[^a-zA-Z]+/)?.[0] || '',
                memoryDw: ql.memory?.match(/[a-zA-Z]+$/)?.[0] || 'Gi',
            }
            
            this.form.unit = quota.unit || 'hour';
            this.form.quantity = quota.quantity || '';
            this.form.quota.cpu = fd.cpu;
            this.form.quota.cpuDw = fd.cpuDw;
            this.form.quota.memory = fd.memory;
            this.form.quota.memoryDw = fd.memoryDw;
            this.form.storageclass = fd.storageclass;
            this.form.bandwidth = fd.bandwidth;

            this.form.storageSize = fd.storageSize;
            this.form.storageSizeDw = fd.storageSizeDw;
            this.form.sysStorage = fd.sysStorage;
            this.form.sysStorageDw = fd.sysStorageDw;
            this.form.dataStorage = fd.dataStorage;
            this.form.dataStorageDw = fd.dataStorageDw;

            if(!data.limit){
                delete this.form.limit;
            }else{
                this.form.limit = {};
                this.form.limit.cpu = fl.cpu;
                this.form.limit.cpuDw = fl.cpuDw;
                this.form.limit.memory = fl.memory;
                this.form.limit.memoryDw = fl.memoryDw;
            }
            this.form = JSON.parse(JSON.stringify(this.form));
        },
        submit(){
            new Promise((resolve,reject)=>{
                this.$refs.form.validate((err) => {
                    if (err) {
                        this.$refs.form.scrollToField(Object.keys(err)[0]);
                        reject();
                        return;
                    }
                    resolve();
                })
            }).then(()=>{
                return this.$refs.quotaconfig.getForm()
            }).then((v)=>{
                this.form = {
                    ...this.form,
                    ...v,
                }
                let fd = this.form.quota;
                let fl = this.form.limit;
                let o = {
                    storageclass: v.storageclass,
                    unit: this.form.unit || '',
                    quantity: this.form.quantity || '',
                    hard: {
                        cpu: fd.cpu + fd.cpuDw,
                        memory: fd.memory + fd.memoryDw,
                        bandwidth: v.bandwidth + 'Mbps',
                        'requests.storage': v.storageSize + v.storageSizeDw,
                        'sys.storage': v.sysStorage + v.sysStorageDw,
                        'data.storage': v.dataStorage + v.dataStorageDw,
                    },
                    limit: {
                        cpu: fl.cpu + fl.cpuDw,
                        memory: fl.memory + fl.memoryDw,
                    }
                }
                if(this.form.clustermode=='virtual'){
                    delete o.limit;
                    delete o.hard['sys.storage']
                    delete o.hard['data.storage']
                }
                if(!this.form.openlimit){
                    delete o.limit;
                }
                if(!this.form.name){
                    let data = JSON.parse(JSON.stringify(dataTemplate));
                    data.data.quota = JSON.stringify(o);
                    data.metadata.annotations.title = this.form.title;
                    data.metadata.labels.clustermode = this.form.clustermode;
                    data.metadata.namespace = this.namespaceActive;
                    data.metadata.name = "k3k.quota." + this.createName();
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }else{
                    k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+this.form.name,[{
                        op: 'replace',
                        path: '/metadata/annotations/title',
                        value: this.form.title,
                    },{
                        op: 'replace',
                        path: '/data/quota',
                        value: JSON.stringify(o),
                    },{
                        op: 'replace',
                        path: '/metadata/labels/clustermode',
                        value: this.form.clustermode,
                    }],{
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            })
        },
        openYaml(name){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
            })
        },
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
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
    }
}
</script>

<style scoped>
.m-lr6{margin-left:6px; margin-right:6px;}
</style>