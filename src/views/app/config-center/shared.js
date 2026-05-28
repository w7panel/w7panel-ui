import dayjs from 'dayjs';
import { k8sproxy } from '@/utils/api';

export const CONFIG_CENTER_LABEL_KEY = 'w7.cc/config-center';
export const CONFIG_CENTER_KIND = 'ConfigMap';
export const CONFIG_CENTER_DATA_KEY = 'config-center.json';
export const CONFIG_CENTER_RESOURCE_PREFIX = 'cfg-center-';
export const CONFIG_CENTER_DEPLOY_PREFIX = 'cfg-deploy-';

function safeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    } catch (error) {
        return fallback;
    }
}

export function createRandomId(length = 8) {
    const source = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';
    for (let i = 0; i < length; i += 1) {
        value += source[Math.floor(Math.random() * source.length)];
    }
    return value;
}

export function slugifyName(value = '') {
    const slug = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
    return slug || createRandomId(6);
}

export function createConfigCenterResourceName(name = '') {
    return `${CONFIG_CENTER_RESOURCE_PREFIX}${slugifyName(name)}-${createRandomId(6)}`;
}

export function createStrategyId() {
    return `strategy-${createRandomId(10)}`;
}

export function createStrategyConfigMapName(configId, strategyId) {
    const cfg = String(configId || '').replace(CONFIG_CENTER_RESOURCE_PREFIX, '').slice(0, 20) || createRandomId(6);
    const stg = String(strategyId || '').replace(/^strategy-/, '').slice(0, 10) || createRandomId(6);
    return `${CONFIG_CENTER_DEPLOY_PREFIX}${cfg}-${stg}`.slice(0, 63);
}

export function createVolumeName(strategyId) {
    return `cfg-volume-${String(strategyId || '').replace(/^strategy-/, '').slice(0, 12)}`.slice(0, 63);
}

export function normalizeConfigItem(item = {}) {
    return {
        version: item.version || '',
        name: item.name || '',
        value: item.value ?? '',
        remark: item.remark ?? '',
    };
}

export function normalizeStrategy(item = {}) {
    return {
        id: item.id || createStrategyId(),
        type: item.type || 'env',
        targetGroup: item.targetGroup || '',
        targetApp: item.targetApp || '',
        targetKind: item.targetKind || '',
        targetContainer: item.targetContainer || '',
        mountPath: item.mountPath || '',
        autoDeploy: !!item.autoDeploy,
        lastSelectedVersion: item.lastSelectedVersion || '',
        lastAppliedVersion: item.lastAppliedVersion || '',
        lastAppliedAt: item.lastAppliedAt || '',
        generatedConfigMapName: item.generatedConfigMapName || '',
    };
}

export function normalizeConfigCenter(data = {}) {
    return {
        id: data.id || '',
        name: data.name || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        items: Array.isArray(data.items) ? data.items.map(normalizeConfigItem) : [],
        inherit: data.inherit && data.inherit.configId ? {
            configId: data.inherit.configId || '',
            configName: data.inherit.configName || '',
            version: data.inherit.version || '',
        } : null,
        strategies: Array.isArray(data.strategies) ? data.strategies.map(normalizeStrategy) : [],
    };
}

