<template>
    <div class="pod-metrics df df-c">
        <div class="fs-16 b df-s0">Pod指标</div>
        <a-tabs v-model:active-key="activeType" class="df-s0 mt-10">
            <a-tab-pane v-for="item in chartTypes" :key="item.key" :title="item.title" />
        </a-tabs>
        <monitor-stat-chart
            :key="activeType"
            class="fc"
            :title="activeChart.title"
            :step-options="activeStepOptions"
            :retention-seconds="metricRetentionSeconds"
            :fixed-step="normalizedFixedStep"
            :fixed-time-range="pickerValue"
            :default-step="activeStepOptions[0].value"
            :data="series"
            :loading="loading"
            :unit="activeUnit"
            empty-text="暂无 Pod 指标数据"
            @query-change="queryChanged"
        />
    </div>
</template>

<script>
import CryptoJS from 'crypto-js';
import dayjs from 'dayjs';
import { panelApi } from '@/utils/api';
import { getUserInfo } from '@/utils/auth';
import MonitorStatChart from '@/components/monitor-stat-chart.vue';
import { METRIC_30S_STEPS, METRIC_60S_STEPS, METRIC_RETENTION_SECONDS } from '@/config/monitor';

const METRICS = {
    cpu: 'pod_cpu_usage_seconds_total',
    memory: 'pod_memory_working_set_bytes',
    flow: 'hubble_flows_processed_total',
    drop: 'hubble_drop_total',
    dns: 'hubble_dns_queries_total',
    tcp: 'hubble_tcp_flags_total',
    http: 'hubble_http_requests_total',
};

