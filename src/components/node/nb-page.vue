<template>
    <div>
        <div>
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

                <!-- <template #source-title="{countTotal, countSelected, checked, indeterminate, onSelectAllChange}">
                    <div style="padding:12px 0 6px;">
                        <div class="df ai-c jc-b">
                            <a-checkbox
                                :model-value="checked"
                                :indeterminate="indeterminate"
                                @change="(e) => onSelectAllChange(e)"
                                style="margin-right: 8px;height:auto;"
                            >选择节点</a-checkbox>
                            <span class="count-text">{{ countSelected }}/{{ countTotal }}</span>
                        </div>
                        <div class="df ai-c mt-10" style="padding-left:24px;height:24px;background-color:var(--color-fill-1);">节点名称</div>
                    </div>
                </template>
                <template #target-title="{countTotal, countSelected, checked, indeterminate, onSelectAllChange}">
                    <div style="padding:12px 0 6px;">
                        <div class="df ai-c jc-b">
                            <a-checkbox
                                :model-value="checked"
                                :indeterminate="indeterminate"
                                @change="(e) => onSelectAllChange(e)"
                                style="margin-right: 8px;height:auto;"
                            >已绑定节点</a-checkbox>
                            <span class="count-text">{{ countSelected }}/{{ countTotal }}</span>
                        </div>
                        
                        <div class="df ai-c jc-b mt-10" style="padding-left:24px;height:24px;background-color:var(--color-fill-1);">
                            <div class="fc">节点名称</div>
                            <div style="width:84px;">操作</div>
                        </div>
                    </div>
                </template> -->

                <!-- <template #source="{data,selectedKeys,onSelect}">
                    <div v-for="(item,index) in data" :key="index" class="custom-item df ai-c jc-b">
                        <a-checkbox :model-value="selectedKeys.indexOf(item.value)>-1" :value="item.value" @change="v=>changeSelect({key:item.value,select:v,selectedKeys,onSelect})" style="width:100%;height:100%;">
                            <div class="one-hide" style="width:100%;">{{item.label}}</div>
                        </a-checkbox>
                    </div>
                </template> -->
                
                <template #target="{data,selectedKeys,onSelect}">
                    <div v-for="(item,index) in data" :key="index" class="custom-item df ai-c jc-b">
                        <a-checkbox :model-value="selectedKeys.indexOf(item.value)>-1" @change="v=>changeSelect({key:item.value,select:v,selectedKeys,onSelect})" style="height:100%;">
                            <div class="one-hide" style="width:140px;">{{item.label}}</div>
                        </a-checkbox>
                        <a-checkbox v-model="storages[item.value]" :disabled="item.isServer" :value="item.value" style="height:100%;">
                            <div>专用节点</div>
                        </a-checkbox>
                    </div>
                </template>
            </a-transfer>
        </div>
        <div class="mt-20">
            <a-button type="primary" @click="submit">确定</a-button>
        </div>
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
            storages: {},
        }
    },
    watch: {
        list: 'init',
    },
    created(){
        this.init();
    },
    methods: {
        changeSelect(obj){
            let selectedKeys = obj.selectedKeys;
            if(obj.select){
                selectedKeys.push(obj.key)
            }else{
                selectedKeys = selectedKeys.filter(i=>i!==obj.key)
            }
            obj.onSelect(selectedKeys);
        },
        init(){
            if(!this.list?.length){return}
            console.log('lllllllllll',this.list)
            this.nodes = this.list.map(i=>{
                let isStorage = i.taints?.find?.(t=>t.key=='node.kubernetes.io/storage'&&t.effect=='NoSchedule');
                this.storages[i.name] = Boolean(isStorage);
                return {
                    label: i.name,
                    value: i.name,
                    isServer: i.isServer,
                    taints: i.taints,
                }
            })
            this.binds = this.list.filter(i=>i.storageTag).map(i=>i.name)
        },
        async submit(){
            for(let i in this.nodes){
                let item = this.nodes[i];

                let sv = this.storages[item.value]? 'NoSchedule' : '';
                let taints = item?.taints || [];
                let taintsIndex = taints.findIndex(i=>i.key=='node.kubernetes.io/storage')
                if(taintsIndex>-1){
                    if(sv){
                        taints[taintsIndex].effect = sv;
                    }else{
                        taints.splice(taintsIndex,1)
                    }
                }else if(sv){
                    taints.push({
                        key: 'node.kubernetes.io/storage',
                        effect: sv,
                    })
                }

                await k8sproxy.patch('/api/v1/nodes/'+item.value,[{
                    op: 'replace',
                    path: '/metadata/labels/node-role.kubernetes.io~1storage',
                    value: String(this.binds.includes(item.value))
                },{
                    op: 'replace',
                    path: '/spec/taints',
                    value: taints,
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            }
            this.$message.success('操作成功');
        },
        
        // async submitDDC(obj){
        //     await k8sproxy.patch('/api/v1/nodes/'+obj.key,[],{
        //         headers: {'Content-Type': 'application/json-patch+json'},
        //     });
        // },
        
    }
}
</script>
<style>
/* .node-transfer .arco-transfer-view-header{height:auto; line-height:1; padding:0; padding-right:6px;} */
.node-transfer .arco-transfer-list-item{padding:0 10px;}
.node-transfer .arco-transfer-view .arco-checkbox{padding-left:0;}
.node-transfer .arco-transfer-view{width:300px;}
.node-transfer .arco-transfer-view .custom-item{height:36px; padding:0 10px;}
.node-transfer .arco-transfer-view .custom-item:hover{color:var(--color-text-1); background-color:var(--color-fill-2);}
</style>