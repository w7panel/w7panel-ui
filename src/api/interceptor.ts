/**
 *  axios 拦截
 */

import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Notification } from '@arco-design/web-vue';
import { useLoadingStore } from '@/store';
import { clearToken } from '@/utils/auth';
import { useNamespaceStore } from '@/store';
import { getToken, setToken, setRefreshToken, getRefreshToken, } from '@/utils/auth';
import router from "@/router";

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
    loading?: boolean;
    customToken?:string;
    noAlert?:boolean;
}
interface CustomAxiosResponse extends AxiosResponse<HttpResponse> {
    config: CustomAxiosRequestConfig;
}

export interface HttpResponse<T = unknown> {
    status: number;
    msg: string;
    code: number;
    data: T;
}

if((window as any).__MICRO_APP_ENVIRONMENT__){
    axios.defaults.baseURL = (window as any)?.microApp?.getData()?.requestUrl || axios.defaults.baseURL;
}

axios.defaults.timeout = 30000;
axios.defaults.timeoutErrorMessage = '请求超时，请稍后重试';

// -----------------------------------------------------------------
// 并发 GET 请求防重 (重复请求共享同一个 Promise)
// -----------------------------------------------------------------
const originalGet = axios.get;
const pendingGetRequests = new Map<string, Promise<any>>();

axios.get = function (url: string, config?: CustomAxiosRequestConfig) {
    // 排除特殊的不希望防重的配置（如流或手动取消）
    if (config?.cancelToken || config?.signal || config?.responseType === 'stream') {
        return originalGet.call(this, url, config);
    }
    const key = url + (config?.params ? JSON.stringify(config.params) : '');
    
    if (pendingGetRequests.has(key)) {
        return pendingGetRequests.get(key) as Promise<any>;
    }
    
    const promise = originalGet.call(this, url, config).finally(() => {
        pendingGetRequests.delete(key);
    });
    pendingGetRequests.set(key, promise);
    return promise;
};
// -----------------------------------------------------------------

axios.interceptors.request.use(
    (config: CustomAxiosRequestConfig) => {
        let token = getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        if(config?.customToken){
            config.headers.Authorization = `Bearer ${config.customToken}`;
        }
        if(config?.loading){
            useLoadingStore().loading = true;
        }
        return config;
    },
    (error) => {
        if(error?.config?.loading){
            useLoadingStore().loading = false;
        }
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    async (res:CustomAxiosResponse) => {
        if(res?.config?.loading){
            useLoadingStore().loading = false;
        }
        if (res.status >= 200 && res.status < 300 && res) {
            // let expire = getExpire();
            // let time = expire*1000 - Date.now();
            // if(router?.currentRoute.value?.name != 'login' && res?.config?.url != '/k8s/refresh-token' && time < 600000 && time > 0){
            //     await axios.post('/k8s/refresh-token',{namespace: useNamespaceStore().namespace}).then(res=>{
            //         setExpire(res.data.expire);
            //         setToken(res.data.token);
            //     });
            // }

            return Promise.resolve(res);
        }
    },
    async (error) => {
        if(error?.config?.loading){
            useLoadingStore().loading = false;
        }
        if (error?.response?.status == 401) {
            if(!error?.config?.customToken && error?.config?.url!='/panel-api/v1/auth/refresh-token2'){
                let t = await axios.post('/panel-api/v1/auth/refresh-token2',{token: getRefreshToken()},{
                    customToken: '',
                    noAlert: true,
                    timeout: 3000,
                }).then(res=>{
                    let refreshToken = res.data.refreshToken;
                    let token = res.data.token;
                    setRefreshToken(refreshToken);
                    setToken(token);
                    return res.data;
                }).catch(()=>{
                    clearToken();
                    if(router?.currentRoute.value?.name == 'login'){
                        router?.push({ name: 'login'});
                        return;
                    }
                    router?.push({ name: 'login', query: {redirect: router?.currentRoute.value.fullPath}});
                    return {}
                })
                if(t.token){return}
            }
            clearToken();
            if(router?.currentRoute.value?.name == 'login'){
                router?.push({ name: 'login'});
                return;
            }
            router?.push({ name: 'login', query: {redirect: router?.currentRoute.value.fullPath}});
            // window.location.reload();
            return;
        }
        if (error?.response?.status == 429) { return; }
        if (error?.response?.status == 408) { return; }
        
        if (error.config.noAlert){
            return Promise.reject(error);
        }
        if (!error?.config?.dontalert) {
            if (
                error.response &&
                !error.config.headers.cancelerror &&
                error.response?.data?.error
            ) {
                if(error?.response?.status == 503){
                    console.log(error.response.data.error)
                }else if(error?.response?.status == 500 && error?.config?.url=='/panel-api/v1/auth/login'){
                    
                }else{
                    Notification.error({title: 'Error',content: error.response.data.error,});
                }
            } else {
                let data = error?.response?.data;
                let str = data?.message;
                if (typeof data === 'string') {
                    str = data;
                } else {
                    str = data?.message;
                }
                if(error?.response?.status == 503){
                    console.log(str);
                }else{
                    if(str?.includes('please retry later')){
                        Notification.error({title: 'Error',content: '同步数据中, 稍后重试',});
                    }else if(/Please disable the disk \S+ and remove all replicas first/.test(str)){
                        Notification.error({title: 'Error',content: '删除失败！有分区正在使用，请先删除对应的分区后再删除节点！',});
                    }else if(str?.includes('remove all replicas first') || str?.includes('no other healthy replica available')){
                        Notification.error({title: 'Error',content: '删除失败！数据正在同步中，请稍后再试',});
                    }else if(str){
                        Notification.error({title: 'Error', content: str,});
                    }
                }
            }
        }

        return Promise.reject(error);
    }
);
