<template>
  <div class="statistics-analysis-charts">
    <div v-if="showTabs || selectorStyle === 'buttons' || $slots.toolbar" :class="['statistics-analysis-toolbar', { 'statistics-analysis-toolbar-buttons': selectorStyle === 'buttons' }]">
      <a-tabs v-if="showTabs" :active-key="modelValue" hide-content class="statistics-analysis-tabs" @change="changeGroup">
        <a-tab-pane v-for="group in groups" :key="group.key" :title="group.title" />
      </a-tabs>
      <a-radio-group v-else-if="selectorStyle === 'buttons'" :model-value="modelValue" type="button" @change="changeGroup">
        <a-radio v-for="group in groups" :key="group.key" :value="group.key">{{ group.title }}</a-radio>
      </a-radio-group>
      <slot name="toolbar" :group="activeGroup" />
    </div>

    <div v-if="activeGroup" class="statistics-analysis-grid" :class="`statistics-analysis-grid-${activeGroup.charts?.length || 0}`">
      <div v-for="chart in activeGroup.charts || []" :key="chart.key" class="statistics-analysis-chart">
        <slot name="chart" :chart="chart" :group="activeGroup">
          <monitor-stat-chart
            :title="showChartTitle ? chart.title : ''"
            :step-options="chart.stepOptions || stepOptions"
            :retention-seconds="chart.retentionSeconds || retentionSeconds"
            :fixed-step="step == null ? chart.fixedStep : Number(step)"
            :fixed-time-range="pickerValue || chart.timeRange"
            :default-step="chart.defaultStep || chart.stepOptions?.[0]?.value || stepOptions?.[0]?.value"
            :data="chart.series || []"
            :loading="Boolean(chart.loading)"
            :unit="chart.unit"
            :option="chart.option"
            :empty-text="chart.emptyText || emptyText"
            @query-change="query => $emit('query-change', { group: activeGroup.key, chart: chart.key, ...query })"
          />
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import MonitorStatChart from '@/components/monitor-stat-chart.vue';

export default {
  name: 'StatisticsAnalysisCharts',
  components: { MonitorStatChart },
  props: {
    modelValue: { type: [String, Number], default: '' },
    groups: { type: Array, default: () => [] },
    showTabs: { type: Boolean, default: true },
    selectorStyle: { type: String, default: 'tabs' },
    pickerValue: { type: Array, default: null },
    step: { type: Number, default: null },
    stepOptions: { type: Array, default: () => [] },
    retentionSeconds: { type: Number, default: 86400 },
    emptyText: { type: String, default: '当前时间范围暂无监控数据' },
  },
  emits: ['update:modelValue', 'query-change'],
  computed: {
    activeGroup() {
      return this.groups.find((group) => group.key === this.modelValue) || this.groups[0] || null;
    },
    showChartTitle() {
      return (this.activeGroup?.charts?.length || 1) > 1;
    },
  },
  watch: {
    groups: {
      immediate: true,
      handler() {
        if (this.activeGroup && this.activeGroup.key !== this.modelValue) {
          this.$emit('update:modelValue', this.activeGroup.key);
        }
      },
    },
  },
  methods: {
    changeGroup(key) { this.$emit('update:modelValue', key); },
  },
};
</script>

<style scoped>
.statistics-analysis-charts{width:100%;min-width:0;}
.statistics-analysis-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0;}
.statistics-analysis-toolbar-buttons{justify-content:flex-start;}
.statistics-analysis-tabs{flex:1;min-width:0;}
.statistics-analysis-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;margin-top:20px;}
.statistics-analysis-grid-1{grid-template-columns:minmax(0,1fr);}
.statistics-analysis-chart{min-width:0;min-height:360px;}
@media (max-width:900px){.statistics-analysis-toolbar{flex-wrap:wrap;}.statistics-analysis-toolbar>:last-child{max-width:100%;margin-left:auto;}.statistics-analysis-grid{grid-template-columns:minmax(0,1fr);}}
</style>
