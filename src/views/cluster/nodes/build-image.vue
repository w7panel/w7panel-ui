<template>
    <div>
        
        <a-button v-if="showCreateBtn" type="primary" @click="openForm">
            <template v-if="runningTask.exist">
                <icon-loading />
                <span class="ml-4">任务执行中</span>
            </template>
            <span v-else>构建镜像</span>
        </a-button>

        <a-table v-if="!hideList" :data="list" class="cptable" :pagination="false" :bordered="false">
            <template #columns>
                <a-table-column title="任务与目标镜像" :width="280">
                    <template #cell="{ record }">
                        <div>{{record.name}}</div>
                        <div class="fs-12 c-99 task-image-name" :title="record.address">{{record.address}}</div>
                    </template>
                </a-table-column>
                <a-table-column title="状态" :width="110">
                    <template #cell="{ record }">
                        <span :class="record.statusClass">{{record.statusTxt}}</span>
                        <span v-if="record.maxRetries" class="fs-12 c-99 ml-6">{{record.retryCount}}/{{record.maxRetries}}</span>
                    </template>
                </a-table-column>
                <a-table-column title="完成时间" :width="180">
                    <template #cell="{ record }">{{record.completedAt || '-'}}</template>
                </a-table-column>
                <a-table-column title="原因" :width="200">
                    <template #cell="{ record }"><div class="task-reason" :title="record.reason">{{record.reasonTxt}}</div></template>
                </a-table-column>
                <a-table-column title="操作" :width="140">
                    <template #cell="{ record }">
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="toYaml(record)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip v-if="record.jobName" content="日志">
                            <i class="opt-icon" @click="showLog(record)"><icon-file /></i>
                        </a-tooltip>
                        <a-tooltip content="编辑">
                            <i class="opt-icon" @click="openEdit(record)"><icon-edit /></i>
                        </a-tooltip>
                        <a-popconfirm :content="'确认要删除吗'" @ok="delItem(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </template>
                </a-table-column>
            </template>
        </a-table>

        <build-image-drawer
            :show="biModal.show"
            :data="biModal.data"
            :nodeName="nodeName"
            :nodeIp="nodeIp"
            @close="v=>{biModal.show=false;v&&getList();v&&testIsBuilding();}"
        ></build-image-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <job-log
            :show="logModal.show"
            mode="modal"
            :showTabs="false"
            title="构建日志"
            :jobName="logModal.jobName"
            :namespace="namespaceActive"
            :tail-lines="500"
            @close="logModal.show = false; logModal.jobName = '';"
        />

        <!-- <a-modal
            width="600px"
            v-model:visible="runningTask.exist"
            title="提示"
            cancel-text="删除"
            ok-text="查看"
            @ok="runningTask.log"
            @cancel="runningTask.delete"
        >
            <div class="padding-20 txt-c">有正在执行的构建任务</div>
        </a-modal> -->
    </div>
</template>
<script>
import { useNamespaceStore } from '@/store'
import buildImageDrawer from '@/components/build-image-drawer.vue'
import yamlDrawer from '@/components/yaml-drawer.vue'
import jobLog from '@/components/job-log.vue'
import { k8sproxy } from '@/utils/api'
import { getPermission, getUserInfo } from '@/utils/auth'

