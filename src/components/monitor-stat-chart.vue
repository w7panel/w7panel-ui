<template>
  <div class="monitor-stat-chart">
    <div class="monitor-stat-header">
      <div>
        <div v-if="title" class="monitor-stat-title">{{ title }}</div>
        <slot name="subtitle" />
      </div>
      <div class="monitor-stat-controls">
        <slot name="controls" />
        <a-range-picker
          v-if="!hasFixedTimeRange"
          v-model:model-value="timeRange"
          show-time
          :disabled-date="disabledDate"
          :shortcuts="shortcuts"
          shortcuts-position="right"
          style="width: 340px"
          @ok="notifyQueryChange"
        />
        <a-select
          v-if="fixedStep == null"
          v-model="selectedStep"
          style="width: 120px"
          @change="notifyQueryChange"
        >
          <a-option v-for="item in stepOptions" :key="item.value" :value="item.value">{{ item.label }}</a-option>
        </a-select>
      </div>
    </div>
    <a-alert v-if="configurationError" type="error" class="monitor-stat-error">{{ configurationError }}</a-alert>
    <a-spin v-else :loading="loading" class="monitor-stat-spin">
      <a-empty v-if="!loading && !data.length" :description="emptyText" />
      <div v-show="data.length" ref="chart" class="monitor-stat-body"></div>
    </a-spin>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { markRaw } from 'vue';
import { useDarkStore } from '@/store';

export default {
  name: 'MonitorStatChart',
  props: {
    title: { type: String, default: '' },
    stepOptions: { type: Array, required: true },
    retentionSeconds: { type: Number, required: true },
    chartType: { type: String, default: 'line' },
    data: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    unit: { type: String, default: '' },
    emptyText: { type: String, default: '当前时间范围暂无监控数据' },
    fixedStep: { type: Number, default: null },
    fixedTimeRange: { type: Array, default: null },
    option: { type: Object, default: () => ({}) },
    defaultStep: { type: Number, default: null },
  },
  emits: ['query-change'],
  data() {
    const end = dayjs();
    return {
      dark: useDarkStore(),
      selectedStep: this.defaultStep ?? this.stepOptions[0]?.value,
      timeRange: [end.subtract(1, 'hour').toDate(), end.toDate()],
      chart: null,
      resizeObserver: null,
    };
  },
  computed: {
    hasFixedTimeRange() { return Array.isArray(this.fixedTimeRange) && this.fixedTimeRange.length === 2; },
    effectiveRange() { return this.hasFixedTimeRange ? this.fixedTimeRange : this.timeRange; },
    effectiveStep() { return this.fixedStep ?? this.selectedStep; },
    configurationError() {
      if (!this.stepOptions.some((item) => item.value === this.effectiveStep)) return '时间粒度超出该指标允许范围';
      if (!this.effectiveRange?.length) return '请选择查询时间范围';
      const start = dayjs(this.effectiveRange[0]); const end = dayjs(this.effectiveRange[1]); const now = dayjs();
      if (!start.isValid() || !end.isValid() || !start.isBefore(end)) return '查询开始时间必须早于结束时间';
      if (end.isAfter(now.add(1, 'minute')) || start.isBefore(now.subtract(this.retentionSeconds, 'second').subtract(1, 'minute'))) return '查询时间超出该指标的数据保留范围';
      return '';
    },
    shortcuts() {
      return [5, 30, 60, 180, 720, 1440, 2880, 10080, 43200]
        .filter((minutes) => minutes * 60 <= this.retentionSeconds)
        .map((minutes) => ({
          label: minutes < 60 ? `${minutes}分钟` : minutes < 1440 ? `${minutes / 60}小时` : `${minutes / 1440}天`,
          value: () => [dayjs().subtract(minutes, 'minute'), dayjs()],
        }));
    },
  },
  watch: {
    data: { deep: true, handler() { this.$nextTick(this.renderChart); } },
    option: { deep: true, handler() { this.$nextTick(this.renderChart); } },
    chartType() { this.renderChart(); },
    'dark.isDark'() { this.renderChart(); },
  },
  mounted() { this.$nextTick(this.renderChart); },
  beforeUnmount() { this.resizeObserver?.disconnect(); this.chart?.dispose(); },
  methods: {
    disabledDate(current) {
      const value = dayjs(current); const now = dayjs();
      return value.isAfter(now, 'day') || value.isBefore(now.subtract(this.retentionSeconds, 'second'), 'day');
    },
    notifyQueryChange() {
      if (this.configurationError) return;
      this.$emit('query-change', {
        start: dayjs(this.effectiveRange[0]).unix(), end: dayjs(this.effectiveRange[1]).unix(), step: this.effectiveStep,
      });
    },
    renderChart() {
      if (!this.$refs.chart || !this.data.length || this.configurationError) { this.chart?.clear(); return; }
      if (!this.chart) {
        this.chart = markRaw(echarts.init(this.$refs.chart));
        this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
        this.resizeObserver.observe(this.$refs.chart);
      }
      const textColor = this.dark.isDark ? 'rgba(255,255,255,.9)' : '#4e5969';
      const series = this.data.map((item) => ({ ...item, type: this.chartType || item.type || 'line' }));
      this.chart.setOption({
        backgroundColor: this.dark.isDark ? '#232324' : '#fff', textStyle: { color: textColor },
        color: ['#165dff', '#00b42a', '#f7ba1e', '#722ed1', '#f53f3f', '#86909c'],
        tooltip: { trigger: 'axis', appendToBody: true }, legend: { type: 'scroll', textStyle: { color: textColor } },
        grid: { left: 20, right: 20, top: 42, bottom: 16, containLabel: true },
        xAxis: { type: 'time' }, yAxis: { type: 'value', name: this.unit }, series,
        ...this.option,
      }, true);
    },
  },
};
</script>

<style scoped>
.monitor-stat-chart{width:100%;height:100%;min-height:360px;display:flex;flex-direction:column;}
.monitor-stat-header,.monitor-stat-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.monitor-stat-title{font-size:16px;font-weight:600;}.monitor-stat-controls{justify-content:flex-end;}
.monitor-stat-spin{display:block;flex:1;min-height:300px;margin-top:16px;}.monitor-stat-spin :deep(.arco-spin-children){height:100%;}
.monitor-stat-body{width:100%;height:100%;min-height:300px;}.monitor-stat-error{margin-top:16px;}
</style>
