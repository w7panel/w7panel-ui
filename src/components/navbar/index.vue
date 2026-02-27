<template>
    <div class="navbar">
        <div class="left-side">
            <a-space>
                <div @click="$router.push('/')">
                    <!-- <img v-if="isDark" alt="logo" src="@/assets/images/logo-dark.png" style="height:30px;" /> -->
                    <img alt="logo" :src="logoimg" style="height:30px;" class="nav-logo" />
                </div>
                <icon-menu-fold v-if="!topMenu && appStore.device === 'mobile'" style="font-size: 22px; cursor: pointer" @click="toggleDrawerMenu"/>
            </a-space>
        </div>
        <div class="center-side df ai-c jc-b">
            <div class="fc df ai-c">
                <!-- <a-button :type="appStore.menuFilter=='cloudserver'?'primary':'outline'" @click="appStore.changeMenuFilter('cloudserver');$router.push('/cluster/panel');">云主机</a-button>
                <a-button
                    v-for="(item,index) in topApps"
                    :key="index"
                    :type="($route.name=='topapp-micro'&&$route.params.group==item.name)?'primary':'outline'"
                    @click="$router.push('/appgroup/'+item.name)"
                    class="ml-10"
                >{{ item.title }}</a-button> -->

                <a-menu v-if="$route.name!='order-base-index'&&$route.name!='init-cluster-index'" mode="horizontal" v-model:selected-keys="selkeys">
                    <a-menu-item key="cloudserver" @click="appStore.changeMenuFilter('cloudserver');$router.push('/cluster/panel');testMenu();">云主机</a-menu-item>
                    <a-menu-item v-for="(item,index) in topApps" :key="item.name" @click="$router.push('/appgroup/'+item.name)">{{ item.title }}</a-menu-item>
                </a-menu>
                
                <!-- <a-button-group v-if="topApps.length" size="small" class="topapp-group">
                    <a-button
                        v-for="(item,index) in topApps"
                        :key="index"
                        :class="{active:$route.name=='topapp-micro'&&$route.params.group==item.name}"
                        @click="$router.push('/appgroup/'+item.name)"
                    >{{ item.title }}</a-button>
                </a-button-group> -->
            </div>
            <div class="df ai-c">
                <div v-if="permissions && (permissions.includes('system-manage')||permissions.includes('system')) && $route.name!='order-base-index' && $route.name!='init-cluster-index'">
                    <a-radio-group v-model="appStore.menuFilter" type="button" @change="v=>{appStore.changeMenuFilter(v);$router.push({usermanage:'/usermanage/users',system:'/system/cloud'}[v]);}">
                        <a-radio v-if="permissions.includes('system-manage')" value="usermanage">多租户管理</a-radio>
                        <a-radio v-if="permissions.includes('system')" value="system">系统管理</a-radio>
                    </a-radio-group>
                    <!-- <a-button :type="appStore.menuFilter=='usermanage'?'primary':'outline'" @click="appStore.changeMenuFilter('usermanage');$router.push('/usermanage/users');"></a-button>
                    <a-button :type="appStore.menuFilter=='system'?'primary':'outline'" @click="appStore.changeMenuFilter('system');$router.push('/system/cloud');" class="ml-20"></a-button> -->
                </div>
            </div>
        </div>
        <ul class="right-side">
            <li>
                <a-tooltip :content="theme === 'light'? $t('settings.navbar.theme.toDark') : $t('settings.navbar.theme.toLight')">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleToggleTheme" >
                        <template #icon>
                            <icon-moon-fill v-if="theme === 'dark'" />
                            <icon-sun-fill v-else />
                        </template>
                    </a-button>
                </a-tooltip>
            </li>
            <li>
                <a-tooltip :content="isFullscreen? $t('settings.navbar.screen.toExit') : $t('settings.navbar.screen.toFull')">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="toggleFullScreen">
                        <template #icon>
                            <icon-fullscreen-exit v-if="isFullscreen" />
                            <icon-fullscreen v-else />
                        </template>
                    </a-button>
                </a-tooltip>
            </li>
            <li>
                <a-dropdown trigger="click" position="br">
                    <a-avatar :size="32" :style="{ marginRight: '8px', cursor: 'pointer' }">
                        <!-- <img alt="avatar" :src="avatar" /> -->
                        <icon-user style="font-size:24; stroke-width: 5;" class="df ai-c jc-c"/>
                    </a-avatar>
                    <span>{{userInfo&&userInfo['w7.cc/username']}}</span>
                    <template #content>
                        <a-doption>
                            <a-space @click="openChangePwd">
                                <icon-lock />
                                <span>修改密码</span>
                            </a-space>
                        </a-doption>
                        <a-doption>
                            <a-space @click="handleLogout">
                                <icon-export />
                                <span>退出登录</span>
                            </a-space>
                        </a-doption>
                    </template>
                </a-dropdown>
            </li>
        </ul>

        <a-modal v-model:visible="nsVisible" title="新建命名空间" @ok="createNamespace" @cancel="nsVisible = false" :popup-container="false?'#allmodalbox':'body'">
            <div class="df df-c ai-c jc-c">
                <a-input type="text" v-model="nsValue" placeholder="请输入命名空间名称" />
            </div>
        </a-modal>

        <a-drawer :visible="changePwd.show" title="修改密码" width="600px" @ok="submitPwd" @cancel="changePwd.show=false;">
            <a-alert v-if="hasPwd=='false'" style="margin-bottom:20px;">暂未设置账号密码，建议尽快设置，方便后续直接登录</a-alert>
            <a-form ref="pwdForm" :model="changePwd" auto-label-width >
                <a-form-item label="用户名">
                    <a-input v-model="changePwd.username" disabled/>
                </a-form-item>
                <a-form-item v-if="hasPwd!=='false'" label="旧密码" field="oldPassword" :rules="[{ required: true, message: '请输入旧密码' }]" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.oldPassword" type="password" placeholder="旧密码" />
                </a-form-item>
                <a-form-item label="新密码" field="newPassword" :rules="[{ required: true, message: '请输入新密码' }]" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.newPassword" type="password" placeholder="新密码" />
                </a-form-item>
                <a-form-item label="确认密码" field="confirmPassword" :rules="[{ required: true, message: '请输入新密码' },{validator:(value,cb)=>{value!==changePwd.newPassword?cb('两次密码不一致'):cb()}}]" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.confirmPassword" type="password" placeholder="确认密码" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script lang="ts" setup>
