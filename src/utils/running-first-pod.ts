import { k8sproxy } from '@/utils/api';

export type RunningFirstPodParams = {
  type: string;
  namespace: string;
  name: string;
};

export class RunningFirstPodError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'RunningFirstPodError';
    this.status = status;
    this.code = code;
  }
}

const workloadResources: Record<string, string> = {
  deployment: 'deployments',
  deployments: 'deployments',
  daemonset: 'daemonsets',
  daemonsets: 'daemonsets',
  statefulset: 'statefulsets',
  statefulsets: 'statefulsets',
};

function invalidParams(message: string) {
  return new RunningFirstPodError(message, 400, 'INVALID_RUNNING_FIRST_POD_PARAMS');
}

export async function runningFirstPod(params: RunningFirstPodParams) {
  if (!params || typeof params !== 'object') {
    throw invalidParams('runningFirstPod params are required');
  }

  const type = String(params.type || '').trim().toLowerCase();
  const namespace = String(params.namespace || '').trim();
  const name = String(params.name || '').trim();
  const resource = workloadResources[type];
  if (!resource) {
    throw invalidParams(`unsupported workload type: ${params.type || ''}`);
  }
  if (!namespace || !name) {
    throw invalidParams('namespace and name are required');
  }

  const workloadPath = [
    '/apis/apps/v1/namespaces',
    encodeURIComponent(namespace),
    resource,
    encodeURIComponent(name),
  ].join('/');
  const workloadResponse = await k8sproxy.get(workloadPath, { noAlert: true });
  const matchLabels = workloadResponse?.data?.spec?.selector?.matchLabels;
  if (!matchLabels || typeof matchLabels !== 'object' || Object.keys(matchLabels).length === 0) {
    throw invalidParams('workload matchLabels are required');
  }

  const labelSelector = Object.entries(matchLabels)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
  const podResponse = await k8sproxy.get(
    `/api/v1/namespaces/${encodeURIComponent(namespace)}/pods`,
    {
      params: { labelSelector },
      noAlert: true,
    },
  );
  const pod = (podResponse?.data?.items || [])
    .find((item: any) => item?.status?.phase === 'Running');
  if (!pod) {
    throw new RunningFirstPodError(
      'running pod not found',
      404,
      'RUNNING_POD_NOT_FOUND',
    );
  }
  return pod;
}
