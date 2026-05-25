import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/system',
    name: 'system',
    component: DEFAULT_LAYOUT,
    redirect: '/system/cloud',
    meta: {
        locale: '系统管理',
        requiresAuth: true,
        icon: 'icon-cloud',
        order: 5,
        key: 'system',
    },
    children: [
        {
            path: 'cloud',
            name: 'cloud-cloud',
            component: () => import('@/views/system/cloud/cloud.vue'),
            meta: {
                locale: '云端注册',
                requiresAuth: true,
                roles: ['*'],
                key: 'system-cloud',
            },
        },
        {
            path: 'cloud-register',
            name: 'cloud-register',
            component: () => import('@/views/system/cloud/register.vue'),
            meta: {
                locale: '云端注册',
                hideInMenu: true,
                requiresAuth: true,
                roles: ['*'],
                key: 'system-cloud',
            },
        },
        // {
        //     path: 'white-list',
        //     name: 'white-list',
        //     component: () => import('@/views/system/whitelist/list.vue'),
        //     meta: {
        //         locale: '域名白名单',
        //         hideInMenu: false,
        //         requiresAuth: true,
        //         roles: ['*'],
        //         key: 'system-whitelist'
        //     },
        // },
        // {
        //     path: 'usermanage',
        //     name: 'usermanage',
        //     component: ()=>import('@/views/system/usermanage/index.vue'),
        //     redirect: '/system/usermanage/users',
        //     meta: {
        //         locale: '多租户管理',
        //         hideInMenu: false,
        //         requiresAuth: true,
        //         roles: ['*'],
        //         key: 'system-manage',
        //     },
        //     children: [{
        //         path: 'users',
        //         name: 'users',
        //         component: () => import('@/views/system/users/users.vue'),
        //         meta: {
        //             locale: '用户管理',
        //             hideInMenu: true,
        //             requiresAuth: true,
        //             roles: ['*'],
        //             key: 'system-user',
        //         },
        //     },{
        //         path: 'user-group',
        //         name: 'user-group',
        //         component: () => import('@/views/system/usergroup/list.vue'),
        //         meta: {
        //             locale: '用户组',
        //             hideInMenu: true,
        //             requiresAuth: true,
        //             roles: ['*'],
        //             key: 'system-usergroup'
        //         },
        //     },{
        //         path: 'permission',
        //         name: 'usermanage-permission',
        //         component: ()=>import('@/views/system/usermanage/permission.vue'),
        //         meta: {
        //             locale: '权限套餐',
        //             hideInMenu: true,
        //             requireAuth: true,
        //             rules: ['*'],
        //             key: 'system-permission'
        //         },
        //     },{
        //         path: 'cost',
        //         name: 'usermanage-cost',
        //         component: ()=>import('@/views/system/usermanage/cost.vue'),
        //         meta: {
        //             locale: '费用套餐',
        //             hideInMenu: true,
        //             requireAuth: true,
        //             rules: ['*'],
        //             key: 'system-cost'
        //         },
        //     },{
        //         path: 'user-resource',
        //         name: 'user-resource',
        //         component: ()=>import('@/views/system/users/user-resource.vue'),
        //         meta: {
        //             locale: '查看资源',
        //             hideInMenu: true,
        //             requireAuth: true,
        //             rules: ['*'],
        //         }
        //     },{
        //         path: 'usermanage-whitedomain',
        //         name: 'usermanage-whitedomain',
        //         component: ()=>import('@/views/system/white-domain/index.vue'),
        //         meta: {
        //             locale: '备案域名',
        //             hideInMenu: true,
        //             requireAuth: true,
        //             rules: ['*'],
        //             key: 'system-white-domain'
        //         },
        //     },{
        //         path: 'usermanage-system',
        //         name: 'usermanage-system',
        //         component: ()=>import('@/views/system/system/index.vue'),
        //         meta: {
        //             locale: '系统设置',
        //             hideInMenu: true,
        //             requireAuth: true,
        //             rules: ['*'],
        //             key: 'system-system'
        //         },
        //     }],
        // },
        // {
        //     path: 'users',
        //     name: 'users',
        //     component: () => import('@/views/system/users/users.vue'),
        //     meta: {
        //         locale: '用户管理',
        //         hideInMenu: false,
        //         requiresAuth: true,
        //         roles: ['*'],
        //         key: 'system-user',
        //     },
        // },
        // {
        //     path: 'user-group',
        //     name: 'user-group',
        //     component: () => import('@/views/system/usergroup/list.vue'),
        //     meta: {
        //         locale: '用户组',
        //         hideInMenu: false,
        //         requiresAuth: true,
        //         roles: ['*'],
        //         key: 'system-usergroup'
        //     },
        // },
        {
            path: 'permission',
            name: 'system-permission',
            component: () => import('@/views/system/permission/index.vue'),
            meta: {
                locale: '权限设置',
                hideInMenu: true,
                requiresAuth: true,
                roles: ['*'],
                key: 'system-permission'
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
                key: 'system-order-center',
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
                key: 'system-cost-center',
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
        {
            path: 'license',
            name: 'license-index',
            component: () => import('@/views/system/license/license.vue'),
            meta: {
                locale: '授权管理',
                requiresAuth: true,
                roles: ['*'],
                key: 'system-license',
            },
        },
        {
            path: 'access-key',
            name: 'access-key',
            component: () => import('@/views/system/access-key/index.vue'),
            redirect: '/system/access-key/api-key',
            meta: {
                locale: '访问密钥',
                requiresAuth: true,
                roles: ['*'],
            },
            children: [
                {
                    path: 'api-key',
                    name: 'api-key',
                    component: () => import('@/views/system/access-key/api-key.vue'),
                    meta: {
                        locale: 'API密钥管理',
                        requiresAuth: true,
                        roles: ['*'],
                    },
                },
                {
                    path: 'oidc-key',
                    name: 'oidc-key',
                    component: () => import('@/views/system/access-key/oidc-key.vue'),
                    meta: {
                        locale: 'OIDC密钥管理',
                        requiresAuth: true,
                        roles: ['*'],
                    },
                }
            ],
        },
    ],
},
];

export default DASHBOARD;
