import axios from 'axios';
import { buildApiPath } from '@/config/api';

export function nodes() {
    return axios.post(buildApiPath('CLUSTER_NODES'));
}

export function compressFiles(compressUrl: string, sources: string[], output: string) {
    return axios.post(`${compressUrl}/compress`, { sources, output });
}

export function extractFiles(compressUrl: string, source: string, target: string) {
    return axios.post(`${compressUrl}/extract`, { source, target });
}

export function getDiskUsage() {
    return axios.get(buildApiPath('METRICS_USAGE_DISK'));
}

export function getLonghornStatus() {
    return axios.get(buildApiPath('CLUSTER_LONGHORN_STATUS'));
}
