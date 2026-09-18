import { getToken } from './auth';

// Browsers cannot set Authorization on a WebSocket handshake. Carry the panel
// session in the offered protocols, never in the URL or the host cookie.
export async function createPanelWebSocket(url: string) {
    const ckm = (window as any).$wujie?.props;
    const isCkmSession = typeof ckm?.getCkmPanelToken === 'function';
    if (isCkmSession && ckm.getCkmPanelExpiresAt() <= Date.now() / 1000 + 30) {
        await ckm.refreshCkmPanelSession();
    }
    const target = new URL(url, window.location.href);
    target.searchParams.delete('api-token');
    target.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = getToken();
    if (!token) return new WebSocket(target.toString());

    // A fixed application protocol lets the Server complete subprotocol
    // negotiation; the bearer protocol is consumed only by panel auth.
    const protocols = ['w7panel-terminal', 'w7panel-bearer.' + token];
    if (isCkmSession) protocols.unshift('w7panel-ckm');
    return new WebSocket(target.toString(), protocols);
}
