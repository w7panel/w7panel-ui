<template>
    <div>
        <div>
            <a-transfer
                v-model="binds"
                :data="nodes"
                class="node-transfer"
                :title="['选择节点','专用节点']"
            >
                <template #to-target-icon>
                    <div class="df ai-c">
                        <icon-right />
                        <span class="ml-4">专用</span>
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
        <!-- <div class="mt-20">
            <a-button type="primary" @click="submit">确定</a-button>
        </div> -->
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
export default{
    props: ['list'],
    data(){
        return {
            nodes: [],
            binds: [],
        }
    },
    watch: {
        list: 'init',
    },
    created(){
        this.init();
    },
    methods: {
        init(){
            if(!this.list?.length){return}
            this.nodes = this.list.map(i=>({label:i.name,value:i.name}))
            this.binds = this.list.filter(i=>i.storage).map(i=>i.name)
        },
        async submit(){
            for(let i in this.nodes){
                let item = this.nodes[i];
                await k8sproxy.patch('/api/v1/nodes/'+item.value,[{
                    op: 'replace',
                    path: '/metadata/labels/node.kubernetes.io~1storage',
                    value: this.binds.includes(item.value)? 'NoSchedule' : ''
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            }
            
            // this.$message.success('操作成功');
            // this.$emit('submit')
        },
        
    }
}
</script>
<style scoped>
</style>