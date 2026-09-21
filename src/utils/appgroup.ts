const APP_GROUP_WORKLOAD_KINDS = ['deployment', 'statefulset', 'daemonset'];

export const APP_GROUP_MANIFEST_TYPE_ANNOTATION = 'w7.cc/manifest-type';
export const GATEWAY_PLUGIN_APPLICATION_TYPE = 'gateway-plugin';
export const APP_PLUGIN_APPLICATION_TYPE = 'app-plugin';
export const APPGROUP_DEPENDENCY_LABEL_PREFIX = 'w7.cc/depends-';

const DEFAULT_APP_GROUP_NAMESPACE = 'default';
const DEFAULT_UNINSTALL_POLL_INTERVAL = 1000;
const DEFAULT_UNINSTALL_TIMEOUT = 10 * 60 * 1000;

export interface AppGroupUninstallPlanItem {
    name: string;
    title: string;
    resource: any;
}

export interface AppGroupUninstallPlan {
    namespace: string;
    rootName: string;
    items: AppGroupUninstallPlanItem[];
    dependentItems: AppGroupUninstallPlanItem[];
}

export interface AppGroupUninstallOptions {
    signal?: AbortSignal;
    pollIntervalMs?: number;
    timeoutMs?: number;
    confirm?: (plan: AppGroupUninstallPlan) => boolean | Promise<boolean>;
    onDeleting?: (item: AppGroupUninstallPlanItem, plan: AppGroupUninstallPlan) => void;
}

export interface AppGroupUninstallResult {
    cancelled: boolean;
    deletedNames: string[];
    plan: AppGroupUninstallPlan;
}

export function getAppGroupApplicationType(appGroup: any) {
    return appGroup?.metadata?.annotations?.[APP_GROUP_MANIFEST_TYPE_ANNOTATION] || '';
}

export function isGatewayPluginAppGroup(appGroup: any) {
    return getAppGroupApplicationType(appGroup) === GATEWAY_PLUGIN_APPLICATION_TYPE;
}

export function isAppPluginAppGroup(appGroup: any) {
    return getAppGroupApplicationType(appGroup) === APP_PLUGIN_APPLICATION_TYPE;
}

export function isPluginAppGroup(appGroup: any) {
    return isGatewayPluginAppGroup(appGroup) || isAppPluginAppGroup(appGroup);
}

export function appGroupDependsOn(appGroup: any, target: any) {
    const targetNamespace = target?.metadata?.namespace || DEFAULT_APP_GROUP_NAMESPACE;
    const targetName = target?.metadata?.name || '';
    return (appGroup?.spec?.dependencies || []).some((dependency: any) => {
        const dependencyNamespace = dependency?.namespace
            || appGroup?.metadata?.namespace
            || DEFAULT_APP_GROUP_NAMESPACE;
        return dependencyNamespace === targetNamespace
            && dependency?.name === targetName;
    });
}

export function isAppGroupWorkloadItem(item: any) {
    return APP_GROUP_WORKLOAD_KINDS.includes(String(item?.kind || '').toLowerCase());
}

export function filterAppGroupWorkloadItems(items: any[] = []) {
    return items.filter(isAppGroupWorkloadItem);
}

function getAppGroupApi(namespace: string) {
    return `/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(namespace)}/appgroups`;
}

function getErrorStatus(error: any) {
    return error?.response?.status || error?.status;
}

function throwIfAborted(signal?: AbortSignal) {
    if(!signal?.aborted){return}
    const error = new Error('应用卸载已取消');
    error.name = 'AbortError';
    throw error;
}

function wait(interval: number, signal?: AbortSignal) {
    throwIfAborted(signal);
    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', abort);
            resolve();
        }, interval);
        const abort = () => {
            clearTimeout(timer);
            const error = new Error('应用卸载已取消');
            error.name = 'AbortError';
            reject(error);
        };
        signal?.addEventListener('abort', abort, { once: true });
    });
}

async function loadAppGroup(k8sClient: any, namespace: string, name: string, signal?: AbortSignal) {
    throwIfAborted(signal);
    try {
        const response = await k8sClient.get(
            `${getAppGroupApi(namespace)}/${encodeURIComponent(name)}`,
            { noAlert: true, signal },
        );
        return response?.data || null;
    } catch(error) {
        if(getErrorStatus(error) === 404){return null}
        throw error;
    }
}

