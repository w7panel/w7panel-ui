<template>
    <div>
        <a-alert v-if="domainParse.exist && !domainParse.configured" type="warning" class="mt-20">系统尚未配置域名解析记录，请联系管理员获取。</a-alert>
        <a-alert v-else-if="domainParse.exist" title="添加域名后，请在您持有域名的DNS解析后台添加对应的域名解析记录：" class="mt-20">
            <span>记录类型：</span>
            <span>{{ domainParse.type }}，</span>
            <span>记录值：</span>
            <span>{{ domainParse[domainParse.type=='A'?'ipsText':'cname'] }}</span>
            <span v-if="domainParse.type=='A'&&domainParse.ips.includes(',')">（IP任选一个，解析功能支持也可添加多条记录）</span>
        </a-alert>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';

export default{
    data(){
        return {
            domainParse: {},
        }
    },
    created(){
        this.init()
    },
    methods: {
        init(){
            panelApi.get('/domain-parse',{noAlert:true,loading:true}).then(res=>{
                let spec = res.data?.spec || {};
                let ips = (Array.isArray(spec.ips) ? spec.ips : [])
                    .filter(ip => typeof ip === 'string' && ip.trim())
                    .map(ip => ip.trim());
                let type = spec.type || 'A';
                this.domainParse = {
                    exist: true,
                    type,
                    cname: spec.cname || '',
                    ips: ips.join(','),
                    ipsText: ips.join(','),
                    configured: type === 'A' ? ips.length > 0 : !!spec.cname,
                }
            }).catch(error=>{
                if(error?.response?.status === 404) this.domainParse = { exist: true, configured: false }
            })
        }
    }
}
</script>
<style scoped>
</style>