export function configCenterToResource(config, existingResource) {
    const normalized = normalizeConfigCenter(config);
    const resource = existingResource ? JSON.parse(JSON.stringify(existingResource)) : {
        apiVersion: 'v1',
        kind: CONFIG_CENTER_KIND,
        metadata: {
            name: normalized.id || createConfigCenterResourceName(normalized.name),
            labels: {},
            annotations: {},
        },
        data: {},
    };

    const now = normalized.updatedAt || new Date().toISOString();
    const createdAt = normalized.createdAt || now;

    resource.metadata = resource.metadata || {};
    resource.metadata.name = normalized.id || resource.metadata.name || createConfigCenterResourceName(normalized.name);
    resource.metadata.labels = {
        ...(resource.metadata.labels || {}),
        [CONFIG_CENTER_LABEL_KEY]: 'true',
    };
    resource.metadata.annotations = {
        ...(resource.metadata.annotations || {}),
        title: normalized.name,
        'w7.cc/config-center-name': normalized.name,
        'w7.cc/config-center-updated-at': now,
    };

    const payload = {
        ...normalized,
        id: resource.metadata.name,
        createdAt,
        updatedAt: now,
        items: normalized.items.map(normalizeConfigItem),
        strategies: normalized.strategies.map(strategy => ({
            ...normalizeStrategy(strategy),
            generatedConfigMapName: strategy.generatedConfigMapName || createStrategyConfigMapName(resource.metadata.name, strategy.id),
        })),
    };

    resource.data = {
        ...(resource.data || {}),
        [CONFIG_CENTER_DATA_KEY]: JSON.stringify(payload),
    };

    return resource;
}

export function resourceToConfigCenter(resource = {}) {
    const payload = safeJsonParse(resource?.data?.[CONFIG_CENTER_DATA_KEY], {});
    return normalizeConfigCenter({
        ...payload,
        id: payload.id || resource?.metadata?.name || '',
        name: payload.name || resource?.metadata?.annotations?.['w7.cc/config-center-name'] || resource?.metadata?.annotations?.title || resource?.metadata?.name || '',
        createdAt: payload.createdAt || resource?.metadata?.creationTimestamp || '',
        updatedAt: payload.updatedAt || resource?.metadata?.annotations?.['w7.cc/config-center-updated-at'] || resource?.metadata?.creationTimestamp || '',
    });
}

export async function listConfigCenters(namespace) {
    const response = await k8sproxy.get(`/api/v1/namespaces/${namespace}/configmaps?labelSelector=${CONFIG_CENTER_LABEL_KEY}=true`, { loading: true });
    return (response?.data?.items || []).map(resourceToConfigCenter);
}

export async function getConfigCenter(namespace, id) {
    const response = await k8sproxy.get(`/api/v1/namespaces/${namespace}/configmaps/${id}`, { loading: true });
    return {
        resource: response?.data || {},
        config: resourceToConfigCenter(response?.data || {}),
    };
}

export async function createConfigCenter(namespace, config) {
    const resource = configCenterToResource(config);
    await k8sproxy.post(`/api/v1/namespaces/${namespace}/configmaps`, resource, { loading: true });
    return resourceToConfigCenter(resource);
}

export async function updateConfigCenter(namespace, config, existingResource) {
    const resource = configCenterToResource(config, existingResource);
    await k8sproxy.put(`/api/v1/namespaces/${namespace}/configmaps/${resource.metadata.name}`, resource, { loading: true });
    return resourceToConfigCenter(resource);
}

export async function deleteConfigCenter(namespace, id) {
    return k8sproxy.delete(`/api/v1/namespaces/${namespace}/configmaps/${id}`, { loading: true });
}

export function buildConfigCenterMap(list = []) {
    return list.reduce((result, item) => {
        result[item.id] = normalizeConfigCenter(item);
        return result;
    }, {});
}

export function getAvailableVersions(config, configMap = {}) {
    const versions = new Set();
    (config?.items || []).forEach(item => {
        if (item.version) {
            versions.add(item.version);
        }
    });
    if (config?.inherit?.version) {
        versions.add(config.inherit.version);
    }
    const inheritConfig = config?.inherit?.configId ? configMap[config.inherit.configId] : null;
    if (inheritConfig) {
        getAvailableVersions(inheritConfig, configMap).forEach(version => versions.add(version));
    }
    return Array.from(versions);
}

function mergeItems(baseItems = [], overrideItems = []) {
    const result = new Map();
    baseItems.forEach(item => {
        if (!item?.name) {
            return;
        }
        result.set(item.name, { ...item });
    });
    overrideItems.forEach(item => {
        if (!item?.name) {
            return;
        }
        result.set(item.name, { ...item });
    });
    return Array.from(result.values());
}

