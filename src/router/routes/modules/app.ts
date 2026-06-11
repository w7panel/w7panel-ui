import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/app',
        name: 'app',
        component: DEFAULT_LAYOUT,
        redirect: "/app/apps",
        meta: {
            locale: '应用管理',
            requiresAuth: true,
            icon: 'icon-apps',
            order: 1,
            menuGroup: 'cloudserver',
            key: 'app',
        },
        children: [
            {
                path: 'apps',
                name: 'app-apps',
                component: () => import('@/views/app/apps/index.vue'),
                meta: {
                    locale: '应用列表',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
            },
            {
                path: 'config-center',
                name: 'app-config-center',
                component: () => import('@/views/app/config-center/index.vue'),
                meta: {
                    locale: '配置中心',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-config-center',
                },
            },
            {
                path: 'config-center/:id',
                name: 'app-config-center-detail',
                component: () => import('@/views/app/config-center/detail.vue'),
                meta: {
                    locale: { key: 'id' },
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-config-center',
                },
            },
            {
                path: 'form',
                name: 'app-form',
                component: () => import('@/views/app/pages/form.vue'),
                meta: {
                    locale: '添加应用',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
            },
            {
                path: 'store',
                name: 'app-store',
                component: () => import('@/views/app/store/store.vue'),
                meta: {
                    locale: '应用商店',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            // {
            //     path: 'store/zpk',
            //     name: 'app-store-zpk',
            //     component: () => import('@/views/app/store/store-zpk.vue'),
            //     meta: {
            //         locale: '制品商店',
            //         hideInMenu: true,
            //         requiresAuth: true,
            //         roles: ['*'],
            //     },
            // },
            {
                path: 'store/:name/store',
                name: 'app-store-custom',
                component: () => import('@/views/app/store/store-custom.vue'),
                meta: {
                    locale: '制品商店',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path: 'store-detail/:identifie',
                name: 'app-store-detail',
                component: () => import('@/views/app/store/detail.vue'),
                meta: {
                    locale: '应用简介',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path: 'store-install',
                name: 'app-store-install',
                component: () => import('@/views/app/store/install.vue'),
                meta: {
                    locale: '安装应用',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path: 'cloudstore',
                name: 'app-cloudstore',
                component: () => import('@/views/app/cloudstore/store.vue'),
                meta: {
                    locale: '云端应用商店',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            {
                path: 'appgroup/:group/micro',
                name: 'group-micro',
                component: ()=>import('@/views/app/apps/detail.vue'),
                meta: {
                    locale: {key:'id'},
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
            },
            {
                path: 'appgroup/:group/micro2',
                name: 'group-micro2',
                component: ()=>import('@/views/app/apps/detail.vue'),
                meta: {
                    locale: {key:'id'},
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
            },
            {
                path: 'appgroup/:group/helm',
                name: 'group-helm',
                component: ()=>import('@/views/app/apps/detail.vue'),
                redirect: (route)=>{
                    return {name:'group-helm-detail', params:route.params}
                },
                meta: {
                    locale: '资源概览',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
                children: [
                    {
                        path: 'detail',
                        name: 'group-helm-detail',
                        component: () => import('@/views/app/pages/helm-detail.vue'),
                        meta: {
                            locale: '详情',
                            routekey: 'group-helm-detail',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'domain',
                        name: 'group-helm-domain',
                        component: () => import('@/views/app/pages/domain.vue'),
                        meta: {
                            locale: '域名',
                            routekey: 'group-helm-domain',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                ]
            },
            {
                path: 'appgroup/:group/:kind?/:id?',
                name: 'app-detail',
                component: () => import('@/views/app/apps/detail.vue'),
                redirect: (route)=>{
                    return {name:'app-detail-detail', params:route.params}
                },
                meta: {
                    locale: {key:'id'},
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-apps',
                },
                children: [
                    {
                        path: 'micro/:page*',
                        name: 'app-detail-micro',
                        component: () => import('@/views/app/pages/micro.vue'),
                        meta: {
                            locale: '应用',
                            routekey: 'app-detail-micro',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'moniter',
                        name: 'app-detail-moniter',
                        component: () => import('@/views/app/pages/moniter.vue'),
                        meta: {
                            locale: '监控',
                            routekey: 'app-detail-moniter',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'microtest/:page*',
                        name: 'app-detail-microtest',
                        component: () => import('@/views/app/pages/micro-test.vue'),
                        meta: {
                            locale: '应用',
                            routekey: 'app-detail-micro',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'detail',
                        name: 'app-detail-detail',
                        component: () => import('@/views/app/pages/detail.vue'),
                        meta: {
                            locale: '应用详情',
                            routekey: 'app-detail-detail',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'form',
                        name: 'app-detail-form',
                        component: () => import('@/views/app/pages/form.vue'),
                        meta: {
                            routekey: 'app-detail-detail',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'pod',
                        name: 'app-detail-pod',
                        component: () => import('@/views/app/pages/pod.vue'),
                        meta: {
                            locale: '容器列表',
                            routekey: 'app-detail-pod',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'pod-webshell',
                        name: 'app-detail-pod-webshell',
                        component: () => import('@/views/app/pages/pod-webshell.vue'),
                        meta: {
                            locale: 'webshell',
                            routekey: 'app-detail-pod',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'domain',
                        name: 'app-detail-domain',
                        component: () => import('@/views/app/pages/domain.vue'),
                        meta: {
                            locale: '域名',
                            routekey: 'app-detail-domain',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'events',
                        name: 'app-detail-events',
                        component: () => import('@/views/app/pages/events.vue'),
                        meta: {
                            locale: '事件管理',
                            routekey: 'app-detail-events',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path: 'version',
                        name: 'app-detail-version',
                        component: () => import('@/views/app/pages/version.vue'),
                        meta: {
                            locale: '历史版本',
                            routekey: 'app-detail-version',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path:'files',
                        name: 'app-detail-files',
                        component: () => import('@/views/app/pages/files.vue'),
                        meta: {
                            locale: '文件管理',
                            routekey:'app-detail-files',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path:'files2',
                        name: 'app-detail-files2',
                        component: () => import('@/views/app/pages/files.vue'),
                        meta: {
                            locale: '文件管理',
                            routekey:'app-detail-files2',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                    {
                        path:'job',
                        name: 'app-detail-job',
                        component: () => import('@/views/app/pages/job.vue'),
                        meta: {
                            locale: '执行脚本',
                            routekey:'app-detail-job',
                            hideInMenu: true,
                            requiresAuth: true,
                            roles: ['*'],
                        },
                    },
                ],
            },
            {
                path: 'helm',
                name: 'app-helm',
                component: () => import('@/views/app/helm/helm.vue'),
                meta: {
                    hideInMenu: true,
                    locale: 'helm',
                    requiresAuth: true,
                    roles: ['*'],
                },
            },{
                path: 'cronjob',
                name: 'app-cronjob',
                component: () => import('@/views/app/cronjob/cronjob.vue'),
                meta: {
                    locale: '计划任务',
                    // hideInMenu: menuConfig?.app?.cronjob?.show === false,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-cronjob',
                },
            },{

                path: 'rvproxy',
                name: 'app-rvproxy',
                component: () => import('@/views/app/rvproxy/rvproxy.vue'),
                meta: {
                    locale: '反向代理',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-rvproxy',
                },
            },
            {
                path: 'rvproxy-domain',
                name: 'app-rvproxy-domain',
                component: () => import('@/views/app/rvproxy/domain.vue'),
                meta: {
                    hideInMenu: true,
                    locale: '域名管理',
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'app-rvproxy',
                },
            },
            {
                path: 'plugin',
                name: 'app-plugin',
                component: () => import('@/views/app/plugin/index.vue'),
                meta: {
                    locale: '插件管理',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
        ],
    },
];

export default DASHBOARD;
