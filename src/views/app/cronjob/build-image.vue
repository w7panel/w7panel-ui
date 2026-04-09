<template>
    <div>
        <a-table :data="list" class="cptable" :pagination="false" :bordered="false">
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
        <build-image-drawer :show="biModal.show" :data="biModal.data" @close="v=>{biModal.show=false;v&&getList()}"></build-image-drawer>
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
    </div>
</template>
<script>
import { useNamespaceStore } from '@/store'
import buildImageDrawer from './build-image-drawer.vue'
import yamlDrawer from '@/components/yaml-drawer.vue'
import jobLog from '@/components/job-log.vue'
import { k8sproxy } from '@/utils/api'
import { getPermission, getUserInfo } from '@/utils/auth'

export default{
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
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
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
            this.biModal.show = true;
            this.biModal.data = null;
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