import { defineStore } from 'pinia';
import { login as userLogin } from '@/api/user';
import { setToken, setPermission, clearToken, setUserInfo, setRefreshToken } from '@/utils/auth';
import axios from 'axios';
import treeData from '@/config/treedata.json';

function getAllKeys(tree) {
    const keys = [];
    function traverse(node) {
        keys.push(node.key);
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => traverse(child));
        }
    }
    tree.forEach(root => traverse(root));
    return keys;
}

const useUserStore = defineStore('user', {
    state: () => ({
        treeData: treeData,
        loginData: {},
    }),

    getters: {
        getTreeData(state) {
            return state.treeData;
        }
    },

    actions: {
        // Login
        async login(loginForm) {
            try {
                const res = await userLogin(loginForm);
                let loginData = res.data;
                if (loginData && loginData.code === 200 && loginData.data) {
                    loginData = loginData.data;
                }
                setRefreshToken(loginData.refreshToken);
                setToken(loginData.token);
                this.loginData = loginData;

                // let arr = [];
                
                // // 使用 Promise.all 并行请求，优化性能
                // const [userInfoRes, consoleInfoRes] = await Promise.all([
                //     axios.get('/panel-api/v1/auth/userinfo'),
                //     axios.get("/panel-api/v1/auth/console/info?code=test")
                // ]);
                
                // // 处理 userinfo
                // let userData = userInfoRes.data;
                // if(userData && userData.code === 200 && userData.data) {
                //     userData = userData.data;
                // }
                // setUserInfo(userData);
                // arr = JSON.parse(userData?.['w7.cc/menu'] || '[]')
                // if (userData?.['w7.cc/debug'] != 'true') {
                //     arr = arr.filter(i => i != 'cluster-resource');
                // }
                
                // // 处理 console info
                // const consoleDataRes = consoleInfoRes.data;
                // let consoleData = consoleDataRes;
                // if(consoleDataRes && consoleDataRes.code === 200 && consoleDataRes.data) {
                //     consoleData = consoleDataRes.data;
                // }
                // let license_type = consoleData?.license_type;

                // if (consoleData.cluster_id == "" && consoleData.thirdparty_cd_token != "") {
                //     axios.post('/panel-api/v1/auth/console/register-to-console?offline_url=' + window.location.origin, {
                //         offline_url: window.location.origin,
                //         offlineUrl: window.location.origin,
                //     }).then(() => { }).catch(() => { })
                // }

                // if (license_type == 'free') {
                //     arr = arr.filter(i => i != 'system-user' && i != 'system-usergroup')
                // }
                // setPermission(arr);

                // res.data = loginData; // 直接将真正的 data 覆盖上去，这样所有的外层组件不用改
                return res;
            } catch (err) {
                clearToken();
                throw err;
            }
        },
    },
});

export default useUserStore;
