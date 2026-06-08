import { k8sproxy } from '@/utils/api';

export const DEFAULT_METRICS_SERVICE = 'vmsingle-w7panel-metrics-single:8429';
export const LEGACY_METRICS_SERVICE = 'vmsingle-w7panel-metrics-k8s-offline-metrics-single:8429';

let cachedMetricsService = '';

export function isVersionLessThan(version: string, target: string) {
  const parseVersion = (v: string) => String(v || '').split('.').map((i) => Number(i) || 0);
  const current = parseVersion(version);
  const baseline = parseVersion(target);
  for (let i = 0; i < Math.max(current.length, baseline.length); i += 1) {
    if ((current[i] || 0) < (baseline[i] || 0)) return true;
    if ((current[i] || 0) > (baseline[i] || 0)) return false;
  }
  return false;
}

export function getMetricsServiceByVersion(version: string) {
  return isVersionLessThan(version, '1.0.23') ? LEGACY_METRICS_SERVICE : DEFAULT_METRICS_SERVICE;
}

export async function getMetricsService() {
  if (cachedMetricsService) return cachedMetricsService;

  cachedMetricsService = await k8sproxy
    .get('/apis/w7panel.w7.com/v1alpha1/namespaces/default/appgroups/w7panel-metrics', { noAlert: true })
    .then((res) => {
      const version = res?.data?.spec?.version || '';
      return getMetricsServiceByVersion(version);
    })
    .catch(() => DEFAULT_METRICS_SERVICE);

  return cachedMetricsService;
}
