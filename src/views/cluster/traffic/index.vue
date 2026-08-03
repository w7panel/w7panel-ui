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
        <a-select v-model="namespace" style="width: 140px" @change="namespaceChanged">
          <a-option v-for="item in namespaceList" :key="item" :value="item">{{ item }}</a-option>
        </a-select>
        <a-range-picker v-model:model-value="timeRange" show-time :disabled-date="disabledTrafficDate" style="width: 330px" @ok="reload" />
        <span class="control-label">域名</span>
        <a-select v-model="selectedDomain" allow-search :filter-option="false" :loading="domainOptionsLoading" placeholder="搜索并选择域名" style="width: 190px" @search="searchDomains" @change="domainChanged">
          <a-option :value="allFilterValue">全部域名</a-option>
          <a-option v-for="item in domainOptions" :key="item.value" :value="item.value">{{ item.label }}</a-option>
        </a-select>
        <span class="control-label">Pod</span>
        <a-select v-model="selectedPodIP" allow-search :filter-option="false" :loading="podOptionsLoading" placeholder="搜索并选择 Pod" style="width: 220px" @search="searchPods" @change="podChanged">
          <a-option :value="allFilterValue">全部 Pod</a-option>
          <a-option v-for="item in podOptions" :key="item.value" :value="item.value">
            <div class="pod-option"><span>{{ item.label }}</span><small>{{ item.service || 'Service 未知' }} · {{ item.value }}</small></div>
          </a-option>
        </a-select>
      </div>
      <a-button :loading="loading" @click="reload">
        <template #icon><icon-refresh /></template>
        刷新
      </a-button>
    </section>

    <section class="chart-panel mt-16">
      <monitor-stat-chart
        title="请求趋势"
        :step-options="trafficSteps"
        :retention-seconds="logRetentionSeconds"
        :fixed-time-range="timeRange"
        :default-step="300"
        :data="trendSeries"
        :loading="seriesLoading"
        :unit="trendConfig.unit"
        :option="trendOption"
        empty-text="当前时间范围暂无请求趋势"
        @query-change="trendQueryChanged"
      >
        <template #subtitle><p class="chart-subtitle">选择的时间范围内，按时间颗粒度汇总。</p></template>
        <template #controls>
          <a-radio-group v-model="trendMetric" type="button" @change="renderTrend">
            <a-radio value="requests">请求数</a-radio>
            <a-radio value="traffic">流量</a-radio>
            <a-radio value="bandwidth">带宽</a-radio>
            <a-radio value="hitRate">命中率</a-radio>
            <a-radio value="hits">命中数</a-radio>
          </a-radio-group>
        </template>
      </monitor-stat-chart>
    </section>

    <section class="data-panel mt-16">
      <a-tabs v-model:active-key="activeTab" hide-content @change="tabChanged">
        <a-tab-pane key="pods" title="按 Pod"></a-tab-pane>
        <a-tab-pane key="domains" title="按域名"></a-tab-pane>
        <a-tab-pane key="urls" title="热点 URL"></a-tab-pane>
      </a-tabs>

      <section class="summary-grid analysis-summary">
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

      <div v-if="activeTab === 'urls'" class="url-filters">
        <a-input v-model="filters.keyword" allow-clear placeholder="筛选路径" @press-enter="search" />
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

    <a-drawer :width="960" :visible="podDetail.show" :footer="false" @cancel="podDetail.show = false">
      <template #title>{{ podDetail.data.pod_name || podDetail.data.upstream_ip }} 关联 URL</template>
      <a-table :loading="podDetail.loading" :data="podDetail.rows" :pagination="false" row-key="rowKey" class="traffic-table">
        <template #columns>
          <a-table-column title="域名" data-index="authority" :width="210" />
          <a-table-column title="方法" :width="90"><template #cell="{ record }"><a-tag>{{ record.method }}</a-tag></template></a-table-column>
          <a-table-column title="路径" :width="300"><template #cell="{ record }"><code class="path-code" :title="record.path">{{ record.path }}</code></template></a-table-column>
          <a-table-column title="请求数" :width="100"><template #cell="{ record }">{{ formatNumber(record.requests) }}</template></a-table-column>
          <a-table-column title="流量" :width="110"><template #cell="{ record }">{{ formatBytes(Number(record.bytes_received || 0) + Number(record.bytes_sent || 0)) }}</template></a-table-column>
          <a-table-column title="错误率" :width="100"><template #cell="{ record }"><span :class="{ danger: Number(record.error_rate) > 0.05 }">{{ formatPercent(record.error_rate) }}</span></template></a-table-column>
          <a-table-column title="P95 延迟" :width="110"><template #cell="{ record }">{{ formatDuration(record.p95_duration_ms) }}</template></a-table-column>
        </template>
      </a-table>
      <div class="pagination-row drawer-pagination">
        <span>按当前命名空间、时间和域名条件聚合</span>
        <a-pagination v-model:current="podDetail.pagination.current" :page-size="podDetail.pagination.pageSize" :total="podDetail.pagination.total" @change="podURLPageChanged" />
      </div>
    </a-drawer>
  </div>
