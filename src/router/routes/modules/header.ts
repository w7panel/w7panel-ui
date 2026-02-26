import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/ui',
    name: 'ui',
    component: DEFAULT_LAYOUT,
    meta: {
        hideInMenu: true,
        requiresAuth: true,
    },
    children: [
        {
            path: 'webshell',
            name: 'ui-webshell',
            component: () => import('@/views/header/web-shell.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'pod-webshell',
            name: 'pod-webshell',
            component: () => import('@/views/header/pod-webshell.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'yaml-k8s',
            name: 'ui-yaml-k8s',
            component: () => import('@/views/header/yaml-k8s.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'yaml-create',
            name: 'ui-yaml-create',
            component: () => import('@/views/header/yaml-create.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
    ],
},
];

export default DASHBOARD;
