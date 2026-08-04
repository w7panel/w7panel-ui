import axios from 'axios';

export const GATEWAY_PLUGIN_MARKET_URL = 'https://zm.w7.com/zpk-market/formula/list';
export const GATEWAY_PLUGIN_MARKET_TAG = '网关插件';

// 制品列表是公开接口，使用独立实例避免全局拦截器附加面板 Bearer Token。
const gatewayPluginMarketClient = axios.create({ timeout: 10000 });

export type GatewayPluginMarketItem = {
    name: string;
    description: string;
    identify: string;
    latest_version: string;
    icon: string;
    formula_url: string;
    application_type: string;
    plugin_type: string;
};

export type GatewayPluginCategory<T> = {
    key: string;
    title: string;
    items: T[];
};

const CATEGORY_ORDER = ['auth', 'security', 'traffic', 'transform', 'o11y', 'ai', 'other'];

const CATEGORY_TITLES: Record<string, string> = {
    auth: '认证鉴权',
    security: '安全防护',
    traffic: '流量管控',
    transform: '请求响应转换',
    o11y: '可观测性',
    ai: 'AI',
    other: '其他',
};

export function normalizeGatewayPluginIdentify(value: unknown) {
    return String(value || '').trim().toLowerCase().replaceAll('_', '-');
}

export function getGatewayPluginCategory(value: unknown) {
    const category = String(value || '').trim().toLowerCase();
    return category || 'other';
}

export function getGatewayPluginCategoryTitle(category: string) {
    return CATEGORY_TITLES[category] || category;
}

export function groupGatewayPlugins<T extends { pluginType?: string }>(items: T[]) {
    const groups = new Map<string, T[]>();
    items.forEach(item => {
        const category = getGatewayPluginCategory(item.pluginType);
        groups.set(category, [...(groups.get(category) || []), item]);
    });

    return [...groups.entries()]
        .sort(([left], [right]) => {
            const leftIndex = CATEGORY_ORDER.indexOf(left);
            const rightIndex = CATEGORY_ORDER.indexOf(right);
            const normalizedLeft = leftIndex < 0 ? CATEGORY_ORDER.length : leftIndex;
            const normalizedRight = rightIndex < 0 ? CATEGORY_ORDER.length : rightIndex;
            return normalizedLeft - normalizedRight || left.localeCompare(right);
        })
        .map(([key, groupItems]): GatewayPluginCategory<T> => ({
            key,
            title: getGatewayPluginCategoryTitle(key),
            items: groupItems,
        }));
}

export async function loadGatewayPluginMarket() {
    const response = await gatewayPluginMarketClient.post(GATEWAY_PLUGIN_MARKET_URL, {
        page: 1,
        limit: 500,
        tag: GATEWAY_PLUGIN_MARKET_TAG,
    });
    const list = response?.data?.data?.list;
    if(!Array.isArray(list)){
        throw new Error('制品市场返回的网关插件列表格式不正确');
    }
    return (list as GatewayPluginMarketItem[]).filter(item => item.application_type === 'gateway-plugin');
}
