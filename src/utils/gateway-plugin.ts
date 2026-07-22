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
  microapp: 'w7.cc/plugin-microapp',
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

export type GatewayPluginRuleContext = {
  namespace: string;
  ingressName: string;
  domains: string[];
  services: string[];
};

function uniqueStrings(values: any[]) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function parseChildHosts(ingress: any) {
  const value = ingress?.metadata?.annotations?.['w7.cc/child-hosts'];
  if (!value) return [];
  try {
    const items = JSON.parse(value);
    return Array.isArray(items) ? items.map(item => item?.host) : [];
  } catch {
    return [];
  }
}

/**
 * 将 Ingress 转成 Higress matchRules 可识别的匹配上下文。
 * service 同时保留常见的短名称、namespace/name 和集群域名形式，兼容原生资源。
 */
export function getGatewayPluginRuleContext(ingress: any, namespace = ''): GatewayPluginRuleContext {
  const resolvedNamespace = namespace || ingress?.metadata?.namespace || '';
  const rules = ingress?.spec?.rules || [];
  const serviceNames = rules.flatMap((rule: any) => rule?.http?.paths || [])
    .map((path: any) => path?.backend?.service?.name)
    .concat([ingress?.spec?.defaultBackend?.service?.name]);
  const services = uniqueStrings(serviceNames).flatMap(name => uniqueStrings([
    name,
    resolvedNamespace ? `${resolvedNamespace}/${name}` : '',
    resolvedNamespace ? `${name}.${resolvedNamespace}` : '',
    resolvedNamespace ? `${name}.${resolvedNamespace}.svc` : '',
    resolvedNamespace ? `${name}.${resolvedNamespace}.svc.cluster.local` : '',
  ]));
  return {
    namespace: resolvedNamespace,
    ingressName: ingress?.metadata?.name || '',
    domains: uniqueStrings(rules.map((rule: any) => rule?.host).concat(parseChildHosts(ingress))),
    services: uniqueStrings(services),
  };
}

export function getGatewayPluginRuleMatch(plugin: any, context: GatewayPluginRuleContext) {
  const rules = plugin?.spec?.matchRules || [];
  const ingressTargets = uniqueStrings([
    context.namespace && context.ingressName ? `${context.namespace}/${context.ingressName}` : '',
    context.ingressName,
  ]);
  const selectors = [
    { scope: 'ingress', targets: ingressTargets },
    { scope: 'domain', targets: uniqueStrings(context.domains || []) },
    { scope: 'service', targets: uniqueStrings(context.services || []) },
  ];
  for (const selector of selectors) {
    if (!selector.targets.length) continue;
    const index = rules.findIndex((rule: any) =>
      (rule?.[selector.scope] || []).some((value: string) => selector.targets.includes(value)),
    );
    if (index >= 0) {
      return {
        index,
        scope: selector.scope,
        values: (rules[index]?.[selector.scope] || []).filter((value: string) => selector.targets.includes(value)),
      };
    }
  }
  return { index: -1, scope: 'ingress', values: [] as string[] };
}

/**
 * 获取当前作用域的独立规则。原规则同时匹配多个 ingress/domain/service 时，
 * 会保留其他匹配目标，并为当前匹配目标复制一条配置相同的规则。
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
  const scope = match.scope;
  const matchedValues = uniqueStrings(match.values);
  const remainingValues = (rule?.[scope] || []).filter((value: string) => !matchedValues.includes(value));
  const hasOtherTargets = remainingValues.length > 0
    || ['ingress', 'domain', 'service'].some(key => key !== scope && (rule?.[key] || []).length > 0);
  if (!hasOtherTargets) return match.index;

  if (remainingValues.length) rule[scope] = remainingValues;
  else delete rule[scope];
  const isolatedRule = {
    [scope]: matchedValues,
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
