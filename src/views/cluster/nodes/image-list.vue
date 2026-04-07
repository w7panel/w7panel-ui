<template>
    <div class="padding-20">
        <div class="bg-white padding-20">
            <div class="df ai-c">
                <span class="df-s0">选择节点：</span>
                <a-select v-model="node" @change="getPid" placeholder="请选择节点">
                    <a-option v-for="item in nodeList" :key="item.name" :value="item.name">{{item.name}}</a-option>
                </a-select>
            </div>
            
            <a-table :data="list" :pagination="false" class="mt-20" :bordered="false">
                <template #columns>
                         
                    <a-table-column title="名称" :width="360">
                        <template #cell="{ record }">{{record.Name}}</template>
                    </a-table-column>
                    <a-table-column title="标签">
                        <template #cell="{ record }">
                            <div>
                                <div v-for="(value,key) in record.Labels">{{ key + ':' + value }}</div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="镜像id" :width="360">
                        <template #cell="{ record }">{{record.Target.digest}}</template>
                    </a-table-column>
                    <a-table-column title="创建时间">
                        <template #cell="{ record }">{{record.created}}</template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-popconfirm content="确定要删除吗" @ok="deleteImage(record)" position="lt">
                                <span class="df-s0 ml-10 c-blue cursor" @click.stop>删除</span>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
    </div>
</template>

<script>
import { useNamespaceStore } from '@/store';
import { k8sproxy, panelApi } from '@/utils/api';
import axios from 'axios';
import dayjs from 'dayjs';

export default {
    data(){
        return {
            namespaceActive: 'default',
            nodeList: [],
            node: '',
            list: [],
            agentUrl: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getNodes();
    },
    mounted(){
    },
    methods: {
        getNodes(){
            k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                let list = data.map(item=>{
                    return {
                        name: item.metadata.name,
                        internalIP: item.status?.addresses?.[0]?.address,
                    }
                })
                this.nodeList = list;
            })
        },
        getPid(){
            let node = this.nodeList.find(i=>i.name==this.node);
            if(!node){return}
            let ip = node.internalIP;
            panelApi.get('/pid',{
                params:{
                    namespace: this.namespaceActive,
                    HostIp: ip,
                },
                loading: true,
            }).then(res=>{
                this.agentUrl = res.data.agentUrl;
                this.getList();
            })
        },
        getList(){
            axios.get(this.agentUrl+'/panel-api/v1/k3s-registry/images/list',{
                loading: true,
            }).then(res=>{
                this.list = res.data.map(i=>{
                    i.created = dayjs(i.CreatedAt).format('YYYY-MM-DD HH:mm:ss');
                    return i;
                });
            })
        },
        deleteImage(row){
            axios.post(this.agentUrl+'/panel-api/v1/k3s-registry/images/delete',{
                target: row.Name,
            },{
                loading: true,
            }).then(res=>{
                this.$message.success('删除成功');
                this.getList();
            })
        },
    },
}
</script>

<style>
</style>
