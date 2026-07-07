const APP_GROUP_WORKLOAD_KINDS = ['deployment', 'statefulset', 'daemonset'];

export function isAppGroupWorkloadItem(item: any) {
    return APP_GROUP_WORKLOAD_KINDS.includes(String(item?.kind || '').toLowerCase());
}

export function filterAppGroupWorkloadItems(items: any[] = []) {
    return items.filter(isAppGroupWorkloadItem);
}
