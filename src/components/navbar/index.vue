<template>
    <div class="navbar">
        <div class="left-side">
            <a-space>
                <div @click="router.push('/')">
                    <img alt="logo" :src="logoimg" style="height:30px;" class="nav-logo" />
                </div>
                <icon-menu-fold
                    v-if="!topMenu && appStore.device === 'mobile'"
                    style="font-size: 22px; cursor: pointer"
                    @click="toggleDrawerMenu"
                />
            </a-space>
        </div>
        <div class="center-side df ai-c jc-b">
            <div class="fc df ai-c">
                <a-menu
                    v-if="route.name !== 'order-base-index' && route.name !== 'init-cluster-index'"
                    mode="horizontal"
                    :selected-keys="selkeys"
                >
                    <template v-if="userRole !== 'normal' && userRole !== 'tech'">
                        <a-menu-item key="cloudserver" @click="handleCloudserverClick">集群控制台</a-menu-item>
                    </template>
                    <a-menu-item
                        v-for="item in topApps"
                        :key="item.name"
                        @click="handleTopAppClick(item.name)"
                    >
                        {{ item.title }}
                    </a-menu-item>
                </a-menu>
            </div>
            <div class="df ai-c">
                <div
                    v-if="permissions && (permissions.includes('system-manage') || permissions.includes('system')) && route.name !== 'order-base-index' && route.name !== 'init-cluster-index'"
                >
                    <a-radio-group
                        v-model="appStore.menuFilter"
                        type="button"
                        @change="handleMenuGroupChange"
                    >
                        <a-radio v-if="permissions.includes('system-manage')" value="usermanage">多租户管理</a-radio>
                        <a-radio v-if="permissions.includes('system')" value="system">系统管理</a-radio>
                    </a-radio-group>
                </div>
            </div>
        </div>
        <ul class="right-side">
            <li>
                <a-tooltip :content="theme === 'light' ? $t('settings.navbar.theme.toDark') : $t('settings.navbar.theme.toLight')">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleToggleTheme">
                        <template #icon>
                            <icon-moon-fill v-if="theme === 'dark'" />
                            <icon-sun-fill v-else />
                        </template>
                    </a-button>
                </a-tooltip>
            </li>
            <li>
                <a-tooltip :content="isFullscreen ? $t('settings.navbar.screen.toExit') : $t('settings.navbar.screen.toFull')">
                    <a-button class="nav-btn" type="outline" :shape="'circle'" @click="toggleFullScreen">
                        <template #icon>
                            <icon-fullscreen-exit v-if="isFullscreen" />
                            <icon-fullscreen v-else />
                        </template>
                    </a-button>
                </a-tooltip>
            </li>
            <li>
                <a-popover position="br" trigger="hover" content-class="user-popover">
                    <div class="df ai-c cursor">
                        <a-avatar :size="32">
                            <icon-user style="font-size:24; stroke-width: 5;" class="df ai-c jc-c" />
                        </a-avatar>
                        <span class="ml-8">{{ userInfo && userInfo['w7.cc/username'] }}</span>
                    </div>
                    <template #content>
                        <div class="user-popover-card">
                            <div class="user-popover-card__top">
                                <div class="user-popover-card__avatar">
                                    <icon-user />
                                </div>
                                <div class="user-popover-card__info">
                                    <div class="user-popover-card__name">{{ userInfo && userInfo['w7.cc/username'] }}</div>
                                    <div class="user-popover-card__status" :class="{ 'is-bound': isRegister }">
                                        <icon-exclamation-circle-fill />
                                        <span>{{ isRegister ? '已绑定账号' : '未绑定账号' }}</span>
                                    </div>
                                </div>
                                <a-button type="outline" @click="router.push('/person/account')">个人中心 ></a-button>
                            </div>
                            <div class="user-popover-card__divider"></div>
                            <div class="user-popover-card__bottom">
                                <span class="user-popover-card__action" @click="openChangePwd">修改密码</span>
                                <span class="user-popover-card__action" @click="handleLogout">退出登录</span>
                            </div>
                        </div>
                    </template>
                </a-popover>
            </li>
        </ul>

        <a-modal
            v-model:visible="nsVisible"
            title="新建命名空间"
            @ok="createNamespace"
            @cancel="nsVisible = false"
            :popup-container="false ? '#allmodalbox' : 'body'"
        >
            <div class="df df-c ai-c jc-c">
                <a-input type="text" v-model="nsValue" placeholder="请输入命名空间名称" />
            </div>
        </a-modal>

        <a-drawer :visible="changePwd.show" title="修改密码" width="600px" @ok="submitPwd" @cancel="changePwd.show = false">
            <a-alert v-if="hasPwd === 'false'" style="margin-bottom:20px;">当前账号尚未设置密码，建议尽快设置，方便后续直接登录</a-alert>
            <a-form ref="pwdForm" :model="changePwd" auto-label-width>
                <a-form-item label="用户名">
                    <a-input v-model="changePwd.username" disabled />
                </a-form-item>
                <a-form-item
                    v-if="hasPwd !== 'false'"
                    label="旧密码"
                    field="oldPassword"
                    :rules="[{ required: true, message: '请输入旧密码' }]"
                    :validate-trigger="['change', 'blur']"
                >
                    <a-input v-model="changePwd.oldPassword" type="password" placeholder="旧密码" />
                </a-form-item>
                <a-form-item
                    label="新密码"
                    field="newPassword"
                    :rules="[{ required: true, message: '请输入新密码' }]"
                    :validate-trigger="['change', 'blur']"
                >
                    <a-input v-model="changePwd.newPassword" type="password" placeholder="新密码" />
                </a-form-item>
                <a-form-item
                    label="确认密码"
                    field="confirmPassword"
                    :rules="[
                        { required: true, message: '请输入确认密码' },
                        { validator: (value, cb) => { value !== changePwd.newPassword ? cb('两次密码不一致') : cb(); } }
                    ]"
                    :validate-trigger="['change', 'blur']"
                >
                    <a-input v-model="changePwd.confirmPassword" type="password" placeholder="确认密码" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script lang="ts" setup>
