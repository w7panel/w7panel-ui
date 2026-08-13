<template>
  <div class="monitor-stat-chart">
    <div v-if="showHeader" class="monitor-stat-header">
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
    <a-spin v-else :loading="loading" :class="['monitor-stat-spin', { 'monitor-stat-spin-with-header': showHeader }]">
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
    showHeader: { type: Boolean, default: true },
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
      const isDark = this.dark.isDark;
      const textColor = isDark ? 'rgba(255,255,255,.9)' : '#4e5969';
      const mutedColor = isDark ? 'rgba(255,255,255,.55)' : '#86909c';
      const axisLineColor = isDark ? 'rgba(255,255,255,.16)' : '#e5e6eb';
      const splitLineColor = isDark ? 'rgba(255,255,255,.08)' : '#f2f3f5';
      const series = this.data.map((item) => {
        const type = item.type || this.chartType || 'line';
        return type === 'line'
          ? { smooth: true, showSymbol: false, symbol: 'circle', symbolSize: 6, areaStyle: { opacity: 0.05 }, ...item, type }
          : { ...item, type };
      });
      const {
        legend: optionLegend = {}, grid: optionGrid = {}, tooltip: optionTooltip = {},
        xAxis: optionXAxis = {}, yAxis: optionYAxis = {}, ...option
      } = this.option || {};
      const axisLabel = { color: mutedColor };
      const axisLine = { lineStyle: { color: axisLineColor } };
      const axisTick = { lineStyle: { color: axisLineColor } };
      this.chart.setOption({
        backgroundColor: isDark ? '#232324' : '#fff', textStyle: { color: textColor },
        color: ['#165dff', '#00b42a', '#f7ba1e', '#722ed1', '#f53f3f', '#86909c'],
        tooltip: { trigger: 'axis', appendToBody: true, ...optionTooltip },
        legend: { type: 'scroll', bottom: 0, ...optionLegend, textStyle: { color: textColor, ...(optionLegend.textStyle || {}) } },
        grid: { left: 20, right: 20, top: 42, bottom: 52, containLabel: true, ...optionGrid },
        xAxis: {
          type: 'time', boundaryGap: false, ...optionXAxis,
          axisLabel: { ...axisLabel, ...(optionXAxis.axisLabel || {}) },
          axisLine: { ...axisLine, ...(optionXAxis.axisLine || {}), lineStyle: { ...axisLine.lineStyle, ...(optionXAxis.axisLine?.lineStyle || {}) } },
          axisTick: { ...axisTick, ...(optionXAxis.axisTick || {}), lineStyle: { ...axisTick.lineStyle, ...(optionXAxis.axisTick?.lineStyle || {}) } },
        },
        yAxis: {
          type: 'value', name: this.unit, ...optionYAxis,
          axisLabel: { ...axisLabel, ...(optionYAxis.axisLabel || {}) },
          axisLine: { ...axisLine, ...(optionYAxis.axisLine || {}), lineStyle: { ...axisLine.lineStyle, ...(optionYAxis.axisLine?.lineStyle || {}) } },
          axisTick: { ...axisTick, ...(optionYAxis.axisTick || {}), lineStyle: { ...axisTick.lineStyle, ...(optionYAxis.axisTick?.lineStyle || {}) } },
          splitLine: { show: true, ...(optionYAxis.splitLine || {}), lineStyle: { color: splitLineColor, ...(optionYAxis.splitLine?.lineStyle || {}) } },
        },
        series,
        ...option,
      }, true);
    },
  },
};
</script>

<style scoped>
.monitor-stat-chart{width:100%;height:100%;min-height:360px;display:flex;flex-direction:column;}
.monitor-stat-header,.monitor-stat-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.monitor-stat-title{font-size:16px;font-weight:600;}.monitor-stat-controls{justify-content:flex-end;}
.monitor-stat-spin{display:block;flex:1;min-height:300px;}.monitor-stat-spin-with-header{margin-top:16px;}.monitor-stat-spin :deep(.arco-spin-children){height:100%;}
.monitor-stat-body{width:100%;height:100%;min-height:300px;}.monitor-stat-error{margin-top:16px;}
</style>