export function resolveConfigVersionItems(config, configMap = {}, version = '', stack = new Set()) {
    if (!config?.id || stack.has(config.id)) {
        return [];
    }
    const nextStack = new Set([...stack, config.id]);
    let inheritedItems = [];
    if (config?.inherit?.configId && configMap[config.inherit.configId]) {
        inheritedItems = resolveConfigVersionItems(configMap[config.inherit.configId], configMap, config.inherit.version || '', nextStack)
            .map(item => ({
                ...item,
                source: 'inherit',
                sourceConfigId: config.inherit.configId,
                sourceConfigName: config.inherit.configName || configMap[config.inherit.configId]?.name || '',
            }));
    }
    const ownItems = (config?.items || [])
        .filter(item => item.name)
        .filter(item => !item.version || item.version === version)
        .map(item => ({
            ...item,
            source: 'self',
            sourceConfigId: config.id,
            sourceConfigName: config.name,
        }));
    return mergeItems(inheritedItems, ownItems);
}

export function buildPreviewItems(config, configMap = {}) {
    const inheritedItems = config?.inherit?.configId && configMap[config.inherit.configId]
        ? resolveConfigVersionItems(configMap[config.inherit.configId], configMap, config.inherit.version || '').map(item => ({
            ...item,
            source: 'inherit',
            sourceConfigId: config.inherit.configId,
            sourceConfigName: config.inherit.configName || configMap[config.inherit.configId]?.name || '',
        }))
        : [];
    const ownItems = (config?.items || [])
        .filter(item => item.name)
        .map(item => ({
            ...item,
            source: 'self',
            sourceConfigId: config.id,
            sourceConfigName: config.name,
        }));
    return [...inheritedItems, ...ownItems];
}

export function isRecentUpdated(updatedAt, createdAt) {
    if (!updatedAt) {
        return false;
    }
    if (createdAt && updatedAt === createdAt) {
        return false;
    }
    return dayjs().diff(dayjs(updatedAt), 'hour') < 24;
}

export function collectDescendantIds(configId, configMap = {}) {
    const result = new Set();
    const visit = (id) => {
        Object.values(configMap).forEach(config => {
            if (config?.inherit?.configId === id && !result.has(config.id)) {
                result.add(config.id);
                visit(config.id);
            }
        });
    };
    visit(configId);
    return Array.from(result);
}

export function validateNoCircularInherit(config, configMap = {}) {
    let currentId = config?.inherit?.configId;
    const seen = new Set([config?.id].filter(Boolean));
    while (currentId) {
        if (seen.has(currentId)) {
            return false;
        }
        seen.add(currentId);
        currentId = configMap[currentId]?.inherit?.configId;
    }
    return true;
}

export async function touchDescendants(namespace, configId, configMap = {}, updatedAt = new Date().toISOString()) {
    const descendants = collectDescendantIds(configId, configMap);
    for (const descendantId of descendants) {
        const current = configMap[descendantId];
        const { resource } = await getConfigCenter(namespace, descendantId);
        const next = {
            ...current,
            updatedAt,
        };
        configMap[descendantId] = await updateConfigCenter(namespace, next, resource);
    }
    return descendants;
}

export function fillStrategyGeneratedNames(config) {
    const next = normalizeConfigCenter(config);
    next.strategies = next.strategies.map(strategy => ({
        ...strategy,
        generatedConfigMapName: strategy.generatedConfigMapName || createStrategyConfigMapName(next.id, strategy.id),
    }));
    return next;
}

