<template>
    <div class="padding-20">
        <Breadcrumb :routes="topbc" />
        <div class="bg-white padding-20">
            <a-descriptions :data="descriptions" size="large"  layout="inline-vertical" bordered>
                <template #label={label}>{{label}}</template>
                <template #value={value}>
                    <div class="mt-10 fs-22">{{value}}</div>
                </template>
            </a-descriptions>

            <a-table :data="list" class="cptable mt-20" :bordered="false" :pagination="false">
                <template #columns>
                    <a-table-column title="名称">
                        <template #cell="{ record }">
                            <div>
                                <div>
                                    <span>{{record.name}}</span>
                                    <span v-if="record.markRemoved" class="ml-6 c-red">[待删除]</span>
                                </div>
                                <div class="fs-12" style="color: rgb(var(--gray-6));">{{record.volume}}</div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="已使用/分配">
                        <template #cell="{ record }">
                            <div class="df df-c">
                                <a-progress :percent="record.readyToUseNum / record.restoreSizeNum" style="width:100px;" :status="(record.readyToUseNum / record.restoreSizeNum)>=1?'danger':'normal'" :stroke-width="10" trackColor="rgb(var(--primary-2))" :show-text="false" />
                                <div>{{record.readyToUse}} / {{ record.restoreSize }}</div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="creationTimestamp"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-popconfirm v-if="!record.markRemoved" content="确定要删除吗？" @ok="del(record)" position="lt"  class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <span :id="'snapshot-'+record.name" class="c-blue cursor">删除</span>
                            </a-popconfirm>
                            <span v-else :id="'snapshot-'+record.name" @click="snapshotPurge(record)" class="c-blue cursor" :class="{'disabled-operation-btn': snapshotPurgeLoading}">清理</span>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
    </div>
</template>
<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import dayjs from 'dayjs';
export default{
    data(){
        return {
            topbc: [
                {name:'root'},
                {name: "storage", label: "存储管理"},
                {name: "storage-zone", label: "存储分区"},
                {name: "storage-zone-snapshot", label: "快照管理"},
            ],
            descriptions: [
                {label: '快照数量', value: 0},
                {label: '快照总大小', value: 0},
            ],
            list: [],
            namespaceActive: '',
            snapshotPurgeLoading: false,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    methods: {
        getList(){
            let id = this.$route.params.id;
            k8sproxy.get(`/apis/longhorn.io/v1beta2/snapshots`,{
                params: { labelSelector: `longhornvolume=${id}` },
                noAlert: true,
            }).then(res=>{
                let items = res?.data?.items || [];
                this.list = items.map(i=>({
                    name: i.metadata.name,
                    volume: i?.spec?.volume,
                    namespace: i.metadata.namespace,
                    createTime: i.metadata.creationTimestamp,
                    creationTimestamp:dayjs(i.metadata.creationTimestamp).format('YYYY-MM-DD hh:mm:ss'),
                    readyToUseNum: Number(i.status?.size),
                    readyToUse: this.btog(i.status?.size),
                    restoreSizeNum: Number(i.status?.restoreSize),
                    restoreSize: this.btog(i.status?.restoreSize),
                    markRemoved: i.status?.markRemoved,
                }));
                this.list.sort((a,b)=>dayjs(b.createTime).unix()-dayjs(a.createTime).unix());
                this.descriptions[0].value = this.list.length;
                this.descriptions[1].value = this.btog(this.list.reduce((a,b)=>a+b.readyToUseNum,0));
            });
        },
        del(row){
            panelApi.post(`/longhorn/volumes/${row.volume}/snapshot-delete`,{name:row.name}).then(res=>{
                this.$message.success('删除成功');
                setTimeout(()=>{
                    this.getList();
                },1000)
            }).catch(()=>{
                this.$message.error('删除失败');
            });

            // k8sproxy.delete(`/apis/longhorn.io/v1beta2/namespaces/${row.namespace}/snapshots/${row.name}`).then(() => {
            //     this.$message.success('删除成功');
            //     this.getList();
            // }).catch((e) => {
            //     console.log(e);
            //     this.$message.error('删除失败');
            // });
        },
        snapshotPurge(row){
            if(this.snapshotPurgeLoading) return;
            this.snapshotPurgeLoading = true;
            panelApi.post(`/longhorn/volumes/${row.volume}/snapshot-purge`,{name:row.name}).then(()=>{
                this.$message.success('清理成功');
                this.getList();
            }).catch(()=>{
                this.$message.error('清理失败');
            }).finally(()=>{
                this.snapshotPurgeLoading = false;
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
    }
}
</script>
<style scoped>
.disabled-operation-btn{color:var(--color-primary-light-3); cursor: not-allowed;}
</style>