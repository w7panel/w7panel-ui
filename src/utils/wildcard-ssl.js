import { panelApi } from '@/utils/api';
import { Message } from '@arco-design/web-vue';

export function isWildcardHost(host) {
    return typeof host === 'string' && host.startsWith('*.');
}

export function isAutoSslIssuer(issuer) {
    return issuer === 'w7-letsencrypt-prod' || (typeof issuer === 'string' && issuer.startsWith('w7-dns-'));
}

export async function applyWildcardSsl(ingress, profileId) {
    const host = ingress?.spec?.rules?.[0]?.host;
    const annotations = ingress?.metadata?.annotations;
    if (!annotations) return ingress;
    if (!isWildcardHost(host) || !annotations['cert-manager.io/cluster-issuer']) {
        delete annotations['w7.cc/dns-profile'];
        delete annotations['w7.cc/dns-grant'];
        return ingress;
    }
    if (!profileId) throw new Error('请先验证泛域名 DNS 配置');
    const response = await panelApi.post(`/dns-profiles/${profileId}/grant`, {
        namespace: ingress.metadata.namespace,
        name: ingress.metadata.name,
        host,
    });
    Object.assign(annotations, response?.data || {});
    if (!annotations['w7.cc/dns-grant']) throw new Error('DNS 签发授权失败');
    return ingress;
}

export async function ensureWildcardResolution(host, namespace, profileId, autoResolve) {
    if (!autoResolve || !isWildcardHost(host)) return true;
    try {
        await panelApi.post(`/dns-profiles/${profileId}/records/ensure`, { namespace, host });
        return true;
    } catch (error) {
        Message.error(`域名已保存，自动解析失败：${error.message || '请稍后重试'}`);
        return false;
    }
}
