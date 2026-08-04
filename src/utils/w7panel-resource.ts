export const W7PANEL_RESOURCE_NAMESPACE = 'default';

export const MICROAPP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${W7PANEL_RESOURCE_NAMESPACE}/microapps`;
export const APPGROUP_API = `/apis/w7panel.w7.com/v1alpha1/namespaces/${W7PANEL_RESOURCE_NAMESPACE}/appgroups`;

export const RESOURCE_GROUP_LABEL = 'w7.cc/group-name';
export const RESOURCE_IDENTIFIE_LABEL = 'w7.cc/identifie';
export const RESOURCE_IDENTIFIE_ANNOTATION = 'w7.cc/identifie';
export const OFFICIAL_APP_ANNOTATION = 'w7.cc/official-app';
export const DENY_DELETE_ANNOTATION = 'w7.cc/deny-delete';

export function resourceListWithLabelSelector(api: string, selector: string) {
  return `${api}?labelSelector=${encodeURIComponent(selector)}`;
}

export function getResourceGroupName(resource: any) {
  return resource?.metadata?.labels?.[RESOURCE_GROUP_LABEL] || '';
}

async function loadNamedResources(k8sClient: any, api: string, names: string[]) {
  const uniqueNames = [...new Set(names.map(name => String(name || '').trim()).filter(Boolean))];
  const responses = await Promise.all(uniqueNames.map(name => k8sClient.get(
    `${api}/${encodeURIComponent(name)}`,
    { noAlert: true },
  ).catch(()=>null)));
  return responses.map(response => response?.data).filter(Boolean);
}

export async function loadResourcesByGroupNames(
  k8sClient: any,
  api: string,
  groupNames: string[],
  includeLegacyName = false,
) {
  const uniqueNames = [...new Set(groupNames.map(name => String(name || '').trim()).filter(Boolean))];
  if(!uniqueNames.length) return [];
  const selector = `${RESOURCE_GROUP_LABEL} in (${uniqueNames.join(',')})`;
  const response = await k8sClient.get(resourceListWithLabelSelector(api, selector), { noAlert: true }).catch(()=>null);
  const resources = response?.data?.items || [];
  if(!includeLegacyName) return resources;
  const groupedNames = new Set(resources.map((item: any) => item?.metadata?.labels?.[RESOURCE_GROUP_LABEL]).filter(Boolean));
  const legacyResources = await loadNamedResources(
    k8sClient,
    api,
    uniqueNames.filter(name => !groupedNames.has(name)),
  );
  const resourceMap = new Map<string, any>();
  [...resources, ...legacyResources].forEach(item => {
    const name = item?.metadata?.name;
    if(name) resourceMap.set(name, item);
  });
  return [...resourceMap.values()];
}
