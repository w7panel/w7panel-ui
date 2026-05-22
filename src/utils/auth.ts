const TOKEN_KEY = 'w7panel-token';
const REFRESH_TOKEN = 'w7panel-refresh-token'
// const EXPIRE = 'expire';
const PERMISSION = 'w7panel-permission';
const USERINFO = 'w7panel-userinfo';
const FILEEDITOR_KEY = 'w7panel-fileeditor';
const WEBSHELL_KEY = 'w7panel-webshell';
const K8SINFO_KEY = 'w7panel-k8sinfo';

const isLogin = () => {
    if((window as any).__MICRO_APP_ENVIRONMENT__ && (window as any)?.microApp?.getData()?.token){
        return true;
    }
    return !!localStorage.getItem(TOKEN_KEY);
};

const getToken = () => {
    if((window as any).__MICRO_APP_ENVIRONMENT__ && (window as any)?.microApp?.getData()?.token){
        return (window as any)?.microApp?.getData()?.token;
    }
    return localStorage.getItem(TOKEN_KEY);
};
const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN);
};
// const getExpire = () => {
//     return Number(localStorage.getItem(EXPIRE));
// };
const getPermission = () => {
    let permission = [];
    try{
        permission = JSON.parse(localStorage.getItem(PERMISSION));
    }catch{}
    return permission?.length? permission : null;
};
const getUserInfo = () => {
    let userInfo = {};
    try{
        userInfo = JSON.parse(localStorage.getItem(USERINFO));
    }catch{}
    return userInfo;
}

const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
};
const setRefreshToken = (token: string) => {
    localStorage.setItem(REFRESH_TOKEN, token);
}
// const setExpire = (v: number) => {
//     localStorage.setItem(EXPIRE, String(v));
// };
const setPermission = (v: string[]) => {
    localStorage.setItem(PERMISSION, JSON.stringify(v));
};
const setUserInfo = (v: string[]) => {
    localStorage.setItem(USERINFO, JSON.stringify(v));
};

const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(USERINFO);
    localStorage.removeItem(PERMISSION);
};


const getFileEditor = () => {
    return localStorage.getItem(FILEEDITOR_KEY);
};
const setFileEditor = (boo: string) => {
    localStorage.setItem(FILEEDITOR_KEY, boo);
};
const getWebshell = () => {
    return localStorage.getItem(WEBSHELL_KEY);
};
const setWebshell = (boo: string) => {
    localStorage.setItem(WEBSHELL_KEY, boo);
};
const getK8sinfo = () => {
    let k8sinfo = {};
    try{
        k8sinfo = JSON.parse(localStorage.getItem(K8SINFO_KEY));
    }catch{}
    return k8sinfo
};
const setK8sinfo = (v) => {
    localStorage.setItem(K8SINFO_KEY, JSON.stringify(v));
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
 };
