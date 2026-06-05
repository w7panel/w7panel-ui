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
        menuGroup: 'system',
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
            path: 'audit',
            name: 'system-audit',
            component: () => import('@/views/system/audit/index.vue'),
            meta: {
                locale: '审计日志',
                requiresAuth: true,
                roles: ['*'],
                key: 'system-audit',
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
