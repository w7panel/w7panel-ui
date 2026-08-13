import { getToken } from '@/utils/auth';

const PANEL_TOKEN_HEADER = 'X-W7Panel-Token';

export class MicroappProxyError extends Error {
    status: number;
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'MicroappProxyError';
        this.status = 400;
        this.code = code;
    }
}

export class K8sProxyError extends MicroappProxyError {
    constructor(message: string, code: string) {
        super(message, code);
        this.name = 'K8sProxyError';
    }
}

export class PanelProxyError extends MicroappProxyError {
    constructor(message: string, code: string) {
        super(message, code);
        this.name = 'PanelProxyError';
    }
}

type ProxyErrorFactory = (message: string) => MicroappProxyError;

function invalidBaseUrl(message: string) {
    return new MicroappProxyError(message, 'INVALID_MICROAPP_PROXY_BASE_URL');
}

function invalidRequestUrl(message: string) {
    return new MicroappProxyError(message, 'INVALID_MICROAPP_PROXY_URL');
}

function invalidK8sBaseUrl(message: string) {
    return new K8sProxyError(message, 'INVALID_K8S_PROXY_BASE_URL');
}

function invalidK8sRequestUrl(message: string) {
    return new K8sProxyError(message, 'INVALID_K8S_PROXY_URL');
}

function invalidPanelBaseUrl(message: string) {
    return new PanelProxyError(message, 'INVALID_PANEL_PROXY_BASE_URL');
}

function invalidPanelRequestUrl(message: string) {
    return new PanelProxyError(message, 'INVALID_PANEL_PROXY_URL');
}

function hasPathTraversal(path: string) {
    let value = path.split(/[?#]/, 1)[0].replace(/^\/+/, '');
    for (let index = 0; index < 5; index += 1) {
        const segments = value.replace(/\\/g, '/').split('/');
        if (segments.some((segment) => segment === '..')) {
            return true;
        }
        try {
            const decoded = decodeURIComponent(value);
            if (decoded === value) {
                break;
            }
            value = decoded;
        } catch {
            return true;
        }
    }
    return value.replace(/\\/g, '/').split('/').some((segment) => segment === '..');
}

function resolveBaseUrl(backendUrl: string, invalid: ProxyErrorFactory) {
    const value = String(backendUrl || '').trim();
    if (!value) {
        throw invalid('proxy base URL is required');
    }

    let url: URL;
    try {
        url = new URL(value, window.location.origin);
    } catch {
        throw invalid('proxy base URL is invalid');
    }

    if (
        !['http:', 'https:'].includes(url.protocol)
        || url.origin !== window.location.origin
        || url.username
        || url.password
        || url.search
        || url.hash
    ) {
        throw invalid('proxy base URL must be a same-origin HTTP URL');
    }

    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    return url;
}

function resolveRequestUrl(
    baseUrl: URL,
    path: string,
    proxyName: string,
    invalid: ProxyErrorFactory,
) {
    const value = typeof path === 'string' ? path.trim() : '';
    if (
        !value
        || /^[a-z][a-z\d+.-]*:/i.test(value)
        || /^[/\\]{2}/.test(value)
        || value.includes('\\')
        || hasPathTraversal(value)
    ) {
        throw invalid(`${proxyName} only accepts a relative request path`);
    }

    let url: URL;
    try {
        url = new URL(value.replace(/^\/+/, ''), baseUrl);
    } catch {
        throw invalid(`${proxyName} request path is invalid`);
    }

    if (
        url.origin !== baseUrl.origin
        || !url.pathname.startsWith(baseUrl.pathname)
    ) {
        throw invalid(`${proxyName} request path escapes its proxy prefix`);
    }

    return url.toString();
}

export type MicroappProxy = (
    path: string,
    init?: RequestInit,
) => Promise<Response>;

export type K8sProxy = MicroappProxy;
export type PanelProxy = MicroappProxy;

function createHostProxy(
    baseUrl: string,
    proxyName: string,
    invalidBase: ProxyErrorFactory,
    invalidRequest: ProxyErrorFactory,
): MicroappProxy {
    const hostFetch = window.fetch.bind(window);

    return async (path: string, init: RequestInit = {}) => {
        const resolvedBaseUrl = resolveBaseUrl(baseUrl, invalidBase);
        const requestUrl = resolveRequestUrl(
            resolvedBaseUrl,
            path,
            proxyName,
            invalidRequest,
        );
        const headers = new Headers(init.headers);
        const token = getToken();

        headers.delete(PANEL_TOKEN_HEADER);
        if (token) {
            headers.set(PANEL_TOKEN_HEADER, token);
        }

        return hostFetch(requestUrl, {
            ...init,
            headers,
            credentials: 'same-origin',
            mode: 'same-origin',
            redirect: 'manual',
        });
    };
}

export function createMicroappProxy(backendUrl: string): MicroappProxy {
    return createHostProxy(
        backendUrl,
        'microappProxy',
        invalidBaseUrl,
        invalidRequestUrl,
    );
}

export function createK8sProxy(): K8sProxy {
    return createHostProxy(
        '/k8s-proxy',
        'k8sproxy',
        invalidK8sBaseUrl,
        invalidK8sRequestUrl,
    );
}

export function createPanelProxy(): PanelProxy {
    return createHostProxy(
        '/panel-api/v1',
        'panelProxy',
        invalidPanelBaseUrl,
        invalidPanelRequestUrl,
    );
}
