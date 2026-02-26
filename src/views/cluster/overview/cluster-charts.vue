<template>
    <div class="df df-c" style="height:100%;">
        <a-tabs v-model="activeType" class="df-s0" @change="v=>activeType = v">
            <a-tab-pane key="cpu" title="CPU">
            </a-tab-pane>
            <a-tab-pane key="memory" title="内存">
            </a-tab-pane>
        </a-tabs>
        <div v-if="activeType=='cpu'" class="fc chartbox">
            <!-- <div class="title b">CPU</div> -->
            <div id="cpuchart" class="chart"></div>
        </div>
        <div v-else class="fc chartbox">
            <!-- <div class="title b">内存</div> -->
            <div id="memorychart" class="chart"></div>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import * as echarts from 'echarts'
import { useDarkStore } from '@/store'

let cpuChart = null;
let memoryChart = null;

export default {
    props: ['list'],
    data(){
        return {
            dark: useDarkStore(),
            activeType: 'cpu',
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
        }
    },
    created(){},
    mounted(){
        this.init();
    },
    watch: {
        list(v){
            this.init();
        },
        activeType(v){
            this.chartInit(v);
        },
        'dark.isDark'(v){
            this.$nextTick(() => {
                this.chartInit(this.activeType);
            });
        }
    },
    methods: {
        init(){
            if(!this.list?.length){return};
            this.$nextTick(()=>{
                this.chartInit(this.activeType);
            })
        },
        getChart(Name,MetricName){
            return axios.get(`/api/v1/dashboard/nodes/${Name}/metrics/${MetricName}/minute`).then(res=>{
                return res?.data;
            })
        },
        async chartInit(chartType){
            let c = this[chartType];
            c.loading = true;
            // let chart = null;
            // if(chart){ chart.dispose();}
            c.x = {};
            c.y = [];
            let dw = chartType=='cpu'? '核' : 'M';
            
            let nodes = this.list;
            for(let i=0; i<nodes?.length; i++){
                let data = await this.getChart(nodes[i].name, chartType);
                if(!data?.items?.length){continue}
                c.x = {
                    type: 'category',
                    data: data.items[0].metricPoints?.map(item=>item.timestamp.replace(/^(\d{4}-\d{2}-\d{2})\w(\d{2}:\d{2}).*$/,'$1 $2')),
                };
                c.y.push({
                    name: nodes[i].name,
                    type: 'line',
                    data: data.items[0].metricPoints?.map(item=>{
                        if(chartType=='cpu'){
                            return (item.value / 1000).toFixed(4);
                        }
                        if(chartType=='memory'){
                            return (item.value / 1024 / 1024).toFixed(2);
                        }
                    }),
                    smooth: true,
                })
            }
            
            c.loading = false;

            let option = {
                tooltip: {
                    trigger: 'axis',
                    appendToBody: this.inMicro,
                    // alwaysShowContent: true,
                },
                legend: {
                    show: true,
                    // type: 'scroll',
                    // orient: 'vertical',
                    // top: 520,
                    // height: 120,
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    // bottom: 140,
                    containLabel: true
                },
                // xAxis: [],//c.x,
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: '{value} '+ dw
                    }
                },
                // series: [],//c.y,
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
            if(chartType=='cpu'){
                let max = 1;
                c.y.forEach(item=>{
                    let maxItem = Math.max(...item.data);
                    if(maxItem > max){ max = maxItem;}
                })
                option.yAxis.max = Math.ceil(max);
            }

            if(c.x?.data?.length){
                option.xAxis = c.x;
                option.series = c.y;
                let chart = null;
                if(chartType=='cpu'){ chart = cpuChart; }
                if(chartType=='memory'){ chart = memoryChart; }
                if(chart){ chart.dispose();}
                let dom = document.getElementById(chartType + 'chart')
                if(dom){
                    dom.removeAttribute("_echarts_instance_");
                    chart = echarts.init(dom);
                    chart.setOption(option);
                }
            }
        },
    },
}
</script>

<style scoped>
/* .chartbox{background:#fff;} */
.chartbox .title{padding:16px;}
.chart{height:100%;}
</style>