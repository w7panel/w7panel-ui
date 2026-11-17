export const SITE_PANEL_VIEWS = ['files', 'terminal', 'logs'] as const;

export function sitePanelUrl(base: string, group: string, namespace: string, view: string, token: string) {
    if (!(SITE_PANEL_VIEWS as readonly string[]).includes(view)) throw new Error('不支持的站点工具');
    if (!group?.trim()) throw new Error('未获取到当前站点');
    const url = new URL(`/dialog/appgroup/${encodeURIComponent(group)}/site-panel/${view}`, base);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('面板地址无效');
    url.searchParams.set('namespace', namespace || 'default');
    // The fragment stays in the frame and is not sent in HTTP requests or referrers.
    if (token) url.hash = new URLSearchParams({ paneltoken: token }).toString();
    return url.href;
}

export function sitePodSelector(application: any) {
    const selector = application?.spec?.selector || {};
    const labels = Object.entries(selector.matchLabels || {}).map(([key, value]) => `${key}=${value}`);
    for (const expression of selector.matchExpressions || []) {
        const { key, operator, values = [] } = expression;
        if (operator === 'In') labels.push(`${key} in (${values.join(',')})`);
        else if (operator === 'NotIn') labels.push(`${key} notin (${values.join(',')})`);
        else if (operator === 'Exists') labels.push(key);
        else if (operator === 'DoesNotExist') labels.push(`!${key}`);
        else throw new Error('应用 Pod 选择器格式不正确');
    }
    if (!labels.length) throw new Error('未找到应用 Pod 选择器');
    return labels.join(',');
}

export function siteTerminalContainers(application: any, pod: any): string[] {
    // Admission can add runtime helpers to Pods; terminal choices follow the workload's declared containers.
    const podContainers = new Set((pod?.spec?.containers || []).map((item: any) => item.name));
    const running = new Set((pod?.status?.containerStatuses || [])
        .filter((status: any) => status.state?.running).map((status: any) => status.name));
    return (application?.spec?.template?.spec?.containers || []).map((item: any) => item.name)
        .filter((name: string) => podContainers.has(name) && running.has(name));
}

export function sitePanelPods(items: any[], view: string) {
    return items.filter(pod => pod.metadata?.name
        && (view !== 'terminal' || (!pod.metadata.deletionTimestamp && pod.status?.phase === 'Running'
            && pod.status?.containerStatuses?.some((status: any) => status.state?.running))))
        .sort((a, b) => Number(b.status?.phase === 'Running') - Number(a.status?.phase === 'Running')
            || String(b.metadata.creationTimestamp || '').localeCompare(String(a.metadata.creationTimestamp || '')));
}
