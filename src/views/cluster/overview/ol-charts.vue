<template>
    <monitor-stat-chart
        :title="showChartTitle ? chartTitle : ''"
        :step-options="activeStepOptions"
        :retention-seconds="metricRetentionSeconds"
        :fixed-step="normalizedFixedStep"
        :fixed-time-range="normalizedFixedRange"
        :default-step="activeStepOptions[0].value"
        :data="activeChartState.y"
        :loading="activeChartState.loading"
        :unit="chartUnit"
        :option="chartOption"
        :empty-text="isCiliumChart(activeType) ? '暂无 Cilium 指标数据，请确认 Cilium 已开启 Prometheus 指标' : '当前时间范围暂无监控数据'"
        @query-change="queryChanged"
    />
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import { getUserInfo } from '@/utils/auth';
import dayjs from 'dayjs'
import MonitorStatChart from '@/components/monitor-stat-chart.vue';
import { METRIC_30S_STEPS, METRIC_60S_STEPS, METRIC_RETENTION_SECONDS } from '@/config/monitor';

export default {
    components: { MonitorStatChart },
    props: ['list','node','activeType','noMonitor','pickerValue','step','virtualDiskFilterCache','showTitle'],
    data(){
        return {
            // activeType: 'cpu',
            _virtualDiskFilterCache: null,
            timeType: 'minute',
            timeRange: [], 
            queryRange: null,
            queryStep: null,
            metricRetentionSeconds: METRIC_RETENTION_SECONDS,

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
    },
    computed: {
        showChartTitle(){ return this.showTitle !== false; },
        activeChartState(){ return this.getChartState(this.activeType); },
        activeStepOptions(){ return (this.isCiliumChart(this.activeType) || ['HostGPUMemoryUsage','HostCoreUtilization'].includes(this.activeType)) ? METRIC_30S_STEPS : METRIC_60S_STEPS; },
        normalizedFixedStep(){ return this.step == null ? null : Number(this.step); },
        normalizedFixedRange(){ return this.pickerValue?.length === 2 ? this.pickerValue : null; },
        chartTitle(){ return ({
            cpu:'CPU使用', memory:'内存使用', HostGPUMemoryUsage:'GPU显存使用', HostCoreUtilization:'GPU算力使用率',
            load:'负载', 'disk-read':'磁盘读取 IOPS', 'disk-write':'磁盘写入 IOPS', 'network-in':'网络接收包', 'network-out':'网络发送包',
            'disk-read-bytes':'磁盘读取', 'disk-written-bytes':'磁盘写入', 'network-receive-bytes':'网络接收流量', 'network-transmit-bytes':'网络发送流量',
            'cilium-drop-count':'Cilium丢包', 'cilium-drop-bytes':'Cilium丢包流量', 'cilium-endpoint':'Cilium Endpoint',
            'cilium-unreachable':'Cilium连通性', 'cilium-bpf-map-pressure':'Cilium BPF Map',
        })[this.activeType] || this.activeType; },
        chartUnit(){ return ({ cpu:'核', memory:'M', HostGPUMemoryUsage:'M', HostCoreUtilization:'%', load:'', 'disk-read':'io/s', 'disk-write':'io/s', 'network-in':'p/s', 'network-out':'p/s', 'disk-read-bytes':'MB/s', 'disk-written-bytes':'MB/s', 'network-receive-bytes':'Mb/s', 'network-transmit-bytes':'Mb/s', 'cilium-drop-count':'包/s', 'cilium-drop-bytes':'KB/s', 'cilium-endpoint':'个', 'cilium-unreachable':'个', 'cilium-bpf-map-pressure':'%' })[this.activeType] || ''; },
        chartOption(){
            const option = { xAxis: this.activeChartState.x?.data?.length ? this.activeChartState.x : { type:'time' }, legend: { type:'scroll', bottom:10 }, yAxis: { type:'value', axisLabel: { formatter: `{value} ${this.chartUnit}` } } };
            if(['HostCoreUtilization','cilium-bpf-map-pressure'].includes(this.activeType)) option.yAxis.max = 100;
            return option;
        },
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
            let step = this.activeStepOptions[0].value;

            if(this.queryRange?.length==2){
                startTime = this.queryRange[0];
                endTime = this.queryRange[1];
            }else if(this.pickerValue?.length==2){
                startTime = dayjs(this.pickerValue[0]).unix();
                endTime = dayjs(this.pickerValue[1]).unix();
            }
            if(this.queryStep){
                step = this.queryStep;
            }else if(this.step){
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
                    'cpu': 'rate(node_cpu_usage_seconds_total{job="' + nodeResourceJob + '"}[3m])',
                    'memory': '(node_memory_working_set_bytes{job="' + nodeResourceJob + '"})',
                }),

                'HostGPUMemoryUsage': '(HostGPUMemoryUsage)',
                'HostCoreUtilization': '(HostCoreUtilization)',
                'load': 'avg(node_load1{"instance"="'+Name+'"}[1m0s])',

                'disk-read': 'irate(node_disk_reads_completed_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',
                'disk-write': 'irate(node_disk_writes_completed_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',
                'network-in': 'irate(node_network_receive_packets_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',
                'network-out': 'irate(node_network_transmit_packets_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',
                'disk-read-bytes': 'irate(node_disk_read_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',
                'disk-written-bytes': 'irate(node_disk_written_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"'+filter+'}[2m])',

                'network-receive-bytes': 'irate(node_network_receive_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"}[2m])*8',
                'network-transmit-bytes': 'irate(node_network_transmit_bytes_total{"instance"="'+Name+'",job="default/'+ jobArg +'"}[2m])*8',

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
        renderChart(){},
        queryChanged({start,end,step}){ this.queryRange=[start,end]; this.queryStep=step; this.chartInit(this.activeType); },
    },
}
</script>

<style scoped>
.chartbox .title{padding:16px;}
.chart{height:100%;}
.empty-chart{height:100%;display:flex;flex-direction:column;justify-content:center;}
</style>
