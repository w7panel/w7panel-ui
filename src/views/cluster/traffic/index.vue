<template>
  <div class="padding-20 traffic-page">
    <route-breadcrumb />

    <section class="traffic-hero">
      <div class="hero-copy">
        <span class="hero-kicker">TRAFFIC OBSERVATORY</span>
        <h2>流量从哪里来，又去了哪里</h2>
        <p>统一查看入口域名、热点路径和最终承载请求的 Pod。</p>
      </div>
      <div class="flow-ribbon" aria-label="域名到 Pod 的流量路径">
        <div class="flow-node">
          <span>入口</span>
          <strong>{{ topDomain || '域名' }}</strong>
        </div>
        <div class="flow-line"><i></i><em>{{ formatNumber(summary.requests) }} 次请求</em></div>
        <div class="flow-node gateway-node">
          <span>网关</span>
          <strong>Higress</strong>
        </div>
        <div class="flow-line"><i></i><em>{{ formatBytes(totalBytes) }}</em></div>
        <div class="flow-node">
          <span>承载</span>
          <strong>{{ topPod || 'Service / Pod' }}</strong>
        </div>
      </div>
    </section>

    <a-alert v-if="healthMessage" class="mt-16" type="warning" show-icon>
      <template #title>部分监控数据暂不可用</template>
      {{ healthMessage }}
    </a-alert>

    <section class="control-bar mt-16">
      <div class="control-group">
        <span class="control-label">命名空间</span>
        <a-select v-model="namespace" style="width: 180px" @change="reload">
          <a-option v-for="item in namespaceList" :key="item" :value="item">{{ item }}</a-option>
        </a-select>
        <a-range-picker v-model:model-value="timeRange" show-time style="width: 380px" @ok="reload" />
      </div>
      <a-button :loading="loading" @click="reload">
        <template #icon><icon-refresh /></template>
        刷新
      </a-button>
    </section>

    <section class="summary-grid mt-16">
      <article class="metric-block">
        <span>请求总数</span><strong>{{ formatNumber(summary.requests) }}</strong><small>经过 Higress 的 HTTP 请求</small>
      </article>
      <article class="metric-block">
        <span>总流量</span><strong>{{ formatBytes(totalBytes) }}</strong><small>请求与响应字节之和</small>
      </article>
      <article class="metric-block">
        <span>错误率</span><strong :class="{ danger: Number(summary.error_rate) > 0.05 }">{{ formatPercent(summary.error_rate) }}</strong><small>HTTP 4xx 与 5xx</small>
      </article>
      <article class="metric-block">
        <span>P95 延迟</span><strong>{{ formatDuration(summary.p95_duration_ms) }}</strong><small>网关端到端耗时</small>
      </article>
    </section>

    <section class="chart-panel mt-16">
      <div class="section-heading">
        <div><h3>请求趋势</h3><p>选择的时间范围内，按时间颗粒度汇总。</p></div>
        <a-select v-model="step" style="width: 120px" @change="loadSeries">
          <a-option value="5m">5 分钟</a-option><a-option value="30m">30 分钟</a-option>
          <a-option value="2h">2 小时</a-option><a-option value="12h">12 小时</a-option>
        </a-select>
      </div>
      <a-spin :loading="seriesLoading" class="chart-spin">
        <a-empty v-if="!seriesLoading && !series.length" description="当前时间范围暂无请求趋势" />
        <div v-show="series.length" ref="trendChart" class="trend-chart"></div>
      </a-spin>
    </section>

    <section class="data-panel mt-16">
      <a-tabs v-model:active-key="activeTab" hide-content @change="tabChanged">
        <a-tab-pane key="pods" title="按 Pod"></a-tab-pane>
        <a-tab-pane key="domains" title="按域名"></a-tab-pane>
        <a-tab-pane key="urls" title="热点 URL"></a-tab-pane>
      </a-tabs>

      <div v-if="activeTab === 'urls'" class="url-filters">
        <a-input v-model="filters.keyword" allow-clear placeholder="筛选路径" @press-enter="search" />
        <a-input v-model="filters.domain" allow-clear placeholder="筛选域名" @press-enter="search" />
        <a-select v-model="filters.method" allow-clear placeholder="请求方法">
          <a-option v-for="method in methods" :key="method" :value="method">{{ method }}</a-option>
        </a-select>
        <a-select v-model="filters.status" allow-clear placeholder="状态码">
          <a-option value="2xx">2xx</a-option><a-option value="3xx">3xx</a-option>
          <a-option value="4xx">4xx</a-option><a-option value="5xx">5xx</a-option>
        </a-select>
        <a-select v-model="filters.sort" placeholder="排行方式">
          <a-option value="requests">按请求数</a-option><a-option value="traffic">按流量</a-option>
          <a-option value="errors">按错误数</a-option><a-option value="latency">按 P95 延迟</a-option>
        </a-select>
        <a-button type="primary" @click="search"><template #icon><icon-search /></template>筛选</a-button>
      </div>

      <a-table :loading="tableLoading" :data="rows" :pagination="false" :bordered="false" row-key="rowKey" class="traffic-table">
        <template #columns>
          <template v-if="activeTab === 'pods'">
            <a-table-column title="Pod" :width="240">
              <template #cell="{ record }"><button class="entity-link" @click="openPod(record)">{{ record.pod_name || record.upstream_ip }}</button><small>{{ record.upstream_ip }}</small></template>
            </a-table-column>
            <a-table-column title="Service" data-index="upstream_service" :width="220" />
          </template>
          <a-table-column v-if="activeTab !== 'pods'" title="域名" data-index="authority" :width="240" />
          <template v-if="activeTab === 'urls'">
            <a-table-column title="方法" :width="90"><template #cell="{ record }"><a-tag>{{ record.method }}</a-tag></template></a-table-column>
            <a-table-column title="路径" :width="380"><template #cell="{ record }"><code class="path-code" :title="record.path">{{ record.path }}</code></template></a-table-column>
          </template>
          <a-table-column title="请求数" :width="120"><template #cell="{ record }">{{ formatNumber(record.requests) }}</template></a-table-column>
          <a-table-column title="流量" :width="120"><template #cell="{ record }">{{ formatBytes(Number(record.bytes_received || 0) + Number(record.bytes_sent || 0)) }}</template></a-table-column>
          <a-table-column title="错误率" :width="110"><template #cell="{ record }"><span :class="{ danger: Number(record.error_rate) > 0.05 }">{{ formatPercent(record.error_rate) }}</span></template></a-table-column>
          <a-table-column title="P95 延迟" :width="120"><template #cell="{ record }">{{ formatDuration(record.p95_duration_ms) }}</template></a-table-column>
        </template>
      </a-table>
      <div class="pagination-row">
        <span>URL 已在采集时去除查询参数</span>
        <a-pagination v-model:current="pagination.current" :page-size="pagination.pageSize" :total="pagination.total" @change="pageChanged" />
      </div>
    </section>

    <a-drawer :width="760" :visible="podDetail.show" :footer="false" @cancel="podDetail.show = false">
      <template #title>{{ podDetail.data.pod_name || podDetail.data.upstream_ip }} 网络详情</template>
      <div class="pod-detail-summary">
        <div><span>网关请求</span><strong>{{ formatNumber(podDetail.data.requests) }}</strong></div>
        <div><span>HTTP 流量</span><strong>{{ formatBytes(Number(podDetail.data.bytes_received || 0) + Number(podDetail.data.bytes_sent || 0)) }}</strong></div>
      </div>
      <pods-cilium-charts v-if="podDetail.show && podDetail.data.pod_name && podDetail.data.pod_name !== '已终止 Pod'" :list="[podDetail.data.pod_name]" :namespace="podDetail.data.namespace || namespace" :picker-value="timeRange" :step="300" />
      <a-empty v-else description="Pod 已终止，无法关联 Hubble 网络指标" />
    </a-drawer>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { markRaw } from 'vue';
