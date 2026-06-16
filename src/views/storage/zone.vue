<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <div class="mb-20">
                <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新建</a-button>
            </div>
            <div class="bg-white padding-20">
                <a-tabs v-model:active-key="listTab">
                    <a-tab-pane key="1" title="手动创建">
                        <div class="c-99">自主手动创建的分区，允许多应用混用，允许安装应用时选择</div>
                    </a-tab-pane>
                    <a-tab-pane key="2" title="自动创建">
                        <div class="c-99">来自其他应用自动创建的分区，不允许多应用混用，不允许安装应用时选择</div>
                    </a-tab-pane>
                    <template #extra>
                        <div class="df ai-c">
                            <!-- <div v-if="syspvc.show" class="df ai-c" style="margin-right:30px;">
                                <span>系统盘：</span>
                                <a-progress :percent="syspvc.progress" status="normal" style="width:60px;" :stroke-width="14" :show-text="false" />
                                <div class="ml-10">{{syspvc.actualSizeTxt}} / {{syspvc.sizeTxt}}</div>
                            </div> -->
                            <!-- <div v-if="clusterMode=='shared'">存储剩余：{{availableResource.storage.value + availableResource.storage.unit}} / {{availableResource.hard}}</div> -->
                        </div>
                    </template>
                </a-tabs>
                <a-table :data="listTab=='1'?list1:list2" class="mt-20 cptable extratable zonelisttable" :scroll="{x:'1200px'}" :bordered="false" :pagination="false">
                    <template #columns>
                        <a-table-column title="名称" :width="360" fixed="left">
                            <template #cell="{ record }">
                                <div class="df ai-c">
                                    <!-- 状态图标 -->
                                    <div v-if="record.status=='Lost'||record.status=='Released'" class="point c-red df-s0" ></div>
                                    <div v-else-if="record.status=='Bound'" class="point c-green df-s0"></div>
                                    <div v-else class="point df-s0"></div>
                                    <div>
                                        <div class="df ai-c">
                                            <span>{{record.name}}</span>
                                            <!-- 默认状态：默认显示图标，悬停显示"默认分区" -->
                                            <span v-if="record.isDefault && listTab=='1'" class="ml-6 default-status">
                                                <icon-bookmark class="fs-16" />
                                                <span class="default-text">默认分区</span>
                                            </span>
                                            <!-- 设为默认：默认显示图标，悬停显示"设为默认" -->
                                            <span v-else-if="!record.onlyshow && listTab=='1'" class="ml-6 cursor default-btn" @click.stop="setDefault(record)">
                                                <icon-bookmark class="fs-16" />
                                                <span class="default-text">设为默认</span>
                                            </span>
                                        </div>
                                        <div class="fs-12" style="color:rgb(var(--gray-6));">{{record.storageClassName}}</div>
                                    </div>

                                    <div v-if="record.isExpanding" class="ml-10 fs-12 c-66 df ai-c">
                                        <icon-loading />
                                        <span class="ml-4">扩容中</span>
                                    </div>
                                </div>
                            </template>
                        </a-table-column>

                        <a-table-column v-if="usermode!=='cluster' && hasLonghornSystem" title="副本数" :width="100">
                            <template #cell="{ record }">{{record.numberOfReplicas}}</template>
                        </a-table-column>
                        <a-table-column v-if="usermode!=='cluster' && hasLonghornSystem" title="已使用/分配" align="center">
                            <template #cell="{ record }">
                                <div class="df df-c ai-c">
                                    <!-- <a-progress :percent="record.usedSizeNum / record.storageSizeNum" style="width:100px;" :status="(record.usedSizeNum / record.storageSizeNum)>=1?'danger':'normal'" :stroke-width="10" trackColor="rgb(var(--primary-2))" :show-text="false" /> -->
                                    <div class="custom-progress">
                                        <!-- <div v-if="record.snapShotNum" class="progress-wraning" :style="{width:(record.snapShotNum / record.storageSizeNum * 100)+'%' }"></div> -->
                                        <div class="progress-primary" :style="{width:(record.usedSizeNum / record.storageSizeNum * 100)+'%'}"></div>
                                    </div>
                                    <span class="fs-12 mt-4 lh-1">
                                        <!-- {{record.snapShotNum?`${record.snapShot} / `:''}} -->
                                        {{record.usedSize}} / {{record.storageSize}}
                                    </span>
                                </div>
                            </template>
                        </a-table-column>
                        <a-table-column v-if="usermode=='cluster' && hasLonghornSystem" title="已使用">
                            <template #cell="{ record }">{{record.usedSize}}</template>
                        </a-table-column>

                        <a-table-column title="快照总大小">
                            <template #title>
                                <span>快照总大小</span>
                                
                                <a-tooltip content="快照大小会占用分配的容量">
                                    <icon-question-circle-fill class="ml-4 c-99 cursor" />
                                </a-tooltip>
                            </template>
                            <template #cell="{ record }">
                                <span v-if="record.snapShotNum" class="c-blue cursor" @click="$router.push('/storage/zone-snapshot/'+record.volumeName)">{{record.snapShot}}</span>
                                <span v-else >-</span>
                            </template>
                        </a-table-column>

                        <a-table-column title="绑定状态">
                            <template #cell="{ record }">
                                <span v-if="record.bindstatus">{{ record.attachedNodeId }}（{{record.bindstatus}}）</span>
                                <span v-else>-</span>
                                
                                <a-dropdown>
                                    <span v-if="record.state=='attached'||record.state=='detached'" class="ml-10 c-blue cursor zone-operation-dropdown" style="white-space:nowrap;">操作<icon-down/></span>
                                    <template #content>
                                        <a-doption v-if="record.state=='attached'&&record.isLock=='true'" @click="detach.volumeName=record.volumeName;detach.force=false;submitDetach();">解锁</a-doption>
                                        <a-doption v-if="record.state=='detached'" @click="openAttach(record)">绑定</a-doption>
                                        <a-doption v-if="record.state=='attached'" @click="openDetach(record)">分离</a-doption>
                                    </template>
                                </a-dropdown>
                            </template>
                        </a-table-column>

                        <a-table-column title="访问模式">
                            <template #cell="{ record }">
                                {{record.accessModes || '-'}}
                            </template>
                        </a-table-column>
                        <a-table-column title="创建时间">
                            <template #cell="{ record }">{{record.create || '-'}}</template>
                        </a-table-column>
                        <a-table-column title="操作" fixed='right' :width="240">
                            <template #cell="{ record }">
                                <span v-if="hasLonghornSystem && !record.isExpanding" class="c-blue cursor mr-20" @click="openExpend(record)">扩容</span>
                                <span v-if="record.isExpanding" class="c-blue cursor mr-20" @click="cancelExpand(record)">取消扩容</span>

                                <span v-if="record.state=='attached'" class="operation c-blue cursor mr-20" :class="tfloading.includes(record.name)?'disabled':''" @click="trimFilesystem(record)">
                                    <span>碎片整理</span>
                                    <icon-loading v-if="tfloading.includes(record.name)" class="ml-4" />
                                </span>
                                <!-- <span v-if="record.state=='detached'" class="c-blue cursor mr-20" @click="openAttach(record)">绑定</span>
                                <span v-if="record.state=='attached'" class="c-blue cursor mr-20" @click="openDetach(record)">分离</span> -->
                                <!-- <span class="c-blue cursor mr-20" v-if="!record.pvDisabled" @click="openPvpvc(record)">创建pv/pvc</span> -->
                                <a-popconfirm v-if="!record.onlyshow" content="确定要删除吗？" @ok="del(record)" position="lt"  class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                    <span :id="'disk-'+record.name" class="c-blue cursor">删除</span>
                                </a-popconfirm>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div>
        </div>

        <a-modal :visible="expand.show" title="扩容" @ok="expandSubmit" @cancel="expand.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <a-form :model="expand" ref="expand" auto-label-width>
                <a-form-item label="大小" field="size" :rules="[{required:true,message:'请输入大小'}]">
                    <a-input v-model="expand.size" type="number" placeholder="请输入大小">
                        <template #append>Gi</template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>
        
        <zone-drawer
            :show="form.show"
            :availableResource="availableResource"
            @close="closeSD"
        ></zone-drawer>

        <a-modal :visible="attach.show" title="挂载" @ok="submitAttach" @cancel="attach.show=false;">
            <a-form :model="attach" auto-label-width>
                <a-form-item label="节点">
                    <div class="df df-c" style="flex:1;">
                        <a-select v-model="attach.hostId" placeholder="请选择节点" :loading="attach.nodeLoading">
                            <a-option v-for="n in nodeList" :key="n" :label="n" :value="n"></a-option>
                        </a-select>
                        <a-checkbox v-model="attach.lock" class="mt-10">锁定</a-checkbox>
                    </div>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="detach.show" title="分离" @ok="submitDetach" @cancel="detach.show=false;">
            <a-checkbox v-model="detach.force">强制分离</a-checkbox>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';
