<template>
    <div class="padding-20">
        <!-- <route-breadcrumb :data="{id:title}" /> -->
        <div class="mt-10">
            <a-button v-if="permission.includes('app-apps-edit')" type="primary" @click="$emit('editApp')"><template #icon><icon-edit /></template>修改</a-button>
            <!-- <a-button type="primary ml-20" @click="reload" ><template #icon><icon-refresh /></template>重启</a-button> -->
             <a-button v-if="debug" @click="showYAML=true;" class="ml-20" type="outline">YAML详情</a-button>
             <a-button @click="showSet=true;" class="ml-20" type="outline">安装配置</a-button>
             
        </div>
        <!-- <div >
            <a-tabs @change="v=>activeName=v" class="app-detail-tabs">
                <a-tab-pane title="应用详情" key="content"></a-tab-pane>
                <a-tab-pane title="YAML详情" key="yaml"></a-tab-pane>
                <a-tab-pane title="安装配置" key="set"></a-tab-pane>
            </a-tabs>
        </div> -->

        <detail-content :data="data" @refresh="$emit('refresh')"></detail-content>

        <a-drawer :width="800" :visible="showYAML" @cancel="showYAML=false;" unmountOnClose :footer="false">
            <template #title>YAML详情</template>
            <detail-yaml v-if="debug" :data="data" @refresh="$emit('refresh')"></detail-yaml>
        </a-drawer>
        
        <a-drawer :width="800" :visible="showSet" @cancel="showSet=false;" unmountOnClose :footer="false">
            <template #title>安装配置</template>
            <detail-env :data="data" @refresh="$emit('refresh')"></detail-env>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import detailContent from './detail-content.vue'
import detailYaml from './detail-yaml.vue'
import detailEnv from './detail-env.vue'

import axios from 'axios';
import { useNamespaceStore } from '@/store'
import { getUserInfo,getPermission } from '@/utils/auth';

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: 'default',
            activeName: 'content',
            canedit: true,
            permission: [],
            debug: false,

            showYAML: false,
            showSet: false,
        }
    },
    components: {
        detailContent,
        detailYaml,
        detailEnv,
    },
    watch: {
        data(v,ov){
            this.testEdit();
        },
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.testEdit();
    },
    methods: {
        testEdit(){
            let canedit = true;
            if(this.data?.metadata?.labels?.['app.kubernetes.io/managed-by'] && !this.data?.metadata?.labels?.['w7.cc/release-name']){
                canedit = false;
            }
            this.canedit = canedit;
        },
        reload(){
            k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, {
                metadata:{labels:{reload: String(Date.now())}}
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
            }).then(res=>{
                this.$message.success("操作成功");
                this.$emit('refresh');
            }).catch(()=>{})
        },
    }
}
</script>

<style>
.app-detail-tabs .arco-tabs-content{padding:0;}
</style>