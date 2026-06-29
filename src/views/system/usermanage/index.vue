<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <route-breadcrumb />
        <a-layout class="fc">
            <a-layout-sider :width="160">
                <div class="df df-c menu-absolute-div" style="position:absolute;inset:0;overflow:auto;">
                    <a-menu style="width:100%;" v-model:selected-keys="selectMenu" @menu-item-click="handelMicroMenu">
                        <a-menu-item v-if="permission.includes('usermanage/users')" key="users">用户管理</a-menu-item>
                        <a-menu-item v-if="permission.includes('usermanage/permission')" key="usermanage-permission">权限套餐</a-menu-item>
                        <a-menu-item v-if="permission.includes('usermanage/usermanage-whitedomain')" key="usermanage-whitedomain">备案域名</a-menu-item>
                        <a-menu-item v-if="permission.includes('usermanage/site-setting')" key="usermanage-site-setting">站点设置</a-menu-item>
                        <a-menu-item v-if="permission.includes('usermanage/usermanage-system')" key="usermanage-system">系统设置</a-menu-item>
                    </a-menu>
                </div>
            </a-layout-sider>

            <a-layout-content class="df df-c">
                <div class="bg-white routerviewbox fc ml-12" >
                    <router-view />
                </div>
            </a-layout-content>
        </a-layout>
    </div>
</template>

<script>
import { getPermission } from '@/utils/auth';
export default {
    data(){
        return {
            selectMenu: [],
            permission: [],
        }
    },
    created(){
        this.permission = getPermission() || [];
        this.selectMenu = this.$route.name;
    },
    watch:{
        '$route.name'(v){
            this.selectMenu = [v];
        },
    },
    methods: {
        handelMicroMenu(key){
            this.$router.push({name:key})
        }
    }
}
</script>

<style>

</style>
