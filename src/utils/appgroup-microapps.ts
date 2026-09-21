import { getMicroAppOrder } from './microapp-menu';
import {
  APP_PLUGIN_APPLICATION_TYPE,
  getAppGroupApplicationType,
} from './appgroup';
import {
  RESOURCE_GROUP_LABEL,
  W7PANEL_RESOURCE_NAMESPACE,
  loadResourcesByGroupNames,
  resourceListWithLabelSelector,
} from './w7panel-resource';

export const APPGROUP_DEPENDENCY_LABEL_PREFIX = 'w7.cc/depends-';
export { APP_PLUGIN_APPLICATION_TYPE } from './appgroup';
export const DEPENDENT_PLUGIN_ORDER_BASE = 200;
export { getAppGroupApplicationType } from './appgroup';

export interface ReverseDependentAppItem {
  appgroup: string;
  identifie: string;
  type: string;
  packageType: string;
  title: string;
  version: string;
}

function getAppGroupApi(namespace: string) {
  return `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(namespace)}/appgroups`;
}

function toReverseDependentAppItem(appGroup: any): ReverseDependentAppItem {
  const metadata = appGroup?.metadata || {};
  const spec = appGroup?.spec || {};
  const applicationType = getAppGroupApplicationType(appGroup);
  const appgroup = metadata?.name || '';
  return {
    appgroup,
    identifie: spec?.identifie
      || metadata?.labels?.['w7.cc/identifie']
      || metadata?.annotations?.['w7.cc/identifie']
      || '',
    type: applicationType,
    packageType: spec?.type || '',
    title: spec?.title || metadata?.annotations?.title || appgroup,
    version: spec?.version || metadata?.labels?.['w7.cc/version'] || '',
  };
}

function dedupeReverseDependentApps(items: ReverseDependentAppItem[]) {
  const result = new Map<string, ReverseDependentAppItem>();
  items.forEach(item => {
    if(!item.appgroup){return}
    const key = item.appgroup;
    if(!result.has(key)){result.set(key, item)}
  });
  return [...result.values()];
}

async function loadAppGroup(k8sClient: any, namespace: string, name: string) {
  if(!name){return null}
  const response = await k8sClient.get(
    `${getAppGroupApi(namespace)}/${encodeURIComponent(name)}`,
    { noAlert: true },
  ).catch(()=>null);
  return response?.data || null;
}

export function appGroupDependsOn(appGroup: any, target: any) {
  const targetNamespace = target?.metadata?.namespace || W7PANEL_RESOURCE_NAMESPACE;
  const targetName = target?.metadata?.name || '';
  return (appGroup?.spec?.dependencies || []).some((dependency: any) => {
    const dependencyNamespace = dependency?.namespace
      || appGroup?.metadata?.namespace
      || W7PANEL_RESOURCE_NAMESPACE;
    return dependencyNamespace === targetNamespace
      && dependency?.name === targetName;
  });
}

export async function loadAppGroupReverseDependentContext(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const resolvedNamespace = namespace || W7PANEL_RESOURCE_NAMESPACE;
  const target = await loadAppGroup(k8sClient, resolvedNamespace, appGroupName);
  if(!target){
    return {
      target: null,
      dependentAppGroups: [],
      reverseDependentApps: [] as ReverseDependentAppItem[],
    };
  }

  const targetNamespace = target?.metadata?.namespace || resolvedNamespace;
  const selector = `${APPGROUP_DEPENDENCY_LABEL_PREFIX}${appGroupName}=true`;
  const dependentResponse = await k8sClient.get(
    resourceListWithLabelSelector(getAppGroupApi(targetNamespace), selector),
    { noAlert: true },
  ).catch(()=>null);
  const dependentAppGroups = (dependentResponse?.data?.items || []).filter((candidate: any) => (
    candidate?.metadata?.name !== appGroupName
    && !candidate?.metadata?.deletionTimestamp
    && appGroupDependsOn(candidate, target)
  ));

  return {
    target,
    dependentAppGroups,
    reverseDependentApps: dedupeReverseDependentApps(dependentAppGroups.map(toReverseDependentAppItem)),
  };
}

export async function loadVisibleAppGroupContext(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const resolvedNamespace = namespace || W7PANEL_RESOURCE_NAMESPACE;
  const dependentContext = await loadAppGroupReverseDependentContext(
    k8sClient,
    resolvedNamespace,
    appGroupName,
  );
  const groupNames = [appGroupName];
  dependentContext.dependentAppGroups.forEach((candidate: any) => {
    if(getAppGroupApplicationType(candidate) !== APP_PLUGIN_APPLICATION_TYPE){return}
    if(candidate?.metadata?.name){groupNames.push(candidate.metadata.name)}
  });
  const microAppApi = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(resolvedNamespace)}/microapps`;
  const microApps = await loadResourcesByGroupNames(k8sClient, microAppApi, groupNames, true);
  return {
    ...dependentContext,
    microApps,
  };
}

export async function loadVisibleAppGroupMicroApps(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const context = await loadVisibleAppGroupContext(k8sClient, namespace, appGroupName);
  return context.microApps;
}

const getMicroAppGroupName = (microApp: any) => microApp?.metadata?.labels?.[RESOURCE_GROUP_LABEL]
  || String(microApp?.metadata?.name || '').replace(/-root$/, '');

export const sortVisibleAppGroupMicroApps = <T>(microApps: T[] = [], primaryGroupName = '') => microApps
  .map((microApp, index) => {
    const groupName = getMicroAppGroupName(microApp);
    const microAppName = String((microApp as any)?.metadata?.name || '');
    const isDependentPlugin = Boolean(primaryGroupName && groupName && groupName !== primaryGroupName);
    const order = getMicroAppOrder(microApp);
    return {
      microApp,
      index,
      groupName,
      microAppName,
      isDependentPlugin,
      displayOrder: order === Number.MAX_SAFE_INTEGER
        ? Number.POSITIVE_INFINITY
        : order + (isDependentPlugin ? DEPENDENT_PLUGIN_ORDER_BASE : 0),
    };
  })
  .sort((a, b) => a.displayOrder - b.displayOrder
    || Number(a.isDependentPlugin) - Number(b.isDependentPlugin)
    || a.groupName.localeCompare(b.groupName)
    || a.microAppName.localeCompare(b.microAppName)
    || a.index - b.index)
  .map(({ microApp }) => microApp);
