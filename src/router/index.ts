import { createRouter, createWebHistory } from 'vue-router';
import NProgress from 'nprogress'; // progress bar
import 'nprogress/nprogress.css';
import { useNamespaceStore } from '@/store';
  import { useAppStore } from '@/store';

import { appRoutes } from './routes';
import { REDIRECT_MAIN, NOT_FOUND_ROUTE } from './routes/base';
import { isLogin } from '@/utils/auth';
import { setFileEditor,setWebshell, setK8sinfo } from '@/utils/auth';
import { getPermission, setPermission, setUserInfo } from '@/utils/auth';

import useK3kinfo from '@/hooks/k3k-info';

NProgress.configure({ showSpinner: false }); // NProgress Configuration

const router = createRouter(({
//   history: createWebHistory(),
  history: createWebHistory( '/'), // (window as any).__MICRO_APP_BASE_ROUTE__ ||
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

    // 检查需要登录的路由
    if (to.meta.requiresAuth !== false && !isLogin()) {
        next({ name: 'login', query: { redirect: to.fullPath } });
        return;
    }

    if(isLogin() && to.name!='order-base-index' && to.name!='init-cluster-index'){
        try{
            if(!getPermission()){
                await useK3kinfo();
            }
            // let { data } = await axios.get('/panel-api/v1/k3k/info').then(res=>{
            //     setFileEditor(res?.data?.['w7.cc/file-editor']);
            //     setWebshell(res?.data?.['w7.cc/web-shell']);
            //     setK8sinfo(res?.data);
            //     return res;
            // })

            // if(!getPermission() && data?.['w7.cc/menu']){
            //     let arr = [];
            //     await axios.get('/panel-api/v1/auth/userinfo').then(res => {
            //         setUserInfo(res.data);
            //         arr = JSON.parse(res.data?.['w7.cc/menu'] || '[]')
            //         if (res.data?.['w7.cc/debug'] != 'true') {
            //             arr = arr.filter(i => i != 'cluster-resource');
            //         }
            //         setPermission(arr);
            //     })
            //     await axios.get("/panel-api/v1/auth/console/info?code=test").then(res => {
            //         let is_register = res.data?.is_register;
            //         let license_type = res.data?.license_type;

            //         let data = res?.data;
            //         if (data.cluster_id == "" && data.thirdparty_cd_token != "") {
            //             axios.post('/panel-api/v1/console/register-to-console?offline_url=' + window.location.origin, {
            //                 offline_url: window.location.origin,
            //                 offlineUrl: window.location.origin,
            //             }).then(() => { }).catch(() => { })
            //         }

            //         if (!is_register) {
            //             arr = arr.filter(i => i != 'system-order-center' && i != 'system-cost-center')
            //         }
            //         if (license_type == 'free') {
            //             arr = arr.filter(i => i != 'system-user' && i != 'system-usergroup')
            //         }
            //         setPermission(arr);
            //     });
            // }
            
            // if(data?.['w7.cc/user-mode']=='cluster' && (data?.['w7.cc/need-create-order']=='true' || data?.['w7.cc/need-renew']=='true')){
            //     next({path:'/order-base/index',query:{
            //         ...(to.query.couponCode?{couponCode:to.query.couponCode}:{})
            //     }});
            //     return;
            // }else if(data?.['w7.cc/user-mode']=='cluster' && data?.['w7.cc/k3k-job-status']!=='complete'){
            //     next('/init-cluster')
            //     return;
            // }
        }catch{}
    }

    // 根据路由名称，设置菜单过滤
    const appStore = useAppStore();
    if(['usermanage','users','usermanage-permission','system-resource','user-resource','usermanage-whitedomain','usermanage-system'].includes(to.name)){
        appStore.changeMenuFilter('usermanage');
    }else if(['cloud-cloud','cloud-register','system-permission','system-order-center','system-order-detail','system-cost-center','system-cost-detail','license-index','system-audit','access-key','api-key','oidc-key',].includes(to.name)){
        appStore.changeMenuFilter('system');
    }else if(['topapp','topapp-micro'].includes(to.name)){
        appStore.changeMenuFilter('topapp');
    }else{
        appStore.changeMenuFilter('cloudserver')
    }

    return new Promise<void>((resolve)=>{
        if(namespaceList.length > 0) {
            resolve()
        }else{
            if(to.name=='login' || !isLogin()){
                resolve();
            }else{
                // useNamespaceStore().setNamespaceList().finally(()=>{})
                resolve();
            }
        }
    }).then(()=>{
        next();
    })
})

export default router;
