import { k8sproxy } from '@/utils/api';

const GROUP = 'w7panel.w7.com';
const VERSION = 'v1alpha1';
const RESOURCE = 'privatedns';
const API_BASE = `/apis/${GROUP}/${VERSION}/${RESOURCE}`;
const KIND = 'PrivateDNS';
const DEFAULT_TTL = 60;
const DEFAULT_MX_PRIORITY = 10;

interface PrivateDNSRecord {
    id?: string;
    name?: string;
    type: string;
    value: string;
    ttl?: number;
    mxPriority?: number;
}

interface PrivateDNSResource {
    apiVersion: string;
    kind: string;
    metadata: Record<string, any>;
    spec: {
        domain: string;
        records?: PrivateDNSRecord[];
    };
    status?: Record<string, any>;
}

export function normalizePrivateDNSDomain(domain: string) {
    return (domain || '').trim().toLowerCase().replace(/\.$/, '');
}

function normalizeRecordName(name?: string) {
    const recordName = (name || '').trim().toLowerCase().replace(/\.$/, '');
    return recordName || '@';
}

function normalizeRecordValue(type: string, value: string) {
    const recordType = (type || '').trim().toUpperCase();
    const recordValue = (value || '').trim();
    if (['CNAME', 'MX', 'NS'].includes(recordType)) {
        return recordValue.toLowerCase().replace(/\.$/, '');
    }
    return recordValue;
}

