import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
{
    path: '/cluster',
    name: 'cluster',
    component: DEFAULT_LAYOUT,
    redirect: '/cluster/panel',
    meta: {
        locale: '集群管理',
        requiresAuth: true,
        icon: 'icon-common',
        order: 0,
        key: 'cluster',
    },
    children: [
        {
            path: 'panel',
            name: 'cluster-panel',
            component: () => import('@/views/cluster/overview/panel.vue'),
            meta: {
                locale: '概览',
                requiresAuth: true,
                hideInMenu: false,
                roles: ['*'],
                key: 'cluster-panel',
            },
        },
        {
            path: 'overview',
            name: 'cluster-overview',
            component: () => import('@/views/cluster/overview/index.vue'),
            meta: {
                locale: '集群概况',
                requiresAuth: true,
                hideInMenu: true,
                roles: ['*'],
            },
        },
        {
            path: 'nodes',
            name: 'cluster-nodes',
            component: () => import('@/views/cluster/nodes/index.vue'),
            meta: {
                locale: '节点管理',
                requiresAuth: true,
                key: 'cluster-nodes',
                roles: ['*'],
            },
        },
        {
            path: 'nodes-image-list',
            name: 'cluster-nodes-image-list',
            component: () => import('@/views/cluster/nodes/image-list.vue'),
            meta: {
                locale: '镜像管理',
                requiresAuth: true,
                hideInMenu: false,
                roles: ['*'],
                key: 'cluster-nodes-image-list',
            },
        },
        {
            path: 'build-image-list',
            name: 'build-image-list',
            component: () => import('@/views/cluster/nodes/build-image.vue'),
            meta: {
                local: '构建镜像',
                requiresAuth: true,
                hideInMenu: true,
                roles: ['*'],
            }
        },
        {
            path: 'resource',
            name: 'cluster-resource',
            component: () => import('@/views/cluster/resource/index.vue'),
            meta: {
                locale: '资源对象浏览器',
                requiresAuth: true,
                roles: ['*'],
                key: 'cluster-resource',
            },
        },
        {
            path: 'search',
            name: 'cluster-search',
            component: ()=>import('@/views/cluster/resource/search.vue'),
            meta: {
                locale: '原始查询',
                requiresAuth: true,
                hideInMenu: true,
                roles: ['*'],
            }
        },
        {
            path: 'nodes-files',
            name: 'cluster-nodes-files',
            component: () => import('@/views/cluster/nodes/filespage.vue'),
            meta: {
                locale: '文件管理',
                requiresAuth: true,
                hideInMenu: true,
                roles: ['*'],
            },
        },
        {
            path: 'dns',
            name: 'cluster-dns',
            component: () => import('@/views/dns/index.vue'),
            meta: {
                locale: 'DNS解析',
                requiresAuth: true,
                roles: ['*'],
                key: 'dns',
            },
        },
        {
            path: 'dns/:domain',
            name: 'dns-records',
            component: () => import('@/views/dns/detail.vue'),
            meta: {
                locale: { key: 'domain' },
                hideInMenu: true,
                requiresAuth: true,
                roles: ['*'],
                key: 'dns',
            },
        },
    ],
},
];

export default DASHBOARD;
