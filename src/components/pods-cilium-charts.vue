<template>
    <div class="pod-metrics df df-c">
        <div class="pod-metrics-toolbar df ai-c jc-b df-s0">
            <div class="fs-16 b">Pod指标</div>
            <div class="pod-metrics-controls">
                <a-range-picker
                    v-model:model-value="timeRange"
                    show-time
                    :disabled-date="disabledMetricDate"
                    :shortcuts="metricShortcuts"
                    shortcuts-position="right"
                />
                <a-select v-model="selectedStep" :options="activeStepOptions" style="width:120px" @change="timeChanged" />
            </div>
        </div>
        <statistics-analysis-charts
            v-model="activeType"
            class="fc mt-10"
            :groups="metricGroups"
            :show-tabs="false"
            selector-style="buttons"
            :picker-value="timeRange"
            :step="selectedStep"
            :retention-seconds="metricRetentionSeconds"
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
import StatisticsAnalysisCharts from '@/components/statistics-analysis-charts.vue';
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
    components: { StatisticsAnalysisCharts },
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
            timeRange: [dayjs().subtract(1, 'hour').toDate(), dayjs().toDate()],
            selectedStep: METRIC_60S_STEPS[0].value,
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
        activeUnit() { return { cpu: '核', memory: 'MiB', flow: 'flow/s' }[this.activeType] || '次/s'; },
        metricShortcuts() {
            return [5, 30, 60, 180, 720, 1440]
                .filter((minutes) => minutes * 60 <= METRIC_RETENTION_SECONDS)
                .map((minutes) => ({
                    label: minutes < 60 ? `${minutes}分钟` : minutes < 1440 ? `${minutes / 60}小时` : `${minutes / 1440}天`,
                    value: () => [dayjs().subtract(minutes, 'minute').toDate(), dayjs().toDate()],
                }));
        },
        metricGroups() {
            return this.chartTypes.map((item) => ({
                key: item.key,
                title: item.title,
                charts: [{
                    key: item.key,
                    title: item.title,
                    unit: { cpu: '核', memory: 'MiB', flow: 'flow/s' }[item.key] || '次/s',
                    series: item.key == this.activeType ? this.series : [],
                    loading: item.key == this.activeType && this.loading,
                    stepOptions: ['cpu', 'memory'].includes(item.key) ? METRIC_60S_STEPS : METRIC_30S_STEPS,
                    defaultStep: ['cpu', 'memory'].includes(item.key) ? METRIC_60S_STEPS[0].value : METRIC_30S_STEPS[0].value,
                }],
            }));
        },
    },
    watch: {
        list() {
            this.loadChart();
        },
        activeType(value) {
            const query = this.queriesByType[value] || {};
            this.queryRange = query.range || null;
            this.queryStep = query.step || null;
            this.selectedStep = query.step ?? this.activeStepOptions[0]?.value;
            this.loadChart();
        },
        timeRange() {
            this.timeChanged();
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
            } else if (this.timeRange?.length == 2) {
                start = dayjs(this.timeRange[0]).unix();
                end = dayjs(this.timeRange[1]).unix();
            }
            return {
                query,
                start,
                end,
                step: this.queryStep || this.selectedStep || this.activeStepOptions[0].value,
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
        disabledMetricDate(current) {
            const value = dayjs(current);
            const now = dayjs();
            return value.isAfter(now, 'day') || value.isBefore(now.subtract(METRIC_RETENTION_SECONDS, 'second'), 'day');
        },
        timeChanged() {
            if (!this.timeRange?.length) return;
            this.queryRange = [dayjs(this.timeRange[0]).unix(), dayjs(this.timeRange[1]).unix()];
            this.queryStep = this.selectedStep;
            this.queriesByType[this.activeType] = { range: this.queryRange, step: this.queryStep };
            this.loadChart();
        },
    },
};
</script>

<style scoped>
.pod-metrics{width:100%;height:100%;min-height:0;}
.pod-metrics-toolbar{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.pod-metrics-controls{display:flex;align-items:center;gap:12px;}
.pod-metrics :deep(.statistics-analysis-charts){display:flex;flex-direction:column;min-height:0;flex:1;}
.pod-metrics :deep(.statistics-analysis-grid){flex:1;min-height:0;grid-auto-rows:minmax(360px,1fr);}
@media (max-width:900px){.pod-metrics-toolbar{flex-direction:column;align-items:stretch;}.pod-metrics-controls{flex-wrap:wrap;}}
.chart-spin{display:block;width:100%;height:auto;min-height:0;flex:1;overflow:hidden;}
.chart-spin :deep(.arco-spin-children){width:100%;height:100%;min-height:0;}
.chart{width:100%;height:100%;min-height:0;background:#fff;}
</style>
