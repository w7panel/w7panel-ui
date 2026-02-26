<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <!-- <route-breadcrumb class="df-s0" :data="{id:$route.id}" /> -->
        <Breadcrumb :routes="topbc" />
        <a-layout class="fc">
            <a-layout-sider :width="100">
                <div class="df df-c" style="height:100%;">
                    <a-tabs v-model:active-key="menukey" @tab-click="changeKey" class="db-detailmenu" position="left" hide-content>
                        <a-tab-pane key="panel" title="概览"></a-tab-pane>
                        <a-tab-pane key="olog" title="操作记录"></a-tab-pane>
                        <a-tab-pane key="monitor" title="实时监控"></a-tab-pane>
                        <a-tab-pane v-if="dbtype=='mysql'||dbtype=='postgresql'||dbtype=='mongodb'||dbtype=='redis'" key="ini" title="参数设置"></a-tab-pane>
                    </a-tabs>
                </div>
            </a-layout-sider>
            <a-layout-content class="ml-6 df df-c">
                <router-view :data="data" @refresh="getInfo" :dbtype="dbtype" />
            </a-layout-content>
        </a-layout>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store'

export default {
    data(){
        return {
            namespaceActive: '',
            defaultMenuKey: 'panel',
            menukey: 'panel',
            data: null,
            topbc: [
                {name:'root'},
                {name: "app", label: "应用管理"},
                {name: "database-list", label: "集群数据库"},
                {name: "database-detail", label: this.$route.params.id},
                {name: "database-detail-panel", label: '概览'},
            ],
            dbtype: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
        this.getInfo();
    },
    watch: {
        '$route.name'(){
            this.init();
        },
    },
    methods: {
        init(){
            let match = this.$route.name.match(/^database\-detail\-([\w\-]+)$/);
            match && (this.defaultMenuKey = this.menukey = match[1]);
            this.topbc[4] = {
                name: "database-detail-"+this.menukey,
                label: {
                    "panel":"概览",
                    "olog":"操作记录",
                    "monitor":"实时监控",
                    'ini': "参数设置",
                }[this.menukey],
            }
        },
        getInfo(){
            k8sproxy.get('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/clusters/'+this.$route.params.id).then(res=>{
                this.data = res?.data;
                this.dbtype = this.data?.metadata?.labels?.['w7panel.kubeblocks.io/name'];
            });
        },
        changeKey(){
            if(this.menukey == this.defaultMenuKey){return}
            this.$router.push({name:'database-detail-'+this.menukey, params:this.$route.params});
        },
    },
}
</script>

<style>
.db-detailmenu,
.db-detailmenu .arco-tabs-nav-tab{width:100%;}
.db-detailmenu .arco-tabs-nav{width:100px; padding-top:10px;}

.db-tabs .arco-drawer-body{padding:0;}
.db-tabs .arco-tabs-tab.arco-tabs-tab-active{
    background:var(--color-bg-2);
}
</style>