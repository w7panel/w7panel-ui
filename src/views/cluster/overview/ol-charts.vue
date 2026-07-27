<template>
    <div class="df df-c" style="height:400px;">
        <div class="fc chartbox">
            <div v-if="activeType=='cpu'" id="cpuChart" class="chart"></div>
            <div v-else-if="activeType=='memory'" id="memoryChart" class="chart"></div>
            <div v-else-if="activeType=='HostGPUMemoryUsage'" id="HostGPUMemoryUsageChart" class="chart"></div>
            <div v-else-if="activeType=='HostCoreUtilization'" id="HostCoreUtilizationChart" class="chart"></div>
            <div v-else-if="activeType=='load'" id="loadChart" class="chart"></div>
            <div v-else-if="activeType=='disk'" id="diskChart" class="chart"></div>
            <div v-else-if="activeType=='disk-read'" id="diskreadChart" class="chart"></div>
            <div v-else-if="activeType=='disk-write'" id="diskwriteChart" class="chart"></div>
            <div v-else-if="activeType=='network'" id="networkChart" class="chart"></div>
            <div v-else-if="activeType=='network-in'" id="networkinChart" class="chart"></div>
            <div v-else-if="activeType=='network-out'" id="networkoutChart" class="chart"></div>
            <div v-else-if="activeType=='disk-read-bytes'" id="diskreadbytesChart" class="chart"></div>
            <div v-else-if="activeType=='disk-written-bytes'" id="diskwrittenbytesChart" class="chart"></div>
            <div v-else-if="activeType=='network-receive-bytes'" id="networkreceivebytesChart" class="chart"></div>
            <div v-else-if="activeType=='network-transmit-bytes'" id="networktransmitbytesChart" class="chart"></div>
            <a-empty
                v-else-if="isCiliumChart(activeType) && !getChartState(activeType).loading && !getChartState(activeType).y.length"
                class="empty-chart"
                description="暂无 Cilium 指标数据，请确认 Cilium 已开启 Prometheus 指标"
            />
            <div v-else-if="activeType=='cilium-drop-count'" id="ciliumdropcountChart" class="chart"></div>
            <div v-else-if="activeType=='cilium-drop-bytes'" id="ciliumdropbytesChart" class="chart"></div>
            <div v-else-if="activeType=='cilium-endpoint'" id="ciliumendpointChart" class="chart"></div>
            <div v-else-if="activeType=='cilium-unreachable'" id="ciliumunreachableChart" class="chart"></div>
            <div v-else-if="activeType=='cilium-bpf-map-pressure'" id="ciliumbpfmappressureChart" class="chart"></div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import * as echarts from 'echarts'

import { useDarkStore } from '@/store'
import { getUserInfo } from '@/utils/auth';
import dayjs from 'dayjs'
import { markRaw } from 'vue'

