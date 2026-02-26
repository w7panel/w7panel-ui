<template>
    <div>
        <a-alert v-if="domainParse.exist" title="添加域名后，请在您持有域名的DNS解析后台添加对应的域名解析记录：" class="mt-20">
            <span>记录类型：</span>
            <span>{{ domainParse.type }}，</span>
            <span>记录值：</span>
            <span>{{ domainParse[domainParse.type=='A'?'ips':'cname'] }}</span>
            <span v-if="domainParse.type=='A'&&domainParse.ips.includes(',')">（IP任选一个，解析功能支持也可添加多条记录）</span>
        </a-alert>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import axios from 'axios';

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
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-parse',{noAlert:true,loading:true}).then(res=>{
                this.domainParse = {
                    exist: true,
                    type: res.data?.data?.type || 'A',
                    cname: res.data?.data?.cname || '',
                    ips: res.data?.data?.ips || '',
                }
            }).catch(()=>{})
        }
    }
}
</script>
<style scoped>
</style>
