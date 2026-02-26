<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <a-tabs v-model:active-key="activekey">
                <a-tab-pane key="1" title="共享集群">
                    <div>
                        <menu-select
                            v-if="shared.show"
                            allowedMode="shared"
                            :permission="shared.list"
                            @checked="v=>shared.list=v"
                        />
                        <div class="mt-20">
                            <a-button @click="submitShared">保存</a-button>
                        </div>
                    </div>

                </a-tab-pane>
                <a-tab-pane key="2" title="独享集群">
                    <div>
                        <menu-select
                            v-if="virtual.show"
                            allowedMode="virtual"
                            :permission="virtual.list"
                            @checked="v=>virtual.list=v"
                        />
                        <div class="mt-20">
                            <a-button @click="submitVirtual">保存</a-button>
                        </div>
                    </div>
                </a-tab-pane>
            </a-tabs>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import menuSelect from './menu-select.vue'
import { useNamespaceStore } from '@/store';

export default {
    data(){
        return {
            namespaceActive: 'default',
            activekey: '1',
            shared: {
                list: [],
                show: false,
                hasConfig: true,
            },
            virtual:{
                list: [],
                show: false,
                hasConfig: true,
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
    },
    components: {
        menuSelect,
    },
    methods: {
        getData(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/k3k.shared.config",{noAlert:true}).then(res=>{
                let sharedPermission = res?.data?.data?.menu || '[]';
                sharedPermission = JSON.parse(sharedPermission);
                this.shared = {
                    list: sharedPermission,
                    show: true,
                    hasConfig: true,
                }
            }).catch(()=>{
                this.shared.hasConfig = false;
            }).finally(()=>{
                this.shared.show = true;
            })
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/k3k.virtual.config",{noAlert:true}).then(res=>{
                let virtualPermission = res?.data?.data?.menu || '[]';
                virtualPermission = JSON.parse(virtualPermission);
                this.virtual = {
                    list: virtualPermission,
                    show: true,
                    hasConfig: true,
                }
            }).catch(()=>{
                this.virtual.hasConfig = false;
            }).finally(()=>{
                this.virtual.show = true;
            })
        },
        submitShared(){
            let sharedPermission = JSON.stringify(this.shared.list);
            if(this.shared.hasConfig){
                k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/k3k.shared.config",{
                    data: {
                        menu: sharedPermission,
                    }
                },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
                    this.$message.success('操作成功')
                })
            }else{
                k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'k3k.shared.config',
                        namespace: this.namespaceActive,
                    },
                    data:{
                        menu: sharedPermission
                    }
                }).then(res=>{
                    this.shared.hasConfig = true;
                })
            }
        },
        submitVirtual(){
            let virtualPermission = JSON.stringify(this.virtual.list);
            if(this.virtual.hasConfig){
                k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/k3k.virtual.config",{
                    data: {
                        menu: virtualPermission,
                    }
                },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
                    this.$message.success('操作成功')
                })
            }else{
                k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'k3k.virtual.config',
                        namespace: this.namespaceActive,
                    },
                    data:{
                        menu: virtualPermission
                    }
                }).then(res=>{
                    this.virtual.hasConfig = true;
                    this.$message.success('操作成功');
                })
            }
        },
    },
}
</script>

<style>

</style>