async function loadReverseDependentAppGroups(
    k8sClient: any,
    namespace: string,
    target: any,
    signal?: AbortSignal,
) {
    throwIfAborted(signal);
    const targetName = target?.metadata?.name || '';
    if(!targetName){return []}
    const selector = `${APPGROUP_DEPENDENCY_LABEL_PREFIX}${targetName}=true`;
    const response = await k8sClient.get(
        `${getAppGroupApi(namespace)}?labelSelector=${encodeURIComponent(selector)}`,
        { noAlert: true, signal },
    );
    return (response?.data?.items || []).filter((candidate: any) => (
        candidate?.metadata?.name !== targetName
        && appGroupDependsOn(candidate, target)
    ));
}

function toUninstallPlanItem(resource: any): AppGroupUninstallPlanItem {
    const name = resource?.metadata?.name || '';
    return {
        name,
        title: resource?.spec?.title || resource?.metadata?.annotations?.title || name,
        resource,
    };
}

async function createAppGroupUninstallPlan(
    k8sClient: any,
    namespace: string,
    rootName: string,
    signal?: AbortSignal,
): Promise<AppGroupUninstallPlan> {
    const items: AppGroupUninstallPlanItem[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = async (name: string) => {
        if(visited.has(name)){return}
        if(visiting.has(name)){
            throw new Error(`应用依赖存在循环，无法安全卸载：${name}`);
        }
        visiting.add(name);
        const resource = await loadAppGroup(k8sClient, namespace, name, signal);
        if(resource){
            const dependentAppGroups = await loadReverseDependentAppGroups(
                k8sClient,
                namespace,
                resource,
                signal,
            );
            dependentAppGroups.sort((a: any, b: any) => String(a?.metadata?.name || '')
                .localeCompare(String(b?.metadata?.name || '')));
            for(const dependent of dependentAppGroups){
                const dependentName = dependent?.metadata?.name || '';
                if(dependentName){await visit(dependentName)}
            }
            items.push(toUninstallPlanItem(resource));
        }
        visiting.delete(name);
        visited.add(name);
    };

    await visit(rootName);
    return {
        namespace,
        rootName,
        items,
        dependentItems: items.filter(item => item.name !== rootName),
    };
}

async function waitForAppGroupDeletion(
    k8sClient: any,
    namespace: string,
    name: string,
    deadline: number,
    pollInterval: number,
    signal?: AbortSignal,
) {
    while(Date.now() < deadline){
        const resource = await loadAppGroup(k8sClient, namespace, name, signal);
        if(!resource){return}
        await wait(pollInterval, signal);
    }
    throw new Error(`等待应用“${name}”卸载完成超时`);
}

export async function uninstallAppGroup(
    k8sClient: any,
    namespace: string,
    appGroupName: string,
    options: AppGroupUninstallOptions = {},
): Promise<AppGroupUninstallResult> {
    const resolvedNamespace = namespace || DEFAULT_APP_GROUP_NAMESPACE;
    const rootName = String(appGroupName || '').trim();
    if(!rootName){throw new Error('缺少应用标识')}

    const plan = await createAppGroupUninstallPlan(
        k8sClient,
        resolvedNamespace,
        rootName,
        options.signal,
    );
    if(options.confirm && !await options.confirm(plan)){
        return { cancelled: true, deletedNames: [], plan };
    }

    const timeoutMs = Math.max(1, options.timeoutMs || DEFAULT_UNINSTALL_TIMEOUT);
    const pollInterval = Math.max(100, options.pollIntervalMs || DEFAULT_UNINSTALL_POLL_INTERVAL);
    const deadline = Date.now() + timeoutMs;
    const deletedNames: string[] = [];
    for(const item of plan.items){
        throwIfAborted(options.signal);
        const current = await loadAppGroup(
            k8sClient,
            resolvedNamespace,
            item.name,
            options.signal,
        );
        if(!current){continue}
        options.onDeleting?.(item, plan);
        if(!current?.metadata?.deletionTimestamp){
            try {
                await k8sClient.delete(
                    `${getAppGroupApi(resolvedNamespace)}/${encodeURIComponent(item.name)}`,
                    { noAlert: true, signal: options.signal },
                );
            } catch(error) {
                if(getErrorStatus(error) !== 404){throw error}
            }
        }
        await waitForAppGroupDeletion(
            k8sClient,
            resolvedNamespace,
            item.name,
            deadline,
            pollInterval,
            options.signal,
        );
        deletedNames.push(item.name);
    }
    return { cancelled: false, deletedNames, plan };
}
