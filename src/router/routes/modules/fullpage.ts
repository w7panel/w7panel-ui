
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
    ],
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
},
];

export default DASHBOARD;
