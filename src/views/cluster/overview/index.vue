<template>
    <div class="com-container">
        <div class="bg-white padding-20">
            <div class="df jc-b">
                <div class="fs-16 b">集群信息</div>
                <!-- <div class="df ai-c">
                    <a-button @click="drawer.show=true;" >监控</a-button>
                </div> -->
            </div>
            <div class="mt-10">
                <a-form label-width="130px" label-align="left" auto-label-width>
                    <!-- <a-form-item label="主机名称" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.labels && info.labels['kubernetes.io/hostname']}}</span>
                    </a-form-item>
                    <a-form-item label="发行版本" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.osImage}}</span>
                    </a-form-item>
                    <a-form-item label="内核版本" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.kernelVersion}}</span>
                    </a-form-item>
                    <a-form-item label="系统类型" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.labels && info.labels['kubernetes.io/os']}}</span>
                    </a-form-item> -->
                    <a-form-item label="集群版本" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.gitVersion}}</span>
                    </a-form-item>
                    <a-form-item label="Service CIDR" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.serciceCIDR}}</span>
                    </a-form-item>
                    <a-form-item label="Pod CIDR" style="margin-bottom:0;">
                        <span class="c-00-6">{{info.podCIDR}}</span>
                    </a-form-item>
                    <a-form-item label="cpu" style="margin-bottom:0;">
                        <a-progress v-if="info.cpu" :percent="info.cpuPercent" :show-text="false" stroke-width="10" style="width:100px;" />
                        <span class="ml-10">{{info.cpu}} 核</span>
                    </a-form-item>
                    <a-form-item label="内存" style="margin-bottom:0;">
                        <a-progress v-if="info.memory" :percent="info.memoryPercent" :show-text="false" stroke-width="10" style="width:100px;" />
                        <span class="ml-10">{{info.memory}} G</span>
                    </a-form-item>
                </a-form>
            </div>
        </div>
        <div class="df mt-20">
            <div class="bg-white padding-20 fc">
                <div class="fs-16 b">CPU</div>
                <div class="mt-10">
                    <ol-charts :list="list" activeType="cpu"></ol-charts>
                </div>
            </div>
            <div class="bg-white padding-20 ml-20 fc">
                <div class="fs-16 b">内存</div>
                <div class="mt-10">
                    <ol-charts :list="list" activeType="memory"></ol-charts>
                </div>
            </div>
        </div>
        <a-drawer :width="740" title="监控" :visible="drawer.show" @cancel="drawer.show=false;" :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <cluster-charts v-if="drawer.show" :list="list"></cluster-charts>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import ClusterCharts from './cluster-charts.vue';
import { useNamespaceStore } from '@/store'
import olCharts from './ol-charts.vue';

export default {
    data(){
        return {
            namespaceActive: '',
            chartDialog: {
                show: false,
            },
            list: [],
            drawer: {
                show: false,
            },

            info: {
                gitVersion: '',
                serciceCIDR: '',
                podCIDR: '',
                creationTimestamp: '',
                cpu: 0,
                cpuPercent: 0,
                memory: 0,
                memoryPercent: 0,

            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getInfo();
    },
    components: {
        ClusterCharts,
        olCharts,
    },
    methods: {
        async getInfo(){
            // 并行请求优化
            const [versionRes, serviceRes, nodesRes] = await Promise.all([
                k8sproxy.get('/version'),
                k8sproxy.get('/api/v1/namespaces/default/services/kubernetes', {noAlert:true}),
                k8sproxy.get('/api/v1/nodes',{loading:true})
            ]);
            
            this.info.gitVersion = versionRes?.data?.gitVersion || '';
            this.info.creationTimestamp = window.formatDate(serviceRes?.data?.metadata?.creationTimestamp);
            
            if(nodesRes?.data){
                let data = nodesRes.data;
                let list = data.items || [];
                if(list.length){
                    this.info.podCIDR = list[0].spec.podCIDR;
                }
                let cpu = 0;
                let memory = 0;
                list.map(item=>{
                    cpu = cpu + Number(item?.status?.allocatable?.cpu || 0);
                    memory = memory + Number(item?.status?.allocatable?.memory.replace(/[a-zA-z]/g,'') || 0);
                })
                this.info.cpu = cpu;
                this.info.memory = Number((memory / 1024 / 1024).toFixed(2));
                this.list = list.map(i=>({name:i.metadata.name}));
            }
            
            // metrics 请求
            const metricsRes = await k8sproxy.get('/apis/metrics.k8s.io/v1beta1/nodes');
            let d = metricsRes?.data?.items || [];
            let usedCpu = 0;
            let usedMemory = 0;
            d.map(i=>{
                usedCpu = usedCpu + (Number(i.usage.cpu.replace(/[a-zA-z]/g,'')) / 1000 / 1000 / 1000);
                usedMemory = usedMemory + (Number(i.usage.memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 );
            })

            this.info.usedCpu = Number(usedCpu.toFixed(2));
            this.info.usedMemory = Number(usedMemory.toFixed(2));
            this.info.cpuPercent = Number((usedCpu / this.info.cpu).toFixed(2));
            this.info.memoryPercent = Number((usedMemory / this.info.memory).toFixed(2));
        }
    }
}
</script>

<style>
.big-a-progress .arco-progress-circle-wrapper{width:160px!important; height:160px!important;}
</style>