</template>

<script>
import dayjs from 'dayjs';
import { trafficApi } from '@/api/traffic';
import { useNamespaceStore } from '@/store';
import MonitorStatChart from '@/components/monitor-stat-chart.vue';
import { LOG_RETENTION_SECONDS, TRAFFIC_STEPS, TRAFFIC_STEP_VALUES } from '@/config/monitor';

export default {
  components: { MonitorStatChart },
  data() {
    const end = dayjs();
    return {
      namespaceStore: useNamespaceStore(), namespace: 'default', timeRange: [end.subtract(1, 'hour').toDate(), end.toDate()],
      activeTab: 'pods', step: '5m', trendMetric: 'requests', loading: false, seriesLoading: false, tableLoading: false,
      health: {}, summary: {}, series: [], rows: [],
      trafficSteps: TRAFFIC_STEPS, logRetentionSeconds: LOG_RETENTION_SECONDS,
      allFilterValue: '__all__', selectedDomain: '__all__', selectedPodIP: '__all__', domainOptions: [], podOptions: [], domainOptionsLoading: false, podOptionsLoading: false,
      domainSearchTimer: null, podSearchTimer: null, domainOptionRequest: 0, podOptionRequest: 0,
      pagination: { current: 1, pageSize: 20, total: 0 },
      filters: { keyword: '', method: '', status: '', sort: 'requests' }, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      topDomain: '', topPod: '', podDetail: { show: false, data: {}, loading: false, rows: [], pagination: { current: 1, pageSize: 20, total: 0 } },
    };
  },
  computed: {
    namespaceList() { return this.namespaceStore.namespaceList.length ? this.namespaceStore.namespaceList : ['default']; },
    totalBytes() { return Number(this.summary.bytes_received || 0) + Number(this.summary.bytes_sent || 0); },
    healthMessage() { const logs = this.health?.logs; return logs && !logs.available ? (logs.message || 'Higress 访问日志不可用') : ''; },
    trendConfig() {
      return {
        requests: { unit: '请求数', fields: [['requests_total', '总请求'], ['requests_http1', 'HTTP/1'], ['requests_http2', 'HTTP/2'], ['requests_http3', 'HTTP/3'], ['requests_https', 'HTTPS']], format: this.formatNumber },
        traffic: { unit: '流量', fields: [['traffic_bytes', '总流量']], format: this.formatBytes },
        bandwidth: { unit: '带宽', fields: [['bandwidth_bps', '平均带宽']], format: this.formatBandwidth },
        hitRate: { unit: '命中率', fields: [['hit_rate_total', '总命中率'], ['hit_rate_2xx', '2xx'], ['hit_rate_3xx', '3xx'], ['hit_rate_4xx', '4xx'], ['hit_rate_5xx', '5xx'], ['hit_rate_other', '其他']], format: this.formatPercent },
        hits: { unit: '命中数', fields: [['hits_total', '总命中数'], ['hits_2xx', '2xx'], ['hits_3xx', '3xx'], ['hits_4xx', '4xx'], ['hits_5xx', '5xx'], ['hits_other', '其他']], format: this.formatNumber },
      }[this.trendMetric];
    },
    trendSeries() { const points = Array.isArray(this.series) ? this.series : []; return this.trendConfig.fields.map(([field, name]) => ({ name, smooth: true, showSymbol: false, areaStyle: { opacity: 0.05 }, data: points.map((item) => [item._time, Number(item[field] || 0)]) })); },
    trendOption() { const config = this.trendConfig; return { tooltip: { trigger: 'axis', valueFormatter: (value) => config.format(value) }, yAxis: { type: 'value', name: config.unit, axisLabel: { formatter: (value) => config.format(value) }, splitLine: { lineStyle: { color: '#f2f3f5' } } } }; },
  },
  async created() {
    await this.namespaceStore.fetchNamespaceList();
    this.namespace = this.namespaceStore.namespace || this.namespaceList[0] || 'default';
    this.reload();
  },
  beforeUnmount() { clearTimeout(this.domainSearchTimer); clearTimeout(this.podSearchTimer); },
  methods: {
    normalize(res) { return res?.data?.data ?? res?.data ?? {}; },
    params(extra = {}) {
      return { namespace: this.namespace, start: dayjs(this.timeRange[0]).toISOString(), end: dayjs(this.timeRange[1]).toISOString(), domain: this.selectedDomain !== this.allFilterValue ? this.selectedDomain : undefined, upstreamIp: this.selectedPodIP !== this.allFilterValue ? this.selectedPodIP : undefined, page: this.pagination.current, pageSize: this.pagination.pageSize, step: this.step, ...extra };
    },
    async reload() {
      if (!this.isTrafficRangeValid()) { this.$message.error('查询时间必须在最近 30 天内'); return; }
      this.loading = true; this.pagination.current = 1;
      const tasks = [this.loadHealth(), this.loadSummary(), this.loadSeries(), this.loadTable(), this.loadDomainOptions(), this.loadPodOptions()];
      if (this.podDetail.show) tasks.push(this.loadPodURLs());
      await Promise.all(tasks);
      this.loading = false;
    },
    async loadHealth() { try { this.health = this.normalize(await trafficApi.health()); } catch (error) { this.health = { logs: { available: false, message: error?.message } }; } },
    async loadSummary() { try { this.summary = this.normalize(await trafficApi.summary(this.params())); } catch { this.summary = {}; } },
    async loadDomainOptions(search = '') {
      const request = ++this.domainOptionRequest; this.domainOptionsLoading = true;
      const params = this.params({ domain: undefined, search, page: 1, pageSize: 50 });
      try {
        const data = this.normalize(await trafficApi.domains(params));
        if (request === this.domainOptionRequest) this.domainOptions = this.keepSelectedOption((data.list || []).map((item) => ({ value: item.authority, label: item.authority })), this.selectedDomain, this.domainOptions);
      } catch { if (request === this.domainOptionRequest) this.domainOptions = this.keepSelectedOption([], this.selectedDomain, this.domainOptions); }
      if (request === this.domainOptionRequest) this.domainOptionsLoading = false;
    },
    async loadPodOptions(search = '') {
      const request = ++this.podOptionRequest; this.podOptionsLoading = true;
      const params = this.params({ upstreamIp: undefined, search, page: 1, pageSize: 50 });
      try {
        const data = this.normalize(await trafficApi.pods(params));
        if (request === this.podOptionRequest) this.podOptions = this.keepSelectedOption((data.list || []).map((item) => ({ value: item.upstream_ip, label: item.pod_name || item.upstream_ip, service: item.upstream_service })), this.selectedPodIP, this.podOptions);
      } catch { if (request === this.podOptionRequest) this.podOptions = this.keepSelectedOption([], this.selectedPodIP, this.podOptions); }
      if (request === this.podOptionRequest) this.podOptionsLoading = false;
    },
    keepSelectedOption(options, selected, previous) {
      if (!selected || options.some((item) => item.value === selected)) return options;
      const current = previous.find((item) => item.value === selected);
      return current ? [current, ...options] : options;
    },
    searchDomains(value) { clearTimeout(this.domainSearchTimer); this.domainSearchTimer = setTimeout(() => this.loadDomainOptions(value), 300); },
    searchPods(value) { clearTimeout(this.podSearchTimer); this.podSearchTimer = setTimeout(() => this.loadPodOptions(value), 300); },
    async namespaceChanged() { this.selectedDomain = this.allFilterValue; this.selectedPodIP = this.allFilterValue; this.domainOptions = []; this.podOptions = []; this.podDetail.show = false; await this.reload(); },
    async domainChanged() { this.pagination.current = 1; this.podDetail.show = false; this.topDomain = this.selectedDomain !== this.allFilterValue ? this.selectedDomain : ''; await Promise.all([this.reloadData(), this.loadPodOptions()]); },
    async podChanged() { this.pagination.current = 1; this.podDetail.show = false; this.topPod = this.selectedPodIP !== this.allFilterValue ? (this.podOptions.find((item) => item.value === this.selectedPodIP)?.label || '') : ''; await Promise.all([this.reloadData(), this.loadDomainOptions()]); },
    async reloadData() { this.loading = true; await Promise.all([this.loadSummary(), this.loadSeries(), this.loadTable()]); this.loading = false; },
    async loadSeries() {
      this.seriesLoading = true;
      try { const data = this.normalize(await trafficApi.series(this.params())); this.series = Array.isArray(data) ? data : []; } catch { this.series = []; }
      this.seriesLoading = false;
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
    tabChanged() { this.pagination.current = 1; this.loadTable(); },
    search() { this.pagination.current = 1; this.loadTable(); },
    pageChanged(page) { this.pagination.current = page; this.loadTable(); },
    openPod(record) { this.podDetail.show = true; this.podDetail.data = record; this.podDetail.rows = []; this.podDetail.pagination.current = 1; this.loadPodURLs(); },
    async loadPodURLs() {
      this.podDetail.loading = true;
      try {
        const response = await trafficApi.urls(this.params({ upstreamIp: this.podDetail.data.upstream_ip, page: this.podDetail.pagination.current, pageSize: this.podDetail.pagination.pageSize, sort: 'requests' }));
        const data = this.normalize(response);
        this.podDetail.rows = (data.list || []).map((item, index) => ({ ...item, rowKey: `pod-url-${this.podDetail.pagination.current}-${index}` }));
        this.podDetail.pagination.total = Number(data.total || 0);
      } catch { this.podDetail.rows = []; this.podDetail.pagination.total = 0; }
      this.podDetail.loading = false;
    },
    podURLPageChanged(page) { this.podDetail.pagination.current = page; this.loadPodURLs(); },
    renderTrend() {},
    trendQueryChanged({ step }) { this.step = TRAFFIC_STEP_VALUES[step] || '5m'; this.loadSeries(); },
    disabledTrafficDate(current) { const value = dayjs(current); const now = dayjs(); return value.isAfter(now, 'day') || value.isBefore(now.subtract(this.logRetentionSeconds, 'second'), 'day'); },
    isTrafficRangeValid() { const start = dayjs(this.timeRange?.[0]); const end = dayjs(this.timeRange?.[1]); const now = dayjs(); return start.isValid() && end.isValid() && start.isBefore(end) && !end.isAfter(now.add(1, 'minute')) && !start.isBefore(now.subtract(this.logRetentionSeconds, 'second').subtract(1, 'minute')); },
    formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }); },
    formatBytes(value) { const n = Number(value || 0); if (n < 1024) return `${n.toFixed(0)} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`; return `${(n / 1073741824).toFixed(2)} GB`; },
    formatBandwidth(value) { const n = Number(value || 0); if (n < 1000) return `${n.toFixed(0)} bps`; if (n < 1000000) return `${(n / 1000).toFixed(1)} Kbps`; if (n < 1000000000) return `${(n / 1000000).toFixed(1)} Mbps`; return `${(n / 1000000000).toFixed(2)} Gbps`; },
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
.control-group { flex: 1; flex-wrap: wrap; justify-content: flex-start; }.control-bar > .arco-btn { flex: none; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--traffic-line); border: 1px solid var(--traffic-line); }.metric-block { padding: 18px 20px; background: var(--color-bg-2, #fff); }.metric-block span, .metric-block small { display: block; color: var(--traffic-muted); }.metric-block strong { display: block; margin: 10px 0 6px; color: var(--traffic-ink); font: 600 26px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace; }.metric-block small { font-size: 12px; }.danger { color: #f53f3f !important; }
.analysis-summary { margin: 4px 0 16px; }
.pod-option { display: flex; flex-direction: column; padding: 3px 0; }.pod-option small { color: var(--traffic-muted); font-size: 11px; }
.section-heading h3 { margin: 0 0 5px; font-size: 16px; }.section-heading p { margin: 0; color: var(--traffic-muted); }.chart-spin { display: block; min-height: 290px; margin-top: 16px; }.trend-chart { height: 290px; }
.trend-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.url-filters { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 0; border-top: 1px solid var(--traffic-line); }.url-filters :deep(.arco-input-wrapper), .url-filters :deep(.arco-select) { width: 180px; }.traffic-table { margin-top: 12px; }.entity-link { display: block; max-width: 210px; padding: 0; color: var(--traffic-blue); background: none; border: 0; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.traffic-table small { display: block; margin-top: 3px; color: var(--traffic-muted); }.path-code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4e5969; }.pagination-row { margin-top: 16px; }.pagination-row > span { color: var(--traffic-muted); font-size: 12px; }
.drawer-pagination { margin-top: 16px; }
@media (max-width: 1100px) { .traffic-hero { grid-template-columns: 1fr; }.summary-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .traffic-hero { padding: 22px 18px; }.flow-ribbon { grid-template-columns: 1fr; gap: 8px; }.flow-line { display: none; }.control-bar, .control-group { align-items: stretch; flex-direction: column; }.summary-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
