<template>
    <div class="person-account-page df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <a-descriptions layout="horizontal" column="1" bordered class="account-description">
                <descriptions-item label="用户名">{{ baseInfo.username }}</descriptions-item>
                <descriptions-item label="UID">{{ baseInfo.uid }}</descriptions-item>
                <descriptions-item label="密码">
                    <span>{{ hasPwd === 'false' ? '未设置' : '已设置' }}</span>
                    <span class="ml-20 c-blue cursor" @click="openChangePwd">修改密码</span>
                </descriptions-item>
                <descriptions-item label="注册时间">{{ baseInfo.registerTime }}</descriptions-item>
            </a-descriptions>

            <a-descriptions class="account-description mt-30" layout="horizontal" column="1" bordered>
                <descriptions-item label="绑定账号">
                    <div v-if="isRegister" class="df">
                        <div class="df df-c ai-c changeuser cursor" @click="bindAccount">
                            <div class="imgbox">
                                <img v-if="cloudUserInfo.avatar" :src="cloudUserInfo.avatar" alt="" @error="cloudUserInfo.avatar='';" />
                                <div v-else class="imgempty df df-c ai-c jc-c c-ff">
                                    <icon-user />
                                </div>
                                <div class="btn df df-c ai-c jc-c c-ff">
                                    <icon-sync class="fs-20" />
                                    <span class="mt-4 fs-12">切换账号</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <template v-else>
                        <span>{{ bindStatusText }}</span>
                        <span class="ml-20 c-blue cursor" @click="bindAccount">立即绑定</span>
                    </template>
                </descriptions-item>
                <template v-if="isRegister">
                    <descriptions-item label="昵称">{{ cloudUserInfo.nickname || '-' }}</descriptions-item>
                    <descriptions-item label="云端UID">{{ cloudUserInfo.user_id || '-' }}</descriptions-item>
                </template>
            </a-descriptions>
        </div>

        <a-drawer :visible="changePwd.show" title="修改密码" width="600px" @ok="submitPwd" @cancel="changePwd.show=false;">
            <a-alert v-if="hasPwd=='false'" style="margin-bottom:20px;">当前账号尚未设置密码，建议先设置，方便后续直接登录</a-alert>
            <a-form ref="pwdForm" :model="changePwd" auto-label-width>
                <a-form-item label="用户名">
                    <a-input v-model="changePwd.username" disabled />
                </a-form-item>
                <a-form-item v-if="hasPwd!=='false'" label="旧密码" field="oldPassword" :rules="[{ required: true, message: '请输入旧密码' }]" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.oldPassword" type="password" placeholder="旧密码" />
                </a-form-item>
                <a-form-item label="新密码" field="newPassword" :rules="[{ required: true, message: '请输入新密码' }]" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.newPassword" type="password" placeholder="新密码" />
                </a-form-item>
                <a-form-item label="确认密码" field="confirmPassword" :rules="confirmPasswordRules" :validate-trigger="['change', 'blur']">
                    <a-input v-model="changePwd.confirmPassword" type="password" placeholder="确认密码" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { Message } from '@arco-design/web-vue';
import { clearToken, getK8sinfo, getUserInfo } from '@/utils/auth';
import { useStorage } from '@vueuse/core';

const emptyBaseInfo = () => ({
    username: '-',
    uid: '-',
    registerTime: '-',
});

