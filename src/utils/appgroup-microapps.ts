import { getMicroAppOrder } from './microapp-menu';
import { APPGROUP_DEPENDENCY_LABEL_PREFIX, APP_PLUGIN_APPLICATION_TYPE } from './appgroup';
import {
  MICROAPP_PRESENTATION_KEY_LABEL,
  MICROAPP_PRESENTATION_MODE_ANNOTATION,
  RESOURCE_GROUP_LABEL,
  W7PANEL_RESOURCE_NAMESPACE,
  loadResourcesByGroupNames,
  resourceListWithLabelSelector,
} from './w7panel-resource';

export const DEPENDENT_PLUGIN_ORDER_BASE = 200;
export const MICROAPP_PRESENTATION_MODE_SINGLETON = 'singleton';
export const MICROAPP_PRESENTATION_MODE_MULTIPLE = 'multiple';

export interface ReverseDependentAppItem {
  appgroup: string;
  identifie: string;
  type: string;
  title: string;
  version: string;
}

const MICROAPP_MANIFEST_TYPE_ANNOTATION = 'w7.cc/manifest-type';

function getMicroAppApplicationType(microApp: any) {
  return microApp?.metadata?.annotations?.[MICROAPP_MANIFEST_TYPE_ANNOTATION] || '';
}

function toReverseDependentAppItem(microApp: any): ReverseDependentAppItem {
  const metadata = microApp?.metadata || {};
  const appgroup = metadata?.labels?.[RESOURCE_GROUP_LABEL] || '';
  return {
    appgroup,
    identifie: metadata?.labels?.['w7.cc/identifie'] || '',
    type: getMicroAppApplicationType(microApp),
    title: microApp?.spec?.title || appgroup,
    version: metadata?.labels?.['w7.cc/version'] || '',
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

async function loadAppGroupMicroAppContext(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const resolvedNamespace = namespace || W7PANEL_RESOURCE_NAMESPACE;
  if(!appGroupName){
    return {
      ownMicroApps: [],
      dependentMicroApps: [],
      microApps: [],
      reverseDependentApps: [] as ReverseDependentAppItem[],
    };
  }
  const microAppApi = `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(resolvedNamespace)}/microapps`;
  const selector = `${APPGROUP_DEPENDENCY_LABEL_PREFIX}${appGroupName}=true`;
  const [ownResources, dependentResponse] = await Promise.all([
    loadResourcesByGroupNames(k8sClient, microAppApi, [appGroupName], false),
    k8sClient.get(
      resourceListWithLabelSelector(microAppApi, selector),
      { noAlert: true },
    ).catch(()=>null),
  ]);
  const activeResources = (resources: any[]) => resources.filter(item => (
    item?.metadata?.name && !item?.metadata?.deletionTimestamp
  ));
  const ownMicroApps = activeResources(ownResources);
  const dependentMicroApps = activeResources(dependentResponse?.data?.items || []).filter(item => (
    getMicroAppGroupName(item) && getMicroAppGroupName(item) !== appGroupName
  ));
  const visibleDependentMicroApps = dependentMicroApps.filter(item => (
    getMicroAppApplicationType(item) === APP_PLUGIN_APPLICATION_TYPE
  ));
  const resourceMap = new Map<string, any>();
  [...ownMicroApps, ...visibleDependentMicroApps].forEach(item => {
    resourceMap.set(item.metadata.name, item);
  });

  return {
    ownMicroApps,
    dependentMicroApps,
    microApps: resolvePresentedMicroApps([...resourceMap.values()], appGroupName),
    reverseDependentApps: dedupeReverseDependentApps(dependentMicroApps.map(toReverseDependentAppItem)),
  };
}

export async function loadVisibleAppGroupContext(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  return loadAppGroupMicroAppContext(k8sClient, namespace, appGroupName);
}

export async function loadVisibleAppGroupMicroApps(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const context = await loadAppGroupMicroAppContext(k8sClient, namespace, appGroupName);
  return context.microApps;
}

export async function loadMicroAppReverseDependentApps(
  k8sClient: any,
  namespace: string,
  appGroupName: string,
) {
  const context = await loadAppGroupMicroAppContext(k8sClient, namespace, appGroupName);
  return context.reverseDependentApps;
}

const getMicroAppGroupName = (microApp: any) => microApp?.metadata?.labels?.[RESOURCE_GROUP_LABEL] || '';

const getMicroAppPresentationKey = (microApp: any) => String(
  microApp?.metadata?.labels?.[MICROAPP_PRESENTATION_KEY_LABEL] || '',
).trim();

const getMicroAppPresentationMode = (microApp: any) => String(
  microApp?.metadata?.annotations?.[MICROAPP_PRESENTATION_MODE_ANNOTATION] || '',
).trim();

function selectSingletonMicroApp(microApps: any[], primaryGroupName: string) {
  return sortVisibleAppGroupMicroApps(microApps, primaryGroupName)[0];
}

// resolvePresentedMicroApps applies only the generic presentation contract.
// Unmarked and multiple resources remain visible; singleton resources with the
// same capability key collapse to the first item in the normal display order.
export function resolvePresentedMicroApps<T>(microApps: T[] = [], primaryGroupName = ''): T[] {
  const groups = new Map<string, T[]>();
  microApps.forEach(microApp => {
    const key = getMicroAppPresentationKey(microApp);
    if(!key){return}
    const candidates = groups.get(key) || [];
    candidates.push(microApp);
    groups.set(key, candidates);
  });

  const singletonWinners = new Map<string, T>();
  groups.forEach((candidates, key) => {
    const modes = candidates.map(getMicroAppPresentationMode);
    if(!modes.every(mode => mode === MICROAPP_PRESENTATION_MODE_SINGLETON)){return}
    singletonWinners.set(key, selectSingletonMicroApp(candidates, primaryGroupName));
  });

  return microApps.filter(microApp => {
    const key = getMicroAppPresentationKey(microApp);
    const winner = singletonWinners.get(key);
    return !winner || winner === microApp;
  });
}

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
