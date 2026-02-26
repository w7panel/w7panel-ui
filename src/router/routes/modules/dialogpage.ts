// component: ,

const DASHBOARD = [
    {
        path: '/dialog/appgroup/:group/:kind?/:id/files',
        name: 'dialog-files',
        component: () => import('@/views/app/pages/files.vue'),
        meta: {
            hideInMenu: true,
            requiresAuth: true,
        },
    },
    {
        path: '/dialog/store-install',
        name: 'dialog-stallinstall',
        component: () => import('@/views/app/store/install.vue'),
        meta: {
            hideInMenu: true,
            requiresAuth: true,
        },
    },
    {
        path: '/dialog/appgroup/:group/micro',
        name: 'dialog-micro',
        component: () => import('@/views/topapp/dialog-page.vue'),
        meta: {
            hideInMenu: true,
            requiresAuth: true,
        },
    },
    {
        path: '/dialog/pod-webshell',
        name: 'dialog-pod-webshell',
        component: () => import('@/views/header/pod-webshell.vue'),
        meta: {
            hideInMenu: true,
            requiresAuth: false,
            roles: ['*'],
        },
    },
]

export default DASHBOARD;