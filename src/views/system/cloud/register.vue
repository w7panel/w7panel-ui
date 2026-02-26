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
export default {
    created(){
        this.register();
    },
    methods: {
        register(){
            let code = this.$route.query.code;
            panelApi.get('/console/bind?code='+code).then(res=>{
                panelApi.post('/console/register-to-console?offline_url='+window.location.origin).then(res=>{
                    this.$message.success('注册集群成功');
                    this.$router.replace('/system/cloud');
                })
            })
        },
    }
}
</script>

<style>

</style>