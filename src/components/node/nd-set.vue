<template>
    <div>
        <div>
            <a-form layout="vertical">
                <!-- <a-form-item label="系统管理组件节点选择器">
                    <a-input v-model="sm" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="Kubernetes 污点容忍">
                    <a-input v-model="tt" placeholder="请输入"></a-input>
                </a-form-item> -->
                <a-form-item label="使用存储网络进行集群内数据流量。将此字段留空以使用 Kubernetes 集群网络">
                    <a-input v-model="sn" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="允许 Longhorn 将存储网络用于 RWX（读写多）卷">
                    <a-switch v-model="ve"></a-switch>
                </a-form-item>
            </a-form>
            <div>
                <a-button type="primary" @click="submit">确定</a-button>
            </div>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';

export default{
    data(){
        return {
            sm: 'node-role.kubernetes.io/storage:true',
            tt: 'node-role.kubernetes.io/storage:NoSchedule',
            sn: '',
            ve: false,
        }
    },
    created(){
        this.getData();
    },
    methods: {
        getData(){
            // k8sproxy.get('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/system-managed-components-node-selector').then(res=>{
            //     if(res?.data?.value){this.sm = res.data.value}
            // })
            // k8sproxy.get('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/taint-toleration').then(res=>{
            //     this.tt = res?.data?.value || '';
            // })
            k8sproxy.get('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/storage-network',{noAlert:true}).then(res=>{
                if(res?.data?.value){this.sn = res.data.value}
            })
            k8sproxy.get('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/storage-network-for-rwx-volume-enabled',{noAlert:true}).then(res=>{
                this.ve = res?.data?.value === 'true';
            })
        },
        async submit(){
            // await k8sproxy.patch('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/system-managed-components-node-selector',{
            //     value: this.sm,
            // },{
            //     headers: {'Content-Type': 'application/merge-patch+json'}
            // }).catch(()=>{})
            // await k8sproxy.patch('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/taint-toleration',{
            //     value: this.tt,
            // },{
            //     headers: {'Content-Type': 'application/merge-patch+json'}
            // }).catch(()=>{})
            await k8sproxy.patch('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/storage-network',{
                value: this.sn,
            },{
                headers: {'Content-Type': 'application/merge-patch+json'}
            }).catch(()=>{})
            await k8sproxy.patch('/apis/longhorn.io/v1beta2/namespaces/longhorn-system/settings/storage-network-for-rwx-volume-enabled',{
                value: String(this.ve),
            },{
                headers: {'Content-Type': 'application/merge-patch+json'}
            }).catch(()=>{})
            
            this.$message.success('操作成功');
        },
    }
}
</script>
<style scoped>
</style>