const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Apply only fields changed in the form; Kubernetes fields the form cannot show stay intact.
export function applyTemplateAppEdit(original, baseline, edited) {
    if (same(baseline, edited)) return copy(original);
    if (Array.isArray(baseline) && Array.isArray(edited)) {
        if (!Array.isArray(original)) return copy(edited);
        const identity = item => {
            if (!object(item)) return null;
            if (typeof item.mountPath === 'string') return 'mount:' + item.mountPath;
            if (item.containerPort !== undefined) return 'port:' + item.containerPort + ':' + (item.protocol || 'TCP');
            if (typeof item.name === 'string') return 'name:' + item.name;
            if (item.secretRef?.name) return 'secret:' + item.secretRef.name + ':' + (item.prefix || '');
            if (item.configMapRef?.name) return 'configmap:' + item.configMapRef.name + ':' + (item.prefix || '');
            return null;
        };
        const keys = baseline.map(identity), nextKeys = edited.map(identity);
        const keyed = [...keys, ...nextKeys].every(key => key !== null)
            && new Set(keys).size === keys.length && new Set(nextKeys).size === nextKeys.length;
        if (keyed) {
            const old = new Map(baseline.map((item, index) => [keys[index], {
                item, original: original.find(source => identity(source) === keys[index]) ?? original[index],
            }]));
            const result = edited.map((item, index) => {
                const previous = baseline[index];
                const source = old.get(nextKeys[index])
                    || (baseline.length === edited.length && previous && !nextKeys.includes(keys[index])
                        ? { item: previous, original: original.find(value => identity(value) === keys[index]) ?? original[index] } : null);
                return source ? applyTemplateAppEdit(source.original, source.item, item) : copy(item);
            });
            // Keep original entries that this form never represented (e.g. pull secrets).
            return result.concat(original.filter(item => !keys.includes(identity(item)) && !nextKeys.includes(identity(item))).map(copy));
        }
        if (baseline.length === edited.length) {
            return edited.map((item, index) => applyTemplateAppEdit(original[index], baseline[index], item));
        }
        return copy(edited);
    }
    if (object(baseline) && object(edited)) {
        const result = object(original) ? copy(original) : {};
        for (const key of Object.keys(baseline)) {
            if (same(baseline[key], edited[key])) continue;
            if (!(key in edited)) delete result[key];
            else result[key] = applyTemplateAppEdit(result[key], baseline[key], edited[key]);
        }
        for (const key of Object.keys(edited)) {
            if (!(key in baseline) && edited[key] !== undefined) result[key] = copy(edited[key]);
        }
        // Kubernetes union fields must be replaced when the user selects a new source/handler.
        const groups = [
            ['value', 'valueFrom'],
            ['fieldRef', 'resourceFieldRef', 'secretKeyRef', 'configMapKeyRef'],
            ['exec', 'httpGet', 'tcpSocket', 'grpc', 'sleep'],
            ['secretRef', 'configMapRef'],
        ];
        if ('name' in edited && ['csi', 'projected', 'emptyDir', 'hostPath', 'persistentVolumeClaim', 'secret', 'configMap', 'nfs'].some(key => key in result)) {
            groups.push(['csi', 'projected', 'emptyDir', 'hostPath', 'persistentVolumeClaim', 'secret', 'configMap', 'nfs',
                'downwardAPI', 'ephemeral', 'iscsi', 'fc', 'local', 'awsElasticBlockStore', 'azureDisk', 'azureFile',
                'cephfs', 'cinder', 'flexVolume', 'flocker', 'gcePersistentDisk', 'gitRepo', 'glusterfs', 'photonPersistentDisk',
                'portworxVolume', 'quobyte', 'rbd', 'scaleIO', 'storageos', 'vsphereVolume']);
        }
        for (const group of groups) {
            const selected = group.find(key => key in edited && !(key in baseline));
            if (selected) for (const key of group) if (key !== selected) delete result[key];
        }
        return result;
    }
    return copy(edited);
}
