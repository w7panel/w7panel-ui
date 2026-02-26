import { AppRouteRecordRaw } from '../types';
// import { DEFAULT_LAYOUT } from '../base';
const PageLayout = () => import('@/layout/page-layout.vue');

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/config',
        name: 'config',
        component: PageLayout,
        meta: {
            locale: '配置管理',
            hideInMenu: true,
            requiresAuth: true,
            icon: 'icon-tool',
            order: 3,
        },
        redirect: (route) => {
            return { name:'config-configmap', params:route.params};
        },
        children: [
            {
                path:'config',
                name:'config-configmap',
                component: () => import('@/views/config/configmap/index.vue'),
                meta: {
                    locale: 'configmap',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path:'config-detail/:id',
                name:'config-configmap-detail',
                component: () => import('@/views/config/configmap/detail.vue'),
                meta: {
                    locale: '详情',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path:'sercet',
                name:'config-sercet',
                component: () => import('@/views/config/sercet/index.vue'),
                redirect: (route) => {
                    return { name:'config-sercet-all', params:route.params};
                },
                meta: {
                    locale: 'sercet',
                    hideInMenu: true,
                    hideChildrenInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
                children: [
                    {
                        path:'all',
                        name:'config-sercet-all',
                        component: () => import('@/views/config/sercet/all.vue'),
                        meta: {
                            locale:'全部',
                            routekey:'config-sercet-all',
                            requiresAuth: true,
                            hideInMenu: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path:'image',
                        name:'config-sercet-image',
                        component: () => import('@/views/config/sercet/image.vue'),
                        meta: {
                            locale:'镜像仓库',
                            routekey:'config-sercet-image',
                            requiresAuth: true,
                            hideInMenu: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path:'crt',
                        name:'config-sercet-crt',
                        component: () => import('@/views/config/sercet/crt.vue'),
                        meta: {
                            locale:'证书管理',
                            routekey:'config-sercet-crt',
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
