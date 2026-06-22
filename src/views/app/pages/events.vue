<template>
    <div>
        <div class="padding-20">
            <!-- <route-breadcrumb :data="{id:title}" /> -->
            <div class="bg-white ">
                <table class="com-table"><tbody>
                    <tr>
                        <td>资源名</td>
                        <td>级别</td>
                        <td>内容</td>
                        <td>详细描述</td>
                        <td>时间</td>
                    </tr>
                    <tr v-for="(item,index) in list" :key="index">
                        <td>{{item.name}}</td>
                        <td>{{item.type}}</td>
                        <td>{{item.reason}}</td>
                        <td>{{item.message}}</td>
                        <td>{{item.eventTime}}</td>
                    </tr>
                    <tr v-if="!list || !list.length">
                        <td colspan="6"><a-empty /></td>
                    </tr>
                </tbody></table>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store'

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: '',
            list: [],
            apptype: 'deployments',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    computed: {
    //    ...mapState(['namespace','namespaceActive']),
    },
    watch: {
        data(v,ov){
            if(!Object.keys(ov)?.length){
                this.getList();
            }
        },
    },
    methods: {
        getList(){
            if(!this.data?.metadata?.uid || !this.data?.metadata?.name){return}
            let type = this.apptype=='deployments'? 'Deployment' : 'Statufulset';
            let query = `involvedObject.kind=${type},involvedObject.uid=${this.data.metadata.uid},involvedObject.name=${this.data.metadata.name},involvedObject.namespace=${this.namespaceActive}`

            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/events?fieldSelector='+encodeURIComponent(query),{loading:true}).then(res=>{
                this.list = res.data?.items || [];
                this.list = this.list.map(i=>{
                    i.name = i.metadata?.name;
                    i.eventTime = window.formatDate(i.eventTime);
                    return i;
                })
            })
        },

    }
}
</script>

<style>

</style>
