// import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/sitemanage',
    name: 'sitemanage',
    component: () => import('@/views/app/pages/to-sitemanage.vue'),
    // redirect: '/system/cloud',

    meta: {
        locale: '站点管理',
        requiresAuth: true,
        icon: 'icon-archive',
        order: 3,
        menuGroup: 'cloudserver',
        key: 'sitemanage',
        linkIcon: true,
    },
},
];

export default DASHBOARD;
