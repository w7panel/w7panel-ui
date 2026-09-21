export const HEADER_LAYOUT = () => import('@/layout/header-layout.vue');

const LEGACY_APP_DIRECT_DO = '__topapp_app_direct__';

const getQueryValue = (value) => Array.isArray(value) ? value[0] : value;
const getMicroRoute = (route) => getQueryValue(
  route.query?.['app-detail-micro'] || route.query?.do || route.query?.appmicro,
);
const redirectToTopAppPage = (route) => {
  const legacyAppDirect = getMicroRoute(route) === LEGACY_APP_DIRECT_DO;
  const query = {...route.query};
  if(legacyAppDirect){
    delete query['app-detail-micro'];
    delete query.do;
    delete query.appmicro;
    delete query.showMenu;
  }
  return {
    name: legacyAppDirect ? 'topapp-direct' : 'topapp-micro',
    params: { group: route.params.group },
    query,
  };
};

const redirectLegacyAppDirect = (route) => {
  if (getMicroRoute(route) !== LEGACY_APP_DIRECT_DO) {
    return;
  }
  const query = {...route.query};
  delete query['app-detail-micro'];
  delete query.do;
  delete query.appmicro;
  delete query.showMenu;
  return {name:'topapp-direct', params:route.params, query};
};

const DASHBOARD: any = [
  {
    path: '/appgroup/:group',
    name: 'topapp',
    component: HEADER_LAYOUT,
    redirect: redirectToTopAppPage,
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
        component: () => import('@/views/app/apps/detail.vue'),
        beforeEnter: redirectLegacyAppDirect,
        meta: {
          locale: '应用',
          hideInMenu: true,
          requiresAuth: true,
        },
      },
      {
        path: 'direct',
        name: 'topapp-direct',
        component: () => import('@/views/app/apps/detail.vue'),
        meta: {
          locale: '应用直达',
          hideInMenu: true,
          requiresAuth: true,
        },
      },
    ],
  },
];

export default DASHBOARD;
