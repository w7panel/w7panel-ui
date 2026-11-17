export function domainHost(value) {
    return String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
}

export function createDomainGroups(ingress = [], values = {}, saved = [], _whiteList = [], app = {}) {
    values = values ?? {};
    saved = saved ?? [];
    _whiteList = _whiteList ?? [];
    app = app ?? {};
    const named = (Array.isArray(ingress) ? ingress : []).filter(group => group.domainParam && group.routes?.length);
    const legacyParam = (app.startParams || []).find(param => !param.module_name && /^%DOMAIN_(?:SSL_URL|URL|HOST)%$/.test(param.values_text || ''));
    const definitions = named.length ? named.map((group, index) => ({
        param: group.domainParam, valueParam: group.domainParam,
        title: group.name || '域名', required: typeof group.required === 'boolean' ? group.required : index === 0,
        forceSSL: !!group.autoSSL,
    })) : app.requireDomain ? [{
        param: 'default', valueParam: legacyParam?.name || 'DOMAIN_URL', title: '默认域名',
        required: !!app.requireDomainForce, forceSSL: !!app.requireDomainHttps,
    }] : [];
    return definitions.map(definition => {
        const prior = saved.find(group => group.param === definition.param);
        const raw = values[definition.valueParam] ?? (definition.param === 'default' ? values.DOMAIN_SSL_URL : '') ?? '';
        const value = /^%.*%$/.test(String(raw)) ? '' : raw;
        const inheritDefault = definition.param === 'default' && !!app.inheritDefault && !prior && !value;
        let host = domainHost(prior?.host ?? value);
        let whiteDomain = _whiteList.findIndex(item => host === item.domain || host.endsWith('.' + item.domain));
        if (whiteDomain < 0) whiteDomain = 0;
        if (!host && !prior && !inheritDefault && definition.required && _whiteList[whiteDomain]?.prefixRandom) {
            host = Math.random().toString(36).slice(2, 12) + '.' + _whiteList[whiteDomain].domain;
        }
        const savedSSL = values[`domainGroups.${definition.param}.autoSSL`];
        return {
            ...definition,
            host,
            autoSSL: definition.forceSSL || (prior ? !!prior.autoSSL : savedSSL != null ? String(savedSSL) === 'true' : /^https:\/\//i.test(value)),
            dnsProfileId: prior?.dnsProfileId || '',
            autoResolve: !!prior?.autoResolve,
            inheritDefault,
            hostLocked: !!prior?.hostLocked,
            whiteDomain,
            allowedZones: _whiteList.map(item => String(item.domain || '').toLowerCase()).filter(Boolean),
        };
    });
}

export function syncDefaultDomainGroups(forms = []) {
    forms = forms ?? [];
    const source = forms[0]?.domainGroups?.find(group => group.param === 'default') || forms[0]?.domainGroups?.find(group => group.host);
    if (!source) return;
    for (const form of forms.slice(1)) {
        for (const group of form.domainGroups || []) {
            if (group.param !== 'default' || !group.inheritDefault) continue;
            Object.assign(group, { host: source.host, autoSSL: group.forceSSL || source.autoSSL, dnsProfileId: source.dnsProfileId, autoResolve: source.autoResolve });
        }
    }
}

export function domainGroupError(group) {
    if (group == null) return '';
    if (!group.host) return group.required ? '请输入域名' : '';
    const labels = group.host.replace(/^\*\./, '').split('.');
    if (group.host.length > 253 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return '域名格式不正确';
    if (group.allowedZones?.length && !group.allowedZones.some(zone => group.host.toLowerCase().endsWith(`.${zone}`) || group.host.toLowerCase() === zone)) return '域名不在允许的域名列表中';
    if (group.forceSSL && group.autoSSL === false) return '此域名必须启用自动 SSL';
    if ((group.autoSSL || group.forceSSL) && group.host.startsWith('*.') && !group.dnsProfileId) return '请选择 DNS 配置';
    return '';
}

export function domainGroupEnvs(groups = []) {
    groups = groups ?? [];
    return groups.filter(group => group.param !== 'default').map(group => ({ name: group.valueParam || group.param, value: group.host || '' }));
}

export function domainBindings(groups = []) {
    groups = groups ?? [];
    return groups.map(group => ({ param: group.param, host: group.host, autoSSL: !!(group.autoSSL || group.forceSSL), dnsProfileId: group.dnsProfileId || '' }));
}