export default {
    props: ['list','node','activeType','noMonitor','pickerValue','step','virtualDiskFilterCache'],
    data(){
        return {
            // activeType: 'cpu',
            dark: useDarkStore(),
            _virtualDiskFilterCache: null,
            timeType: 'minute',
            timeRange: [], 

            menuIndex: 'cpu',
            chartType: 'cpu',
            
            cpu:{
                loading: false,
                x:[],
                y:[],
            },
            memory:{
                loading: false,
                x:[],
                y:[],
            },
            HostGPUMemoryUsage: {
                loading: false,
                x: [],
                y: [],
            },
            HostCoreUtilization: {
                loading: false,
                x: [],
                y: [],
            },
            load: {
                loading: false,
                x: [],
                y: [],
            },
            'disk-read': {
                loading: false,
                x: [],
                y: [],
            },
            'disk-write': {
                loading: false,
                x: [],
                y: [],
            },
            'network-in': {
                loading: false,
                x: [],
                y: [],
            },
            'network-out': {
                loading: false,
                x: [],
                y: [],
            },
            'disk-read-bytes': {
                loading: false,
                x: [],
                y: [],
            },
            'disk-written-bytes': {
                loading: false,
                x: [],
                y: [],
            },
            'network-receive-bytes': {
                loading: false,
                x: [],
                y: [],
            },
            'network-transmit-bytes': {
                loading: false,
                x: [],
                y: [],
            },
            'cilium-drop-count': {
                loading: false,
                x: [],
                y: [],
            },
            'cilium-drop-bytes': {
                loading: false,
                x: [],
                y: [],
            },
            'cilium-endpoint': {
                loading: false,
                x: [],
                y: [],
            },
            'cilium-unreachable': {
                loading: false,
                x: [],
                y: [],
            },
            'cilium-bpf-map-pressure': {
                loading: false,
                x: [],
                y: [],
            },
            chart: null,
            userInfo: {},
        }
    },
    created(){
        if(this.virtualDiskFilterCache){
            this._virtualDiskFilterCache = this.virtualDiskFilterCache;
        }
        this.userInfo = getUserInfo();
    },
    mounted(){
        this.init();
    },
    beforeDestroy(){
        window.removeEventListener("resize",  this.resize);
        this.chart?.dispose?.();
    },
    watch: {
        virtualDiskFilterCache(v){
            this._virtualDiskFilterCache = v;
        },
        node(){this.init();},
        list(){this.init();},
        pickerValue(){
            this.chartInit(this.activeType);
        },
        step(){
            this.chartInit(this.activeType);
        },
        activeType(v){
            this.chartInit(v);
        },
        'dark.isDark'(v){
            this.$nextTick(() => {
                this.renderChart(this.activeType);
            });
        }
    },
    methods: {
        getChartState(chartType){
            if(!this[chartType]){
                this[chartType] = {
                    loading: false,
                    x: {},
                    y: [],
                };
            }
            return this[chartType];
        },
        isCiliumChart(chartType){
            return [
                'cilium-drop-count',
                'cilium-drop-bytes',
                'cilium-endpoint',
                'cilium-unreachable',
                'cilium-bpf-map-pressure',
            ].includes(chartType);
        },
        getCiliumSeriesName(chartType, metric){
            const node = metric.node || '集群';
            if(chartType=='cilium-drop-count'||chartType=='cilium-drop-bytes'){
                const direction = metric.direction=='INGRESS' ? '入站' : (metric.direction=='EGRESS' ? '出站' : metric.direction);
                return [node, direction, metric.reason].filter(Boolean).join(' / ');
            }
            if(chartType=='cilium-unreachable'){
                return [node, metric.resource].filter(Boolean).join(' / ');
            }
            if(chartType=='cilium-bpf-map-pressure'){
                return [node, metric.map_name].filter(Boolean).join(' / ');
            }
            return node;
        },
        isCkmRequest(){
            return this.userInfo?.['w7.cc/is-ckm-req']=='true'
                || this.userInfo?.['w7.cc/is-cvm-req']=='true';
        },
        async init(){
            // if(!this.list?.length && !this.node){return}
            if(!this.activeType){return}
            this.$nextTick(()=>{
                this.chartInit(this.activeType);
            })
        },
        getChart(Name,MetricName,filterArr){
            let time = parseInt(Date.now()/1000);
            let startTime = time - 3600;
            let endTime = time;
            let step = 15;

            if(this.pickerValue?.length==2){
                startTime = dayjs(this.pickerValue[0]).unix();
                endTime = dayjs(this.pickerValue[1]).unix();
            }
            if(this.step){
                step = this.step;
            }

            let filter = '';
            if(filterArr?.length){
                filter = `,device!~"${filterArr.join('|')}"`
            }
            const nodeResourceJob = 'default/w7panel-metrics-node-resource';
            let jobArg = 'w7panel-metrics-node-exporter';
            const metricQuery = {
                ...(this.isCkmRequest()?{
                    'cpu': 'rate(pod_cpu_usage_seconds_total{pod="' + Name + '"})',
                    'memory': 'pod_memory_working_set_bytes{pod="' + Name + '"}',
                }:{
                    'cpu': 'rate(node_cpu_usage_seconds_total{job="' + nodeResourceJob + '"})',
                    'memory': '(node_memory_working_set_bytes{job="' + nodeResourceJob + '"})',
                }),

                'HostGPUMemoryUsage': '(HostGPUMemoryUsage)',
                'HostCoreUtilization': '(HostCoreUtilization)',
                'load': 'avg(node_load1{"instance"="'+Name+'"}[1m0s])',

                'disk-read': 'irate(node_disk_reads_completed_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[1m0s])',
                'disk-write': 'irate(node_disk_writes_completed_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[1m0s])',
                'network-in': 'irate(node_network_receive_packets_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[1m0s])',
                'network-out': 'irate(node_network_transmit_packets_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[1m0s])',
                'disk-read-bytes': 'irate(node_disk_read_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[15s])',
                'disk-written-bytes': 'irate(node_disk_written_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[15s])',

                'network-receive-bytes': 'irate(node_network_receive_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"}[1m0s])*8',
                'network-transmit-bytes': 'irate(node_network_transmit_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"}[1m0s])*8',

                'cilium-drop-count': 'sum by (node, direction, reason) (rate(cilium_drop_count_total[5m]))',
                'cilium-drop-bytes': 'sum by (node, direction, reason) (rate(cilium_drop_bytes_total[5m]))',
                'cilium-endpoint': 'sum by (node) (cilium_endpoint)',
                'cilium-unreachable': 'label_replace(sum by (node) (cilium_unreachable_nodes), "resource", "节点", "node", ".*") or label_replace(sum by (node) (cilium_unreachable_health_endpoints), "resource", "Endpoint", "node", ".*")',
                'cilium-bpf-map-pressure': 'max by (node, map_name) (cilium_bpf_map_pressure) * 100',
            }[MetricName];

            if(!metricQuery){
                return Promise.resolve({data:{result:[]}});
            }
            
            return panelApi.get('/metrics/query-range',{params:{
                query: metricQuery,
                start: startTime,
                end: endTime,
                step: step,
                local: 1,
            }}).then(res=>{
                let data = res?.data;
                // let types = [
                //     'cpu',
                //     'memory',
                //     'disk-read',
                //     'disk-write',
                //     'network-in',
                //     'network-out',
                //     'disk-read-bytes',
                //     'disk-written-bytes',
                //     'network-receive-bytes',
                //     'network-transmit-bytes',
                // ];
                // if(data?.data?.result?.length && types.includes(MetricName)){
                //     data.data.result = data.data.result.filter(i=>/^default\//.test(i.metric?.job))
                // }
                return data;
            });
        },

        async chartInit(chartType){
            let c = this.getChartState(chartType);
            if(c.loading){return}
            c.loading = true;
            // let chart = null;
            // if(chart){ chart.dispose();}
            c.x = {};
            c.y = [];
            if(this.isCiliumChart(chartType)){
                try{
                    const { data } = await this.getChart('', chartType);
                    const result = data?.result || [];
                    if(result.length){
                        c.x = {
                            type: 'category',
                            data: result[0].values?.map(item=>window.formatDate(item[0]*1000)),
                        };
                        result.forEach(item=>{
                            c.y.push({
                                name: this.getCiliumSeriesName(chartType, item.metric || {}),
                                type: 'line',
                                data: item.values?.map(value=>{
                                    let metricValue = Number(value[1]);
                                    if(chartType=='cilium-drop-bytes'){
                                        metricValue = metricValue / 1024;
                                    }
                                    return metricValue.toFixed(2);
                                }),
                                smooth: true,
                            });
                        });
                    }
                }catch{
                    c.x = {};
                    c.y = [];
                }
                c.loading = false;
                this.$nextTick(()=>this.renderChart(chartType));
                return;
            }
            let gpuNames = {};
            if(chartType=='HostGPUMemoryUsage'||chartType=='HostCoreUtilization'){
                let { data } = await axios('/panel-api/v1/gpu/node/devices');
                data?.map(i=>{
                    gpuNames[i.id] = i.type + '('+ i.nodeName +')';
                })
            }
            const isCkmRequest = this.isCkmRequest();
            const server0PodName = this.userInfo?.['w7.cc/server0-pod-name'];
            if((!isCkmRequest&&(chartType=='cpu'||chartType=='memory'))||chartType=='HostGPUMemoryUsage'||chartType=='HostCoreUtilization'){
                let data = null;
                try{
                    let res = await this.getChart('', chartType);
                    if(!res?.data?.result?.length){
                        c.loading=false;
                        return
                    }
                    data = res?.data;
                }catch{
                    c.loading = false;
                    return;
                }
                
                c.x = {
                    type: 'category',
                    data: data.result[0].values?.map(item=>window.formatDate(item[0]*1000)),
                };
                for(let i=0; i<data.result.length; i++){
                    let item = data.result[i];
                    let name = (chartType=='cpu'||chartType=='memory')? item.metric.node : item.metric.deviceuuid;
                    if(chartType=='HostGPUMemoryUsage'||chartType=='HostCoreUtilization'){
                        name = gpuNames[name] || name;
                    }
                    c.y.push({
                        name: name,
                        type: 'line',
                        data: data.result[i].values?.map(item=>{
                            if(chartType=='cpu'){
                                return (item[1]/1).toFixed(4);
                            }
                            if(chartType=='memory' || chartType=='HostGPUMemoryUsage'){
                                return (item[1] / 1024 / 1024).toFixed(2);
                            }
                            return Number(item[1]).toFixed(2);
                        }),
                        smooth: true,
                    })
                }
            }else if((isCkmRequest && server0PodName) || (!isCkmRequest && this.list?.length)){
                let nodes = this.list;
                if(isCkmRequest){
                    nodes = [{name:server0PodName}];
                }else if(this.userInfo?.["k3k.io/cluster-mode"]=='shared'){
                    nodes = [{name:this.userInfo?.['w7.cc/k3k-namespace']+'-server-0'}];
                }
                for(let i=0; i<nodes?.length; i++){
                    // // console.log(chartType)
                    // let { data } = await this.getChart(nodes[i].name, chartType);
                    // // console.log(data)
                    // if(!data?.result?.length){continue}
                    
                    let data = null;
                    try{
                        let res = await this.getChart(nodes[i].name, chartType);
                        if(!res?.data?.result?.length){continue}
                        data = res?.data;
                    }catch{
                        continue;
                    }
                    
                    c.x = {
                        type: 'category',
                        data: data.result[0].values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    c.y.push({
                        name: nodes[i].name,
                        type: 'line',
                        data: data.result[0].values?.map(item=>{
                            if(chartType=='cpu'){
                                return (item[1]/1).toFixed(4);
                            }
                            if(chartType=='memory' || chartType=='HostGPUMemoryUsage'){
                                return (item[1] / 1024 / 1024).toFixed(2);
                            }
                            return Number(item[1]).toFixed(2);
                        }),
                        smooth: true,
                    })
                }
            }
            if(this.node){
                let node = this.node;
                if(this.userInfo?.["k3k.io/cluster-mode"]=='shared'){
                    node = this.userInfo?.['w7.cc/k3k-namespace'] + '-server-0';
                }
                if(chartType=='load'){
                    let {data} = await this.getChart(node, 'load').catch(()=>{
                        c.loading = false;
                        return {};
                    });
                    c.x = {
                        type: 'category',
                        data: data?.result?.[0]?.values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    c.y.push({
                        name: node,
                        type: 'line',
                        data: data?.result?.[0]?.values?.map(item=>Number(item[1]).toFixed(2)) || [],
                        smooth: true,
                    })
                }
                const needFilter = ['disk-read','disk-write','network-in','network-out','disk-read-bytes','disk-written-bytes'].includes(chartType);
                let filterArr = [];
                if(needFilter){
                    if(!this._virtualDiskFilterCache){
                        this._virtualDiskFilterCache = await panelApi.get('/metrics/query-range',{
                            params: {
                                query: '(node_disk_info{model="VIRTUAL-DISK"})',
                                local: 1,
                            }
                        }).then(res=>{
                            return res?.data?.data?.result?.map(i=>i.metric?.device) || [];
                        }).catch(()=>[]);
                    }
                    filterArr = this._virtualDiskFilterCache;
                }
                if(chartType=='disk-read' || chartType=='disk-write'){
                    let { data } = await this.getChart(node, chartType, filterArr).catch(()=>{
                        c.loading = false;
                        return {};
                    });

                    c.x = {
                        type: 'category',
                        data: data?.result?.[0]?.values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    for(let i in data?.result){
                        let r = data.result[i];
                        c.y.push({
                            name: r.metric?.device + (chartType=='disk-read'?' 读':' 写'),
                            type: 'line',
                            data: r.values?.map(item=>Number(item[1]).toFixed(2)),
                            smooth: true,
                        })
                    }
                }
                if(chartType=='network-in'||chartType=='network-out'){
                    let { data } = await this.getChart(node, chartType, filterArr).catch(()=>{
                        c.loading = false;
                        return {};
                    });

                    c.x = {
                        type: 'category',
                        data: data?.result?.[0]?.values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    for(let i in data?.result){
                        let r = data.result[i];
                        if(/^lxc/.test(r.metric?.device)){continue}
                        c.y.push({
                            name: r.metric?.device + (chartType=='network-in'?' 进':' 出'),
                            type: 'line',
                            data: r.values?.map(item=>Number(item[1]).toFixed(2)),
                            smooth: true,
                        })
                    }
                }
                if(chartType=='disk-read-bytes'||chartType=='disk-written-bytes'){
                    let { data } = await this.getChart(node, chartType, filterArr).catch(()=>{
                        c.loading = false;
                        return {};
                    });

                    c.x = {
                        type: 'category',
                        data: data?.result?.[0]?.values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    for(let i in data?.result){
                        let r = data.result[i];
                        c.y.push({
                            name: r.metric?.device + (chartType=='disk-read-bytes'?' 读':' 写'),
                            type: 'line',
                            data: r.values?.map(item=>Number(item[1]/1024/1024).toFixed(2)),
                            smooth: true,
                        })
                    }
                }
                if(chartType=='network-receive-bytes'||chartType=='network-transmit-bytes'){
                    let { data } = await this.getChart(node, chartType).catch(()=>{
                        c.loading = false;
                        return {};
                    });

                    c.x = {
                        type: 'category',
                        data: data?.result?.[0]?.values?.map(item=>window.formatDate(item[0]*1000)),
                    };
                    for(let i in data?.result){
                        let r = data.result[i];
                        if(/^lxc/.test(r.metric?.device)){continue}
                        c.y.push({
                            name: r.metric?.device + (chartType=='network-receive-bytes'?' 进':' 出'),
                            type: 'line',
                            data: r.values?.map(item=>Number(item[1]/1024/1024).toFixed(2)),
                            smooth: true,
                        })
                    }
                }
            }
            
            c.loading = false;
            this.renderChart(chartType);
        },
        renderChart(chartType){
            let c = this.getChartState(chartType);
            let dw = '';
            switch(chartType){
                case 'cpu': dw = '核'; break;
                case 'memory': dw = 'M'; break;
                case 'HostGPUMemoryUsage': dw = 'M'; break;
                case 'HostCoreUtilization': dw = '%'; break;
                case 'disk': dw = 'io/s'; break;
                case 'disk-read': dw = 'io/s'; break;
                case 'disk-write': dw = 'io/s'; break;
                case 'network': dw = 'p/s'; break;
                case 'network-in': dw = 'p/s'; break;
                case 'network-out': dw = 'p/s'; break;
                case 'disk-read-bytes': dw = 'MB/s'; break;
                case 'disk-written-bytes': dw = 'MB/s'; break;
                case 'network-receive-bytes': dw = 'Mb/s'; break;
                case 'network-transmit-bytes': dw = 'Mb/s'; break;
                case 'cilium-drop-count': dw = '包/s'; break;
                case 'cilium-drop-bytes': dw = 'KB/s'; break;
                case 'cilium-endpoint': dw = '个'; break;
                case 'cilium-unreachable': dw = '个'; break;
                case 'cilium-bpf-map-pressure': dw = '%'; break;
            }

            let option = {
                tooltip: {
                    trigger: 'axis',
                    appendToBody: this.inMicro,
                    valueFormatter: value=>(value+dw),
                },
                legend: {
                    show: true,
                    type: 'scroll',
                    bottom: 10,
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    top: '10px',
                    containLabel: true
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: '{value} '+ dw
                    },
                },
            }
            if(chartType=='cpu'){
                let max = 1;
                c.y.forEach(item=>{
                    if(!item?.data?.length){ return; }
                    let maxItem = Math.max(...item.data);
                    if(maxItem > max){ max = maxItem;}
                })
                option.yAxis.max = Math.ceil(max);
            }
            if(chartType=='HostCoreUtilization'){
                option.yAxis.max = 100;
            }
            if(chartType=='cilium-bpf-map-pressure'){
                option.yAxis.max = 100;
            }

            if(useDarkStore().isDark){
                option.backgroundColor = '#232324';
                option.textStyle = {
                    color: "rgba(255,255,255,0.9)"
                }
                option.legend.textStyle = {
                    color: "rgba(255,255,255,0.9)"
                }
            }

            if(c.x?.data?.length){
                option.xAxis = c.x;
                option.series = (c.y || []).filter(item=>item?.type && Array.isArray(item.data));
                if(!option.series.length){ return; }
                let dom = document.getElementById(chartType.replaceAll('-','')+'Chart')
                if(dom){
                    
                    this.chart?.dispose?.();
                    this.chart = markRaw(echarts.init(dom));
                    this.chart?.setOption(option,true);
                    window.removeEventListener("resize",  this.resize);
                    this.resize = ()=>{
                        this.chart?.resize();
                    }
                    window.addEventListener("resize",  this.resize);
                }
            }
        },
    },
}
</script>

<style scoped>
.chartbox .title{padding:16px;}
.chart{height:100%;}
.empty-chart{height:100%;display:flex;flex-direction:column;justify-content:center;}
</style>
