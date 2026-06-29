import { DEFAULT_LAYOUT } from '../base';

const DASHBOARD: any = [{
    path: '/usermanage',
    name: 'usermanage',
    component: DEFAULT_LAYOUT,
    redirect: '/usermanage/users',
    meta: {
        locale: '多租户管理',
        requiresAuth: true,
        icon: 'icon-cloud',
        order: 5,
        menuGroup: 'usermanage',
        key: 'system-manage',
    },
    children: [{
        path: 'users',
        name: 'users',
        component: () => import('@/views/system/users/users.vue'),
        meta: {
            locale: '用户管理',
            hideInMenu: false,
            requiresAuth: true,
            roles: ['*'],
            key: 'system-user',
        },
    },{
        path: 'permission',
        name: 'usermanage-permission',
        component: ()=>import('@/views/system/usermanage/permission.vue'),
        meta: {
            locale: '权限套餐',
            hideInMenu: false,
            requireAuth: true,
            rules: ['*'],
            key: 'system-permission'
        },
    },{
        path: 'user-resource',
        name: 'user-resource',
        component: ()=>import('@/views/system/users/user-resource.vue'),
        meta: {
            locale: '查看资源',
            hideInMenu: true,
            requireAuth: true,
            rules: ['*'],
        }
    },{
    //     path: 'resource',
    //     name: 'system-resource',
    //     component: () => import('@/views/system/resource/list.vue'),
    //     meta: {
    //         locale: '资源管理',
    //         hideInMenu: false,
    //         requiresAuth: true,
    //         roles: ['*'],
    //         // key: 'system-resource'
    //     },
    // },{
        path: 'usermanage-whitedomain',
        name: 'usermanage-whitedomain',
        component: ()=>import('@/views/system/white-domain/index.vue'),
        meta: {
            locale: '备案域名',
            hideInMenu: false,
            requireAuth: true,
            rules: ['*'],
            key: 'system-white-domain'
        },
    },{
        path: 'site-setting',
        name: 'usermanage-site-setting',
        component: ()=>import('@/views/system/site-setting/index.vue'),
        meta: {
            locale: '站点设置',
            hideInMenu: false,
            requireAuth: true,
            rules: ['*'],
            key: 'system-site-setting'
        },
    },{
        path: 'usermanage-system',
        name: 'usermanage-system',
        component: ()=>import('@/views/system/system/index.vue'),
        meta: {
            locale: '系统设置',
            hideInMenu: false,
            requireAuth: true,
            rules: ['*'],
            key: 'system-system'
        },
    }]
}];

export default DASHBOARD;
