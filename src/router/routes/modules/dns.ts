import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/dns',
        name: 'dns',
        component: DEFAULT_LAYOUT,
        redirect: '/dns/zones',
        meta: {
            locale: 'DNS解析',
            requiresAuth: true,
            icon: 'icon-link',
            order: 3,
            key: 'dns',
        },
        children: [
            {
                path: 'zones',
                name: 'dns-zones',
                component: () => import('@/views/dns/index.vue'),
                meta: {
                    locale: 'DNS解析',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'dns',
                },
            },
            {
                path: 'zones/:domain',
                name: 'dns-records',
                component: () => import('@/views/dns/detail.vue'),
                meta: {
                    locale: { key: 'domain' },
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'dns',
                },
            },
        ],
    },
];

export default DASHBOARD;