import { trafficApi } from '@/api/traffic';
import { useNamespaceStore } from '@/store';
import PodsCiliumCharts from '@/components/pods-cilium-charts.vue';

export default {
  components: { PodsCiliumCharts },
  data() {
    const end = dayjs();
    return {
      namespaceStore: useNamespaceStore(), namespace: 'default', timeRange: [end.subtract(1, 'hour').toDate(), end.toDate()],
      activeTab: 'pods', step: '5m', loading: false, seriesLoading: false, tableLoading: false,
      health: {}, summary: {}, series: [], rows: [], trendChart: null,
      pagination: { current: 1, pageSize: 20, total: 0 },
      filters: { keyword: '', domain: '', method: '', status: '', sort: 'requests' }, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      topDomain: '', topPod: '', podDetail: { show: false, data: {} }, resizeHandler: null,
    };
  },
  computed: {
    namespaceList() { return this.namespaceStore.namespaceList.length ? this.namespaceStore.namespaceList : ['default']; },
    totalBytes() { return Number(this.summary.bytes_received || 0) + Number(this.summary.bytes_sent || 0); },
    healthMessage() { const logs = this.health?.logs; return logs && !logs.available ? (logs.message || 'Higress 访问日志不可用') : ''; },
  },
  async created() {
    await this.namespaceStore.fetchNamespaceList();
    this.namespace = this.namespaceStore.namespace || this.namespaceList[0] || 'default';
    this.reload();
  },
  beforeUnmount() { window.removeEventListener('resize', this.resizeHandler); this.trendChart?.dispose(); },
  methods: {
    normalize(res) { return res?.data?.data ?? res?.data ?? {}; },
    params(extra = {}) {
      return { namespace: this.namespace, start: dayjs(this.timeRange[0]).toISOString(), end: dayjs(this.timeRange[1]).toISOString(), page: this.pagination.current, pageSize: this.pagination.pageSize, step: this.step, ...extra };
    },
    async reload() {
      this.loading = true; this.pagination.current = 1;
      await Promise.all([this.loadHealth(), this.loadSummary(), this.loadSeries(), this.loadTable()]);
      this.loading = false;
    },
    async loadHealth() { try { this.health = this.normalize(await trafficApi.health()); } catch (error) { this.health = { logs: { available: false, message: error?.message } }; } },
    async loadSummary() { try { this.summary = this.normalize(await trafficApi.summary(this.params())); } catch { this.summary = {}; } },
    async loadSeries() {
      this.seriesLoading = true;
      try { this.series = this.normalize(await trafficApi.series(this.params({ dimension: this.activeTab === 'pods' ? 'pod' : 'domain' }))) || []; } catch { this.series = []; }
      this.seriesLoading = false; this.$nextTick(this.renderTrend);
    },
    async loadTable() {
      this.tableLoading = true;
      const extras = this.activeTab === 'urls' ? this.filters : {};
      try {
        const response = await trafficApi[this.activeTab](this.params(extras)); const data = this.normalize(response);
        this.rows = (data.list || []).map((item, index) => ({ ...item, rowKey: `${this.activeTab}-${this.pagination.current}-${index}` }));
        this.pagination.total = Number(data.total || 0);
        if (this.activeTab === 'domains') this.topDomain = this.rows[0]?.authority || this.topDomain;
        if (this.activeTab === 'pods') this.topPod = this.rows[0]?.pod_name || this.topPod;
      } catch { this.rows = []; this.pagination.total = 0; }
      this.tableLoading = false;
    },
    tabChanged() { this.pagination.current = 1; this.loadTable(); this.loadSeries(); },
    search() { this.pagination.current = 1; this.loadTable(); },
    pageChanged(page) { this.pagination.current = page; this.loadTable(); },
    openPod(record) { this.podDetail = { show: true, data: record }; },
    renderTrend() {
      if (!this.$refs.trendChart || !this.series.length) { this.trendChart?.clear(); return; }
      if (!this.trendChart) { this.trendChart = markRaw(echarts.init(this.$refs.trendChart)); this.resizeHandler = () => this.trendChart?.resize(); window.addEventListener('resize', this.resizeHandler); }
      const grouped = {};
      this.series.forEach((item) => { const name = item.authority || item.upstream_ip || '全部请求'; if (!grouped[name]) grouped[name] = []; grouped[name].push([item._time, Number(item.requests || 0)]); });
      this.trendChart.setOption({ color: ['#165dff', '#00b42a', '#f7ba1e', '#722ed1'], tooltip: { trigger: 'axis' }, legend: { type: 'scroll', top: 0 }, grid: { left: 20, right: 20, top: 42, bottom: 10, containLabel: true }, xAxis: { type: 'time', axisLine: { lineStyle: { color: '#c9cdd4' } } }, yAxis: { type: 'value', name: '请求数', splitLine: { lineStyle: { color: '#f2f3f5' } } }, series: Object.entries(grouped).slice(0, 8).map(([name, data]) => ({ name, type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.06 }, data })) }, true);
    },
    formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }); },
    formatBytes(value) { const n = Number(value || 0); if (n < 1024) return `${n.toFixed(0)} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`; return `${(n / 1073741824).toFixed(2)} GB`; },
    formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(2)}%`; },
    formatDuration(value) { const n = Number(value || 0); return n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n.toFixed(0)}ms`; },
  },
};
</script>

