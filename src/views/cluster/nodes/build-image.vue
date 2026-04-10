<template>
    <div>
        
        <a-button v-if="showCreateBtn" type="primary" @click="openAdd">构建镜像</a-button>

        <a-table v-if="!hideList" :data="list" class="cptable" :pagination="false" :bordered="false">
            <template #columns>
                <a-table-column title="DockerfilePath">
                    <template #cell="{ record }">{{record.dockerfilePath}}</template>
                </a-table-column>
                <a-table-column title="构建源">
                    <template #cell="{ record }">{{record.downloadUrl}}</template>
                </a-table-column>
                <a-table-column title="状态">
                    <template #cell="{ record }"><span :class="record.statusClass">{{record.statusTxt}}</span></template>
                </a-table-column>
                <a-table-column title="操作">
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
                        <a-popconfirm :content="'确认要删除吗'" @ok="delItem(record)" position="lt">
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
            @close="v=>{biModal.show=false;v&&getList()}"
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

        <a-modal
            width="600px"
            v-model:visible="runningTask.exist"
            title="提示"
            cancel-text="删除"
            ok-text="查看"
            @ok="runningTask.log"
            @cancel="runningTask.delete"
        >
            <div class="padding-20 txt-c">有正在执行的构建任务</div>
        </a-modal>
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
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        if(!this.hideList){
            this.getList();
        }
    },
    components: {
        buildImageDrawer,
        yamlDrawer,
        jobLog,
    },
    methods: {
        getList(){
            k8sproxy.get(`/apis/buildimage.w7.cc/v1alpha1/namespaces/${this.namespaceActive}/buildimages`).then(res=>{
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
        openAdd(){
            this.runningTask.exist = false;
            k8sproxy.get(`/apis/buildimage.w7.cc/v1alpha1/namespaces/${this.namespaceActive}/buildimages?labelSelector=w7.cc/build-finish=false,w7.cc/build-from=image-manager`,{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                if(!list.length){
                    this.biModal.show = true;
                    this.biModal.data = null;
                }else{
                    let name = list[0]?.metadata?.name;
                    let jobName = list[0]?.status?.jobName || '';
                    this.runningTask = {
                        exist: true,
                        log: ()=>{
                            this.showLog({jobName:jobName})
                        },
                        delete: ()=>{
                            this.$modal.confirm({
                                title: '提示',
                                content: '确定要删除吗？',
                                onOk: () => {
                                    this.delItem({name:name})
                                }
                            });
                        },
                    }
                }
            })
        },
        openEdit(record){
            this.biModal.show = true;
            this.biModal.data = record.data;
        },
        delItem(record){
            k8sproxy.delete(`/apis/buildimage.w7.cc/v1alpha1/namespaces/${this.namespaceActive}/buildimages/${record.name}`).then(()=>{
                this.$message.success('删除成功');
                this.getList();
            });
        },
        toYaml(record){
            let resourceVersion = record.data?.metadata?.resourceVersion;
            k8sproxy.get(`/apis/buildimage.w7.cc/v1alpha1/namespaces/${this.namespaceActive}/buildimages/${record.name}`).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.name,
                    submit: (data)=>{
                        data.metadata.resourceVersion = resourceVersion || data.metadata.resourceVersion;
                        return k8sproxy.put('/apis/buildimage.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/buildimages/'+data?.metadata?.name, data).then(()=>{
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
</style>