export default {
    components: { MonitorStatChart },
    props: ['list', 'namespace', 'pickerValue', 'step'],
    data() {
        return {
            activeType: 'cpu',
            chartTypes: [
                { key: 'cpu', title: 'CPU' },
                { key: 'memory', title: '内存' },
                { key: 'flow', title: 'Cilium流量' },
                { key: 'drop', title: 'Cilium丢包' },
                { key: 'dns', title: 'DNS请求' },
                { key: 'tcp', title: 'TCP事件' },
                { key: 'http', title: 'HTTP请求' },
            ],
            loading: false,
            series: [],
            requestId: 0,
            userInfo: {},
            metricRetentionSeconds: METRIC_RETENTION_SECONDS,
            queryRange: null,
            queryStep: null,
            queriesByType: {},
        };
    },
    created() {
        this.userInfo = getUserInfo() || {};
    },
    mounted() { this.loadChart(); },
    computed: {
        activeChart() { return this.chartTypes.find((item) => item.key === this.activeType) || this.chartTypes[0]; },
        activeStepOptions() { return this.isResourceMetric() ? METRIC_60S_STEPS : METRIC_30S_STEPS; },
        normalizedFixedStep() { return this.step == null ? null : Number(this.step); },
        activeUnit() { return { cpu: '核', memory: 'MiB', flow: 'flow/s' }[this.activeType] || '次/s'; },
    },
    watch: {
        list() {
            this.loadChart();
        },
        activeType(value) {
            const query = this.queriesByType[value] || {};
            this.queryRange = query.range || null;
            this.queryStep = query.step || null;
            this.loadChart();
        },
        pickerValue() {
            this.loadChart();
        },
        step() {
            this.loadChart();
        },
    },
    methods: {
        isCkmRequest() {
            return this.userInfo?.['w7.cc/is-ckm-req'] == 'true'
                || this.userInfo?.['w7.cc/is-cvm-req'] == 'true';
        },
        translateToHostName(name, namespace, clusterName) {
            const namePrefix = `${name}-${namespace}-${clusterName}`;
            const nameKey = `${name}+${namespace}+${clusterName}`;
            const nameSuffix = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(nameKey));
            const fullPath = `${namePrefix}-${nameSuffix}`;
            if (fullPath.length < 64) return fullPath;
            const hash = CryptoJS.SHA256(fullPath).toString(CryptoJS.enc.Hex);
            return /[a-z0-9]/.test(fullPath[56])
                ? fullPath.substring(0, 57) + '-' + hash.substring(0, 5)
                : fullPath.substring(0, 56) + '-' + hash.substring(0, 6);
        },
        escapePromRegex(value) {
            return String(value || '').replace(/[\\.*+?()[\]{}|^$]/g, '\\$&');
        },
        getPodContext() {
            const logicalNamespace = this.namespace || 'default';
            const isCkm = this.isCkmRequest();
            const metricNamespace = isCkm
                ? (this.userInfo?.['w7.cc/k3k-namespace'] || logicalNamespace)
                : logicalNamespace;
            const clusterName = this.userInfo?.['w7.cc/k3k-name'];
            const nameMap = {};
            (this.list || []).forEach((name) => {
                const metricName = isCkm && clusterName
                    ? this.translateToHostName(name, logicalNamespace, clusterName)
                    : name;
                nameMap[metricName] = name;
            });
            return { metricNamespace, nameMap };
        },
        isResourceMetric() {
            return this.activeType == 'cpu' || this.activeType == 'memory';
        },
        getQuery(metric, metricNamespace, podNames) {
            const namespace = this.escapePromRegex(metricNamespace);
            const names = podNames.map(this.escapePromRegex).join('|');
            if (this.activeType == 'cpu') {
                return `sum by (pod) (rate(${metric}{namespace="${namespace}",pod=~"^(${names})$"}[5m]))`;
            }
            if (this.activeType == 'memory') {
                return `sum by (pod) (${metric}{namespace="${namespace}",pod=~"^(${names})$"})`;
            }
            const podMatcher = `^${namespace}/(${names})$`;
            return `sum by (source) (rate(${metric}{source=~"${podMatcher}"}[5m]))`
                + ` or sum by (destination) (rate(${metric}{destination=~"${podMatcher}"}[5m]))`;
        },
        getTimeParams(query) {
            let start = dayjs().subtract(1, 'hour').unix();
            let end = dayjs().unix();
            if (this.queryRange?.length == 2) {
                start = this.queryRange[0];
                end = this.queryRange[1];
            } else if (this.pickerValue?.length == 2) {
                start = dayjs(this.pickerValue[0]).unix();
                end = dayjs(this.pickerValue[1]).unix();
            }
            return {
                query,
                start,
                end,
                step: this.queryStep || this.step || this.activeStepOptions[0].value,
                local: 1,
            };
        },
        async loadChart() {
            const currentRequest = ++this.requestId;
            const metric = METRICS[this.activeType];
            const { metricNamespace, nameMap } = this.getPodContext();
            const podNames = Object.keys(nameMap);
            this.series = [];
            if (!metric || !podNames.length) {
                this.loading = false;
                return;
            }
            this.loading = true;
            try {
                const query = this.getQuery(metric, metricNamespace, podNames);
                const response = await panelApi.get('/metrics/query-range', {
                    params: this.getTimeParams(query),
                });
                if (currentRequest != this.requestId) return;
                const result = response?.data?.data?.result || response?.data?.result || [];
                this.series = result.map((item) => {
                    if (this.isResourceMetric()) {
                        const metricPodName = item.metric?.pod || '';
                        return {
                            name: nameMap[metricPodName] || metricPodName,
                            smooth: true,
                            data: (item.values || []).map((value) => [
                                value[0] * 1000,
                                this.activeType == 'cpu'
                                    ? Number(value[1]).toFixed(4)
                                    : (Number(value[1]) / 1024 / 1024).toFixed(2),
                            ]),
                        };
                    }
                    const context = item.metric?.source || item.metric?.destination || '';
                    const metricPodName = context.substring(context.indexOf('/') + 1);
                    const direction = item.metric?.source ? '出站' : '入站';
                    return {
                        name: `${nameMap[metricPodName] || metricPodName} / ${direction}`,
                        smooth: true,
                        data: (item.values || []).map((value) => [
                            value[0] * 1000,
                            Number(value[1]).toFixed(3),
                        ]),
                    };
                });
            } catch {
                if (currentRequest == this.requestId) this.series = [];
            } finally {
                if (currentRequest == this.requestId) {
                    this.loading = false;
                }
            }
        },
        queryChanged({ start, end, step }) {
            this.queryRange = [start, end]; this.queryStep = step;
            this.queriesByType[this.activeType] = { range: this.queryRange, step };
            this.loadChart();
        },
    },
};
</script>

<style scoped>
.pod-metrics{width:100%;height:100%;min-height:0;}
.chart-spin{display:block;width:100%;height:auto;min-height:0;flex:1;overflow:hidden;}
.chart-spin :deep(.arco-spin-children){width:100%;height:100%;min-height:0;}
.chart{width:100%;height:100%;min-height:0;background:#fff;}
</style>
