<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <div class="bg-white fc df ai-c jc-c">
            <a-spin :size="32" />
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import { getRefreshToken, setRefreshToken, setToken } from '@/utils/auth';
export default {
    created(){
        this.register();
    },
    methods: {
        async register(){
            let code = this.$route.query.code;

            panelApi.get('/auth/console/bind?code='+code).then(res=>{
                panelApi.post('/auth/console/register-to-console?offline_url='+window.location.origin).then(async res=>{
                    
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

                    this.$message.success('注册集群成功');
                    const returnPath = typeof this.$route.query.return === 'string' && this.$route.query.return.startsWith('/')
                        ? this.$route.query.return
                        : '/system/cloud';
                    this.$router.replace(returnPath);
                })
            })
        },
    }
}
</script>

<style>

</style>
