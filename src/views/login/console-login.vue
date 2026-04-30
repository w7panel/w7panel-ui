<template>
    <div class="df df-c ai-c">
        <div class="df ai-c" style="margin-top:80px;">
            <icon-loading class="c-99" style="font-size:30px;" />
            <span class="c-99 ml-20" style="font-size:20px;">登录中...</span>
        </div>
        <contact-us></contact-us>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import axios from 'axios';
import { setToken,setPermission, setUserInfo,getK8sinfo, setRefreshToken } from '@/utils/auth';
import treeData from '@/config/treedata.json';
import useK3kinfo from '@/hooks/k3k-info';
import { useNamespaceStore } from '@/store';
  import contactUs from '@/components/contact-us.vue';


export default {
    data(){
        return {
            namespaceActive: 'default',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.treeData = treeData;
        this.toLogin();
    },
    methods: {
        getAllKeys(tree) {
            const keys = [];
            function traverse(node) {
                keys.push(node.key);
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => traverse(child));
                }
            }
            tree.forEach(root => traverse(root));
            return keys;
        },
        toLogin(){
            panelApi.get('/auth/console/login',{
                params:{
                    code: this.$route.query.code,
                    policyName: this.$route.query?.policyName || '',
                }
            }).then(async res=>{
                
                setRefreshToken(res.data.refreshToken)
                setToken(res.data.token);
                
                let data = res.data;

                
                const {data:k3kInfo} = await useK3kinfo();

                if(!data.isK3kUser){
                    this.beforeTest();
                }else{
                    let couponCode = this.$route.query?.couponCode || '';

                    if(k3kInfo?.['w7.cc/support-cvm']=='true' && k3kInfo?.['w7.cc/is-cvm-req']=='false'){
                        this.$router.push('/usermanage/resource')
                    }else if(k3kInfo?.['w7.cc/need-create-order']=='true' || k3kInfo?.['w7.cc/need-renew']=='true'){
                        this.$router.push('/order-base?couponCode=' + couponCode);
                    }else if(k3kInfo?.['w7.cc/k3k-job-status']=='complete'){
                        this.beforeTest()
                    }else{
                        this.$router.push('/init-cluster')
                    }
                }
            })
        },
        
        async beforeTest(){
            await useNamespaceStore().setNamespaceList().catch(()=>{})
            await k8sproxy.get('/api/v1/namespaces/default/services/kubernetes', {loading:true, noAlert:true}).then(async res=>{
                let boo = await this.testWeihu()
                if(boo){
                    this.$router.push('/init-cluster')
                    return;
                };
                const redirect = this.$route.query?.redirect;
                this.$router.push(redirect? redirect : {name:'cluster-panel'});
                this.$message.success('欢迎使用');
            }).catch(()=>{
                this.$router.push('/init-cluster')
                // this.$router.push('/resource-loading')
            });
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