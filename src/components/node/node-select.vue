<template>
    <div>
        <div class="df ai-c mt-4">
            <a-checkbox v-model="node_notin" @change="handleChange">反选</a-checkbox>
            <a-checkbox v-model="node_exists" @change="changeNodeExists" class="ml-10">模糊匹配</a-checkbox>
        </div>
        <div v-if="preservedExpressions.length" class="c-99 mt-10">另有 {{ preservedExpressions.length }} 条当前表格无法表示的调度条件，将保留原配置；可通过 YAML 编辑。</div>
        <a-table :data="nodes" class="cptable mt-10" :scroll="{x:'100%',y:'320px'}" row-key="id" :row-selection="rowSelection" v-model:selectedKeys="node_selector" @selection-change="keys=>{node_selector=keys;handleChange();}" :pagination="false">
            <template #columns>
                <a-table-column title="节点标签" fixed='left' :width="500" :filterable="filterable">
                    <template #cell="{ record }">
                        <span>{{record.key}}</span>
                        <span v-if="!node_exists"> = {{record.value}}</span>
                    </template>
                </a-table-column>
                <a-table-column title="匹配节点IP">
                    <template #cell="{ record }">
                        <span class="option-ip fs-12 c-ff" v-for="ips in record.ips" :key="ips">{{ips}}</span>
                    </template>
                </a-table-column>
            </template>
            <template #name-filter="{ filterValue, setFilterValue, handleFilterConfirm}">
                <div class="bg-white padding-10 df ai-c" style="box-shadow:0 0 10px rgba(0, 0, 0, 0.2);transform:translateX(-50%);margin-left:24px;">
                    <a-input :model-value="filterValue[0]" @input="(value)=>setFilterValue([value])"  @press-enter="handleFilterConfirm" placeholder="请输入搜索条件" />
                    <a-button @click="handleFilterConfirm" type="primary" style="padding:0 10px;"><template #icon><icon-search /></template></a-button>
                </div>
            </template>
        </a-table>
        <!-- <div class="top df ai-c">
            <a-checkbox v-model="node_notin" @change="handleChange">反选</a-checkbox>
            <a-checkbox v-model="node_exists" @change="changeNodeExists" class="ml-10">模糊匹配</a-checkbox>
        </div>
        <div class="list">
            <a-checkbox-group v-model="node_selector" @change="handleChange" class="df df-c">
                <a-checkbox v-for="(nds,ndsid) in nodes" :key="ndsid" :value="nds.id">
                    <span>{{nds.key}}</span>
                    <span v-if="!node_exists"> = {{nds.value}}</span>
                    <span class="ml-10"></span>
                    <span class="option-ip fs-12 c-ff" v-for="ips in nds.ips" :key="ips">{{ips}}</span>
                </a-checkbox>
            </a-checkbox-group>
        </div> -->
    </div>
</template>

<script>

import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import {h} from 'vue'
import { IconSearch } from '@arco-design/web-vue/es/icon';

