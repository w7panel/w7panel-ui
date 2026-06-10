import { expandPermissionValues } from './permission-match';

const PRE = 'iframe-';

const TOKEN_KEY = 'w7panel-token';
const REFRESH_TOKEN = 'w7panel-refresh-token'
// const EXPIRE = 'expire';
const PERMISSION = 'w7panel-permission';
const USERINFO = 'w7panel-userinfo';
const FILEEDITOR_KEY = 'w7panel-fileeditor';
const WEBSHELL_KEY = 'w7panel-webshell';
const K8SINFO_KEY = 'w7panel-k8sinfo';
const isSubapp = (window as any).__POWERED_BY_WUJIE__;

const isLogin = () => {
    if((window as any).__POWERED_BY_WUJIE__ && (window as any)?.$wujie?.props?.paneltoken){
        return true;
    }
    if((window as any).__MICRO_APP_ENVIRONMENT__ && (window as any)?.microApp?.getData()?.token){
        return true;
    }
    return !!localStorage.getItem((isSubapp? PRE : '' ) + TOKEN_KEY);
};

const getToken = () => {
    if((window as any).__POWERED_BY_WUJIE__ && (window as any)?.$wujie?.props?.paneltoken){
        return (window as any)?.$wujie?.props?.paneltoken;
    }
    if((window as any).__MICRO_APP_ENVIRONMENT__ && (window as any)?.microApp?.getData()?.token){
        return (window as any)?.microApp?.getData()?.token;
    }
    return localStorage.getItem((isSubapp? PRE : '' ) + TOKEN_KEY);
};
const getRefreshToken = () => {
    if((window as any).__POWERED_BY_WUJIE__ && (window as any)?.$wujie?.props?.refreshToken){
        return (window as any)?.$wujie?.props?.refreshToken;
    }
    return localStorage.getItem((isSubapp? PRE : '' ) + REFRESH_TOKEN);
};
// const getExpire = () => {
//     return Number(localStorage.getItem(EXPIRE));
// };
const getPermission = () => {
    let permission = [];
    try{
        permission = JSON.parse(localStorage.getItem((isSubapp? PRE : '' ) + PERMISSION));
    }catch{}
    return permission?.length? expandPermissionValues(permission) : null;
};
const getUserInfo = () => {
    let userInfo = {};
    try{
        userInfo = JSON.parse(localStorage.getItem((isSubapp? PRE : '' ) + USERINFO));
    }catch{}
    return userInfo;
}

const setToken = (token: string) => {
    localStorage.setItem((isSubapp? PRE : '' ) + TOKEN_KEY, token);
};
const setRefreshToken = (token: string) => {
    localStorage.setItem(REFRESH_TOKEN, token);
}
const setIframeToken = (token: string) => {
    localStorage.setItem(PRE+TOKEN_KEY, token);
};
const setIframeRefreshToken = (token: string) => {
    localStorage.setItem(PRE+REFRESH_TOKEN, token);
};
const getIframeToken = () => {
    return localStorage.getItem(PRE+TOKEN_KEY);
};
const getIframeRefreshToken = () => {
    return localStorage.getItem(PRE+REFRESH_TOKEN);
};
// const setExpire = (v: number) => {
//     localStorage.setItem(EXPIRE, String(v));
// };
const setPermission = (v: string[]) => {
    localStorage.setItem((isSubapp? PRE : '' ) + PERMISSION, JSON.stringify(expandPermissionValues(v)));
};
const setUserInfo = (v: string[]) => {
    localStorage.setItem((isSubapp? PRE : '' ) + USERINFO, JSON.stringify(v));
};

const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(USERINFO);
    localStorage.removeItem(PERMISSION);
    localStorage.removeItem(FILEEDITOR_KEY);
    localStorage.removeItem(K8SINFO_KEY);
    localStorage.removeItem(WEBSHELL_KEY);
};

const clearIframeToken = () => {
    localStorage.removeItem(PRE+TOKEN_KEY);
    localStorage.removeItem(PRE+REFRESH_TOKEN);
    localStorage.removeItem(PRE+USERINFO);
    localStorage.removeItem(PRE+PERMISSION);
    localStorage.removeItem(PRE+FILEEDITOR_KEY);
    localStorage.removeItem(PRE+K8SINFO_KEY);
    localStorage.removeItem(PRE+WEBSHELL_KEY);
};


const getFileEditor = () => {
    return localStorage.getItem((isSubapp? PRE : '' ) + FILEEDITOR_KEY);
};
const setFileEditor = (boo: string) => {
    localStorage.setItem((isSubapp? PRE : '' ) + FILEEDITOR_KEY, boo);
};
const getWebshell = () => {
    return localStorage.getItem((isSubapp? PRE : '' ) + WEBSHELL_KEY);
};
const setWebshell = (boo: string) => {
    localStorage.setItem((isSubapp? PRE : '' ) + WEBSHELL_KEY, boo);
};
const getK8sinfo = () => {
    let k8sinfo = {};
    try{
        k8sinfo = JSON.parse(localStorage.getItem((isSubapp? PRE : '' ) + K8SINFO_KEY));
    }catch{}
    return k8sinfo
};
const setK8sinfo = (v) => {
    localStorage.setItem((isSubapp? PRE : '' ) + K8SINFO_KEY, JSON.stringify(v));
};

export { isLogin, getToken, setToken, clearToken,
    // getExpire,
    // setExpire,
    setPermission, getPermission, setUserInfo, getUserInfo,
    getFileEditor,
    setFileEditor,
    getWebshell,
    setWebshell,
    getK8sinfo,
    setK8sinfo,
    setRefreshToken,
    getRefreshToken,
    setIframeToken,
    setIframeRefreshToken,
    getIframeToken,
    getIframeRefreshToken,
    clearIframeToken,
 };
