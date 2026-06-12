export const HEADER_LAYOUT = () => import('@/layout/header-layout.vue');

const DASHBOARD: any = [
  {
    path: '/appgroup/:group',
    name: 'topapp',
    component: HEADER_LAYOUT,
    redirect: (route) => {
      return { name: 'topapp-micro', params: route.params };
    },
    meta: {
      locale: '应用',
      hideInMenu: true,
      requiresAuth: true,
      menuGroup: 'topapp',
    },
    children: [
      {
        path: 'micro',
        name: 'topapp-micro',
        component: () => import('@/views/topapp/micro.vue'),
        meta: {
          locale: '应用',
          hideInMenu: true,
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/zpk-store',
    name: 'zpk-store',
    component: HEADER_LAYOUT,
    redirect: '/zpk-store/list',
    meta: {
      locale: '制品商店',
      hideInMenu: true,
      requiresAuth: true,
      menuGroup: 'cloudserver',
    },
    children: [{
      path: 'list',
      name: 'zpk-store-list',
      component: () => import('@/views/topapp/iframe-page.vue'),
      meta: {
        locale: '制品商店',
        hideInMenu: true,
        requiresAuth: true,
      },
    }]

  }
];

export default DASHBOARD;