import zoneDrawer from './zone-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import { IconBookmark } from '@arco-design/web-vue/es/icon';
import CryptoJS  from 'crypto-js';

export default {
    data() {
        return {
            namespaceActive: "",
            listTab: '1',
            list: [],
            list1: [],
            list2: [],
            expand: {
                show: false,
                nativeSize: '',
                size: '',
                key: '',
            },
            form: {
                show: false,
            },
            disks: [],
            userInfo: {},
            availableResource: {
                storage: {
                    value: '',
                    unit: '',
                },
                hard: '',
            },

            clusterMode: '',
            usermode: '',

            syspvc: {},
            hasLonghornSystem: false,

            attach: {
                show: false,
                hostId: '',
            },

            detach: {
                show: false,
                force: false,
                volumeName: '',
                hostId: '',
            },
            nodeList: [],
            testExpanding: null,
            tfloading: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.userInfo = getUserInfo();
        this.clusterMode = this.userInfo?.['k3k.io/cluster-mode'];
        this.usermode = this.userInfo?.['w7.cc/user-mode'];
        this.getList();
        this.testLonghornSystem();
    },
    components: {
        zoneDrawer,
        IconBookmark,
    },
    beforeUnmount(){
        clearTimeout(this.testExpanding);
    },
    methods: {
        trimFilesystem(row){
            this.tfloading.push(row.name);
            // /longhorn/volumes/:volumeName/trim-filesystem
            panelApi.post(`/longhorn/volumes/${row.volumeName}/trim-filesystem`).then(()=>{
                this.$message.success('碎片整理成功');
                this.getList();
            }).finally(()=>{
                this.tfloading = this.tfloading.filter(item=>item!=row.name);
            });
        },
        // 挂载
        openAttach(record){
            this.attach = {
                ...this.attach,
                show: true,
                volumeName: record.volumeName,
                hostId: '',
                nodeLoading: false,
                lock: false,
            };
            if(!this.nodeList.length){
                this.getNodeList();
            }
        },
        submitAttach(){
            if(!this.attach.hostId){
                this.$message.warning('请选择节点');
                return;
            }
            panelApi.post(`/longhorn/volumes/${this.attach.volumeName}/attach`,{
                hostId: this.attach.hostId,
                disableFrontend: this.attach.lock,
            }).then(()=>{
                this.attach.show = false;
                this.$message.success('挂载成功');
                this.getList();
            });
        },
        // 分离
        openDetach(record){
            this.detach = {
                show: true,
                volumeName: record.volumeName,
                hostId: record.migratedNode || record.hostId || '',
                force: false,
            };
        },
        submitDetach(){
            panelApi.post(`/longhorn/volumes/${this.detach.volumeName}/detach`,{
                forceDetach: this.detach.force,
            }).then(()=>{
                this.detach.show = false;
                this.$message.success('操作成功');
                this.getList();
            });
        },
        getNodeList(){
            this.attach.nodeLoading = true;
            k8sproxy.get('/api/v1/nodes').then(res=>{
                this.nodeList = (res?.data?.items || []).map(i=>i.metadata.name);
            }).finally(()=>{
                this.attach.nodeLoading = false;
            });
        },
        testLonghornSystem(){
            panelApi.get('/helm/releases/longhorn?namespace=longhorn-system',{loading:true,noAlert:true}).then(res=>{
                if(res?.data){this.hasLonghornSystem = true;}
            }).catch(()=>{
                this.hasLonghornSystem = false;
            })
        },
        openForm(){
            this.form = {
                show: true,
                name: this.createName(),
                size: 1,
                replicas: 1,
                frontend: 'blockdev',
                dataEngine: 'v1', // 数据引擎
                dataLocality: 'disabled', // 'best-effort', // 数据本地化
                accessMode: 'rwx', //访问模式
                backingImage: '', // 备份镜像
                encrypted: false, // 加密
                disk: '',
            }
            if(!this.disks?.length){
                this.getDisks();
            }
        },
        closeSD(v){
            this.form.show = false;
            v && this.getList();
        },
        getList(){
            // if(this.userInfo['w7.cc/user-mode']=='cluster'){
            //     k8sproxy.get(`/api/v1/namespaces/${this.userInfo['w7.cc/k3k-namespace']}/resourcequotas/${this.userInfo['w7.cc/k3k-name']}?local=1`).then(res=>{
            //         let data = res.data;
            //         this.availableResource = {
            //             storage: this.minusMemory(data.status?.hard?.['requests.storage'], data.status?.used?.['requests.storage']),
            //             hard: data.status?.hard?.['requests.storage'],
            //         }
            //     })
            // }
            k8sproxy.get('/api/v1/persistentvolumeclaims').then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let size = i.spec?.resources?.requests?.storage;
                    return {
                        name: i.metadata.name,
                        namespace: i.metadata.namespace,
                        key: i.metadata.name + ':' + i.metadata.namespace,
                        accessModes: i.spec?.accessModes?.join(',') || '',
                        storageSize: this.btog(size),
                        storageSizeNum: this.gtob(size),

                        storageClassName: i.spec?.storageClassName,
                        create: window.formatDate(i?.metadata?.creationTimestamp),
                        status: i.status?.phase,

                        volumeName: i.spec?.volumeName,
                    }
                })
                this.list = list;
                this.getStatus();
            })
        },
        async getStatus(){
            let list = this.list;
            const formatStorageSize = (bytes) => {
                // 1 GiB = 1024 MiB = 1024*1024*1024 bytes
                return bytes >= 1024 ** 3 
                    ? `${(bytes / (1024 ** 3)).toFixed(0)} Gi` 
                    : `${(bytes / (1024 ** 2)).toFixed(0)} Mi`;
            };

            try{
                await panelApi.get('/longhorn/volumes/status',{noAlert:true}).then(res=>{
                    let data = res?.data || {};

                    list = list.map(i=>{
                        let translateKey = this.translateToHostName(i.name, this.namespaceActive, this.userInfo?.['w7.cc/k3k-name']) + ':' + this.userInfo['w7.cc/k3k-namespace'];
                        
                        let obj = data?.[this.clusterMode=='shared'? translateKey : i.key] || {};
                        if(obj.actualSize){
                            obj.usedSize = this.btog(obj.actualSize);
                            obj.usedSizeNum = Number(obj.actualSize);
                        }else{
                            obj.usedSize = 0;
                            obj.usedSizeNum = 0;
                        }
                        obj.snapShot = this.btog(obj.snapShotSize);
                        obj.snapShotNum = Number(obj.snapShotSize);
                        
                        let bindstatus = '';
                        if(obj.state=='attached' && obj.isLock=='true'){ bindstatus = '锁定' }
                        else if(obj.state=='attached'){ bindstatus = '自动' }
                        // else if(obj.state=='detached'){ bindstatus = '未绑定' }


                        return {
                            ...i,
                            ...obj,
                            bindstatus,
                        }
                    })
                    
                    let syspvc = data?.[this.userInfo?.['w7.cc/sys-pvc-name']+':'+this.userInfo?.['w7.cc/k3k-namespace']] || '';
                    if(syspvc){
                        this.syspvc = {
                            show: true,
                            numberOfReplicas: syspvc.numberOfReplicas,
                            robustness: syspvc.robustness,
                            
                            actualSize: syspvc.actualSize,
                            actualSizeTxt: formatStorageSize(syspvc.actualSize),
                            size: Number(syspvc.size),
                            sizeTxt: formatStorageSize(Number(syspvc.size)),

                            
                            actualSize: syspvc.actualSize,
                            actualSizeTxt: formatStorageSize(syspvc.actualSize),
                            size: Number(syspvc.size),
                            sizeTxt: formatStorageSize(Number(syspvc.size)),
                        }
                        this.syspvc.progress = Number( (syspvc.actualSize / Number(syspvc.size)).toFixed(2) );
                        if(this.clusterMode=="shared"){
                            list.unshift({
                                onlyshow: true,
                                name: this.userInfo?.['w7.cc/sys-pvc-name'],
                                numberOfReplicas: 1,
                                
                                usedSizeNum: syspvc.actualSize,
                                usedSize: formatStorageSize(syspvc.actualSize),
                                storageSizeNum: Number(syspvc.size),
                                storageSize: formatStorageSize(Number(syspvc.size)),
                            })
                        }
                    }
                    this.list = list;
                    this.getCustom();
                })
            }catch{
                this.list = list;
                this.getCustom();
            }
        },
        // 判断是否手动创建
        getCustom(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{noAlert:true}).then(res=>{
                if(!res.data){return}
                let arr = res.data?.data?.customs?.split(',');
                this.customsExist = true;
                this.customsList = arr;
                this.customsDefault = res?.data?.data?.default || '';
                this.list.map(i=>{
                    i.isCustom = arr.includes(i.name);
                    i.isDefault = i.name == this.customsDefault;
                });
                if(this.list.filter(i=>i.isExpanding)?.length){
                    clearTimeout(this.testExpanding);
                    this.testExpanding = setTimeout(()=>{
                        this.getList();
                    },5000)
                }
                this.list1 = this.list.filter(i=>i.isCustom&&!i.onlyshow);
                this.list2 = this.list.filter(i=>!i.isCustom||i.onlyshow);
                // console.log(this.list1,this.list2)
            })
        },
        setDefault(record){
            if(this.customsExist){
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{
                    data: {default: record?.name || ''}
                },{
                    headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.getCustom();
                })
            }else{
                k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'longhorn-volumes-config',
                        namespace: this.namespaceActive,
                    },
                    data: {
                        default: record?.name || '',
                    }
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.getCustom();
                });
            }
        },
        del(row){
            k8sproxy.delete(`/api/v1/namespaces/${row.namespace}/persistentvolumeclaims/${row.name}`).then(res=>{
                this.$message.success('删除成功');
                this.getList();
            })
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
        
        cancelExpand(record){
            panelApi.post(`/longhorn/volumes/${record.volumeName}/cancel-expansion`).then(res=>{
                this.$message.success('取消成功');
                this.getList();
            })
        },
        openExpend(record){
            console.log(record)
            this.expand = {
                show: true,
                namespace: record.namespace,
                isOnlyshow: record.onlyshow,
                nativeSize: record.storageSize,
                size: record.storageSize.replace(/Gi/,'').trim(),
                key: record.name,
            }
        },
        expandSubmit(){
            this.$refs['expand'].validate((valid)=>{
                if(valid){return}
                
                // let availableSize = this.availableResource.storage.value + this.availableResource.storage.unit;

                // if(this.clusterMode=="shared" && availableSize){
                //     let size = this.expand.size + 'Gi';
                //     let all = this.plusMemory(availableSize, this.expand.nativeSize);
                //     let minus = this.minusMemory(all.value+all.unit, size);
                //     if(minus.value<0){
                //         this.$message.error("剩余存储不足");
                //         return;
                //     }
                // }

                if(this.expand?.isOnlyshow){
                    panelApi.post('/k3k/storage/resize',{
                        size: Number(this.expand.size),
                    }).then(res=>{
                        this.expand.show = false;
                        this.$message.success('操作成功');
                        setTimeout(()=>{
                            this.getList();
                        },800)
                        return;
                    })
                    return;
                }

                k8sproxy.patch(`/api/v1/namespaces/${this.expand.namespace}/persistentvolumeclaims/${this.expand.key}`,[{
                    op: 'replace',
                    path: '/spec/resources/requests/storage',
                    value: this.expand.size + 'Gi',
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(res=>{
                    this.expand.show = false;
                    this.$message.success('操作成功');
                    setTimeout(()=>{
                        this.getList();
                    },800)
                });
                // k8sproxy.post(`/k8s-proxy/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes/${this.expand.key}?action=expand`,{
                //     size: this.expand.size + 'Gi',
                // }).then(res=>{
                //     this.expand.show = false;
                //     this.$message.success('操作成功');
                //     setTimeout(()=>{
                //         this.getList();
                //     },800)
                // });
            });
        },
        getDisks(){
            k8sproxy.get(`/api/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/nodes`,{
                headers: {Accept: 'application/json',},
                noAlert: true,
            }).then(res=>{
                let result = res.data.data || [];
                this.diskTags = [];
                this.disks = [];
                result?.map(item =>{
                    let d = item?.disks || [];
                    this.disks = this.disks.concat(Object.keys(d));
                    
                    let ds = Object.keys(item?.disks || []);
                    ds?.map(k =>{
                        this.diskTags = this.diskTags.concat(item.disks[k]?.tags);
                    });
                });
                this.diskCont = {};
                this.disks.map(i=>{
                    this.diskCont[i] = this.diskCont[i]? this.diskCont[i]+1 : 1;
                })
                // 去重
                this.disks = Array.from(new Set(this.disks));
                this.diskTags = Array.from(new Set(this.diskTags));
            });
        },
        btog(input){
            // 单位换算比例 (以字节为基准)
            const units = {
                '': 1,        // 无单位默认字节
                'B': 1,
                'k': 1024,
                'M': 1024**2,
                'G': 1024**3,
                'T': 1024**4,
                'Ki': 1024,
                'Mi': 1024**2,
                'Gi': 1024**3,
                'Ti': 1024**4
            };
            
            // 提取数值和单位
            const match = String(input).match(/^(\d+\.?\d*)\s*(\D*)$/);
            if (!match) return '-';
            
            const [, num, unit] = match;
            const bytes = parseFloat(num) * (units[unit] || 1);
            
            // 确定显示单位
            const levels = ['B', 'K', 'Mi', 'Gi', 'Ti'];
            let level = 0;
            let size = bytes;
            
            while (size >= 1024 && level < levels.length - 1) {
                size /= 1024;
                level++;
            }
            
            return `${Number(size.toFixed(2))} ${levels[level]}`;
        },
        gtob(input){
            // 单位与字节的换算比例
            const units = {
                '': 1,        // 无单位默认字节
                'B': 1,
                'k': 1024,
                'M': 1024**2,
                'G': 1024**3,
                'T': 1024**4,
                'Ki': 1024,
                'Mi': 1024**2,
                'Gi': 1024**3,
                'Ti': 1024**4
            };
            
            // 提取数值和单位
            const match = String(input).match(/^(\d+\.?\d*)\s*(\D*)$/);
            if (!match) return NaN; // 无效输入返回NaN
            
            const [, numStr, unit] = match;
            const num = parseFloat(numStr);
            
            // 计算字节数
            return num * (units[unit] || 1);
        },
        
        translateToHostName(name, namespace, clusterName) {
            const namePrefix = `${name}-${namespace}-${clusterName}`;
            const nameKey = `${name}+${namespace}+${clusterName}`;
            const nameSuffix = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(nameKey));
            const fullPath = `${namePrefix}-${nameSuffix}`;

            if (fullPath.length < 64) return fullPath;

            const hash = CryptoJS.SHA256(fullPath).toString(CryptoJS.enc.Hex);
            const validChar = /[a-z0-9]/.test(fullPath[56]) 
                ? fullPath.substring(0, 57) + "-" + hash.substring(0, 5)
                : fullPath.substring(0, 56) + "-" + hash.substring(0, 6);

            return validChar;
        },

        minusCpu(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/^\d+(\.\d+)?$/.test(a)){ a = Number(a) * 1000; }
            if(/m$/.test(a)){a = Number(a.replace(/m$/,''))}
            if(/k$/.test(a)){a = Number(a.replace(/k$/,'')) * 1000 * 1000; }
            if(/^\d+(\.\d+)?$/.test(b)){ b = Number(b) * 1000; }
            if(/m$/.test(b)){b = Number(b.replace(/m$/,''))}
            if(/k$/.test(b)){b = Number(b.replace(/k$/,'')) * 1000 * 1000; }
            let value = a - b;
            let unit = 'm';
            if(value>0 && value%1000 == 0 ){
                value = value / 1000;
                unit = '';
            }
            return { value, unit };
        },

        minusMemory(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/Ti$/.test(a)){ a = parseInt(a.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(a)){ a = parseInt(a.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(a)){ a = Number(a.replace(/Mi$/,'')) }
            if(/Ti$/.test(b)){ b = parseInt(b.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(b)){ b = parseInt(b.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(b)){ b = Number(b.replace(/Mi$/,'')) }
            let value = Number(a) - Number(b);
            let unit = 'Mi';
            if(value > 0 && value % 1024 == 0){
                value = value / 1024;
                unit = 'Gi';
            }
            return {value, unit}
        },

        plusMemory(a, b) {
            if (!a) { a = '0' }
            if (!b) { b = '0' }
            
            if (/Ti$/.test(a)) { 
                a = parseInt(a.replace(/Ti$/, '') * 1024 * 1024); 
            } else if (/Gi$/.test(a)) { 
                a = parseInt(a.replace(/Gi$/, '') * 1024); 
            } else if (/Mi$/.test(a)) { 
                a = Number(a.replace(/Mi$/, '')) 
            }
            
            if (/Ti$/.test(b)) { 
                b = parseInt(b.replace(/Ti$/, '') * 1024 * 1024); 
            } else if (/Gi$/.test(b)) { 
                b = parseInt(b.replace(/Gi$/, '') * 1024); 
            } else if (/Mi$/.test(b)) { 
                b = Number(b.replace(/Mi$/, '')) 
            }
            
            let value = Number(a) + Number(b);
            let unit = 'Mi';
            
            if (value > 0 && value % 1024 === 0) {
                value = value / 1024;
                unit = 'Gi';
            }

            return { value, unit };
        }
        
    },
}
</script>

<style scoped>

.point{width:8px; height:8px; border-radius:50%; background:#999; margin-right:6px;}
.point.c-red{background:#D00805;}
.point.c-green{background:#00A870;}
.point.c-blue{color:rgb(var(--primary-6));}
.point.c-brown{color:#C37937;}

/* custom-progress styles to match a-progress */
.custom-progress {
    position: relative;
    width: 120px; /* Match the width used in template */
    height: 10px; /* Match stroke-width */
    background-color: rgb(var(--primary-2));
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    vertical-align: middle;
    margin: 0 8px;
}

.custom-progress .progress-primary {
    height: 100%;
    background-color: rgb(var(--primary-6));
    transition: width 0.6s ease;
}

.custom-progress .progress-wraning {
    height: 100%;
    background-color: rgb(var(--orange-5));
    transition: width 0.6s ease;
}
.custom-progress :first-child{
    border-radius: 10px 0 0 10px;
}
.custom-progress :last-child { 
    border-radius: 0 10px 10px 0;
}

/* 默认状态 - 始终显示图标 */
.default-status {
    display: inline-flex;
    align-items: center;
    color: rgb(var(--orange-5));
    cursor: default;
}

/* 设为默认 - 默认不显示 */
.default-btn {
    display: none;
    align-items: center;
    color: rgb(var(--primary-6));
    cursor: pointer;
}

.default-text {
    display: none;
    margin-left: 4px;
    font-size: 12px;
}

/* 悬停显示文字 */
.zonelisttable :deep(tr:hover) .default-text,
.zonelisttable :deep(.arco-table-tr:hover) .default-text {
    display: inline;
}

/* 悬停时显示设为默认按钮 */
.zonelisttable :deep(tr:hover) .default-btn,
.zonelisttable :deep(.arco-table-tr:hover) .default-btn {
    display: inline-flex;
}
.zone-operation-dropdown {
    opacity: 0;
    transition: opacity 0.15s;
}
.zonelisttable :deep(tr:hover) .zone-operation-dropdown,
.zonelisttable :deep(.arco-table-tr:hover) .zone-operation-dropdown {
    opacity: 1;
}
.zone-operation-dropdown.arco-dropdown-open .arco-icon-down {
  transform: rotate(180deg);
}

.operation.disabled{
    color: var(--color-primary-light-3);
    cursor: not-allowed;
}
</style>
