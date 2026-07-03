<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <menu-select
                v-if="menu.show"
                :permission="menu.list"
                @checked="v=>menu.list=v"
            />
            <div class="mt-20">
                <a-button @click="submitMenu">保存</a-button>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import menuSelect from './menu-select.vue'
import { useNamespaceStore } from '@/store';

const MENU_CONFIGMAP_NAME = 'k3k.menu.config';

export default {
    data(){
        return {
            namespaceActive: 'default',
            menu: {
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
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + MENU_CONFIGMAP_NAME,{noAlert:true}).then(res=>{
                let menuPermission = res?.data?.data?.menu || '[]';
                menuPermission = JSON.parse(menuPermission);
                this.menu = {
                    list: menuPermission,
                    show: true,
                    hasConfig: true,
                }
            }).catch(()=>{
                this.menu.hasConfig = false;
            }).finally(()=>{
                this.menu.show = true;
            })
        },
        submitMenu(){
            let menuPermission = JSON.stringify(this.menu.list);
            if(this.menu.hasConfig){
                k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + MENU_CONFIGMAP_NAME,{
                    data: {
                        menu: menuPermission,
                    }
                },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
                    this.$message.success('操作成功')
                })
            }else{
                k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: MENU_CONFIGMAP_NAME,
                        namespace: this.namespaceActive,
                    },
                    data:{
                        menu: menuPermission
                    }
                }).then(res=>{
                    this.menu.hasConfig = true;
                })
            }
        },
    },
}
</script>

<style>

</style>
