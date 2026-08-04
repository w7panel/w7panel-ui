import { WASM_PLUGIN_API } from '@/utils/gateway-plugin';
import {
  getResourceGroupName,
  loadResourcesByGroupNames,
} from '@/utils/w7panel-resource';

export const AI_LABEL = 'w7.cc/gateway-ai-proxy';
export const AI_DOMAIN_LABEL = 'w7.cc/gateway-ai-domain';
export const AI_CONSUMER_LABEL = 'w7.cc/gateway-ai-consumer';

export const AI_MODELS_ANNOTATION = 'w7.cc/gateway-ai-models';
export const AI_AUTH_ANNOTATION = 'w7.cc/gateway-ai-auth-enabled';
export const AI_PROVIDERS_ANNOTATION = 'w7.cc/gateway-ai-providers';

// AI 代理依赖固定的制品市场插件。页面只检测安装状态并跳转安装，禁止运行时请求市场列表或自动创建内置 WasmPlugin。
export const AI_PROXY_PLUGIN_ARTIFACT = {
  identify: 'w7panel-pluginaiproxy',
  installUrl: 'https://zpk.w7.cc/zpk/respo/info/w7panel-pluginaiproxy',
} as const;

export const KEY_AUTH_PLUGIN_ARTIFACT = {
  identify: 'w7panel-pluginkeyauth',
  installUrl: 'https://zpk.w7.cc/zpk/respo/info/w7panel-pluginkeyauth',
} as const;

export const REQUEST_VALIDATION_PLUGIN_ARTIFACT = {
  identify: 'w7panel-pluginrequestvalidation',
  installUrl: 'https://zpk.w7.cc/zpk/respo/info/w7panel-pluginrequestvalidation',
} as const;

export type AIProxyPluginArtifact = {
  identify: string;
  installUrl: string;
};

function normalizeArtifactIdentify(value: unknown): string {
  return String(value || '').trim().toLowerCase().replaceAll('_', '-');
}

function resolveInstalledPluginArtifact(
  plugins: any[] = [],
  artifact: AIProxyPluginArtifact,
) {
  const groupName = normalizeArtifactIdentify(artifact.identify);
  const plugin = plugins.find(item => getResourceGroupName(item) === groupName)
    || null;
  return {
    plugin,
    installed: Boolean(plugin),
  };
}

export async function loadInstalledPluginArtifacts(
  k8sClient: any,
  targets: Array<{ artifact: AIProxyPluginArtifact }>,
) {
  const groupNames = [...new Set(targets.map(item => normalizeArtifactIdentify(item.artifact.identify)).filter(Boolean))];
  const plugins = await loadResourcesByGroupNames(k8sClient, WASM_PLUGIN_API, groupNames);

  const resolved = targets.map(target => resolveInstalledPluginArtifact(
    plugins,
    target.artifact,
  ));
  return resolved;
}

export interface AIRouteProvider {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
}

export function resourceName(value: string): string {
  return String(value || '')
    .replace(/\*/g, 'x')
    .replace(/(\.|\/|_|:|\s+)/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
    .toLowerCase();
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(-7);
}

export function scopedName(scope: string, name: string, maxLength = 63): string {
  const raw = resourceName(`${scope}-${name}`);
  if (raw.length <= maxLength) return raw;
  const suffix = shortHash(raw);
  return `${raw.slice(0, maxLength - suffix.length - 1).replace(/[^a-z0-9]+$/g, '')}-${suffix}`;
}

export function domainResourcePrefix(domainName: string): string {
  return `${scopedName('ai-scope', domainName, 32)}-`;
}

export function providerResourceId(domainName: string, providerName: string): string {
  return scopedName(domainResourcePrefix(domainName), providerName);
}

export function providerServiceName(providerId: string): string {
  return `${scopedName('llm', providerId, 54)}.internal`;
}

export function consumerResourceId(domainName: string, consumerName: string): string {
  return scopedName(domainResourcePrefix(domainName), consumerName);
}

export function consumerSecretName(domainName: string, consumerName: string): string {
  return scopedName('ai-consumer', `${domainName.replace(/^ai-/, '')}-${consumerName}`);
}

export function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function readRouteProviders(value: unknown): AIRouteProvider[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: resourceName(item?.id || ''),
        name: resourceName(item?.name || ''),
        weight: Number(item?.weight) || 0,
        enabled: item?.enabled !== false,
      }))
      .filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

export function validateProviderWeights(providers: Array<Pick<AIRouteProvider, 'enabled' | 'weight'>>): string {
  const enabled = providers.filter((item) => item.enabled !== false);
  if (enabled.length <= 1) return '';
  if (enabled.some((item) => !Number.isFinite(Number(item.weight)) || Number(item.weight) <= 0)) {
    return '启用多个服务提供者时，每个提供者的权重必须大于 0';
  }
  const total = enabled.reduce((sum, item) => sum + Number(item.weight), 0);
  return total === 100 ? '' : `已启用服务提供者的权重总和必须为 100，当前为 ${total}`;
}
