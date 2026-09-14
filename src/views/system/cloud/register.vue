<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <div class="bg-white fc df ai-c jc-c">
            <a-result v-if="error" status="error" title="绑定账号失败" :subtitle="error">
                <template #extra><a-button @click="$router.replace('/system/cloud')">返回云端账号</a-button></template>
            </a-result>
            <a-spin v-else :size="32" />
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import { getRefreshToken, setRefreshToken, setToken } from '@/utils/auth';
export default {
    data() {
        return { error: '' };
    },
    created(){
        this.bindAccount();
    },
    methods: {
        async bindAccount(){
            const code = this.$route.query.code;
            if (typeof code !== 'string' || !code) {
                this.error = '缺少授权码，请重新绑定账号';
                return;
            }
            try {
                await panelApi.get('/auth/console/bind', { params: { code } });
                await axios.post('/panel-api/v1/auth/refresh-token2',{token: getRefreshToken()},{
                    customToken: '',
                    noAlert: true,
                    timeout: 3000,
                    loading: true,
                }).then(res=>{
                    let refreshToken = res.data.refreshToken;
                    let token = res.data.token;
                    setRefreshToken(refreshToken);
                    setToken(token);
                    return res.data;
                }).catch(()=>{})

                this.$message.success('绑定账号成功');
                const returnPath = typeof this.$route.query.return === 'string' && this.$route.query.return.startsWith('/') && !this.$route.query.return.startsWith('//')
                    ? this.$route.query.return
                    : '/system/cloud';
                this.$router.replace(returnPath);
            } catch (error) {
                this.error = error?.message || '请重新绑定账号';
            }
        },
    }
}
</script>

<style>

</style>
