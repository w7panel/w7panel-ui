<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <div v-if="!metricsState.canShowPodMetrics" class="padding-20 df df-c ai-c jc-c" style="height:100%;">
            <div>未安装监控</div>
            <a-button class="mt-20" type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7panel_metrics')">去安装</a-button>
        </div>
        <div v-else class="df df-c monitor-content" style="height:100%;">
            <div class="df ai-c jc-e">
                <a-range-picker
                    showTime
                    style="width: 400px;"
                    shortcuts-position="right"
                    v-model:model-value="memoryMonitor.pickerValue"
                    :shortcuts="rangeShortcuts"
                    @ok="v=>memoryMonitor.pickerValue = v"
                />
                <span class="ml-20">时间颗粒度</span>
                <a-select v-model="memoryMonitor.step" style="margin-left:10px;width:120px;">
                    <a-option :value="15">15秒</a-option>
                    <a-option :value="60">1分钟</a-option>
                    <a-option :value="600">10分钟</a-option>
                    <a-option :value="3600">1小时</a-option>
                    <a-option :value="10800">3小时</a-option>
                    <a-option :value="43200">12小时</a-option>
                </a-select>
            </div>
            <div class="fc box" style="height:400px;">
                <div class="item df df-c">
                    <pods-charts :list="list" type="cpu" :step="memoryMonitor.step" :pickerValue="memoryMonitor.pickerValue"></pods-charts>
                </div>
                <div class="item">
                    <pods-charts :list="list" type="memory" :step="memoryMonitor.step" :pickerValue="memoryMonitor.pickerValue"></pods-charts>
                </div>
            </div>
            <div class="cilium-box mt-20">
                <pods-cilium-charts
                    :list="list"
                    :namespace="namespaceActive"
                    :step="memoryMonitor.step"
                    :pickerValue="memoryMonitor.pickerValue"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import podsCharts from '@/components/pods-charts.vue'
import podsCiliumCharts from '@/components/pods-cilium-charts.vue'
import { useNamespaceStore } from '@/store';
import axios from 'axios'
import { getUserInfo } from '@/utils/auth';
import dayjs from 'dayjs';

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: '',
            list: [],
            clusterMode: '',
            noMonitor: true,

            memoryMonitor: {
                pickerValue: '',
                step: '15',
            },
            rangeShortcuts: [{
                label: '5分钟',
                value: () => [dayjs().subtract(5, 'minute'), dayjs()],
            },{
                label: '30分钟',
                value: () => [dayjs().subtract(30, 'minute'), dayjs()],
            },{
                label: '1小时',
                value: () => [dayjs().subtract(1, 'hour'), dayjs()],
            },{
                label: '3小时',
                value: () => [dayjs().subtract(3, 'hour'), dayjs()],
            },{
                label: '12小时',
                value: () => [dayjs().subtract(12, 'hour'), dayjs()],
            },{
                label: '24小时',
                value: () => [dayjs().subtract(24, 'hour'), dayjs()],
            },{
                label: '2天',
                value: () => [dayjs().subtract(2, 'day'), dayjs()],
            },{
                label: '7天',
                value: () => [dayjs().subtract(7, 'day'), dayjs()],
            },{
                label: '30天',
                value: () => [dayjs().subtract(30, 'day'), dayjs()],
            },{
                label: '今天',
                value: () => [dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00'), dayjs()],
            },{
                label: '昨天',
                value: () => [dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00').subtract(1, 'day'), dayjs(dayjs().format('YYYY-MM-DD') + ' 00:00:00')],
            }],

            metricsState: {},
        }
    },
    components: {
        podsCharts,
        podsCiliumCharts,
    },
    async created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.clusterMode = getUserInfo()?.["k3k.io/cluster-mode"];
        
        // 并行请求优化
        const [stateRes, installedRes] = await Promise.all([
            panelApi.get('/metrics/state'),
            panelApi.get('/metrics/installed')
        ]);
        this.metricsState = stateRes.data;
        this.noMonitor = !installedRes?.data?.installed;
        
        this.memoryMonitor.pickerValue = [
            dayjs().subtract(1, 'hour'),
            dayjs(),
        ]
        this.getList();
    },
    methods: {
        getList(){
            let selector = this.data?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                params:{labelSelector: label},
                loading:true
            }).then(res=>{
                let items = res?.data?.items || [];
                this.list = items.map(item=>item?.metadata?.name);
            })
        },
    },
}
</script>

<style scoped>
.box{display:flex; flex-direction: row;}
.item{width:50%; padding:10px;}
.monitor-content{overflow:auto;}
.box,.cilium-box{flex-shrink:0;}
.cilium-box{height:440px;padding:10px;box-sizing:border-box;}
@media (max-width: 1300px) {
    .box {display:flex; flex-direction: column;}
    .item{width:100%; padding:10px; height:440px; box-sizing:border-box;}
}
</style>
