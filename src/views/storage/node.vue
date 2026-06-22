<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="openExtra()">{{expandedKeys.length==list.length?'全部收起':'全部展开'}}</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <a-table :data="list" class="cptable extratable" :expandable="expandable" v-model:expandedKeys="expandedKeys" :bordered="false" :pagination="false">
                <template #columns>
                    <a-table-column title="状态">
                        <template #cell="{ record }">{{record.status}}</template>
                    </a-table-column>
                    <a-table-column title="准备就绪">
                        <template #cell="{ record }">{{record.ready}}</template>
                    </a-table-column>
                    <a-table-column title="名称">
                        <template #cell="{ record }">
                            <div class="df df-inline df-c">
                                <span>{{record.name}}</span>
                                <span>{{record.address}}</span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="副本数">
                        <template #cell="{ record }">{{record.replicas}}</template>
                    </a-table-column>
                    <a-table-column title="已调度">
                        <template #cell="{ record }">
                            <div class="df df-inline df-c ai-c">
                                <a-progress :percent="record.allocated.percent" style="width:100px;" :stroke-width="10" :show-text="false" />
                                <span class="fs-12 mt-4">{{record.allocated.used.toFixed(2)}}Gi / {{record.allocated.total.toFixed(2)}}Gi</span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="已使用">
                        <template #cell="{ record }">
                            <div class="df df-inline df-c ai-c">
                                <a-progress :percent="record.used.percent" style="width:100px;" :stroke-width="10" :show-text="false" />
                                <span class="fs-12 mt-4 lh-1">{{record.used.used.toFixed(2)}}Gi / {{record.used.total.toFixed(2)}}Gi</span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="存储大小">
                        <template #cell="{ record }">
                            <div class="df df-inline df-c ai-c">
                                <span>{{record.allocated.total.toFixed(1)}}Gi</span>
                                <span class="fs-12 mt-4 c-99 lh-1">+{{record.allocated.reserve.toFixed(1)}}Gi</span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="tags">
                        <template #cell="{ record }">
                            <a-tag v-for="tag in record.tags" :key="tag" color="arcoblue">{{tag}}</a-tag>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }" >
                            <span class="c-blue cursor" @click="openFormDrawer(record)">编辑</span>
                        </template>
                    </a-table-column>
                </template>
                <template #expand-row="{ record }" >
                    <div>
                        <table class="com-table"><tbody>
                            <tr>
                                <td>状态</td>
                                <td>名称</td>
                                <td>副本数</td>
                                <td>已调度</td>
                                <td>已使用</td>
                                <td>存储大小</td>
                                <td>tags</td>
                            </tr>
                            <tr v-for="(item,index) in record.expend" :key="index">
                                <td>{{item.status}}</td>
                                <td>
                                    <div class="df df-inline df-c">
                                        <span>{{item.name}}</span>
                                        <span>{{item.address}}</span>
                                    </div>
                                </td>
                                <td>{{item.replicas}}</td>
                                <td>
                                    <div class="df df-inline df-c ai-c">
                                        <a-progress :percent="item.allocated.percent" style="width:100px;" :stroke-width="10" :show-text="false" />
                                        <span class="fs-12 mt-4">{{item.allocated.used}}Gi / {{item.allocated.total}}Gi</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="df df-inline df-c ai-c">
                                        <a-progress :percent="item.used.percent" style="width:100px;" :stroke-width="10" :show-text="false" />
                                        <span class="fs-12 mt-4 lh-1">{{item.used.used}}Gi / {{item.used.total}}Gi</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="df df-inline df-c ai-c">
                                        <span>{{item.allocated.total}}Gi</span>
                                        <span class="fs-12 mt-4 c-99 lh-1">+{{item.allocated.reserve}}Gi</span>
                                    </div>
                                </td>
                                <td>
                                    <a-tag v-for="tag in item.tags" :key="tag" color="arcoblue">{{tag}}</a-tag>
                                </td>
                            </tr>
                        </tbody></table>
                    </div>
                </template>
            </a-table>
        </div>
        <a-drawer :visible="drawer.visible" :width="900" @ok="submit" @cancel="drawer.visible=false" :popup-container="$popupContainer">
            <template #title>编辑Node</template>
            <a-form :model="drawer" ref="drawer" auto-label-width class="padding-20">
                <a-row :gutter="16">
                    <a-col :span="6">
                        <a-form-item label="节点调度">
                            <a-switch v-model="drawer.allowScheduling" size="large" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="6">
                        <a-form-item label="驱逐">
                            <a-switch v-model="drawer.autoEvicting" size="large" />
                        </a-form-item>
                    </a-col>
                </a-row>
                <a-form-item label="cpu请求">
                    <a-input-number v-model="drawer.instanceManagerCPURequest" size="large">
                        <template #append>m</template>
                    </a-input-number>
                </a-form-item>
                <a-form-item label="标签">
                    <a-input-tag v-model="drawer.tags" size="large" placeholder="请输入" allow-clear/>
                </a-form-item>
                <a-tabs v-model:active-key="drawer.tabKey" :editable="true" show-add-button @add="addDisk" @delete="removeDisk" type="card" >
                    <a-tab-pane v-for="(item,index) in drawer.disks" :key="item.key" :closable="item.storageScheduled==0" :title="item.name||item.key" style="padding:0 20px;">
                        <a-row :gutter="16">
                            <a-col :span="6">
                                <a-form-item label="调度">
                                    <a-switch v-model="item.allowScheduling" size="large" />
                                </a-form-item>
                            </a-col>
                            <a-col :span="6">
                                <a-form-item label="驱逐">
                                    <a-switch v-model="item.evictionRequested" size="large" />
                                </a-form-item>
                            </a-col>
                        </a-row>
                        <a-form-item label="标签">
                            <a-input-tag v-model="item.tags" size="large" placeholder="请输入" allow-clear/>
                        </a-form-item>
                        <a-form-item label="标识" :field="'disks['+index+'].name'" :rules="[{required:true,message:'请输入路径'}]">
                            <a-input v-model="item.name" size="large" />
                        </a-form-item>
                        <a-form-item label="类型">
                            <a-select v-model="item.diskType" :options="diskTypes" size="large" />
                        </a-form-item>
                        <a-form-item label="路径" :field="'disks['+index+'].path'" :rules="[{required:true,message:'请输入路径'}]">
                            <a-input v-model="item.path" size="large" />
                        </a-form-item>
                        <a-form-item label="预留空间">
                            <a-input-number v-model="item.storageReserved" size="large">                        
                                <template #append>Gi</template>
                            </a-input-number>
                        </a-form-item>
                    </a-tab-pane>
                </a-tabs>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store';

