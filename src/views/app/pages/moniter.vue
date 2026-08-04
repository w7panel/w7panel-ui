<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <div v-if="!metricsState.canShowPodMetrics" class="padding-20 df df-c ai-c jc-c" style="height:100%;">
            <div>未安装监控</div>
            <a-button class="mt-20" type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7panel_metrics')">去安装</a-button>
        </div>
        <div v-else class="df df-c monitor-content" style="height:100%;">
            <div class="pod-metrics-box mt-20">
                <pods-cilium-charts
                    :list="list"
                    :namespace="namespaceActive"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import podsCiliumCharts from '@/components/pods-cilium-charts.vue'
import { useNamespaceStore } from '@/store';
import axios from 'axios'
import { getUserInfo } from '@/utils/auth';

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: '',
            list: [],
            clusterMode: '',
            noMonitor: true,

            metricsState: {},
        }
    },
    components: {
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
.monitor-content{min-height:0;overflow:hidden;}
.monitor-toolbar{flex-shrink:0;}
.pod-metrics-box{width:100%;min-height:0;padding:10px;box-sizing:border-box;flex:1;}
</style>
