// Browsers cannot set Authorization on a WebSocket handshake. Carry the scoped
// session in the offered protocols, never in the URL or the host cookie.
export async function createPanelWebSocket(url: string) {
    const ckm = (window as any).$wujie?.props;
    if (typeof ckm?.getCkmPanelToken !== 'function') return new WebSocket(url);
    if (ckm.getCkmPanelExpiresAt() <= Date.now() / 1000 + 30) await ckm.refreshCkmPanelSession();
    const target = new URL(url, window.location.href);
    target.searchParams.delete('api-token');
    target.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(target.toString(), ['w7panel-ckm', 'w7panel-bearer.' + ckm.getCkmPanelToken()]);
}
