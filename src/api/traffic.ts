import { panelApi } from '@/utils/api';

export interface TrafficQuery {
  namespace: string;
  start: string;
  end: string;
  page?: number;
  pageSize?: number;
  domain?: string;
  method?: string;
  status?: string;
  keyword?: string;
  sort?: 'requests' | 'traffic' | 'errors' | 'latency';
  dimension?: 'domain' | 'pod';
  step?: string;
}

export const trafficApi = {
  health: () => panelApi.get('/traffic/health', { noAlert: true }),
  summary: (params: TrafficQuery) => panelApi.get('/traffic/summary', { params, noAlert: true }),
  series: (params: TrafficQuery) => panelApi.get('/traffic/series', { params, noAlert: true }),
  pods: (params: TrafficQuery) => panelApi.get('/traffic/pods', { params, noAlert: true }),
  domains: (params: TrafficQuery) => panelApi.get('/traffic/domains', { params, noAlert: true }),
  urls: (params: TrafficQuery) => panelApi.get('/traffic/urls', { params, noAlert: true }),
};
