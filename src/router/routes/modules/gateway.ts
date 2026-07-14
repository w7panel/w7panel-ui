import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/gateway',
        name: 'gateway',
        component: DEFAULT_LAYOUT,
        redirect: '/gateway/rvproxy',
        meta: {
            locale: '网关管理',
            requiresAuth: true,
            icon: 'icon-swap',
            order: 2,
            menuGroup: 'cloudserver',
            key: 'gateway',
        },
        children: [
            {
                path: 'rvproxy',
                name: 'gateway-rvproxy',
                component: () => import('@/views/app/rvproxy/rvproxy.vue'),
                meta: {
                    locale: '反向代理',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-rvproxy',
                },
            },
            {
                path: 'rvproxy-domain',
                name: 'gateway-rvproxy-domain',
                component: () => import('@/views/app/rvproxy/domain.vue'),
                meta: {
                    hideInMenu: true,
                    locale: '域名管理',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-rvproxy',
                },
            },
            {
                path: 'aiproxy',
                name: 'gateway-aiproxy',
                component: () => import('@/views/app/aiproxy/aiproxy.vue'),
                meta: {
                    locale: 'AI代理',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-aiproxy',
                },
            },
            {
                path: 'aiproxy-domain',
                name: 'gateway-aiproxy-domain',
                component: () => import('@/views/app/aiproxy/domain.vue'),
                meta: {
                    hideInMenu: true,
                    locale: 'AI代理域名',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-aiproxy',
                },
            },
            {
                path: 'plugins',
                name: 'gateway-plugins',
                component: () => import('@/views/gateway/plugins/index.vue'),
                meta: {
                    locale: '网关插件',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-plugins',
                },
            },
        ],
    },
];

export default DASHBOARD;
