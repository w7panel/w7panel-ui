export const WASM_PLUGIN_NAMESPACE = 'higress-system';
export const WASM_PLUGIN_API = `/apis/extensions.higress.io/v1alpha1/namespaces/${WASM_PLUGIN_NAMESPACE}/wasmplugins`;
export const MICROAPP_NAMESPACE = 'default';
export const MICROAPP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${MICROAPP_NAMESPACE}/microapps`;
export const APPGROUP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${MICROAPP_NAMESPACE}/appgroups`;
export const RESOURCE_GROUP_LABEL = 'w7.cc/group-name';
export const OFFICIAL_APP_ANNOTATION = 'w7.cc/official-app';

export const GATEWAY_PLUGIN_ANNOTATIONS = {
  enabled: 'w7.cc/plugin-enabled',
  supportGlobal: 'w7.cc/plugin-support-global',
  supportRule: 'w7.cc/plugin-support-rule',
  microapp: 'w7.cc/plugin-microapp',
  disabledState: 'w7.cc/plugin-disabled-state',
} as const;

export function getPluginAnnotations(plugin: any) {
  return plugin?.metadata?.annotations || {};
}

export function isGatewayPluginEnabled(plugin: any) {
  return getPluginAnnotations(plugin)[GATEWAY_PLUGIN_ANNOTATIONS.enabled] !== 'false';
}

export function supportsGlobalConfig(plugin: any) {
  return getPluginAnnotations(plugin)[GATEWAY_PLUGIN_ANNOTATIONS.supportGlobal] !== 'false';
}

export function supportsRuleConfig(plugin: any) {
  const annotations = getPluginAnnotations(plugin);
  const explicit = annotations[GATEWAY_PLUGIN_ANNOTATIONS.supportRule];
  if (explicit !== undefined) return explicit === 'true';

  // 已经存在规则的旧插件继续兼容；没有规则的新旧插件都必须显式勾选。
  return Boolean(plugin?.spec?.matchRules?.length);
}

export function getPluginMicroapp(plugin: any) {
  return getPluginAnnotations(plugin)[GATEWAY_PLUGIN_ANNOTATIONS.microapp] || '';
}

export function getResourceGroupName(resource: any) {
  return resource?.metadata?.labels?.[RESOURCE_GROUP_LABEL] || '';
}

/**
 * 制品中的 WasmPlugin 与 MicroApp 通过 w7.cc/group-name 归组。
 * 同组存在多个 MicroApp 时无法确定配置前端，必须回退 YAML；旧资源继续兼容显式 annotation。
 */
export function resolvePluginMicroapp(plugin: any, microapps: any[] = []) {
  const groupName = getResourceGroupName(plugin);
  if (groupName) {
    const matches = microapps.filter(item => getResourceGroupName(item) === groupName);
    if (matches.length === 1) return matches[0];
    return null;
  }

  const explicitName = getPluginMicroapp(plugin);
  if (!explicitName) return null;
  return microapps.find(item => item?.metadata?.name === explicitName) || null;
}

export function getResolvedMicroappName(plugin: any, microapps: any[] = []) {
  const resolvedName = resolvePluginMicroapp(plugin, microapps)?.metadata?.name || '';
  if (getResourceGroupName(plugin)) return resolvedName;
  return resolvedName || getPluginMicroapp(plugin);
}

export function getPluginTitle(plugin: any) {
  return getPluginAnnotations(plugin)['higress.io/wasm-plugin-title'] || plugin?.metadata?.name || '';
}

export function getPluginDescription(plugin: any) {
  return getPluginAnnotations(plugin)['higress.io/wasm-plugin-description'] || '';
}

export function getPluginVersion(plugin: any) {
  return plugin?.metadata?.labels?.['higress.io/wasm-plugin-version'] || '';
}

export function getIngressRuleIndex(plugin: any, namespace: string, ingressName: string) {
  const target = `${namespace}/${ingressName}`;
  return (plugin?.spec?.matchRules || []).findIndex((rule: any) => rule?.ingress?.includes(target));
}

export function setGatewayPluginEnabled(plugin: any, enabled: boolean) {
  const data = JSON.parse(JSON.stringify(plugin));
  data.metadata = data.metadata || {};
  data.metadata.annotations = data.metadata.annotations || {};
  data.spec = data.spec || {};
  data.spec.matchRules = data.spec.matchRules || [];

  const annotations = data.metadata.annotations;
  if (!enabled) {
    annotations[GATEWAY_PLUGIN_ANNOTATIONS.disabledState] = JSON.stringify({
      defaultConfigDisable: data.spec.defaultConfigDisable !== false,
      matchRules: data.spec.matchRules.map((rule: any) => rule?.configDisable !== false),
    });
    data.spec.defaultConfigDisable = true;
    data.spec.matchRules.forEach((rule: any) => {
      rule.configDisable = true;
    });
  } else {
    try {
      const state = JSON.parse(annotations[GATEWAY_PLUGIN_ANNOTATIONS.disabledState] || '{}');
      if (typeof state.defaultConfigDisable === 'boolean') {
        data.spec.defaultConfigDisable = state.defaultConfigDisable;
      }
      if (Array.isArray(state.matchRules)) {
        data.spec.matchRules.forEach((rule: any, index: number) => {
          if (typeof state.matchRules[index] === 'boolean') {
            rule.configDisable = state.matchRules[index];
          }
        });
      }
    } catch {
      // 旧资源没有停用快照时，仅恢复插件级状态，不猜测配置开关。
    }
    delete annotations[GATEWAY_PLUGIN_ANNOTATIONS.disabledState];
  }

  annotations[GATEWAY_PLUGIN_ANNOTATIONS.enabled] = String(enabled);
  return data;
}

export function normalizePluginName(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 63);
}