export default{
    props: ['hideList','showCreateBtn','nodeName','nodeIp'],
    data(){
        return {
            namespaceActive: '',
            biModal: {
                show: false,
                data: null,
            },
            yamlData: {
                show: false,
                data: {},
                title: '',
                submit: ()=>{},
            },
            list: [],
            permission: [],
            debug: false,
            logModal: {
                show: false,
                jobName: '',
            },

            runningTask: {
                exist: false,
                name: '',
                log: ()=>{},
                delete: ()=>{},
            },

            setInterval: null,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        if(!this.hideList){
            this.getList();
        }
        if(this.showCreateBtn || !this.hideList){
            this.testIsBuilding();
            this.setInterval = setInterval(()=>{
                this.testIsBuilding();
                if(!this.hideList){
                    this.getList();
                }
            },5000)
        }
    },
    beforeUnmount(){
        if(this.setInterval){
            clearInterval(this.setInterval);
        }
    },
    components: {
        buildImageDrawer,
        yamlDrawer,
        jobLog,
    },
    methods: {
        getList(){
            k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/buildimages`).then(res=>{
                let list = res.data?.items || [];
                this.list = list.map(i=>{
                    return {
                        name: i.metadata?.name || '',
                        dockerfilePath: i.spec?.source?.dockerfilePath || '',
                        downloadUrl: i.spec?.source?.downloadUrl || '',
                        address: i.spec?.targetImage?.address || '',
                        username: i.spec?.targetImage?.auth?.username || '',
                        password: i.spec?.targetImage?.auth?.password || '',
                        status: i?.status?.status || '',
                        reason: i?.status?.reason || '',
                        reasonTxt: {
                            '': '-',
                            'JobPending': '等待构建任务开始',
                            'JobRunning': '正在构建镜像',
                            'JobRetrying': '构建失败，正在重试',
                            'JobCompleted': '构建完成',
                            'JobSucceeded': '构建完成',
                            'BackoffLimitExceeded': '重试次数已达上限',
                            'DeadlineExceeded': '构建超时',
                        }[i?.status?.reason] || '构建失败',
                        retryCount: i?.status?.retryCount || 0,
                        maxRetries: i?.status?.maxRetries || 0,
                        completedAt: i?.status?.completedAt ? String(i.status.completedAt).replace('T', ' ').replace(/\.\d+Z$/, '') : '',
                        statusTxt: {
                            '': '未开始',
                            'Pending': '初始化中',
                            'Running': '进行中',
                            'Building': '构建中',
                            'Succeeded': '成功',
                            'Failed': '失败',
                        }[i?.status?.status],
                        statusClass: {
                            '': 'c-99',
                            'Pending': 'c-99',
                            'Running': 'c-blue',
                            'Building': 'c-blue',
                            'Succeeded': 'c-green',
                            'Failed': 'c-red',
                        }[i?.status?.status] || 'c-99',
                        jobName: i?.status?.jobName,
                        data: i,
                    }
                })
            })
        },
        showLog(record){
            this.logModal.show = true;
            this.logModal.jobName = record.jobName;
        },
        openForm(){
            if(this.runningTask.exist){
                this.runningTask.log();
            }else{
                this.biModal.show = true;
                this.biModal.data = null;
            }
        },
        testIsBuilding(){
            k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/buildimages?labelSelector=w7.cc/build-finish=false,w7.cc/build-from=image-manager`).then(res=>{
                this.runningTask.exist = (res?.data?.items || [])?.length>0;
                if(this.runningTask.exist){
                    let jobName = res.data.items[0]?.status?.jobName || '';
                    this.runningTask.log = () => {
                        this.showLog({jobName});
                    }
                }else{
                    this.runningTask.log = () => {};
                }
            })
        },
        openEdit(record){
            this.biModal.show = true;
            this.biModal.data = record.data;
        },
        delItem(record){
            k8sproxy.delete(`/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/buildimages/${record.name}`).then(()=>{
                this.$message.success('删除成功');
                this.getList();
            });
        },
        toYaml(record){
            let resourceVersion = record.data?.metadata?.resourceVersion;
            k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/buildimages/${record.name}`).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.name,
                    submit: (data)=>{
                        data.metadata.resourceVersion = resourceVersion || data.metadata.resourceVersion;
                        return k8sproxy.put('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/buildimages/'+data?.metadata?.name, data).then(()=>{
                            this.$message.success('修改成功');
                            this.yamlData = {...this.yamlData, show:false};
                            this.getList();
                        });
                    }
                }
            });
        },
    }
}
</script>
<style scoped>
.task-image-name,
.task-reason {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
