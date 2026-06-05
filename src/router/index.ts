import { createRouter, createWebHistory } from 'vue-router';
import NProgress from 'nprogress'; // progress bar
import 'nprogress/nprogress.css';
import { useNamespaceStore } from '@/store';
import { useAppStore } from '@/store';

import { appRoutes } from './routes';
import { REDIRECT_MAIN, NOT_FOUND_ROUTE } from './routes/base';
import { isLogin } from '@/utils/auth';
import { getPermission } from '@/utils/auth';

import useK3kinfo from '@/hooks/k3k-info';

NProgress.configure({ showSpinner: false }); // NProgress Configuration

const router = createRouter(({
//   history: createWebHistory(),
  history: createWebHistory('/'), // (window as any).__MICRO_APP_BASE_ROUTE__ ||
  base: (window as any)?.__MICRO_APP_BASE_URL__ || '/',
  routes: [
    // {
    //   path: '/',
    //   name: 'root',
    //   redirect: '/cluster/panel',
    // },
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

router.beforeEach(async (to, from, next) => {
    const namespaceList = useNamespaceStore().namespaceList;
    const routeName = String(to.name || '');

    // 检查需要登录的路由
    if (to.meta.requiresAuth !== false && !isLogin()) {
        next({ name: 'login', query: { redirect: to.fullPath } });
        return;
    }

    if (isLogin() && to.name != 'order-base-index' && to.name != 'init-cluster-index') {
        try {
            if (!getPermission()) {
                await useK3kinfo();
            }
            // let { data } = await axios.get('/panel-api/v1/k3k/info').then(res=>{
            //     return res;
            // })

            // if(data?.['w7.cc/user-mode']=='cluster' && (data?.['w7.cc/need-create-order']=='true' || data?.['w7.cc/need-renew']=='true')){
            //     next({path:'/order-base/index',query:{
            //         ...(to.query.couponCode?{couponCode:to.query.couponCode}:{})
            //     }});
            //     return;
            // }else if(data?.['w7.cc/user-mode']=='cluster' && data?.['w7.cc/k3k-job-status']!=='complete'){
            //     next('/init-cluster')
            //     return;
            // }
        } catch {}
    }

    const appStore = useAppStore();
    // 根据当前访问的路由切换顶部菜单分组
    if (['usermanage', 'users', 'user-group', 'usermanage-permission', 'usermanage-cost', 'system-resource', 'user-resource', 'usermanage-whitedomain', 'usermanage-system'].includes(routeName)) {
        appStore.changeMenuFilter('usermanage');
    } else if (['person', 'person-account', 'system-order-center', 'system-order-detail', 'system-cost-center', 'system-cost-detail'].includes(routeName)) {
        appStore.changeMenuFilter('person');
    } else if (['cloud-cloud', 'cloud-register', 'system-permission', 'license-index', 'system-audit', 'access-key', 'api-key', 'oidc-key'].includes(routeName)) {
        appStore.changeMenuFilter('system');
    } else if (['topapp', 'topapp-micro'].includes(routeName)) {
        appStore.changeMenuFilter('topapp');
    } else {
        appStore.changeMenuFilter('cloudserver');
    }

    return new Promise<void>((resolve) => {
        if (namespaceList.length > 0) {
            resolve();
        } else {
            if (to.name == 'login' || !isLogin()) {
                resolve();
            } else {
                // useNamespaceStore().setNamespaceList().finally(()=>{})
                resolve();
            }
        }
    }).then(() => {
        next();
    });
});

export default router;
