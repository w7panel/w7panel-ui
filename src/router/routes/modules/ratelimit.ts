import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/rate-limit',
    name: 'rate-limit',
    component: DEFAULT_LAYOUT,
    redirect: '/rate-limit/index',
    meta: {
        locale: '限流控制',
        requiresAuth: true,
        icon: 'icon-thunderbolt',
        order: 3,
        key: 'rate-limit',
    },
    children: [
        {
            path: 'index',
            name: 'rate-limit-index',
            component: () => import('@/views/app/plugin/cluster-key-rate-limit.vue'),
            meta: {
                locale: '限流控制',
                requiresAuth: true,
                hideInMenu: false,
                roles: ['*'],
                key: 'rate-limit-index',
            },
        }
    ]
}
];
export default DASHBOARD;
