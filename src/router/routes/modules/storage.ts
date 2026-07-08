import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw[] = [
    {
        path: '/storage',
        name: 'storage',
        component: DEFAULT_LAYOUT,
        meta: {
            locale: '存储管理',
            requiresAuth: true,
            icon: 'icon-storage',
            order: 3,
            menuGroup: 'cloudserver',
            key: 'storage',
        },
        redirect: (route) => {
            return { name:'storage-disk', params:route.params};
        },
        children: [
            {
                path:'node',
                name:'storage-node',
                component: () => import('@/views/storage/node.vue'),
                meta: {
                    locale: '存储设备',
                    hideInMenu: true,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'storage-node',
                },
            },
            {
                path:'disk',
                name:'storage-disk',
                component: () => import('@/views/storage/disk.vue'),
                meta: {
                    locale: '存储设备',
                    // hideInMenu: menuConfig?.storage?.disk?.show === false,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'storage-node',
                },
            },
            {
                path:'zone',
                name:'storage-zone',
                component: () => import('@/views/storage/zone.vue'),
                meta: {
                    locale: '存储分区',
                    // hideInMenu: menuConfig?.storage?.zone?.show === false,
                    requiresAuth: true,
                    roles: ['*'],
                    key: 'storage-zone',
                },
            },
            {
                path:'zone-snapshot/:id',
                name:'storage-zone-snapshot',
                component: () => import('@/views/storage/zone-snapshot.vue'),
                meta: {
                    locale: '快照管理',
                    hideInMenu:true,
                    requiresAuth: true,
                    roles: ['*'],
                },
            },
            
            // {
            //     path:'storage',
            //     name:'storage-storage',
            //     component: () => import('@/views/storage/storage.vue'),
            //     meta: {
            //         locale: '存储管理',
            //         requiresAuth: true,
            //         roles: ['*'],
            //     },
            // },
        ],
    },
];

export default DASHBOARD;
