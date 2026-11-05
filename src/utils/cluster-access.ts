import type { RouteMeta } from 'vue-router';
import { panelApi } from '@/utils/api';

type ClusterContext = { isSubCluster: boolean; mainPanelUrl?: string };
let contextPromise: Promise<ClusterContext> | null = null;

export function loadClusterContext(): Promise<ClusterContext> {
  if (!contextPromise) {
    contextPromise = panelApi.get('/app-info', { noAlert: true }).then(({ data }) => {
      const context = data?.data || data;
      if (typeof context?.isSubCluster !== 'boolean') throw new Error('集群类型缺失');
      return context;
    }).catch((error) => {
      contextPromise = null;
      throw error;
    });
  }
  return contextPromise;
}

export function allowsClusterRoute(meta: RouteMeta | undefined, isSubCluster: boolean | null): boolean {
  if (!meta?.clusterTypes) return true;
  return isSubCluster !== null && meta.clusterTypes.includes(isSubCluster ? 'child' : 'main');
}