import { panelApi, k8sproxy } from '@/utils/api';
import { computed, ref, inject, reactive, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useDark, useToggle, useFullscreen, useStorage } from '@vueuse/core';
import { useAppStore, useNamespaceStore } from '@/store';
import useUser from '@/hooks/user';
import { useDarkStore } from '@/store';
import { getK8sinfo, getWebshell, getUserInfo, getPermission } from '@/utils/auth';
import { useRoute, useRouter } from 'vue-router';

const appStore = useAppStore();
const route = useRoute();
const router = useRouter();

const webshell = ref(getWebshell());
const userInfo = ref(getUserInfo());
const isRegister = ref(false);
const logoimg = ref(window.origin + '/assets/logo.png');
const permissions = ref(getPermission());

const currentMenuGroup = computed(() => {
    const matchedGroup = [...route.matched]
        .reverse()
        .find((record) => record?.meta?.menuGroup)?.meta?.menuGroup;

    return matchedGroup || 'cloudserver';
});

const selkeys = computed(() => {
    if (currentMenuGroup.value === 'cloudserver') {
        return ['cloudserver'];
    }

    if (currentMenuGroup.value === 'topapp') {
        return route.params.group ? [String(route.params.group)] : [];
    }

    return [];
});

const handleCloudserverClick = () => {
    appStore.changeMenuFilter('cloudserver');
    if (route.name !== 'cluster-panel') {
        router.push('/cluster/panel');
    }
};

const handleTopAppClick = (name: string) => {
    appStore.changeMenuFilter('topapp');
    if (route.name !== 'topapp-micro' || route.params.group !== name) {
        router.push(`/appgroup/${name}`);
    }
};

const handleMenuGroupChange = (value: string | number | boolean) => {
    const menuGroup = String(value);
    appStore.changeMenuFilter(menuGroup);
    const target = {
        usermanage: '/usermanage/users',
        system: '/system/cloud',
    }[menuGroup];

    if (target && route.path !== target) {
        router.push(target);
    }
};

const changePwd = reactive({
    show: false,
    username: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
});

const loginConfig = useStorage('login-config', { username: '' });
changePwd.username = loginConfig?.value?.username || '';

const openChangePwd = () => {
    changePwd.show = true;
    changePwd.oldPassword = '';
    changePwd.newPassword = '';
    changePwd.confirmPassword = '';
};

const pwdForm = ref<any>(null);
const submitPwd = () => {
    pwdForm.value.validate((err: any) => {
        if (err) {
            return;
        }
        panelApi.post('/auth/reset-password-current', {
            username: changePwd.username,
            password: encodeURIComponent(changePwd.oldPassword),
            newPassword: encodeURIComponent(changePwd.newPassword),
        }).then((res) => {
            if (!res?.data) {
                return;
            }
            Message.success('修改成功');
            changePwd.show = false;
            logout();
        });
    });
};

