<template>
    <div class="df df-c ai-c">
        <div class="df ai-c" style="margin-top:80px;">
            <icon-loading v-if="!loginError" class="c-99" style="font-size:30px;" />
            <span class="c-99 ml-20" style="font-size:20px;">{{ loginError || '登录中...' }}</span>
        </div>
        <contact-us></contact-us>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import axios from 'axios';
import { continueAuthorization } from '@/utils/login-continuation';
import { setToken,setPermission, setUserInfo,getK8sinfo, setRefreshToken } from '@/utils/auth';
import useK3kinfo from '@/hooks/k3k-info';
import { useNamespaceStore } from '@/store';
  import contactUs from '@/components/contact-us.vue';


export default {
    data(){
        return {
            namespaceActive: 'default',
            loginError: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.toLogin();
    },
    methods: {
        toLogin(){
            panelApi.get('/auth/console/login',{
                params:{
                    code: this.$route.query.code,
                    policyName: this.$route.query?.policyName || '',
                }
            }).then(async res=>{
                
                setRefreshToken(res.data.refreshToken)
                setToken(res.data.token);
                
                if(await continueAuthorization(this.$route.query.authRequestID, panelApi, url => { window.location.href = url; })) return;
                let data = res.data;

                
                const {data:k3kInfo} = await useK3kinfo();

                if(k3kInfo?.['w7.cc/role']=='normal'){
                    this.$router.push('/appgroup/w7panel-ckm-root/micro')
                    return;
                }
                this.beforeTest();
            }).catch(err => {
                this.loginError = err?.response?.data?.error || err?.message || '登录失败，请从原应用重新登录';
            })
        },
        
        async beforeTest(){
            await useNamespaceStore().setNamespaceList().catch(()=>{})
            await k8sproxy.get('/api/v1/namespaces/default/services/kubernetes', {loading:true, noAlert:true}).then(async res=>{
                let boo = await this.testWeihu()
                const redirect = this.$route.query?.redirect;
                const isMicroAppDirect = Boolean(window?.w7_microapp?.name);
                this.$router.push(isMicroAppDirect ? '/' : (redirect? redirect : {name:'cluster-panel'}));
                this.$message.success('欢迎使用');
            }).catch(()=> this.$router.push({name:'cluster-panel'}));
        },

        async testWeihu(){
            let data = getK8sinfo();
            if(data['w7.cc/weihu']=='true'){ return true; }
            try{
                await k8sproxy.get('/version',{noAlert:true})
            }catch{
                return true;
            }
            return false;
        },

    },
}
</script>

<style>

</style>
