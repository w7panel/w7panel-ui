import { getMicroAppOrder } from './microapp-menu';
import {
  RESOURCE_GROUP_LABEL,
  W7PANEL_RESOURCE_NAMESPACE,
  loadResourcesByGroupNames,
  resourceListWithLabelSelector,
} from './w7panel-resource';

export const APPGROUP_DEPENDENCY_LABEL_PREFIX = 'w7.cc/depends-';
export const APP_PLUGIN_APPLICATION_TYPE = 'app-plugin';
export const DEPENDENT_PLUGIN_ORDER_BASE = 200;

export function getAppGroupApplicationType(appGroup: any) {
  return appGroup?.metadata?.annotations?.['w7.cc/manifest-type'] || '';
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

export async function loadVisibleAppGroupMicroApps(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const resolvedNamespace = namespace || W7PANEL_RESOURCE_NAMESPACE;
  const encodedNamespace = encodeURIComponent(resolvedNamespace);
  const appGroupApi = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodedNamespace}/appgroups`;
  const microAppApi = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodedNamespace}/microapps`;
  const targetResponse = await k8sClient.get(
    `${appGroupApi}/${encodeURIComponent(appGroupName)}`,
    { noAlert: true },
  ).catch(()=>null);
  const target = targetResponse?.data;
  const groupNames = [appGroupName];
  if(target){
    const selector = `${APPGROUP_DEPENDENCY_LABEL_PREFIX}${appGroupName}=true`;
    const dependentResponse = await k8sClient.get(
      resourceListWithLabelSelector(appGroupApi, selector),
      { noAlert: true },
    ).catch(()=>null);
    (dependentResponse?.data?.items || []).forEach((candidate: any) => {
      if(getAppGroupApplicationType(candidate) !== APP_PLUGIN_APPLICATION_TYPE){return}
      if(!appGroupDependsOn(candidate, target)){return}
      if(candidate?.metadata?.deletionTimestamp){return}
      if(candidate?.metadata?.name){groupNames.push(candidate.metadata.name)}
    });
  }
  return loadResourcesByGroupNames(k8sClient, microAppApi, groupNames, true);
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