const namespaceList = useNamespaceStore().namespaceList;
const topApps = ref<{ title: string; name: string; roles: string[] }[]>([]);
const alreadyGetMenu = ref(false);

const userRole = getK8sinfo()['w7.cc/role'];
const hasPwd = ref(getK8sinfo()['w7.cc/has-password']);

const getMenutop = () => {
    panelApi.get('/microapp/top').then((res) => {
        const items = res.data?.items || [];
        alreadyGetMenu.value = true;
        topApps.value = items.map((i: any) => {
            const roles: string[] = [];
            try {
                let rl = i?.spec?.bindings || [];
                rl = rl.filter((item: any) => item.support === 'thirdparty_cd');
                rl.forEach((r: any) => {
                    roles.push(r.name);
                });
            } catch {}

            return {
                title: i?.metadata?.annotations?.title || i?.spec?.title,
                name: i.metadata.name,
                roles,
            };
        });
    });
};

const getConsoleInfo = () => {
    panelApi.get('/auth/console/info?code=test').then((res) => {
        let data = res?.data;
        if (data && data.code === 200 && data.data) {
            data = data.data;
        }
        isRegister.value = !!data?.is_register;
    }).catch(() => {});
};

if (route.name !== 'order-base-index' && route.name !== 'init-cluster-index') {
    getMenutop();
    getConsoleInfo();
}

watch(() => route.name, () => {
    if (!alreadyGetMenu.value && route.name !== 'order-base-index' && route.name !== 'init-cluster-index') {
        getMenutop();
    }
    if (route.name !== 'order-base-index' && route.name !== 'init-cluster-index') {
        getConsoleInfo();
    }
});

const nsValue = ref('');
const nsVisible = ref(false);
const createNamespace = () => {
    const value = nsValue.value;
    if (!value) {
        Message.warning('请输入命名空间名称');
        return;
    }
    if (namespaceList.includes(value)) {
        Message.warning('命名空间已存在');
        return;
    }
    const data = {
        kind: 'Namespace',
        apiVersion: 'v1',
        metadata: {
            name: value,
        },
    };
    k8sproxy.post('/api/v1/namespaces', data).then(() => {
        Message.success('创建成功');
        useNamespaceStore().setNamespaceList();
    });
};

const { logout } = useUser();
const { isFullscreen, toggle: toggleFullScreen } = useFullscreen();
const theme = computed(() => appStore.theme);
const topMenu = computed(() => appStore.topMenu && appStore.menu);

const isDark = useDark({
    selector: 'body',
    attribute: 'arco-theme',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'arco-theme',
    onChanged(dark: boolean) {
        appStore.toggleTheme(dark);
        useDarkStore().setDark(dark);
    },
});

const toggleTheme = useToggle(isDark);
const handleToggleTheme = () => {
    toggleTheme();
};

const handleLogout = () => {
    logout();
};

const ttInject = inject('toggleDrawerMenu') as (() => void) | undefined;
const toggleDrawerMenu = () => {
    ttInject?.();
    const toggleEvent = new CustomEvent('toggle-drawer');
    window.dispatchEvent(toggleEvent);
};
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

.user-popover.arco-popover-popup-content{
    padding:0;
    border:0;
    border-radius: 10px;
    background-color: transparent;
    box-shadow: none;
}
.user-popover-card{
    width: 360px;
    padding: 18px 20px;
    border: 1px solid var(--color-border-2);
    border-radius: 10px;
    background: var(--color-bg-2);
    color: var(--color-text-1);
}

.user-popover-card__top{
    display: flex;
    align-items: center;
    gap: 16px;
}

.user-popover-card__avatar{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border: 1px solid var(--color-border-2);
    border-radius: 50%;
    color: rgb(var(--primary-6));
    flex-shrink: 0;
}

.user-popover-card__avatar .arco-icon{
    font-size: 34px;
}

.user-popover-card__info{
    flex: 1;
    min-width: 0;
}

.user-popover-card__name{
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-text-1);
    word-break: break-all;
}

.user-popover-card__status{
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
    color: rgb(var(--warning-6));
}

.user-popover-card__status.is-bound{
    color: rgb(var(--success-6));
}

.user-popover-card__divider{
    height: 1px;
    margin: 18px 0 14px;
    background: var(--color-border-2);
}

.user-popover-card__bottom{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.user-popover-card__action{
    color: rgb(var(--primary-6));
    cursor: pointer;
    transition: opacity .2s ease;
}

.user-popover-card__action:hover{
    opacity: .8;
}
</style>
