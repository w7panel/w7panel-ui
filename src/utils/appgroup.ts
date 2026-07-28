const APP_GROUP_WORKLOAD_KINDS = ['deployment', 'statefulset', 'daemonset'];

export const APP_GROUP_MANIFEST_TYPE_ANNOTATION = 'w7.cc/manifest-type';
export const GATEWAY_PLUGIN_APPLICATION_TYPE = 'gateway-plugin';

export function isGatewayPluginAppGroup(appGroup: any) {
    return appGroup?.metadata?.annotations?.[APP_GROUP_MANIFEST_TYPE_ANNOTATION] === GATEWAY_PLUGIN_APPLICATION_TYPE;
}

export function isAppGroupWorkloadItem(item: any) {
    return APP_GROUP_WORKLOAD_KINDS.includes(String(item?.kind || '').toLowerCase());
}

export function filterAppGroupWorkloadItems(items: any[] = []) {
    return items.filter(isAppGroupWorkloadItem);
}
