export const WASM_PLUGIN_NAMESPACE = 'higress-system';
export const WASM_PLUGIN_API = `/apis/extensions.higress.io/v1alpha1/namespaces/${WASM_PLUGIN_NAMESPACE}/wasmplugins`;
export const MICROAPP_NAMESPACE = 'default';
export const MICROAPP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${MICROAPP_NAMESPACE}/microapps`;
export const APPGROUP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${MICROAPP_NAMESPACE}/appgroups`;
export const RESOURCE_GROUP_LABEL = 'w7.cc/group-name';
export const OFFICIAL_APP_ANNOTATION = 'w7.cc/official-app';

export const GATEWAY_PLUGIN_ANNOTATIONS = {
  supportGlobal: 'w7.cc/plugin-support-global',
  supportRule: 'w7.cc/plugin-support-rule',
} as const;

export function getPluginAnnotations(plugin: any) {
  return plugin?.metadata?.annotations || {};
}

export function isGlobalPluginEnabled(plugin: any) {
  return plugin?.spec?.defaultConfigDisable !== true;
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

export function getResourceGroupName(resource: any) {
  return resource?.metadata?.labels?.[RESOURCE_GROUP_LABEL] || '';
}

/**
 * 制品中的 WasmPlugin 与 MicroApp 通过 w7.cc/group-name 归组。
 * 旧版 MicroApp 未写分组标签时，兼容使用与分组同名的 MicroApp。
 * 同组存在多个 MicroApp 时无法确定配置前端，必须回退 YAML。
 */
export function resolvePluginMicroapp(plugin: any, microapps: any[] = []) {
  const groupName = getResourceGroupName(plugin);
  if (groupName) {
    const matches = microapps.filter(item => getResourceGroupName(item) === groupName);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;

    const legacyMatches = microapps.filter(item => !getResourceGroupName(item) && item?.metadata?.name === groupName);
    if (legacyMatches.length === 1) return legacyMatches[0];
  }

  return null;
}

export function getResolvedMicroappName(plugin: any, microapps: any[] = []) {
  return resolvePluginMicroapp(plugin, microapps)?.metadata?.name || '';
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

export type GatewayPluginRuleContext = {
  namespace: string;
  ingressName: string;
};

function uniqueStrings(values: any[]) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

/**
 * 通用网关插件的域名规则统一使用 Higress 标准的 namespace/ingressName 目标。
 * AI 代理自行维护的 domain/service 规则不通过这里识别或修改。
 */
export function getGatewayPluginRuleContext(ingress: any, namespace = ''): GatewayPluginRuleContext {
  return {
    namespace: namespace || ingress?.metadata?.namespace || '',
    ingressName: ingress?.metadata?.name || '',
  };
}

export function getGatewayPluginRuleMatch(plugin: any, context: GatewayPluginRuleContext) {
  const rules = plugin?.spec?.matchRules || [];
  const target = context.namespace && context.ingressName
    ? `${context.namespace}/${context.ingressName}`
    : '';
  if (!target) return { index: -1, scope: 'ingress', values: [] as string[] };
  const index = rules.findIndex((rule: any) => (rule?.ingress || []).includes(target));
  if (index >= 0) return { index, scope: 'ingress', values: [target] };
  return { index: -1, scope: 'ingress', values: [] as string[] };
}

/**
 * 获取当前 Ingress 的独立规则。共享规则包含多个目标时保留其他目标，
 * 并为 namespace/ingressName 复制一条配置相同的规则。
 */
export function ensureGatewayPluginRule(plugin: any, context: GatewayPluginRuleContext) {
  plugin.spec = plugin.spec || {};
  plugin.spec.matchRules = plugin.spec.matchRules || [];
  const match = getGatewayPluginRuleMatch(plugin, context);
  if (match.index < 0) {
    plugin.spec.matchRules.push({
      ingress: [`${context.namespace}/${context.ingressName}`],
      config: {},
      configDisable: true,
    });
    return plugin.spec.matchRules.length - 1;
  }

  const rule = plugin.spec.matchRules[match.index];
  const matchedValues = uniqueStrings(match.values);
  const remainingValues = (rule?.ingress || []).filter((value: string) => !matchedValues.includes(value));
  const hasOtherTargets = remainingValues.length > 0
    || ['domain', 'service'].some(key => (rule?.[key] || []).length > 0);
  if (!hasOtherTargets) return match.index;

  if (remainingValues.length) rule.ingress = remainingValues;
  else delete rule.ingress;
  const isolatedRule = {
    ingress: matchedValues,
    config: JSON.parse(JSON.stringify(rule?.config || {})),
    configDisable: rule?.configDisable === true,
  };
  plugin.spec.matchRules.splice(match.index + 1, 0, isolatedRule);
  return match.index + 1;
}

/** 删除已不存在 Ingress 的匹配目标，共享规则中的其他目标保持不变。 */
export function removeIngressTargetsFromPlugin(plugin: any, namespace: string, ingressNames: string[]) {
  const names = uniqueStrings(ingressNames);
  const targets = new Set(names.map(name => namespace ? `${namespace}/${name}` : name));
  const data = JSON.parse(JSON.stringify(plugin));
  data.spec = data.spec || {};
  const rules = data.spec.matchRules || [];
  let changed = false;
  data.spec.matchRules = rules.filter((rule: any) => {
    const ingress = rule?.ingress || [];
    const remaining = ingress.filter((value: string) => !targets.has(value));
    if (remaining.length === ingress.length) return true;
    changed = true;
    if (remaining.length) rule.ingress = remaining;
    else delete rule.ingress;
    return ['ingress', 'domain', 'service'].some(key => (rule?.[key] || []).length > 0);
  });
  return { data, changed };
}

export async function cleanupIngressPluginRules(k8sClient: any, namespace: string, ingressNames: string[]) {
  const names = uniqueStrings(ingressNames);
  if (!names.length) return;
  const response = await k8sClient.get(WASM_PLUGIN_API, { noAlert: true });
  for (const plugin of response?.data?.items || []) {
    const result = removeIngressTargetsFromPlugin(plugin, namespace, names);
    if (!result.changed) continue;
    await k8sClient.put(`${WASM_PLUGIN_API}/${plugin.metadata.name}`, result.data, { noAlert: true });
  }
}

export function setGlobalPluginEnabled(plugin: any, enabled: boolean) {
  const data = JSON.parse(JSON.stringify(plugin));
  data.metadata = data.metadata || {};
  data.metadata.annotations = data.metadata.annotations || {};
  data.spec = data.spec || {};
  data.spec.defaultConfigDisable = !enabled;
  delete data.metadata.annotations['w7.cc/plugin-enabled'];
  delete data.metadata.annotations['w7.cc/plugin-disabled-state'];
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
