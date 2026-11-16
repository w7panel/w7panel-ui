export function domainHost(value) {
    return String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function createDomainGroups(ingress = [], values = {}, saved = [], _whiteList = [], app = {}) {
    const domainParams = (app.startParams || []).filter(param => param.mark === 'domain' || /^%DOMAIN_(?:SSL_)?URL%$/.test(param.values_text || ''));
    const definitions = [
        ...((app.requireDomain || ingress.length || domainParams.length) ? [{ param: 'default', valueParam: domainParams.find(param => param.name === 'DOMAIN_URL')?.name || 'DOMAIN_URL', title: '默认域名', required: !!app.requireDomainForce }] : []),
        ...domainParams.filter(param => param.name && param.name !== 'DOMAIN_URL').map(param => ({ param: param.name, valueParam: param.name, title: param.title || param.name, required: !!param.required })),
        ...ingress.slice(1).filter(rule => rule.name && !domainParams.some(param => param.name === rule.name)).map(rule => ({ param: rule.name, valueParam: rule.name, title: rule.name, required: false })),
    ];
    return definitions.map((definition, index) => {
        const prior = saved.find(group => group.param === definition.param) || {};
        const value = values[definition.valueParam] ?? prior.host ?? '';
        const forceSSL = !!app.requireDomainHttps;
        return {
            ...definition,
            host: domainHost(value),
            autoSSL: forceSSL || prior.autoSSL || /^https:\/\//i.test(value),
            forceSSL,
            dnsProfileId: prior.dnsProfileId || '',
            autoResolve: !!prior.autoResolve,
            inheritDefault: !!app.inheritDefault && index === 0 && prior.inheritDefault !== false,
            hostLocked: !!prior.hostLocked,
            allowedZones: _whiteList.map(item => String(item.domain || '').toLowerCase()).filter(Boolean),
        };
    });
}

export function syncDefaultDomainGroups(forms = []) {
    const source = forms[0]?.domainGroups?.find(group => group.param === 'default');
    if (!source) return;
    for (const form of forms.slice(1)) {
        for (const group of form.domainGroups || []) {
            if (group.param !== 'default' || !group.inheritDefault) continue;
            Object.assign(group, { host: source.host, autoSSL: group.forceSSL || source.autoSSL, dnsProfileId: source.dnsProfileId, autoResolve: source.autoResolve });
        }
    }
}

export function domainGroupError(group) {
    if (!group.host) return group.required ? '请填写域名' : '';
    if (!/^(?:\*\.)?[a-z0-9.-]+$/i.test(group.host) || group.host.includes('..') || group.host.startsWith('.') || group.host.endsWith('.')) return '域名格式不正确';
    if (group.allowedZones?.length && !group.allowedZones.some(zone => group.host.toLowerCase().endsWith(`.${zone}`) || group.host.toLowerCase() === zone)) return '域名不在允许的域名列表中';
    if (group.forceSSL && !group.autoSSL) return '此域名必须启用自动 SSL';
    if (group.autoSSL && group.host.startsWith('*.') && !group.dnsProfileId) return '请先配置泛域名 DNS 验证';
    return '';
}

export function domainGroupEnvs(groups = []) {
    return groups.filter(group => group.host).map(group => ({ name: group.valueParam || group.param, value: `${group.autoSSL || group.forceSSL ? 'https' : 'http'}://${group.host}` }));
}

export function domainBindings(groups = []) {
    return groups.filter(group => group.host).map(group => ({ param: group.param, host: group.host, autoSSL: !!(group.autoSSL || group.forceSSL), dnsProfileId: group.dnsProfileId || '' }));
}
