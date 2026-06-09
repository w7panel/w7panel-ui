<template>
    <div>
        <a-alert v-if="domainParse.exist" title="添加域名后，请在您持有域名的DNS解析后台添加对应的域名解析记录：" class="mt-20">
            <span>记录类型：</span>
            <span>{{ domainParse.type }}，</span>
            <span>记录值：</span>
            <span>{{ domainParse[domainParse.type=='A'?'ipsText':'cname'] }}</span>
            <span v-if="domainParse.type=='A'&&domainParse.ips.includes(',')">（IP任选一个，解析功能支持也可添加多条记录）</span>
        </a-alert>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';

export default{
    data(){
        return {
            namespaceActive: 'default',
            domainParse: {},
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init()
    },
    methods: {
        init(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/domainparseconfigs/domain-parse',{noAlert:true,loading:true}).then(res=>{
                let spec = res.data?.spec || {};
                let ips = spec.ips || [];
                this.domainParse = {
                    exist: true,
                    type: spec.type || 'A',
                    cname: spec.cname || '',
                    ips: ips.join(','),
                    ipsText: ips.join(','),
                }
            }).catch(()=>{})
        }
    }
}
</script>
<style scoped>
</style>