import { panelApi } from '@/utils/api';
    import { k8sproxy } from '@/utils/api';
    
    import { computed, ref, inject, reactive, watch} from 'vue';
    import { Message } from '@arco-design/web-vue';
    import { useDark, useToggle, useFullscreen } from '@vueuse/core';
    import { useAppStore, useNamespaceStore} from '@/store';
    import useUser from '@/hooks/user';
    import axios from 'axios';
    import {useDarkStore} from '@/store'
    import { getToken,getK8sinfo } from '@/utils/auth';
    import { useStorage } from '@vueuse/core';
    import { useRoute } from 'vue-router'

    import { getWebshell } from '@/utils/auth';
    import { getUserInfo } from '@/utils/auth';
    import { getPermission } from '@/utils/auth';

    const appStore = useAppStore();
    const route = useRoute()

    const webshell = ref(getWebshell());

    const userInfo = ref(getUserInfo());

    const logoimg = ref(window.origin + '/logo.png')

    const permissions = ref(getPermission());
    
    const selkeys = ref([]);
    const testMenu = ()=>{
        if(appStore.menuFilter=='cloudserver'){
            selkeys.value = ['cloudserver']
        }else if(route.name=='topapp-micro'){
            selkeys.value = [route.params.group]
        }else{
            selkeys.value = [];
        }
    }
    testMenu();
    const stopWatch = watch(
        () => route.path,
        () => {
            testMenu();
        }
    )


    // 修改密码
    const changePwd = reactive({
        show: false,
        username: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const loginConfig = useStorage('login-config', {username:''})
    changePwd.username = loginConfig?.value?.username || '';

    const openChangePwd = ()=>{
        changePwd.show = true;
        changePwd.oldPassword = '';
        changePwd.newPassword = '';
        changePwd.confirmPassword = '';
    }
    const pwdForm = ref(null);
    const submitPwd = ()=>{
        pwdForm.value.validate((err) => {
            if (err) {return;}
            panelApi.post('/auth/reset-password-current',{
                username: changePwd.username,
                password: changePwd.oldPassword,
                newPassword: changePwd.newPassword,
            }).then(res=>{
                if(!res?.data){return;}
                Message.success('修改成功');
                changePwd.show = false;
                logout();
            })
        });
    }
    
    // 选择namespace
    const namespaceList = useNamespaceStore().namespaceList;
    let webshelllink = ref('');
    let isInMicro = ref(false);
    if((window as any).__MICRO_APP_ENVIRONMENT__){
        let token = getToken();
        isInMicro.value = true;
        webshelllink.value = (window as any)?.microApp?.getData()?.originUrl || '';
        webshelllink.value = webshelllink.value.replace(/\/$/,'') + '/fp/webshell?api_token=' + token;
    }else{
        webshelllink.value = '/fp/webshell';
    }

    // 应用
    const topApps = ref([]);
    const alreadyGetMenu = ref(false);
    
    let userRole = getK8sinfo()['w7.cc/role'];

    const hasPwd = ref(getK8sinfo()['w7.cc/has-password'])
    
    const getMenutop = ()=>{
        panelApi.get('/microapp/top').then(res=>{
            let items = res.data.items;
            alreadyGetMenu.value = true;
            topApps.value = items.map(i=>{
                let roles = []
                try{
                    let rl = i?.spec?.bindings || [];
                    rl = rl.filter(i=>i.support == "thirdparty_cd")
                    rl.map(r=>{
                        roles.push(r.name)
                    })
                }catch{}
                
                return {
                    title: i?.metadata?.annotations?.title || i?.spec?.title,
                    name: i.metadata.name,
                    roles: roles,
                }
            })
            console.log(topApps.value)
            topApps.value = topApps.value.filter(i=>i.roles?.length >=2 )
        })
        // k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/default/appgroups?labelSelector=w7.cc/menu-location=top').then(res=>{
        //     let items = res.data.items;
        //     alreadyGetMenu.value = true;
        //     topApps.value = items.map(i=>{
        //         let roles = []
        //         try{
        //             let rl = JSON.parse(i?.metadata?.annotations?.['w7.cc/bindings']) || [];
        //             rl = rl.filter(i=>i.support == "thirdparty_cd")
        //             rl.map(r=>{
        //                 roles.push(r.name)
        //             })
        //         }catch{}
                
        //         return {
        //             title: i?.spec?.title,
        //             name: i.metadata.name,
        //             roles: roles,
        //         }
        //     })
        //     topApps.value = topApps.value.filter(i=>i.roles?.length >=2 )
        // })
    }
    if(userRole=='founder' && route.name!='order-base-index' && route.name!='init-cluster-index'){
        getMenutop();
    }
    watch(() => route.name, () => {
        if(!alreadyGetMenu.value && userRole=='founder' && route.name!='order-base-index' && route.name!='init-cluster-index'){
            getMenutop();
        }
    })
    
    // 创建namespace
    let nsValue = ref('');
    let nsVisible = ref(false);
    let createNamespace = ()=>{
        let value = nsValue.value;
        if (!value) {Message.warning('请输入命名空间名称'); return;}
        if (namespaceList.includes(value)) {Message.warning('命名空间已存在'); return;}
        let data = {
            "kind": "Namespace",
            "apiVersion": "v1",
            "metadata": {
                "name": value
            },
        }
        k8sproxy.post('/api/v1/namespaces',data).then(res=>{
            Message.success('创建成功');
            useNamespaceStore().setNamespaceList()
        })
    }
    
    const { logout } = useUser();
    const { isFullscreen, toggle: toggleFullScreen } = useFullscreen();
    const theme = computed(() => {
        return appStore.theme;
    });
    const topMenu = computed(() => appStore.topMenu && appStore.menu);
    const isDark = useDark({
        selector: 'body',
        attribute: 'arco-theme',
        valueDark: 'dark',
        valueLight: 'light',
        storageKey: 'arco-theme',
        onChanged(dark: boolean) {
            // overridden default behavior
            appStore.toggleTheme(dark);
            useDarkStore().setDark(dark);
            // document.body.setAttribute('data-theme', dark?'dark':'light');
        },
    });
    const toggleTheme = useToggle(isDark);
    const handleToggleTheme = () => {
        toggleTheme();
    };
    const handleLogout = () => {
        logout();
    };

    
    const ttInject = inject('toggleDrawerMenu') as () => void;
    const toggleDrawerMenu = ()=>{
        ttInject?.();
        // 创建自定义事件，可携带参数
        const toggleEvent = new CustomEvent('toggle-drawer');
        // 派发全局事件
        window.dispatchEvent(toggleEvent);
    }
</script>

<style scoped lang="less">
.navbar {
    display: flex;
    justify-content: space-between;
    height: 100%;
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border);
}

.left-side {
    display: flex;
    align-items: center;
    padding-left: 20px;
    min-width: 180px;
}

.center-side {
    flex: 1;
}

.right-side {
    display: flex;
    padding-right: 20px;
    list-style: none;
    :deep(.locale-select) { border-radius: 20px; }
    li {
        display: flex;
        align-items: center;
        padding: 0 10px;
    }

    a {
        color: var(--color-text-1);
        text-decoration: none;
    }
    .nav-btn {
        border-color: rgb(var(--gray-2));
        color: rgb(var(--gray-8));
        font-size: 16px;
    }
    .trigger-btn,
    .ref-btn {
        position: absolute;
        bottom: 14px;
    }
    .trigger-btn {
        margin-left: 14px;
    }
}
</style>

<style lang="less">
.message-popover {
    .arco-popover-content {
        margin-top: 0;
    }
}

.topapp-group{padding:2px; background-color:var(--color-fill-2); border-radius:var(--border-radius-small); margin-right:20px;}
.topapp-group .arco-btn-secondary:hover, .arco-btn-secondary[type='button']:hover{background-color: var(--color-bg-5);}
.topapp-group .arco-btn-secondary.active{background-color: var(--color-bg-5);color:rgb(var(--primary-6));}

</style>