<style scoped>
.traffic-page { --traffic-blue: #165dff; --traffic-ink: #1d2129; --traffic-muted: #86909c; --traffic-line: #e5e6eb; }
.traffic-hero { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(580px, 1.7fr); gap: 32px; align-items: center; min-height: 190px; padding: 28px 32px; color: white; background: linear-gradient(125deg, #142c5b 0%, #174ea6 55%, #1677c8 100%); border-radius: 4px; overflow: hidden; }
.hero-kicker { font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .18em; color: #b8d8ff; }
.hero-copy h2 { margin: 12px 0 8px; font-size: 25px; line-height: 1.3; }
.hero-copy p { margin: 0; color: rgba(255,255,255,.72); }
.flow-ribbon { display: grid; grid-template-columns: minmax(125px, 1fr) minmax(120px, .8fr) minmax(125px, 1fr) minmax(120px, .8fr) minmax(140px, 1fr); align-items: center; }
.flow-node { min-width: 0; padding: 18px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.24); backdrop-filter: blur(5px); }
.flow-node span { display: block; margin-bottom: 7px; font-size: 12px; color: #b8d8ff; }.flow-node strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }
.gateway-node { background: rgba(255,255,255,.18); }.flow-line { position: relative; text-align: center; }.flow-line i { display: block; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,.25), #62d8ff); }.flow-line i::after { content: ''; position: absolute; top: -3px; right: 0; border: 4px solid transparent; border-left-color: #62d8ff; }.flow-line em { display: block; margin-top: 8px; font-size: 11px; font-style: normal; color: #b8d8ff; }
.control-bar, .data-panel, .chart-panel { padding: 20px; background: var(--color-bg-2, #fff); }.control-bar, .control-group, .section-heading, .pagination-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.control-label { color: var(--traffic-muted); }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--traffic-line); border: 1px solid var(--traffic-line); }.metric-block { padding: 18px 20px; background: var(--color-bg-2, #fff); }.metric-block span, .metric-block small { display: block; color: var(--traffic-muted); }.metric-block strong { display: block; margin: 10px 0 6px; color: var(--traffic-ink); font: 600 26px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace; }.metric-block small { font-size: 12px; }.danger { color: #f53f3f !important; }
.section-heading h3 { margin: 0 0 5px; font-size: 16px; }.section-heading p { margin: 0; color: var(--traffic-muted); }.chart-spin { display: block; min-height: 290px; margin-top: 16px; }.trend-chart { height: 290px; }
.url-filters { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 0; border-top: 1px solid var(--traffic-line); }.url-filters :deep(.arco-input-wrapper), .url-filters :deep(.arco-select) { width: 180px; }.traffic-table { margin-top: 12px; }.entity-link { display: block; max-width: 210px; padding: 0; color: var(--traffic-blue); background: none; border: 0; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.traffic-table small { display: block; margin-top: 3px; color: var(--traffic-muted); }.path-code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4e5969; }.pagination-row { margin-top: 16px; }.pagination-row > span { color: var(--traffic-muted); font-size: 12px; }
.pod-detail-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }.pod-detail-summary > div { padding: 16px; background: #f7f8fa; }.pod-detail-summary span { display: block; color: var(--traffic-muted); }.pod-detail-summary strong { display: block; margin-top: 8px; font-size: 20px; }
@media (max-width: 1100px) { .traffic-hero { grid-template-columns: 1fr; }.summary-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .traffic-hero { padding: 22px 18px; }.flow-ribbon { grid-template-columns: 1fr; gap: 8px; }.flow-line { display: none; }.control-bar, .control-group { align-items: stretch; flex-direction: column; }.summary-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