export default {
    data() {
        const loginConfig = useStorage('login-config', { username: '' });
        return {
            baseInfo: emptyBaseInfo(),
            cloudInfo: {
                offlineUrl: '-',
                licenseType: '',
                licenseTypeText: '-',
                licenseEndTime: '-',
            },
            cloudUserInfo: {},
            isRegister: false,
            hasPwd: getK8sinfo()['w7.cc/has-password'],
            changePwd: {
                show: false,
                username: loginConfig?.value?.username || getUserInfo()?.['w7.cc/username'] || '',
                oldPassword: '',
                newPassword: '',
                confirmPassword: '',
            },
            confirmPasswordRules: [
                { required: true, message: '请输入确认密码' },
                {
                    validator: (value, cb) => {
                        value !== this.changePwd.newPassword ? cb('两次密码输入不一致') : cb();
                    }
                }
            ],
        };
    },
    computed: {
        bindStatusText() {
            return this.isRegister ? '已绑定' : '未绑定';
        },
    },
    created() {
        this.getBaseInfo();
        this.getCloudInfo();

        if (this.$route.query.code) {
            const code = this.$route.query.code;
            this.$router.push({ query: {} });
            panelApi.get('/auth/console/bind?code=' + code).then(() => {
                Message.success('绑定成功');
                this.getCloudInfo();
            });
        }
    },
    methods: {
        formatRegisterTime(data) {
            const raw = data?.created_at || data?.createTime || data?.created || data?.createdAt || data?.creationTimestamp || data?.registerTime;
            if (!raw) { return '-'; }
            return window.formatDate ? window.formatDate(raw) : raw;
        },
        pickUid(data) {
            return data?.uid || data?.sub || data?.id || data?.['w7.cc/uid'] || '-';
        },
        getBaseInfo() {
            panelApi.get('/auth/userinfo').then((res) => {
                let data = res?.data;
                if (data && data.code === 200 && data.data) {
                    data = data.data;
                }
                const localUser = getUserInfo();
                const merged = {
                    ...localUser,
                    ...data,
                };
                this.baseInfo = {
                    username: merged?.['w7.cc/username'] || merged?.username || '-',
                    uid: this.pickUid(merged),
                    registerTime: this.formatRegisterTime(merged),
                };
                this.changePwd.username = this.baseInfo.username === '-' ? this.changePwd.username : this.baseInfo.username;
            });
        },
        getCloudInfo() {
            panelApi.get('/auth/console/info?code=test').then((res) => {
                let data = res?.data;
                if (data && data.code === 200 && data.data) {
                    data = data.data;
                }
                const licenseType = data?.license_type || '';
                this.isRegister = !!data?.is_register;
                this.cloudInfo = {
                    offlineUrl: data?.offline_url || '-',
                    licenseType,
                    licenseTypeText: {
                        team: '团队版',
                        company: '企业版',
                        free: '免费版',
                    }[licenseType] || licenseType || '-',
                    licenseEndTime: data?.license_end_time || '-',
                };
                this.cloudUserInfo = data?.userinfo || {};
            });
        },
        openChangePwd() {
            this.changePwd.show = true;
            this.changePwd.oldPassword = '';
            this.changePwd.newPassword = '';
            this.changePwd.confirmPassword = '';
        },
        submitPwd() {
            this.$refs.pwdForm.validate((err) => {
                if (err) { return; }
                panelApi.post('/auth/reset-password-current', {
                    username: this.changePwd.username,
                    password: this.changePwd.oldPassword,
                    newPassword: this.changePwd.newPassword,
                }).then((res) => {
                    if (!res?.data) { return; }
                    Message.success('修改成功，请重新登录');
                    this.changePwd.show = false;
                    clearToken();
                    this.$router.push('/login');
                });
            });
        },
        bindAccount() {
            window.location.href = '/panel-api/v1/auth/console/oauth?redirect_uri=' + encodeURIComponent(window.location.origin + '/person/account');
        },
    },
};
</script>

<style scoped>
.person-account-page{
    min-height: 100%;
}

.changeuser .imgbox{position:relative; width:70px; height:70px; border-radius:50%; overflow:hidden;}
.changeuser .imgbox .btn{position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:none;}
.changeuser:hover .imgbox .btn{display:flex;}
.changeuser .imgbox img{display:block; width:100%; height:100%;}
.imgempty{width:100%; height:100%; background:var(--color-fill-4); font-size:34px;}
</style>

<style>
.account-description .arco-descriptions-row td{padding:10px 20px!important; vertical-align:top;}
.account-description .arco-descriptions-item-label{text-align:right!important; min-width:160px;}
</style>
