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
                    permissionItems: [
                        { title: '新建', key: 'gateway-rvproxy-add', route: 'gateway/rvproxy/add' },
                        { title: '编辑', key: 'gateway-rvproxy-edit', route: 'gateway/rvproxy/edit' },
                        { title: '删除', key: 'gateway-rvproxy-delete', route: 'gateway/rvproxy/delete' },
                    ],
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
                    permissionItems: [
                        { title: '新建', key: 'gateway-aiproxy-add', route: 'gateway/aiproxy/add' },
                        { title: '编辑', key: 'gateway-aiproxy-edit', route: 'gateway/aiproxy/edit' },
                        { title: '删除', key: 'gateway-aiproxy-delete', route: 'gateway/aiproxy/delete' },
                    ],
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
                path: 'dns',
                alias: '/cluster/dns',
                name: 'gateway-dns',
                component: () => import('@/views/dns/index.vue'),
                meta: {
                    locale: '私有DNS',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'dns',
                },
            },
            {
                path: 'dns/:domain',
                alias: '/cluster/dns/:domain',
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
            {
                path: 'plugins',
                name: 'gateway-plugins',
                component: () => import('@/views/gateway/plugins/index.vue'),
                meta: {
                    locale: '网关插件',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'gateway-plugins',
                    permissionItems: [
                        { title: '新建', key: 'gateway-plugins-add', route: 'gateway/plugins/add' },
                        { title: '编辑', key: 'gateway-plugins-edit', route: 'gateway/plugins/edit' },
                        { title: '删除', key: 'gateway-plugins-delete', route: 'gateway/plugins/delete' },
                    ],
                },
            },
        ],
    },
];

export default DASHBOARD;
