// import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/zpk',
    name: 'zpk',
    component: () => import('@/views/app/pages/to-zpk.vue'),
    // redirect: '/system/cloud',

    meta: {
        locale: '制品开发',
        requiresAuth: true,
        icon: 'icon-archive',
        order: 3,
        key: 'zpk',
        linkIcon: true,
    },
},
];

export default DASHBOARD;
