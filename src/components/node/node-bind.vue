<template>
    <a-drawer :width="600" :visible="visible" @cancel="closeDrawer()" @ok="submit">
        <template #title>绑定节点</template>
        <div class="padding-20 df df-c ai-c">
            <a-transfer
                v-model="binds"
                :data="nodes"
                class="node-transfer"
                :title="['选择节点','已绑定节点']"
            >
                <template #to-target-icon>
                    <div class="df ai-c">
                        <icon-right />
                        <span class="ml-4">绑定</span>
                    </div>
                </template>
                <template #to-source-icon>
                    <div class="df ai-c">
                        <icon-left />
                        <span class="ml-4">取消</span>
                    </div>
                </template>
            </a-transfer>
        </div>
    </a-drawer>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';

export default{
    props: ['show','list'],
    data(){
        return {
            visible: false,
            nodes: [],
            binds: [],
        }
    },
    watch: {
        show(v){
            this.visible = v;
            if(v){this.init()}
        },
        list: 'init',
    },
    created(){

    },
    methods: {
        init(){
            this.nodes = this.list.map(i=>({label:i.name,value:i.name}))
            this.binds = this.list.filter(i=>i.storageTag).map(i=>i.name)
        },
        async submit(){
            for(let i in this.nodes){
                let item = this.nodes[i];
                await k8sproxy.patch('/api/v1/nodes/'+item.value,[{
                    op: 'replace',
                    path: '/metadata/labels/node-role.kubernetes.io~1storage',
                    value: String(this.binds.includes(item.value))
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            }
            
            this.$message.success('操作成功');
            this.closeDrawer(true);
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    }
}
</script>
<style>
.node-transfer .arco-transfer-operations .arco-btn{width:auto; padding:0 8px;}
.node-transfer .arco-transfer-view-search{padding:0;}
.node-transfer .arco-transfer-view{height:300px;}
.node-transfer .arco-transfer-list-item{padding:0;}
</style>