function hash12(value: string) {
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
        h1 ^= value.charCodeAt(i);
        h1 = Math.imul(h1, 0x01000193);
        h2 ^= value.charCodeAt(value.length - i - 1);
        h2 = Math.imul(h2, 0x01000193);
    }
    return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`.slice(0, 12);
}

function makeRecordId(domain: string, record: PrivateDNSRecord) {
    return hash12([
        normalizePrivateDNSDomain(domain),
        normalizeRecordName(record.name),
        (record.type || '').trim().toUpperCase(),
        normalizeRecordValue(record.type, record.value),
        Number(record.ttl) || DEFAULT_TTL,
        Number(record.mxPriority) || DEFAULT_MX_PRIORITY,
    ].join('|'));
}

function domainToResourceName(domain: string) {
    return normalizePrivateDNSDomain(domain)
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/\./g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function normalizeRecord(domain: string, record: PrivateDNSRecord): PrivateDNSRecord {
    const recordType = (record.type || 'A').trim().toUpperCase();
    const next: PrivateDNSRecord = {
        id: record.id || makeRecordId(domain, record),
        name: normalizeRecordName(record.name),
        type: recordType,
        value: normalizeRecordValue(recordType, record.value),
        ttl: Number(record.ttl) || DEFAULT_TTL,
    };
    if (recordType === 'MX') {
        next.mxPriority = Number(record.mxPriority) || DEFAULT_MX_PRIORITY;
    }
    return next;
}

function getRecordId(domain: string, record: PrivateDNSRecord) {
    return record.id || makeRecordId(domain, record);
}

function getResourceName(name: string) {
    return encodeURIComponent(name);
}

function getResourcePath(name: string) {
    return `${API_BASE}/${getResourceName(name)}`;
}

function latestManagedTime(resource: PrivateDNSResource) {
    const times = (resource.metadata?.managedFields || [])
        .map((item: any) => item?.time)
        .filter(Boolean)
        .sort();
    return times[times.length - 1] || resource.metadata?.creationTimestamp || '';
}

export function listPrivateDNSZones(config?: Record<string, any>) {
    return k8sproxy.get(API_BASE, config).then(res => {
        const items = res?.data?.items || [];
        return items.map((item: PrivateDNSResource) => {
            const records = item.spec?.records || [];
            return {
                name: item.metadata?.name,
                domain: item.spec?.domain || item.metadata?.name,
                recordNum: item.status?.recordCount ?? records.length,
                updateTime: latestManagedTime(item),
                phase: item.status?.phase || '-',
                message: item.status?.message || '',
            };
        }).sort((a: any, b: any) => String(a.domain || '').localeCompare(String(b.domain || '')));
    });
}

export function createPrivateDNSZone(domain: string, config?: Record<string, any>) {
    const normalizedDomain = normalizePrivateDNSDomain(domain);
    return findPrivateDNSResource(normalizedDomain, { ...(config || {}), noAlert: true }).then(resource => {
        if (resource) {
            return Promise.reject(new Error(`privatedns ${normalizedDomain} already exists`));
        }
        return k8sproxy.post(API_BASE, {
            apiVersion: `${GROUP}/${VERSION}`,
            kind: KIND,
            metadata: {
                name: domainToResourceName(normalizedDomain),
            },
            spec: {
                domain: normalizedDomain,
                records: [],
            },
        }, config);
    });
}

function findPrivateDNSResource(domain: string, config?: Record<string, any>) {
    const normalizedDomain = normalizePrivateDNSDomain(domain);
    return k8sproxy.get(API_BASE, config).then(res => {
        const items = res?.data?.items || [];
        return items.find((item: PrivateDNSResource) => normalizePrivateDNSDomain(item.spec?.domain) === normalizedDomain);
    });
}

function getPrivateDNSZoneByName(name: string, config?: Record<string, any>) {
    return k8sproxy.get(getResourcePath(name), config).then(res => res?.data as PrivateDNSResource);
}

export function getPrivateDNSZone(domain: string, config?: Record<string, any>) {
    const normalizedDomain = normalizePrivateDNSDomain(domain);
    const candidates = Array.from(new Set([
        domainToResourceName(normalizedDomain),
        normalizedDomain,
    ].filter(Boolean)));
    const tryGet = (index: number): Promise<PrivateDNSResource> => {
        if (index >= candidates.length) {
            return findPrivateDNSResource(normalizedDomain, config).then(resource => {
                if (resource) { return resource; }
                return Promise.reject(new Error(`privatedns ${normalizedDomain} not found`));
            });
        }
        return getPrivateDNSZoneByName(candidates[index], { ...(config || {}), noAlert: true }).catch(() => tryGet(index + 1));
    };
    return tryGet(0);
}

export function deletePrivateDNSZone(domainOrName: string, config?: Record<string, any>) {
    return getPrivateDNSZone(domainOrName, config).then(resource => (
        k8sproxy.delete(getResourcePath(resource.metadata?.name || domainToResourceName(resource.spec?.domain)), config)
    ));
}

export function listPrivateDNSRecords(domain: string, config?: Record<string, any>) {
    return getPrivateDNSZone(domain, config).then(resource => {
        const normalizedDomain = resource?.spec?.domain || domain;
        return (resource?.spec?.records || []).map(record => normalizeRecord(normalizedDomain, record));
    });
}

export function createPrivateDNSRecord(domain: string, record: PrivateDNSRecord, config?: Record<string, any>) {
    return getPrivateDNSZone(domain, config).then(resource => {
        const normalizedDomain = resource?.spec?.domain || domain;
        resource.spec = resource.spec || { domain: normalizePrivateDNSDomain(normalizedDomain) };
        resource.spec.records = [
            ...(resource.spec.records || []).map(item => normalizeRecord(normalizedDomain, item)),
            normalizeRecord(normalizedDomain, record),
        ];
        return k8sproxy.put(getResourcePath(resource.metadata?.name || domainToResourceName(normalizedDomain)), resource, config);
    });
}

export function updatePrivateDNSRecord(domain: string, id: string, record: PrivateDNSRecord, config?: Record<string, any>) {
    return getPrivateDNSZone(domain, config).then(resource => {
        const normalizedDomain = resource?.spec?.domain || domain;
        const records = resource.spec?.records || [];
        const index = records.findIndex(item => getRecordId(normalizedDomain, item) === id);
        if (index < 0) {
            return Promise.reject(new Error('record not found'));
        }
        records[index] = normalizeRecord(normalizedDomain, { ...record, id });
        resource.spec.records = records.map(item => normalizeRecord(normalizedDomain, item));
        return k8sproxy.put(getResourcePath(resource.metadata?.name || domainToResourceName(normalizedDomain)), resource, config);
    });
}

export function deletePrivateDNSRecord(domain: string, id: string, config?: Record<string, any>) {
    return getPrivateDNSZone(domain, config).then(resource => {
        const normalizedDomain = resource?.spec?.domain || domain;
        resource.spec.records = (resource.spec?.records || [])
            .filter(record => getRecordId(normalizedDomain, record) !== id)
            .map(record => normalizeRecord(normalizedDomain, record));
        return k8sproxy.put(getResourcePath(resource.metadata?.name || domainToResourceName(normalizedDomain)), resource, config);
    });
}
