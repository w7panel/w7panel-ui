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
                    <template #cell="{ record }">{{record.statusTxt}}</template>
                </a-table-column>
                <a-table-column title="操作">
                    <template #cell="{ record }">
                        <span class="c-blue cursor" @click="openEdit(record)">修改</span>
                        <a-popconfirm content="确定删除？" @ok="delItem(record)">
                            <span class="c-blue cursor ml-10">删除</span>
                        </a-popconfirm>
                    </template>
                </a-table-column>
            </template>
        </a-table>
        <build-image-drawer :show="biModal.show" :data="biModal.data" @close="v=>{biModal.show=false;v&&getList()}"></build-image-drawer>
    </div>
</template>
<script>
import { useNamespaceStore } from '@/store'
import buildImageDrawer from './build-image-drawer.vue'
import { k8sproxy } from '@/utils/api'

export default{
    data(){
        return {
            namespaceActive: '',
            biModal: {
                show: false,
                data: null,
            },
            list: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: {
        buildImageDrawer,
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
                        data: i,
                    }
                })
            })
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
    }
}
</script>
<style scoped>
</style>