export const DAY_SECONDS = 24 * 60 * 60;

export const METRIC_RETENTION_SECONDS = DAY_SECONDS;
export const LOG_RETENTION_SECONDS = 30 * DAY_SECONDS;

export const METRIC_30S_STEPS = [
  { label: '30 秒', value: 30 },
  { label: '1 分钟', value: 60 },
  { label: '10 分钟', value: 600 },
  { label: '1 小时', value: 3600 },
  { label: '3 小时', value: 10800 },
  { label: '12 小时', value: 43200 },
];

export const METRIC_60S_STEPS = METRIC_30S_STEPS.filter((item) => item.value >= 60);

export const TRAFFIC_STEPS = [
  { label: '1 分钟', value: 60 },
  { label: '5 分钟', value: 300 },
  { label: '15 分钟', value: 900 },
  { label: '30 分钟', value: 1800 },
  { label: '1 小时', value: 3600 },
  { label: '2 小时', value: 7200 },
  { label: '6 小时', value: 21600 },
  { label: '12 小时', value: 43200 },
  { label: '1 天', value: 86400 },
];

export const TRAFFIC_STEP_VALUES: Record<number, string> = {
  60: '1m', 300: '5m', 900: '15m', 1800: '30m', 3600: '1h',
  7200: '2h', 21600: '6h', 43200: '12h', 86400: '1d',
};
