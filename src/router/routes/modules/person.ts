import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/person',
    name: 'person',
    component: DEFAULT_LAYOUT,
    redirect: '/person/account',
    meta: {
        locale: '个人中心',
        requiresAuth: true,
        icon: 'icon-cloud',
        menuGroup: 'person',
    },
    children: [
        {
            path: 'account',
            name: 'person-account',
            component: () => import('@/views/system/person-center/account.vue'),
            meta: {
                locale: '账号管理',
                hideInMenu: false,
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'order-center',
            name: 'system-order-center',
            component: () => import('@/views/system/order-center/list.vue'),
            meta: {
                locale: '订单中心',
                hideInMenu: false,
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'order-detail/:id',
            name: 'system-order-detail',
            component: () => import('@/views/system/order-center/detail.vue'),
            meta: {
                locale: '订单详情',
                hideInMenu: true,
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'cost-center',
            name: 'system-cost-center',
            component: () => import('@/views/system/cost-center/list.vue'),
            meta: {
                locale: '费用中心',
                hideInMenu: false,
                requiresAuth: true,
                roles: ['*'],
            },
        },
        {
            path: 'cost-detail/:id',
            name: 'system-cost-detail',
            component: () => import('@/views/system/cost-center/detail.vue'),
            meta: {
                locale: '订单详情',
                hideInMenu: true,
                requiresAuth: true,
                roles: ['*'],
            },
        },
    ],
},
];

export default DASHBOARD;