export default {
    props: [ 'ns' ],
    emits: [ 'select' ],
    data(){
        return {
            node_notin: false,
            node_exists: false,
            nodesall: [],
            nodes: [],
            node_selector: [],
            preservedExpressions: [],

            filterable: {
                filter: (value, record) => record.key.includes(value),
                slotName: 'name-filter',
                icon: () => h(IconSearch),
            },
            rowSelection: {
                type: 'checkbox',
                showCheckedAll: true,
                title: '全选',
                width: 80,
            },
        }
    },
    created(){
        this.getNodes();
    },
    watch: {
        ns: "defaultData",
        node_exists(v, previous){
            const selected = this.nodes.filter(node=>this.node_selector.includes(node.id));
            let arr = [];
            this.nodesall.map((i,index)=>{
                let find = arr.find(f=>f.key==i.key&&(v?1:f.value==i.value))
                if(find){
                    find.ips.push(i.ips)
                }else{
                    arr.push({id:index, key:i.key, value:i.value, ips:[i.ips]});
                }
            })
            this.nodes = arr;
            this.node_selector = arr.filter(node=>selected.some(old=>old.key==node.key && (v || previous || old.value==node.value))).map(node=>node.id);
        },

    },
    methods:{
        changeNodeExists(){
            this.$nextTick(()=>this.handleChange());
        },
        getNodes(){
            k8sproxy.get('/api/v1/nodes').then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];

                let options = [];
                data.map(i=>{
                    let ip =  i?.status?.addresses?.find(i=>i.type=='InternalIP')?.address;
                    let master = i?.metadata?.labels['node-role.kubernetes.io/master'];
                    for(let lb in i.metadata?.labels){
                        options.push({key:lb, value:i.metadata?.labels[lb], ips:ip, master:Boolean(master)});
                    }
                })

                let arr = [];
                this.nodesall = options;
                this.nodesall.map((i,index)=>{
                    let find = arr.find(f=>f.key==i.key&&f.value==i.value)
                    if(find){
                        find.ips.push(i.ips)
                    }else{
                        arr.push({id:index, key:i.key, value:i.value, ips:[i.ips]});
                    }
                })
                this.nodes = arr;
                this.defaultData(this.ns);
            })
        },
        defaultData(ns){
            const expressions = ns?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms?.[0]?.matchExpressions || [];
            const keyCounts = new Map();
            expressions.forEach(expression=>keyCounts.set(expression.key,(keyCounts.get(expression.key)||0)+1));
            const representable = expression=>{
                // Multiple constraints on one key are ANDed, not one merged selection.
                if(keyCounts.get(expression.key)>1) return false;
                if(!['In','NotIn','Exists','DoesNotExist'].includes(expression.operator)) return false;
                if(['Exists','DoesNotExist'].includes(expression.operator)) return this.nodes.some(node=>node.key==expression.key);
                return expression.values?.length && expression.values.every(value=>this.nodes.some(node=>node.key==expression.key && node.value==value));
            };
            const operator = expressions.find(representable)?.operator || 'In';
            const editable = expressions.filter(expression=>expression.operator==operator && representable(expression));
            this.preservedExpressions = JSON.parse(JSON.stringify(expressions.filter(expression=>!editable.includes(expression))));
            this.node_selector = [...new Set(editable.flatMap(expression=>{
                if(['Exists','DoesNotExist'].includes(expression.operator)) return [this.nodes.find(node=>node.key==expression.key).id];
                return expression.values.map(value=>this.nodes.find(node=>node.key==expression.key && node.value==value).id);
            }))];
            this.node_notin = ['NotIn','DoesNotExist'].includes(operator);
            this.node_exists = ['Exists','DoesNotExist'].includes(operator);
        },
        handleChange(){
            let ns = [];
            let operator = 'In';
            if(this.node_notin&&!this.node_exists){operator = 'NotIn'}
            if(this.node_notin&&this.node_exists){operator = 'DoesNotExist'}
            if(!this.node_notin&&this.node_exists){operator = 'Exists'}
            this.node_selector.map(i=>{
                let node = this.nodes.find(item=>item.id==i);
                if(!node){return}
                let o = { key:node.key, operator: operator, }
                let find = ns.find(i=>i.key==o.key&&i.operator==operator);
                if((operator=='In'||operator=='NotIn') && find){
                    find.values? find.values?.push(node.value) : o.values= [node.value];
                    return;
                }
                if(!this.node_exists){
                    o.values = [node.value];
                }
                ns.push(o)
            });
            
            // This control edits only the first term's expressions, not other affinity rules.
            const affinity = JSON.parse(JSON.stringify(this.ns || {}));
            affinity.nodeAffinity = affinity.nodeAffinity || {};
            const nodeAffinity = affinity.nodeAffinity;
            const required = nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution || {};
            const terms = required.nodeSelectorTerms || [];
            const first = {...terms[0]};
            const expressions = ns.concat(JSON.parse(JSON.stringify(this.preservedExpressions)));
            if(expressions.length) first.matchExpressions = expressions;
            else delete first.matchExpressions;
            const nextTerms = [...(Object.keys(first).length ? [first] : []), ...terms.slice(1)];
            if(nextTerms.length){
                nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution = {...required, nodeSelectorTerms:nextTerms};
            }else{
                delete nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution;
            }
            if(!Object.keys(nodeAffinity).length) delete affinity.nodeAffinity;
            this.$emit('select', affinity);
        },
    },
}
</script>

<style scoped>
.node_selector{width:800px; border:1px solid var(--color-border-1); border-radius:4px;}
.node_selector .top{height:50px; background: var(--color-fill-2); padding:0 20px;}
.node_selector .list{padding:10px 20px;}

.option-ip{background:var(--color-neutral-8); border-radius:4px; font-size:10px; line-height:12px; padding:2px 3px; margin-left:4px;}
</style>
