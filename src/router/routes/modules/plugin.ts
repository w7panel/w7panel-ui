import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/micro-plugin',
        name: 'micro-plugin',
        component: DEFAULT_LAYOUT,
        meta: {
            locale: 'micro-plugin',
            requiresAuth: true,
            icon: 'icon-storage',
            hideInMenu: true,
            order: 3,
        },
        redirect: '/micro-plugin/plugin',
        children: [
            {
                path:'plugin',
                name:'micro-plugin-page',
                component: () => import('@/views/micro-plugin/plugin.vue'),
                meta: {
                    hideInMenu: true,
                    locale: '列表',
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path:'preview',
                name:'micro-plugin-preview',
                component: () => import('@/views/micro-plugin/plugin-preview.vue'),
                meta: {
                    hideInMenu: true,
                    locale: '预览',
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
        ],
    },
];

export default DASHBOARD;