async function upsertDeployConfigMap(namespace, strategy, items = {}) {
    const resource = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name: strategy.generatedConfigMapName,
            labels: {
                'w7.cc/config-center-deploy': 'true',
                'w7.cc/config-center-strategy-id': strategy.id,
            },
        },
        data: items,
    };
    try {
        await k8sproxy.get(`/api/v1/namespaces/${namespace}/configmaps/${strategy.generatedConfigMapName}`, { noAlert: true });
        await k8sproxy.put(`/api/v1/namespaces/${namespace}/configmaps/${strategy.generatedConfigMapName}`, resource, { loading: true });
    } catch (error) {
        await k8sproxy.post(`/api/v1/namespaces/${namespace}/configmaps`, resource, { loading: true });
    }
}

export async function applyDeploymentStrategy(namespace, config, configMap = {}, strategy, version = '') {
    const resolvedItems = resolveConfigVersionItems(config, configMap, version);
    const data = resolvedItems.reduce((result, item) => {
        result[item.name] = item.value ?? '';
        return result;
    }, {});

    await upsertDeployConfigMap(namespace, strategy, data);

    const response = await k8sproxy.get(`/apis/apps/v1/namespaces/${namespace}/${strategy.targetKind}/${strategy.targetApp}`, { loading: true });
    const workload = response?.data || {};
    const containers = JSON.parse(JSON.stringify(workload?.spec?.template?.spec?.containers || []));
    const volumes = JSON.parse(JSON.stringify(workload?.spec?.template?.spec?.volumes || []));
    const container = containers.find(item => item.name === strategy.targetContainer);

    if (!container) {
        throw new Error('未找到目标容器');
    }

    const configMapName = strategy.generatedConfigMapName;
    const volumeName = createVolumeName(strategy.id);

    container.envFrom = (container.envFrom || []).filter(item => item?.configMapRef?.name !== configMapName);
    container.volumeMounts = (container.volumeMounts || []).filter(item => item?.name !== volumeName);

    const volumeIndex = volumes.findIndex(item => item.name === volumeName);
    if (volumeIndex >= 0) {
        volumes.splice(volumeIndex, 1);
    }

    if (strategy.type === 'env') {
        container.envFrom.unshift({
            configMapRef: {
                name: configMapName,
            },
        });
    } else {
        volumes.push({
            name: volumeName,
            configMap: {
                name: configMapName,
            },
        });
        container.volumeMounts.push({
            name: volumeName,
            mountPath: strategy.mountPath,
            readOnly: true,
        });
    }

    await k8sproxy.patch(`/apis/apps/v1/namespaces/${namespace}/${strategy.targetKind}/${strategy.targetApp}`, {
        spec: {
            template: {
                metadata: {
                    annotations: {
                        'w7.cc/config-center-restarted-at': String(Date.now()),
                    },
                },
                spec: {
                    containers,
                    volumes,
                },
            },
        },
    }, {
        headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
        },
        loading: true,
    });

    return {
        itemCount: resolvedItems.length,
    };
}

export async function runAutoDeployForConfigChain(namespace, rootId, configMap = {}, updatedAt = new Date().toISOString()) {
    const ids = [rootId, ...collectDescendantIds(rootId, configMap)];
    for (const id of ids) {
        const cfg = configMap[id];
        if (!cfg) {
            continue;
        }
        let changed = false;
        const nextStrategies = (cfg.strategies || []).map(strategy => ({ ...strategy }));
        for (let i = 0; i < nextStrategies.length; i += 1) {
            const strategy = nextStrategies[i];
            if (!strategy.autoDeploy) {
                continue;
            }
            if (strategy.lastAppliedAt && new Date(strategy.lastAppliedAt).getTime() >= new Date(updatedAt).getTime()) {
                continue;
            }
            await applyDeploymentStrategy(namespace, cfg, configMap, strategy, strategy.lastSelectedVersion || '');
            strategy.lastAppliedVersion = strategy.lastSelectedVersion || '';
            strategy.lastAppliedAt = new Date().toISOString();
            changed = true;
        }
        if (changed) {
            const { resource } = await getConfigCenter(namespace, cfg.id);
            configMap[id] = await updateConfigCenter(namespace, {
                ...cfg,
                strategies: nextStrategies,
            }, resource);
        }
    }
    return configMap;
}
