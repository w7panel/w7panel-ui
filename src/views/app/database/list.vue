<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div v-if="permission.includes('app-dblist-add')" class="mb-20">
            <a-button type="primary" @click="$router.push('/app/store?tag=数据库集群')"><template #icon><icon-plus /></template>新建</a-button>
            <!-- <a-button type="primary" @click="createdb.show=true;"><template #icon><icon-plus /></template>新建</a-button> -->
        </div>
        <div class="bg-white padding-20">
            <a-table :data="list" class="cptable" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名字">
                        <template #cell="{ record }">
                            <div class="df df-c">
                                <span class="c-blue cursor" @click="$router.push('/app/dbdetail/'+record.name)">{{record.name}}</span>
                                <span class="mt-4 list-title cursor" @click="editTitle(record)">
                                    <span>{{record.title||'未命名'}}</span>
                                    <icon-edit class="editbtn ml-4 c-blue cursor" />
                                </span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="数据库版本">
                        <template #cell="{ record }">{{record.version}}</template>
                    </a-table-column>
                    <a-table-column title="状态">
                        <template #cell="{ record }">
                            <!-- <span v-if="record.status=='Failed'" class="c-red">{{record.status}}</span>
                            <span v-else-if="record.status=='Running'" class="c-green">{{record.status}}</span>
                            <span v-else class="c-99">{{record.status}}</span> -->
                            
                            <a-popover position="bottom" @popup-visible-change="v=>v?getEvents(record):null">
                                <span v-if="record.status=='Failed'" class="c-red cursor">{{record.status}}</span>
                                <span v-else-if="record.status=='Running'" class="c-green cursor">{{record.status}}</span>
                                <span v-else class="c-99 cursor">{{record.status}}</span>
                                <template #content>
                                    <div style="max-height:400px; max-width:800px; overflow:auto;">
                                        <table class="com-table"><tbody>
                                            <tr>
                                                <td>级别</td>
                                                <td>内容</td>
                                                <td>详细描述</td>
                                                <td>时间</td>
                                            </tr>
                                            <tr v-for="(record,index) in eventLs" :key="index">
                                                <td>{{record.type}}</td>
                                                <td>{{record.reason}}</td>
                                                <td>{{record.message}}</td>
                                                <td>{{record.eventTime}}</td>
                                            </tr>
                                            <tr v-if="!eventLs||!eventLs.length">
                                                <td colspan="5" class="txt-c c-cc">没有数据</td>
                                            </tr>
                                        </tbody></table>
                                    </div>
                                </template>
                            </a-popover>
                        </template>
                    </a-table-column>
                    <!-- <a-table-column title="创建时间">
                        <template #cell="{ record }">{{record.creationTimestamp}}</template>
                    </a-table-column> -->
                    <a-table-column title="配置：(CPU/内存/硬盘)">
                        <template #cell="{ record }">{{record.cpu}} / {{record.memory}} / {{record.storage}}</template>
                    </a-table-column>
                    <!-- <a-table-column title="内存">
                        <template #cell="{ record }">{{record.memory}}</template>
                    </a-table-column>
                    <a-table-column title="磁盘">
                        <template #cell="{ record }">{{record.storage}}</template>
                    </a-table-column> -->
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-dropdown trigger="hover">
                                <i class="opt-icon"><icon-apps /></i>
                                <template #content>
                                    <!-- <a-doption @click="$router.push('/database/detail/'+record.name)">详情</a-doption>
                                    <a-doption @click="openStorage(record)">磁盘扩容</a-doption>
                                    <a-doption @click="openReplica(record)">水平扩容</a-doption>
                                    <a-doption @click="openCpuMemory(record)">垂直扩容</a-doption> -->
                                    <a-doption @click="restart(record)">重启集群</a-doption>
                                    <a-doption @click="stopStart">{{record.status=='Running'?'停止':'启动'}}</a-doption>
                                </template>
                            </a-dropdown>
                            <a-popconfirm v-if="record.status!='Deleting'&&permission.includes('app-dblist-delete')" :content="'确认要删除吗'" @ok="delItem(record)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <database-form :show="form.show" @close="v=>{form.show=false;v&&getList()}"></database-form>

        <a-modal :visible="cpuMemory.show" title="垂直扩容" @cancel="cpuMemory.show=false;" @ok="submitCpuMemory">
            <a-form v-model="cpuMemory" auto-label-width class="padding-10">
                <a-form-item label="CPU" field="cpu">
                    <a-input v-model="cpuMemory.cpu" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>核</template>
                    </a-input>
                </a-form-item>
                <a-form-item label="内存" field="memory">
                    <a-input v-model="cpuMemory.memory" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>G</template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="changeStorage.show" title="磁盘扩容" @cancel="changeStorage.show=false;" @ok="submitStorage">
            <a-form v-model="changeStorage" auto-label-width class="padding-10">
                <a-form-item label="磁盘" field="memory">
                    <a-input v-model="changeStorage.storage" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>Gi</template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="replicaForm.show" title="水平扩容" @cancel="replicaForm.show=false;" @ok="submitReplica">
            <a-form v-model="replicaForm" auto-label-width class="padding-10">
                <a-form-item label="副本数" field="memory">
                    <a-input v-model="replicaForm.replica" type="number" size="large" placeholder="请输入" style="width:500px;"></a-input>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="titleForm.show" title="修改名称" @cancel="titleForm.show=false;" @ok="submitEditTitle">
            <a-form v-model="titleForm" auto-label-width class="padding-10">
                <a-form-item label="名称" field="memory">
                    <a-input v-model="titleForm.title" size="large" :spellcheck="false" placeholder="请输入" style="width:500px;"></a-input>
                </a-form-item>
            </a-form>
        </a-modal>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <new-db :show="createdb.show" @close="createdb.show=false;"></new-db>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store'
