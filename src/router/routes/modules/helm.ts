import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/helm',
        name: 'helm',
        component: DEFAULT_LAYOUT,
        meta: {
            locale: 'helm',
            requiresAuth: true,
            icon: 'icon-storage',
            hideInMenu: true,
            order: 3,
        },
        redirect: (route) => {
            return { name:'helm-list', params:route.params};
        },
        children: [
            {
                path:'helm',
                name:'helm-list',
                component: () => import('@/views/helm/helm.vue'),
                meta: {
                    hideInMenu: true,
                    locale: 'helm',
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path:':name',
                name:'helm-detail',
                component: () => import('@/views/helm/helm-detail.vue'),
                meta: {
                    hideInMenu: true,
                    locale:  {key:'name'},
                    requiresAuth: true,
                    roles: ['*'],
                },
                children: [
                    {
                        path: 'micro/:page*',
                        name: 'helm-detail-micro',
                        component: () => import('@/views/app/pages/micro.vue'),
                        meta: {
                            locale: '应用',
                            key: 'helm-detail-micro',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                ],
            },
        ],
    },
];

export default DASHBOARD;
