export const HEADER_LAYOUT = () => import('@/layout/header-layout.vue');


const DASHBOARD: any = [{
    path: '/appgroup/:group',
    name: 'topapp',
    component: HEADER_LAYOUT,
    redirect: (route)=>{
        return {name:'topapp-micro', params:route.params}
    },
    meta: {
        locale: '应用',
        hideInMenu: true,
        requiresAuth: true,
    },
    children: [{
        path: 'micro',
        name: 'topapp-micro',
        component: () => import('@/views/topapp/micro.vue'),
        meta: {
            locale: '应用',
            hideInMenu: true,
            requiresAuth: true,
        },
    },]
}]

export default DASHBOARD;