import databaseForm from './database-form.vue'
import yamlDrawer from '@/components/yaml-drawer.vue'
import { getPermission } from '@/utils/auth';
import { getUserInfo } from '@/utils/auth';
import newDb from './new-db.vue';

export default {
    data(){
        return {
            namespaceActive: '',
            list: [],
            form: {
                show: false,
            },
            cpuMemory: {},
            changeStorage: {},
            replicaForm: {},
            titleForm: {},
            
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            eventLs: [],
            permission: [],
            debug: false,
            createdb: {
                show: false,
            },
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: { databaseForm,yamlDrawer,newDb },
    methods: {
        getEvents(row){
            this.eventLs = row.events;
        },
        getList(){
            k8sproxy.get('/apis/apps.kubeblocks.io/v1alpha1/clusters',{loading:true}).then(res=>{
                let items = res?.data?.items || [];
                let list = items.map(i=>{
                    let memory = i.spec?.componentSpecs?.[0]?.resources?.limits?.memory || '';
                    let memoryNum = memory.replace(/^(\d+(\.\d+)?)Gi$/,(v,$1)=>Number($1)).replace(/^(\d+(\.\d+)?)Mi$/,(v,$1)=>$1*1024);
                    let storage = i.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage;
                    let storageNum = storage.replace(/^(\d+(\.\d+)?)Gi$/,(v,$1)=>Number($1)).replace(/^(\d+(\.\d+)?)Mi$/,(v,$1)=>$1*1024);
                    let events = i?.status?.conditions?.map(c=>({
                            type: c.type,
                            reason: c.reason,
                            message: c.message,
                            eventTime: window.formatDate(c.lastTransitionTime),
                    })) || [];
                    let version = i?.metadata?.labels?.['w7panel.kubeblocks.io/version'] || i?.spec?.clusterVersionRef;
                    return {
                        name: i.metadata?.name,
                        namespace: i.metadata?.namespace,
                        title: i.metadata?.annotations?.title,
                        dbtype: i.spec?.clusterDefinitionRef,
                        status: i.status?.phase,
                        version: version,
                        creationTimestamp: window.formatDate(i.metadata?.creationTimestamp),
                        cpu: i.spec?.componentSpecs?.[0]?.resources?.limits?.cpu,
                        replica: i.spec?.componentSpecs?.[0]?.replicas,
                        memory: memory,
                        memoryNum: memoryNum,
                        storage: storage,
                        storageNum: storageNum,
                        componentName: i.spec?.componentSpecs?.[0]?.name,
                        uid: i.metadata?.uid,
                        events: events,
                    }
                })
                this.list = list;
            })
        },
        editTitle(row){
            this.titleForm = {
                show: true,
                title: row.title || '',
                name: row.name,
            }
        },
        submitEditTitle(){
            k8sproxy.patch('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+ this.namespaceActive +'/clusters/'+this.titleForm.name, {
                metadata:{
                    annotations: {
                        title: this.titleForm.title,
                    }
                }
            },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
                this.titleForm.show = false;
                this.$message.success('操作成功');
                this.getList();
            });
        },
        // 新建
        openForm(){ this.form = { show: true } },
        openYaml(name){
            k8sproxy.get("/apis/apps.kubeblocks.io/v1alpha1/namespaces/"+this.namespaceActive+"/clusters/"+name).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/apis/apps.kubeblocks.io/v1alpha1/namespaces/"+this.namespaceActive+"/clusters/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        // 重启集群
        restart(row){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'restart-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: row.name,
                    type: 'Restart',
                    restart: [{
                        componentName: row.componentName,
                    }]
                }
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        // 水平扩容
        openReplica(row){
            this.replicaForm = {
                show: true,
                name: row.name,
                componentName: row.componentName,
                oldReplica: row.replica,
                replica: row.replica,
            }
        },
        // 提交水平扩容
        submitReplica(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'horizontal-scaling-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.replicaForm.name,
                    type: 'HorizontalScaling',
                    horizontalScaling: [{
                        componentName: this.replicaForm.componentName,
                        [Number(this.replicaForm.replica)>this.replicaForm.oldReplica? 'scaleOut' : 'scaleIn']: {
                            replicaChanges: Math.abs(Number(this.replicaForm.replica) - this.replicaForm.oldReplica),
                        }
                    }]
                }
            }).then(res=>{
                this.replicaForm.show = false;
                this.$message.success('操作成功');
                this.getList();
            });
        },
        // 磁盘扩容
        openStorage(row){
            this.changeStorage = {
                show: true,
                name: row.name,
                storage: row.storageNum,
                componentName: row.componentName,
            }
        },
        // 提交磁盘扩容
        submitStorage(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'volume-expansion-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.changeStorage.name,
                    type: 'VolumeExpansion',
                    volumeExpansion: [{
                        componentName: this.changeStorage.componentName,
                        volumeClaimTemplates: [{
                            name: 'data',
                            storage: this.changeStorage.storage + 'Gi',
                        }]
                    }]
                }
            }).then(res=>{
                this.changeStorage.show = false;
                this.$message.success('操作成功');
                this.getList();
            })
        },
        // 垂直扩容
        openCpuMemory(row){
            this.cpuMemory = {
                show: true,
                name: row.name,
                cpu: row.cpu,
                memory: row.memoryNum,
                componentName: row.componentName,
            }
        },
        // 提交垂直扩容
        submitCpuMemory(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'vertical-scaling-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.cpuMemory.name,
                    type: "VerticalScaling",
                    verticalScaling: [{
                        componentName: this.cpuMemory.componentName,
                        requests: {
                            memory: this.cpuMemory.memory + 'Gi',
                            cpu: this.cpuMemory.cpu,
                        },
                        limits: {
                            memory: this.cpuMemory.memory + 'Gi',
                            cpu: this.cpuMemory.cpu,
                        },
                    }]
                },
            }).then(res=>{
                this.cpuMemory.show = false;
                this.$message.success('操作成功');
                this.getList();
            })
        },
        // 删除
        delItem(row){
            k8sproxy.delete('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/clusters/'+row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        // 停止启动
        stopStart(row){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: 'apps.kubeblocks.io/v1alpha1',
                kind: 'OpsRequest',
                metadata: {
                    name: (row.status=="Running"? 'stop' : 'start') + '-' + Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: row.name,
                    type: row.status=="Running"? 'Stop' : 'Start',
                }
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },

    },
}
</script>

<style scoped>
.list-title .editbtn{display:none;}
/* .list-title:hover{color:rgb(var(--primary-6));} */
.list-title:hover .editbtn{display:inline-block;}
</style>