export default {
    data(){
        return {
            namespaceActive: "",
            data: [],
            list: [],

            // 全选
            selectedKeys: [],
            rowSelection: {
                type: 'checkbox',
                showCheckedAll: true,
                title: '全选',
                width: 80,
            },
            // 扩展
            expandedKeys: [],
            expandable: {
                title: '展开/收起',
                width: 80,
            },

            diskTypes: [
                {value: 'filesystem', label: '文件系统', },
            ],
            drawer: {
                visible: false,
                name: '',
                allowScheduling: true, // 节点调度
                autoEvicting: false, // 要求驱逐
                instanceManagerCPURequest: 0, // 实例管理器CPU请求
                tags: [],
                tabKey: '',
                disks: [],
            },
            removeDiskArr: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    methods: {
        getList(){
            k8sproxy.get(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes`,{
                headers: {Accept: 'application/json',},
                loading: true,
            }).then(res=>{
                let result = res.data;

                let data = result?.data || [];
                this.data = data;
                let list = data?.map(i=>{
                    let status = i?.conditions?.Schedulable?.status=='True'? '可调度' : '不可调度' //i?.allowScheduling? (i?.conditions?.Schedulable?.status=='True'? '可调度' : '不可调度' ) : '禁用';
                    let ready = i?.conditions?.Ready?.status=='True'? '就绪' : '未就绪';
                    let expend = [];
                    for(let k in i?.disks){
                        let disk = i?.disks[k];
                        let status = disk?.allowScheduling? (disk?.conditions?.Schedulable?.status=='True'? '可调度' : '不可调度' ) : '禁用';
                        
                        let sz = {
                            max: disk?.storageMaximum || 0,
                            use: (disk?.storageMaximum || 0) - (disk?.storageAvailable || 0),
                            scheduled: disk?.storageScheduled || 0,
                            reserve: disk?.storageReserved || 0,
                        }
                        let used = {
                            used: (sz.use / 1024 / 1024 / 1024 ).toFixed(2),
                            total: (sz.max / 1024 / 1024 / 1024 ).toFixed(2),
                            percent: sz.max? ( sz.use / sz.max ).toFixed(2) : 0,
                        }
                        let allocated = {
                            used: (sz.scheduled / 1024 / 1024 / 1024 ).toFixed(2),
                            total: ((sz.max - sz.reserve ) / 1024 / 1024 / 1024 ).toFixed(2),
                            reserve: (sz.reserve / 1024 / 1024 / 1024).toFixed(2),
                        }
                        allocated.percent = Number(allocated.total)? allocated.used / allocated.total : 0;

                        let scheduledReplica = disk?.scheduledReplica || {};

                        expend.push({
                            name: k,
                            status: status,
                            diskType: disk?.diskType,
                            path: disk?.path,
                            tags: disk?.tags,
                            allocated: allocated,
                            used: used,
                            replicas: Object.keys(scheduledReplica)?.length || 0,
                        })
                    }

                    let used = {
                        used: expend.map(i=>Number(i.used?.used))?.reduce((a,b)=>a+b,0) || 0,
                        total: expend.map(i=>Number(i.used?.total))?.reduce((a,b)=>a+b,0) || 0,
                    }
                    used.percent = used.total? used.used / used.total : 0;

                    let allocated = {
                        used: expend.map(i=>Number(i.allocated?.used))?.reduce((a,b)=>a+b,0) || 0,
                        total: expend.map(i=>Number(i.allocated?.total))?.reduce((a,b)=>a+b,0) || 0,
                        reserve: expend.map(i=>Number(i.allocated?.reserve))?.reduce((a,b)=>a+b,0) || 0,
                    }
                    allocated.percent = Number(allocated.total)? allocated.used / allocated.total : 0;

                    return {
                        key: i?.name,
                        name: i?.name,
                        address: i?.address,
                        status: status,
                        ready: ready,
                        expend: expend,
                        tags: i?.tags,
                        allocated: allocated,
                        used: used,
                        replicas: expend?.map(i=>i.replicas)?.reduce((a,b)=>a+b,0) || 0,
                    }
                });

                this.list = list;
                console.log(list);
            })
        },
        openFormDrawer(row){
            let listItem = this.data.find(i=>i.name==row.key);
            this.removeDiskArr = [];
            this.drawer = {
                visible: true,
                name: listItem.name,
                allowScheduling: listItem.allowScheduling,
                autoEvicting: listItem.autoEvicting,
                instanceManagerCPURequest: listItem.instanceManagerCPURequest,
                tags: listItem.tags,
                tabKey: Object.keys(listItem?.disks)?.[0] || '',
                disks: Object.keys(listItem?.disks)?.map(i=>{
                    let disk = listItem?.disks[i];
                    return {
                        key: i,
                        name: i,
                        exist: false,
                        tags: disk?.tags,
                        path: disk?.path,
                        diskType: disk?.diskType,
                        storageScheduled: disk.storageScheduled,
                        storageReserved: ((disk?.storageReserved||0) / 1024 / 1024 / 1024).toFixed(2) * 1,
                        allowScheduling: disk?.allowScheduling,
                        evictionRequested: disk?.evictionRequested,
                    }
                })
            }
        },
        submit(){
            this.$refs.drawer.validate((err) => {
                if (err) {
                    this.$refs.drawer.scrollToField(Object.keys(err)[0])
                    return;
                }
                if(this.drawer.name){
                    let listItem = this.data.find(i=>i.name==this.drawer.name);
                    listItem = JSON.parse(JSON.stringify(listItem));
                    listItem.allowScheduling = this.drawer.allowScheduling;
                    listItem.autoEvicting = this.drawer.autoEvicting;
                    listItem.instanceManagerCPURequest = this.drawer.instanceManagerCPURequest;
                    listItem.tags = this.drawer.tags;

                    let disks = listItem?.disks || {};
                    let newDisks = {};
                    this.drawer.disks.forEach(i=>{
                        if(disks[i.key]){
                            let obj = disks[i.key];
                            obj.allowScheduling = i.allowScheduling;
                            obj.evictionRequested = i.evictionRequested;
                            obj.storageReserved = parseInt(i.storageReserved * 1024 * 1024 * 1024);
                            obj.tags = i.tags;
                            obj.path = i.path;
                            obj.diskType = i.diskType;
                            newDisks[i.name||i.key] = obj;
                        }else{
                            i.allowScheduling = false;
                            newDisks[i.name] = {
                                "allowScheduling": i.allowScheduling,
                                "diskType": i.diskType,
                                "evictionRequested": i.evictionRequested,
                                "path": i.path,
                                "storageReserved": parseInt(i.storageReserved * 1024 * 1024 * 1024),
                                "tags": i.tags,
                            }
                        }
                    });
                    // listItem.disks = newDisks;

                    for(let i in listItem.disks){
                        if(!newDisks[i]){
                            listItem.disks[i].allowScheduling = false;
                        }
                    }
                    k8sproxy.put(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${this.drawer.name}`, listItem, {
                        headers: {Accept: 'application/json',},
                    }).then(()=>{
                        return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${this.drawer.name}?action=diskUpdate`,{
                            disks: listItem.disks,
                        },{
                            headers: {Accept: 'application/json',},
                        });
                    }).then(()=>{
                        return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${this.drawer.name}?action=diskUpdate`,{
                            disks: newDisks,
                        },{
                            headers: {Accept: 'application/json',},
                        });
                    }).then(res=>{
                        this.drawer.visible = false;
                        this.$message.success('修改成功');
                        this.getList();
                    });
                }
            });

        },
        addDisk(){
            let key = 'disk-' + Date.now();
            this.drawer.disks.push({
                key: key,
                name: key,
                exist: true,
                tags: [],
                path: '',
                diskType: 'filesystem',
                storageReserved: 0,
                allowScheduling: true,
                evictionRequested: false,
            });
            this.drawer.tabKey = key;
        },
        removeDisk(key){
            let find = this.drawer.disks.find(i=>i.key==key);
            if(find?.exist){ this.removeDiskArr.push(find); }
            this.drawer.disks.splice(this.drawer.disks.findIndex(i=>i.key==key), 1);
            if(this.drawer.tabKey==key){
                this.drawer.tabKey = this.drawer.disks[0]?.key || '';
            }
        },
        openExtra(){
            this.expandedKeys = this.expandedKeys.length==this.list.length? [] : this.list.map(i=>i.key);
        },
    }

}
</script>

<style>
.extratable .arco-table-tr-expand>.arco-table-td{padding:10px; background:#fff;}
.extratable .arco-table-tr-expand:hover>.arco-table-td{background:#fff!important;}
/* .extratable .arco-table-tr-expand .arco-table-td .arco-table .arco-table-th{background-color:var(--color-neutral-2);} */
</style>