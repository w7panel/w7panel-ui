<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div  v-if="permission.includes('storage/disk/add')&&userMode!='cluster'" class="df ai-c mb-20">
            <a-button type="primary" @click="openForm()">                
                <template #icon><icon-plus /></template>
                <span>新建</span>
            </a-button>
            <a-button v-if="usermode!=='cluster' && hasLonghornSystem" type="outline" class="ml-20" @click="openLoad()">添加负载</a-button>
            <!-- <a-button type="primary" :disabled="!selectedKeys.length" @click="bindNode()">绑定Node</a-button> -->
        </div>
        <div class="bg-white padding-20">

            <a-tabs v-if="usermode!=='cluster' && hasLonghornSystem" v-model:active-key="tabsActive">
                <a-tab-pane key="1" title="设备列表"></a-tab-pane>
                <a-tab-pane key="2" title="负载均衡"></a-tab-pane>
            </a-tabs>
            
            <div v-if="tabsActive=='1'">
                <div v-if="usermode=='cluster' || !hasLonghornSystem">
                    <a-table :data="storageClasses" :pagination="false" :bordered="false">
                        <template #columns>
                            <a-table-column title="名称" data-index="name"></a-table-column>
                            <!-- <a-table-column>
                                <template #title>
                                    <span>已分配</span>
                                    <a-tooltip content="分区分配空间/可使用空间">
                                        <icon-question-circle-fill class="ml-4 fs-16 c-99 cursor" />
                                    </a-tooltip>
                                </template>
                                <template #cell>
                                    <div class="df df-inline df-c ai-c">
                                        <a-progress :percent="resourceUsedStatus.usedAllocate" status="normal" style="width:100px;" :stroke-width="10" :show-text="false" />
                                        <span class="fs-12 mt-4">{{resourceUsedStatus.used}} / {{resourceUsedStatus.hard}}</span>
                                    </div>
                                </template>
                            </a-table-column> -->
                            <a-table-column title="名称" data-index="name">
                                <template #title>
                                    <span>已使用</span>
                                    <a-tooltip content="实际使用空间/服务器硬盘空间">
                                        <icon-question-circle-fill class="ml-4 fs-16 c-99 cursor" />
                                    </a-tooltip>
                                </template>
                                <template #cell>
                                    <div class="df df-inline df-c ai-c">
                                        <a-progress :percent="resourceUsedStatus.usedFsAllocate" status="normal" style="width:100px;" :stroke-width="10" :show-text="false" />
                                        <span class="fs-12 mt-4">{{resourceUsedStatus.usedFs}} / {{resourceUsedStatus.hard}}</span>
                                    </div>
                                </template>
                            </a-table-column>
                        </template>
                    </a-table>
                </div>
                <div v-else>
                    <!-- :row-selection="rowSelection" v-model:selectedKeys="selectedKeys" -->
                    <a-table :data="list" class="extratable" :expandable="userMode=='cluster'?false:expandable" v-model:expandedKeys="expandedKeys" :bordered="false" :pagination="false">
                        <template #columns>
                            <a-table-column title="名称">
                                <template #cell="{ record }">
                                    <span>{{record.name}}</span>
                                    <template v-if="!record.isExtra">
                                        <a-tag v-for="(item, index) of record.tags.filter(t=>/^union\d+$/.test(t))" :key="index" size="small" color="blue" class="ml-4" bordered>{{ item }}</a-tag>
                                    </template>
                                </template>
                            </a-table-column>
                            <a-table-column title="路径">
                                <template #cell="{ record }">
                                    <span v-if="!record.isExtra">{{record.path}}</span>
                                    <span v-if="record.isExtra&&record.name=='local-path'">/var/lib/rancher/k3s/storage</span>
                                </template>
                            </a-table-column>
                            <!-- <a-table-column title="标签">
                                <template #cell="{ record }">
                                    <a-tag v-for="tag in record.tags" :key="tag" color="arcoblue" style="margin:0 4px 0 4px;">{{tag}}</a-tag>
                                </template>
                            </a-table-column> -->
                            <a-table-column title="操作">
                                <template #cell="{ record }">
                                    <template v-if="!record.isExtra">
                                        <span v-if="userMode!='cluster'" class="c-blue cursor" @click="bindNode(record)">绑定节点</span>
                                        <span v-if="permission.includes('storage/disk/edit')" class="c-blue cursor ml-10" @click="openForm(record)">编辑</span>
                                        <span v-if="!record.node&&permission.includes('storage/disk/delete')" class="c-blue cursor ml-10" @click="deleteRow(record)">删除</span>
                                    </template>
                                    <!-- <a-popconfirm v-if="!record.node" :content="'确认要删除吗'" @ok="delRow(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                        <span class="c-blue cursor ml-10">删除</span>
                                    </a-popconfirm> -->
                                </template>
                            </a-table-column>
                        </template>
                        <template #expand-icon="{record,expanded}">
                            <div v-if="record.detailList && record.detailList.length" class="df ai-c jc-c cursor" style="padding:2px;">
                                <icon-minus v-if="expanded" />
                                <icon-plus v-else />
                            </div>
                        </template>
                        <template #expand-row="{ record }" >
                            <table v-if="record.detailList && record.detailList.length" class="com-table" style="min-width:1400px;"><tbody>
                                <tr>
                                    <td>节点</td>
                                    <td>状态</td>
                                    <td>副本数</td>
                                    <td>
                                        <span>已分配</span>
                                        <a-tooltip content="分区分配空间/可使用空间">
                                            <icon-question-circle-fill class="ml-4 fs-16 c-99 cursor" />
                                        </a-tooltip>
                                    </td>
                                    <td>
                                        <span>已使用</span>
                                        <a-tooltip content="实际使用空间/服务器硬盘空间">
                                            <icon-question-circle-fill class="ml-4 fs-16 c-99 cursor" />
                                        </a-tooltip>
                                    </td>
                                    <td>
                                        <span>存储大小</span>                                
                                        <a-tooltip content="可使用空间/服务器预留30%空间">
                                            <icon-question-circle-fill class="ml-4 fs-16 c-99 cursor" />
                                        </a-tooltip>
                                    </td>
                                    <td>操作</td>
                                </tr>
                                <tr v-for="item in record.detailList" :key="item.node">
                                    <td>{{item.node}}</td>
                                    <td>{{item.status}}</td>
                                    <td>{{item.replicas}}</td>
                                    <td>
                                        <div class="df df-inline df-c ai-c">
                                            <a-progress :percent="item.allocated.percent" status="normal" style="width:100px;" :stroke-width="10" :show-text="false" />
                                            <span class="fs-12 mt-4">{{item.allocated.used}}Gi / {{item.allocated.total}}Gi</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="df df-inline df-c ai-c">
                                            <a-progress :percent="item.used.percent" status="normal" style="width:100px;" :stroke-width="10" :show-text="false" />
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
                                        <span v-if="!item.allowScheduling&&permission.includes('storage/disk/delete')" class="c-blue cursor ml-10" @click="deleteRow(item)">删除</span>                                        <span @click="editDisk(item.node,item.name,{allowScheduling:!item.allowScheduling,evictionRequested:false})" class="c-blue cursor ml-10">{{item.allowScheduling?'禁用':'取消禁用'}}</span>
                                        <span @click="editDisk(item.node,item.name,{allowScheduling:false,evictionRequested:!item.evictionRequested})" class="c-blue cursor ml-10">{{!item.evictionRequested?'驱逐':'取消驱逐'}}</span>
                                    </td>
                                </tr>
                            </tbody></table>
                        </template>
                    </a-table>
                </div>
            </div>
            <div v-else >
                <a-table :data="loadList" :pagination="false" :bordered="false">
                    <template #columns>
                        <a-table-column title="Tag" data-index="tag"></a-table-column>
                        
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <span class="c-blue cursor ml-10" @click="openLoad(record.tag)">修改</span>
                                <a-popconfirm v-if="!record.node" :content="'确定要删除吗'" @ok="deleteTag(record.tag)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                    <span class="c-blue cursor ml-10">删除</span>
                                </a-popconfirm>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div>
        </div>

        <a-drawer :visible="form.show" :width="900" @ok="submit" @cancel="form.show=false;" :popup-container="$popupContainer">
            <template #title>{{form.key?'编辑':'新增'}}</template>
            <a-form :model="form" ref="form" :rules="rules" auto-label-width class="padding-20">
                <a-form-item label="名称" field="name" >
                    <a-input v-model="form.name" disabled size="large" placeholder="请输入名称" />
                </a-form-item>
                <!-- <a-form-item label="类型">
                    <a-select v-model="form.diskType" :disabled="!!(form.key&&form.node)" :options="diskTypes" size="large" />
                </a-form-item> -->
                <a-form-item label="路径" field="path">
                    <a-input v-model="form.path" :disabled="!!(form.key&&form.node&&form.node.length)" size="large" placeholder="请输入路径" />
                    <template #extra>请先将主机上的磁盘挂载到某个目录，然后填写挂载的目录地址</template>
                </a-form-item>
                <!-- <a-form-item label="标签">
                    <a-input-tag v-model="form.tags" :disabled="!form.key||form.node" size="large" placeholder="请输入标签" allow-clear/>
                </a-form-item> -->
                <a-form-item label="预留空间">
                    <a-input-number v-model="form.reserved" size="large">
                        <template #append>Gi</template>
                    </a-input-number>
                </a-form-item>
            </a-form>
        </a-drawer>

        <a-modal v-model:visible="bindForm.show" @ok="bindNodeSubmit" @cancel="bindForm.show=false;" :popup-container="$popupContainer">
            <template #title>选择Node</template>
            <a-form :model="bindForm" auto-label-width class="padding-20">
                <a-form-item label="" field="node">
                    <a-select v-model="bindForm.node" multiple placeholder="请选择node" :options="bindForm.nodeList" size="large" />
                </a-form-item>
            </a-form>
        </a-modal>
        
        <a-modal v-model:visible="delReplica.show" title="清理副本" width="900px" :mask-closable="false" :popup-container="$popupContainer">
            <template #title>清理副本</template>
            <div class="df df-c pods">
                <div v-for="(item,index) in delReplica.list" :key="index" class="item df ai-c jc-b">
                    <span class="c-blue">{{item.name}}</span>
                    <span v-if="item.check" class="fs-20 c-green"><icon-check /></span>
                    <span v-else-if="delReplica.start" class="fs-12 c-99">等待中...</span>
                </div>
            </div>
            <template #footer>
                <a-button @click="delReplica.show=false">取消</a-button>
                <a-button v-if="delReplica.clear" type="primary" @click="drStep2">确定删除</a-button>
                <a-button v-else type="primary" @click="drStep1">清理副本</a-button>
            </template>
        </a-modal>

        <a-modal v-model:visible="loadForm.show" :title="loadForm.isEdit?'修改负载':'添加负载'" @ok="loadFormSubmit" @cancel="loadForm.show=false;" >
            <a-form :model="loadForm" auto-label-width>
                <a-form-item label="名称">
                    <a-input v-model="loadForm.union" disabled></a-input>
                </a-form-item>
                <a-form-item label="存储设备">
                    <a-select v-model="loadForm.storage" multiple placeholder="请选择">
                        <a-option v-for="(item,index) in list" :key="index" :label="item.name" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getPermission, getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: '',
            list: [],
            data: [],

            tabsActive: '1',

            diskTypes: [
                {value: 'filesystem', label: '文件系统', },
            ],
            form: {
                show: false,
                node: '',
                key: '',
                name: '',
                path: '',
                tags: [],
                diskType: 'filesystem',
                reserved: 0,
            },

            rules: {
                name: [
                    {required:true,message:'请输入名称'},
                    {validator: (value, cb) => {
                        if(!/^[\w-]+$/.test(value)){cb(new Error('名称不合法')); return}
                        cb();
                    }}
                ],
                path: [
                    {required:true,message:'请输入路径'}
                ],
            },
            
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
            
            bindForm: {
                show: false,
                keys: [],
                node: '',
                nodeList: [],
            },
            // 清理副本
            delReplica: {
                show: false,
                list: [],
                start: false,
                row: null,
                clear: false,
            },
            volumes: [],

            permission: [],

            userMode: '',

            storageClasses: [],
            resourceUsedStatus: {
                hard: 0,
                used: 0,
                usedAllocate: 0,
                usedFs: 0,
                usedFsAllocate: 0,
            },
            loadForm: {
                show: false,
                isEdit: false,
                union: '',
                storage: [],
            },

            loadList: [],

            hasLonghornSystem: false,
        }
    },
    created(){
        let userInfo = getUserInfo();
        this.usermode = userInfo?.['w7.cc/user-mode'];
        this.getStorageClasses();
        if(this.usermode=='cluster'){
            this.getResource();
        }else{
            this.permission = getPermission() || [];
            this.namespaceActive = useNamespaceStore().namespace;
            this.getList();
        }
        this.testLonghornSystem();
    },
    methods: {
        testLonghornSystem(){
            panelApi.get('/helm/releases/longhorn?namespace=longhorn-system',{loading:true,noAlert:true}).then(res=>{
                if(res?.data){this.hasLonghornSystem = true;}
            }).catch(()=>{
                this.hasLonghornSystem = false;
            })
        },
        getResource(){
            // let userInfo = getUserInfo();
            
            // return k8sproxy.get(`/api/v1/namespaces/${userInfo['w7.cc/k3k-namespace']}/resourcequotas/${userInfo['w7.cc/k3k-name']}?local=1`).then(res=>{
            //     let data = res.data;
            //     let allocate = this.divideStorage(data.status?.used?.['requests.storage'],data.status?.hard?.['requests.storage'])
            //     this.resourceUsedStatus = {
            //         hard: data.status?.hard?.['requests.storage'],
            //         used: data.status?.used?.['requests.storage'],
            //         usedAllocate: allocate,
            //         usedFs: 0,
            //         usedFsAllocate: 0,
            //     }
            // }).then(res=>{
                const formatStorageSize = (bytes) => {
                    // 1 GiB = 1024 MiB = 1024*1024*1024 bytes
                    return bytes >= 1024 ** 3 
                        ? `${(bytes / (1024 ** 3)).toFixed(0)} Gi` 
                        : `${(bytes / (1024 ** 2)).toFixed(0)} Mi`;
                };
                return panelApi.get('/metrics/usage/disk').then(res=>{
                    let data = res?.data;

                    let usedFs = data?.disk?.usage || 0;
                    usedFs = formatStorageSize(usedFs);

                    this.resourceUsedStatus.hard = data?.disk?.total || 0;
                    this.resourceUsedStatus.hard = formatStorageSize(this.resourceUsedStatus.hard);
                    
                    this.resourceUsedStatus.usedFs = usedFs;
                    this.resourceUsedStatus.usedFsAllocate = this.divideStorage(usedFs, this.resourceUsedStatus.hard);
                })
            // })
        },
        divideStorage(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/Ti$/.test(a)){ a = parseInt(a.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(a)){ a = parseInt(a.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(a)){ a = Number(a.replace(/Mi$/,'')) }
            if(/Ti$/.test(b)){ b = parseInt(b.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(b)){ b = parseInt(b.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(b)){ b = Number(b.replace(/Mi$/,'')) }
            let value = Number(a) / Number(b);
            value = Number(value.toFixed(2))
            return value
        },
        getStorageClasses(){
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        name: i.metadata.name,
                    }
                })
                this.storageClasses = list;
            })
        },
        getList(){
            this.selectedKeys = [];
            let configList = [];
            let diskList = [];

            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps?labelSelector=type=disk', {
                loading: true,
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    try{
                        i.data.tags = JSON.parse(i.data.tags);
                    }catch(e){
                        i.data.tags = [];
                    }
                    // i.data.tags = i.data.tags.filter(t=>/^union\d+$/.test(t))
                    i.data.reserved = Number(i?.data?.reserved || 0)
                    i.data.key = i?.data.name;
                    return i.data;
                });
                configList = list;
            }).then(()=>{
                if(this.userMode=='cluster'){
                    return { data:[] };
                }
                return k8sproxy.get(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes`,{
                    headers: {Accept: 'application/json',},
                    loading: true,
                    noAlert: true,
                })
            }).then(res=>{
                let result = res.data;

                let data = result?.data || [];
                this.data = data;
                let disks = {};

                let loadList = new Set();

                data?.map(i=>{
                    for(let k in i?.disks){
                        let d = i?.disks[k];
                        
                        // d.tags = d.tags.filter(t=>/^union\d+$/.test(t))

                        loadList = new Set([...loadList, ...d?.tags]);
                        let status = d?.allowScheduling? (d?.conditions?.Schedulable?.status=='True'? '可调度' : '不可调度' ) : '禁用';
                        
                        let sz = {
                            max: d?.storageMaximum || 0,
                            use: (d?.storageMaximum || 0) - (d?.storageAvailable || 0),
                            scheduled: d?.storageScheduled || 0,
                            reserve: d?.storageReserved || 0,
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

                        let scheduledReplica = d?.scheduledReplica || {};

                        if(!disks[k]){
                            disks[k] = {
                                key: k,
                                name: k,
                                node: [i.name],
                                path: d?.path,
                                disabled: true,
                                tags: d?.tags || [],
                                detailList:[],
                            };
                        }else{
                            disks[k].node.push(i.name);
                        }
                        disks[k].detailList.push({
                            name: k,
                            key: k,
                            diskType: d?.diskType,
                            path: d?.path,
                            node: i?.name,
                            reserved: d?.storageReserved || 0,
                            tags: d?.tags || [],
                            storageScheduled: d?.storageScheduled || 0,
                            
                            allowScheduling: d.allowScheduling, // 禁用
                            evictionRequested: d.evictionRequested, // 驱逐

                            status: status,
                            allocated: allocated,
                            used: used,
                            replicas: Object.keys(scheduledReplica)?.length || 0,
                        })
                    }
                });

                this.loadList = [];
                loadList.forEach(value=>{
                    this.loadList.push({tag:value})
                });
                this.loadList = this.loadList.filter(i=>/^union/.test(i.tag))
                
                for(let i in disks){
                    diskList.push(disks[i])
                }
                // console.log(diskList)
            }).finally(()=>{
                let list = configList.concat(diskList);
                let userInfo = getUserInfo();
                if(userInfo?.['w7.cc/user-mode']=='cluster'){
                    this.list = list.filter(i=>i.name==userInfo['k3k.io/storageclass']);
                }else{
                    this.list = list;
                }
                let extra = this.storageClasses.filter(i=>{
                    return !(this.list.find(li=>li.name==i.name) || i.name=='longhorn' || i.name=='longhorn-static')
                }).map(i=>{
                    i.isExtra = true
                    return i;
                })
                this.list = this.list.concat(extra);
            })

            // k8sproxy.get(`/k8s-proxy/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes`,{
            //     headers: {Accept: 'application/json',},
            // }).then(res=>{
            //     this.volumes = res?.data?.data || [];
            // })

        },
        async drStep1(){
            let list = this.delReplica.list;

            this.delReplica.start = true;
            for(let i=0; i< list.length; i++){
                let item = list[i];
                await k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes/${item.volume}?action=replicaRemove`,{
                    name: item.name
                },{
                    headers: {Accept: 'application/json',},
                });
                item.check = true;
            }

            this.delReplica.clear = true;
        },
        async drStep2(){
            await this.delRow(this.delReplica.row);
            this.delReplica.show = false;
            this.getList();
        },
        deleteRow(row){
            if(row.node){
                panelApi.get('/longhorn/need-delete-replica',{params:{
                    nodeid: row.node,
                    diskselector: row.key,
                }}).then(res=>{
                    let list = res?.data?.items || [];
                    if(!list.length){ this.delRow(row); return; }

                    list = list.map(i=>{
                        return {
                            volume: i?.metadata?.labels?.longhornvolume,
                            name: i.metadata.name,
                            check: false,
                        };
                    })
                    this.delReplica.row = row;
                    this.delReplica.list = list;
                    this.delReplica.start = false;
                    this.delReplica.clear = false;
                    this.delReplica.show = true;
                })
            }else{
                this.delRow(row);
            }
        },
        delRow(row){
            if(!row){ return; }
            if(row.node){
                let listItem = this.data.find(i=>i.name == row.node);
                listItem = JSON.parse(JSON.stringify(listItem));
                listItem.disks = listItem.disks || {};
                listItem.disks[row.name].allowScheduling = false;

                return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${row.node}?action=diskUpdate`,{
                    disks: listItem.disks,
                },{
                    headers: {Accept: 'application/json',},
                }).then(res=>{
                    delete listItem.disks[row.name];
                    return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${row.node}?action=diskUpdate`,{
                        disks: listItem.disks,
                    },{
                        headers: {Accept: 'application/json',},
                    })
                }).then(()=>{
                    let disk = this.list.find(i=>i.key==row.key)
                    if(disk?.node?.length==1 && disk?.node[0] == row.node){
                        this.expandedKeys.splice(this.expandedKeys.indexOf(row.key),1);
                        let data = {
                            apiVersion: 'v1',
                            kind: 'ConfigMap',
                            metadata: {
                                name: row.name,
                                labels: { type: 'disk' },
                                annotations: { type: 'disk' }
                            },
                            data: {
                                name: row.name,
                                path: row.path,
                                tags: JSON.stringify(row.tags),
                                diskType: row.diskType,
                                reserved: String(row.reserved),
                            }
                        }
                        return k8sproxy.post(`/api/v1/namespaces/${this.namespaceActive}/configmaps`,data)
                    }
                }).then(()=>{
                    this.$message.success('操作成功');
                    this.getList();
                    // this.changeTags(tags);
                })
            }else{
                return k8sproxy.delete(`/api/v1/namespaces/${this.namespaceActive}/configmaps/${row.name}`).then(()=>{
                    this.$message.success('操作成功');
                    this.getList();
                })
            }
        },
        // async changeTags(tags){
        //     // 分区列表
        //     let list = await k8sproxy.get(`/k8s-proxy/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes`,{
        //         headers: {Accept: 'application/json',},
        //     }).then(res => {
        //         let data = res?.data?.data || [];
        //         let list = data.map(item => {
        //             let state = item?.state?.toLowerCase() || '';
        //             let robustness = item?.robustness?.toLowerCase() || '';
        //             let showRb = (state == 'attached' && robustness == 'healthy' ) || (state == 'attached' && robustness == 'degraded' ) || (state == 'detached' && robustness == 'faulted' );
        //             return {
        //                 name: item?.name,
        //                 diskSelector: item?.diskSelector,
        //                 healthy: showRb && robustness=='healthy',
        //                 replicaCount: item?.numberOfReplicas,
        //             }
        //         });
        //         return list;
        //     });
        //     for(let t=0; t<tags.length; t++){
        //         for(let i=0; i<list.length; i++){
        //             if(!list[i]?.healthy){continue}
        //             if(list[i]?.diskSelector?.includes(tags[t])){
        //                 if(list[i].replicaCount - 1 <= 0){continue}
        //                 await k8sproxy.post(`/k8s-proxy/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes/${list[i].name}?action=updateReplicaCount`,{
        //                     replicaCount: list[i].replicaCount - 1,
        //                 })
        //             }
        //         }
        //     }
        // },
        async bindNode(item){
            let alreadyNode = item?.node || [];
            let {data} = await k8sproxy.get('/apis/metrics.k8s.io/v1beta1/nodes').catch(()=>({data:{items:[]}}));

            let nl =  this.data.filter(i=>{
                let find = data?.items?.find(n=>n.metadata.name==i.name);
                return find?.metadata?.labels?.['node-role.kubernetes.io/storage']==='true'
            }).map(i=>({ value: i.name, label: i.name, disabled: alreadyNode.includes(i.name),}));
            this.bindForm = {
                show: true,
                keys: item? [item.name] : this.selectedKeys,
                nodeList: nl,
                node: [],
            }
        },
        editDisk(node,disk,obj){
            let nodeItem = this.data.find(i=>i.name==node);
            if(!nodeItem){ return; }

            nodeItem.disks = nodeItem.disks || {};
            nodeItem.disks[disk] = {
                ...nodeItem.disks[disk],
                ...obj,
            };

            k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${node}?action=diskUpdate`,{
                disks: nodeItem.disks,
            },{
                headers: {Accept: 'application/json',},
                loading: true,
            }).then(()=>{
                this.$message.success('操作成功');
                this.getList();
            });
        },
        bindNodeSubmit(){
            if(!this.bindForm.node?.length){ this.$message.error('请选择Node'); return; }

            useLoadingStore().loading = true;
            
            let listItems = []; // 选中的node
            this.bindForm.node.forEach(i=>{
                let find = this.data.find(d=>d.name==i)
                if(!find){ return; }
                listItems.push(JSON.parse(JSON.stringify(find)));
            })
            
            Promise.all(listItems.map(listItem=>{
                listItem.disks = listItem.disks || {};
                this.bindForm.keys.forEach(i=>{
                    let disk = this.list.find(r=>r?.key==i);
                    if(!disk){ return; }
                    listItem.disks[disk.name] = {
                        "allowScheduling": true,
                        "diskType": disk?.diskType,
                        "evictionRequested": false,
                        "path": disk.path,
                        "storageReserved": disk.reserved,
                        "tags": disk.tags?.length? disk.tags : [disk.name],
                    }
                });
                return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${listItem.name}?action=diskUpdate`,{
                    disks: listItem.disks,
                },{
                    headers: {Accept: 'application/json',},
                })
            })).then(()=>{
                return new Promise((resolve,reject)=>{
                    Promise.all(this.bindForm.keys.map(i=>{
                        return k8sproxy.delete(`/api/v1/namespaces/${this.namespaceActive}/configmaps/${i}`, {noAlert:true});
                    })).finally(()=>{
                        resolve()
                    })
                })
            }).then(()=>{
                this.$message.success('操作成功');
                this.bindForm.show = false;
                this.getList();
            }).catch(()=>{
                useLoadingStore().loading = false;
            })
        },
        openLoad(tag){
            if(tag){
                let storage = [];
                for(let n = 0; n < this.data.length; n++){
                    let node = this.data[n];
                    for(let d in node.disks){
                        let disk = node.disks[d];
                        let tags = disk?.tags || []
                        if(tags.includes(tag)){
                            storage.push(d)
                        }
                    }
                }
                storage = [...new Set(storage)];
                this.loadForm = {
                    show: true,
                    isEdit: true,
                    union: tag,
                    storage: storage,
                }
            }else{
                let n = 1;
                while(this.list?.find?.(i=>i.tags?.find?.(t=>t=='union'+n))){ n++; }
                this.loadForm = {
                    show: true,
                    isEdit: false,
                    union: 'union' + n,
                    storage: [],
                }
            }
        },
        async deleteTag(tag){
            let message = false;
            for(let n = 0; n < this.data.length; n++){
                let node = this.data[n];
                let edit = false;
                let diskKeys = Object.keys(node.disks);
                for(let d = 0; d<diskKeys.length; d++){
                    let disk = node.disks[diskKeys[d]];
                    let tags = disk?.tags || [];
                    let findIndex = tags.findIndex(i=>i==tag);
                    console.log(tags,tag,findIndex)
                    if(findIndex==-1){continue}
                    edit = true;
                    disk.tags.splice(findIndex,1);
                }
                if(!edit){continue}

                await k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${node.name}?action=diskUpdate`,node,{
                    headers: {Accept: 'application/json',},
                    loading: true,
                }).then(()=>{
                    message = true;
                }).catch(()=>{})
            }
            if(this.storageClasses.find(i=>i.name==tag)){
                await k8sproxy.delete('/apis/storage.k8s.io/v1/storageclasses/'+tag).then(res=>{
                    message = true;
                }).catch(()=>{})
            }
            if(message){
                this.$message.success('操作成功');
            }
            this.getList();
        },
        loadFormSubmit(){
            Promise.all(this.data.map(node=>{
                let edit = false;
                for(let d in node.disks){
                    let disk = node.disks[d];
                    if (new Set(this.loadForm.storage).has(d)) {
                        if(!disk.tags.includes(this.loadForm.union)){
                            edit = true;
                            disk?.tags?.push(this.loadForm.union)
                        }
                    }else if(disk?.tags?.includes(this.loadForm.union)){
                        edit = true;
                        let findIndex = disk.tags?.findIndex(t=>t==this.loadForm.union);
                        disk.tags.splice(findIndex,1);
                    }
                    disk.tags = [...new Set(disk?.tags||[])]
                }
                if(edit){
                    console.log(node.name, node)
                    return k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${node.name}?action=diskUpdate`,node,{
                        headers: {Accept: 'application/json',},
                    })
                }else{
                    return Promise.resolve();
                }
            })).then(()=>{
                this.$message.success('操作成功');
                this.loadForm.show = false;
                this.getList();
            })
        },
        openForm(item){
            let name = item?.name;
            if(!name){
                let n = 1;
                while(this.list.find(i=>i.name=='disk'+n)){ n++; }
                name = 'disk' + n;
            }
            this.form = {
                show: true,
                node: item?.node || [],
                key: item?.name || '',
                name: name,
                path: item?.path || '',
                tags: item?.tags || [name],
                diskType: item?.diskType || 'filesystem',
                reserved: this.b2gi(item?.reserved || 0),
            }
            // console.log(this.form)
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }
                if(!this.form.node?.length){
                    let data = {
                        apiVersion: 'v1',
                        kind: 'ConfigMap',
                        metadata: {
                            name: this.form.name,
                            labels: { type: 'disk' },
                            annotations: { type: 'disk' }
                        },
                        data: {
                            name: this.form.name,
                            path: this.form.path,
                            tags: JSON.stringify(this.form.tags),
                            diskType: this.form.diskType,
                            reserved: String(this.gi2b(this.form.reserved)),
                        }
                    }
                    new Promise((resolve,reject)=>{
                        if(!this.form.key || this.form.key == this.form.name){
                            resolve();
                        }else{
                            k8sproxy.delete(`/api/v1/namespaces/${this.namespaceActive}/configmaps/${this.form.key}`).then(()=>{
                                resolve();
                            }).catch(()=>{
                                reject();
                            })
                        }
                    }).then(()=>{
                        if(this.form.key == this.form.name){
                            return k8sproxy.patch(`/api/v1/namespaces/${this.namespaceActive}/configmaps/${this.form.key}`,{data: data.data},{
                                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                            })
                        }
                        return k8sproxy.post(`/api/v1/namespaces/${this.namespaceActive}/configmaps`,data)
                    }).then(()=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }else{
                    let nodes = this.data.filter(i=>this.form.node.includes(i.name));
                    // 修改所有包含当前disk的node的disk
                    Promise.all(nodes.map(node=>{
                        let listItem = JSON.parse(JSON.stringify(node));
                        let data = {
                            "diskType": this.form.diskType,
                            "path": this.form.path,
                            "storageReserved": this.gi2b(this.form.reserved),
                        }
                        if(this.form.key && this.form.key!==this.form.name){
                            delete listItem.disks[this.form.key];
                        }
                        listItem.disks[this.form.name] = data;

                        k8sproxy.post(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes/${node.name}?action=diskUpdate`,{
                            disks: listItem.disks,
                        },{
                            headers: {Accept: 'application/json',},
                        })
                    })).then(()=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }
            })

        },
        computeSize(v){
            v = Number(v) || 0;
            if(v < (1024 * 1024 * 1024)){
                return (v / 1024 / 1024).toFixed(2) + ' MB';
            }else{
                return (v / 1024 / 1024 / 1024).toFixed(2) + ' GB';
            }
        },
        gi2b(v){
            v = Number(v) || 0;
            let b = v * 1024 * 1024 * 1024;
            b = parseInt(b.toFixed(0));
            return b;
        },
        b2gi(v){
            v = Number(v) || 0;
            let b = v / 1024 / 1024 / 1024;
            b = Number(b.toFixed(2));
            return b;
        },
    },
    s2j(s){
        let o = [];
        try{
            o = JSON.parse(s);
        }catch(e){}
        return o;
    },
}
</script>

<style scoped>
.cursor.disabled{ opacity:0.8; cursor:not-allowed;}
</style>
<style>
.extratable .arco-table-tr-expand>.arco-table-td{padding:10px; background:var(--color-bg-2);}
.extratable .arco-table-tr-expand:hover>.arco-table-td{background:var(--color-bg-2)!important;}
.extratable .arco-table-expand-btn{width:auto!important; height:auto!important; border: 0!important; outline: 0!important;}
</style>
