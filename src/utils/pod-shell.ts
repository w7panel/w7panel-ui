import useNamespaceStore from '@/store/modules/namespace';
import { panelApi } from '@/utils/api';

export type PodShellParams = {
  command: string | string[];
  podName: string;
  containerName: string;
};

export class PodShellError extends Error {
  status: number;
  code: string;

  constructor(message: string) {
    super(message);
    this.name = 'PodShellError';
    this.status = 400;
    this.code = 'INVALID_POD_SHELL_PARAMS';
  }
}

export function podShell(params: PodShellParams) {
  if (!params || typeof params !== 'object') {
    return Promise.reject(new PodShellError('podShell params are required'));
  }

  const namespace = String(useNamespaceStore().namespace || '').trim();
  const podName = String(params.podName || '').trim();
  const containerName = String(params.containerName || '').trim();
  const command = Array.isArray(params.command)
    ? params.command
    : typeof params.command === 'string' && params.command.trim()
      ? ['sh', '-c', params.command]
      : [];

  if (!namespace || !podName || !containerName || command.length === 0) {
    return Promise.reject(new PodShellError(
      'namespace, podName, containerName and command are required',
    ));
  }

  return panelApi.post('/exec2', {
    namespace,
    podName,
    containerName,
    tty: false,
    command,
  }, {
    responseType: 'text',
    loading: true,
    noAlert: true,
  });
}
