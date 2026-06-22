import { defineStore } from 'pinia';
import { login as userLogin } from '@/api/user';
import { setToken, clearToken, setRefreshToken } from '@/utils/auth';
import treeData from '@/config/treedata.json';

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
                return res;
            } catch (err) {
                clearToken();
                throw err;
            }
        },
    },
});

export default useUserStore;
