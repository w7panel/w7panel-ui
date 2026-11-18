import { AppRouteRecordRaw } from '../types';

const routes: AppRouteRecordRaw[] = [{
    path: '/metrics',
    name: 'metrics-management',
    component: () => import('@/views/metrics/entry.vue'),
    meta: {
        locale: '监控管理',
        requiresAuth: true,
        icon: 'icon-dashboard',
        order: 3,
        menuGroup: 'cloudserver',
        key: 'metrics',
        linkIcon: true,
    },
}];

export default routes;
