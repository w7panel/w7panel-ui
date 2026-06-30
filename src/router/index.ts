import { createRouter, createWebHistory } from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useNamespaceStore, useAppStore } from '@/store';

import { appRoutes } from './routes';
import { REDIRECT_MAIN, NOT_FOUND_ROUTE } from './routes/base';
import { isLogin, getPermission } from '@/utils/auth';

import useK3kinfo from '@/hooks/k3k-info';

NProgress.configure({ showSpinner: false });

const DYNAMIC_IMPORT_RELOAD_KEY = 'w7panel-dynamic-import-reloaded';
const MICRO_APP_ALLOWED_ROUTE_NAMES = ['cloud-resource', 'login', 'console-login'];

const isMicroAppDirect = () => Boolean((window as any)?.w7_microapp?.name);

const isMicroAppAllowedRoute = (to: any) => MICRO_APP_ALLOWED_ROUTE_NAMES.includes(String(to.name || ''));

const getMenuGroupFromRoute = (to: any) => {
  const matchedGroup = [...(to.matched || [])]
    .reverse()
    .find((record) => record?.meta?.menuGroup)?.meta?.menuGroup;

  if (matchedGroup) {
    return matchedGroup;
  }

  if (['topapp', 'topapp-micro'].includes(String(to.name || ''))) {
    return 'topapp';
  }

  return 'cloudserver';
};

const router = createRouter(({
  // history: createWebHistory(),
  history: createWebHistory('/'),
  base: (window as any)?.__MICRO_APP_BASE_URL__ || '/',
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: '/console-login',
      name: 'console-login',
      component: () => import('@/views/login/console-login.vue'),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: '/resource-loading',
      name: 'resource-loading',
      component: () => import('@/views/init-cluster/resource-loading.vue'),
      meta: {
        requiresAuth: false,
      },
    },
    ...appRoutes,
    REDIRECT_MAIN,
    NOT_FOUND_ROUTE,
  ],
  scrollBehavior() {
    return { top: 0 };
  },
}) as any);

router.onError((error) => {
  const message = String(error?.message || error || '');
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)) {
    return;
  }
  if (sessionStorage.getItem(DYNAMIC_IMPORT_RELOAD_KEY) === '1') {
    return;
  }
  sessionStorage.setItem(DYNAMIC_IMPORT_RELOAD_KEY, '1');
  window.location.reload();
});

router.afterEach(() => {
  sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
});

router.beforeEach(async (to, from, next) => {
  const namespaceList = useNamespaceStore().namespaceList;
  const appStore = useAppStore();

  if (isMicroAppDirect() && !isMicroAppAllowedRoute(to)) {
    next({ name: isLogin() ? 'cloud-resource' : 'login', replace: true });
    return;
  }

  // Switch menu group from route meta before async init to avoid showing the old menu briefly.
  appStore.changeMenuFilter(getMenuGroupFromRoute(to));

  if (to.meta.requiresAuth !== false && !isLogin()) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (isLogin()) {
    try {
      if (!getPermission()) {
        await useK3kinfo();
      }
    } catch {}
  }

  return new Promise<void>((resolve) => {
    if (namespaceList.length > 0) {
      resolve();
    } else if (to.name === 'login' || !isLogin()) {
      resolve();
    } else {
      // useNamespaceStore().setNamespaceList().finally(() => {})
      resolve();
    }
  }).then(() => {
    next();
  });
});

export default router;
