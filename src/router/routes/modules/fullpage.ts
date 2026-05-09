
const HEADER_LAYOUT = () => import('@/layout/header-layout.vue');

const DASHBOARD: any = [
{
    path: '/fp',
    name: 'fp',
    component: HEADER_LAYOUT,
    meta: {
        hideInMenu: true,
        requiresAuth: true,
    },
    children: [
        {
            path: 'webshell',
            name: 'fp-webshell',
            component: () => import('@/views/header/web-shell.vue'),
            meta: {
                requiresAuth: false,
                roles: ['*'],
            },
        },
        {
            path: 'pod-webshell',
            name: 'fp-pod-webshell',
            component: () => import('@/views/header/pod-webshell.vue'),
            meta: {
                requiresAuth: false,
                roles: ['*'],
            },
        },
        
        {
            path: 'cluster-key-rate-limit',
            name: 'cluster-key-rate-limit',
            component: () => import('@/views/app/plugin/cluster-key-rate-limit.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
    ],
},{
    path: "/init-cluster",
    name: "init-cluster",
    component: HEADER_LAYOUT,
    redirect: '/init-cluster/index',
    meta: {
        hideInMenu: true,
        requiresAuth: true,
    },
    children: [
        {
            path: 'index',
            name: 'init-cluster-index',
            component: () => import('@/views/init-cluster/index.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
    ]
},{
    path: "/order-base",
    name: "order-base",
    component: HEADER_LAYOUT,
    redirect: '/order-base/index',
    meta: {
        hideInMenu: true,
        requiresAuth: true,
    },
    children: [
        {
            path: 'index',
            name: 'order-base-index',
            component: () => import('@/views/init-cluster/order-base.vue'),
            meta: {
                requiresAuth: true,
                roles: ['*'],
            },
        },
    ]
},{
    path: "/allow-register",
    name: "allow-register",
    component: HEADER_LAYOUT,
    redirect: '/allow-register/register',
    meta: {
        hideInMenu: true,
        requiresAuth: false,
    },
    children: [
        {
            path: 'register',
            name: 'allow-register-register',
            component: () => import('@/views/header/allow-register.vue'),
            meta: {
                requiresAuth: false,
                roles: ['*'],
            },
        },
        {
            path: 'check',
            name: 'allow-register-check',
            component: () => import('@/views/header/allow-register-check.vue'),

        }
    ]
},{
    path: "/",
    name: "cloud-resource",
    component: () => import('@/views/init-cluster/cloud-resource.vue'),
    meta: {
        hideInMenu: true,
        requiresAuth: false,
    },
},
];

export default DASHBOARD;
