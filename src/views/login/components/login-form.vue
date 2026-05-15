<template>
  <div class="login-form-wrapper df df-c ai-c" style="margin-top:-50px;">
    <!-- <div class="login-form-title">登录</div> -->
    <div class="df ai-c jc-c">
        <img :src="logoimg" alt="" style="width:auto;height:42px;" class="nav-logo">
        <span style="padding:0 10px;color:#ccc;">/</span>
        <span class="colorfont">您的专属服务器管家</span>
    </div>
    <!-- <div class="login-form-sub-title">{{ $t('login.form.title') }}</div> -->
    <div class="formbox">
        <a-form v-if="!canInitUser.init" ref="loginForm" :model="userInfo" class="login-form" layout="vertical" @submit="submit">
            <div class="login-form-error-msg">{{ errorMessage }}</div>
            <a-form-item field="username" :rules="[{ required: true, message: $t('login.form.userName.errMsg') }]" :validate-trigger="['change', 'blur']" hide-label>
                <a-input v-model="userInfo.username" :placeholder="$t('login.form.userName.placeholder')">
                    <template #prefix><icon-user /></template>
                </a-input>
            </a-form-item>
            <a-form-item field="password" :rules="[{ required: true, message: $t('login.form.password.errMsg') }]" :validate-trigger="['change', 'blur']" hide-label style="margin-top:20px;">
                <a-input-password v-model="userInfo.password" :placeholder="$t('login.form.password.placeholder')" allow-clear>
                    <template #prefix><icon-lock /></template>
                </a-input-password>
            </a-form-item>
            <a-space :size="16" direction="vertical" class="mt-20">
                <div class="login-form-password-actions">
                    <a-checkbox checked="rememberPassword" :model-value="loginConfig.rememberPassword" @change="setRememberPassword">记住密码</a-checkbox>
                    <!-- <a-link>忘记密码</a-link> -->
                    <div v-if="canInitUser.allowConsoleRegister" class="cursor c-blue" @click="consoleLogin">控制台登录</div>
                </div>
                <a-button type="primary" :disabled="$route.query.consolelogin=='1'" html-type="submit" long :loading="loading">登录</a-button>
                <!-- <a-button type="text" long class="login-form-register-btn">{{ $t('login.form.register') }}</a-button> -->
            </a-space>
        </a-form>
        <a-form v-else ref="initForm" :model="canInitUser" class="login-form" layout="vertical" @submit="toInit">
            <div v-if="errorMessage" class="c-red" style="margin-bottom:10px;">{{ errorMessage }}</div>
            <div class="c-red" style="margin-bottom:10px;">首次登录，请设置管理员账号密码</div>
            <a-form-item field="username" :rules="[{ required: true, message: '请输入用户名' }]" :validate-trigger="['change', 'blur']" hide-label >
                <a-input v-model="canInitUser.username" placeholder="用户名">
                    <template #prefix><icon-user /></template>
                </a-input>
            </a-form-item>
            <a-form-item field="pwd" :rules="[{ required: true, message:'请输入密码' }]" :validate-trigger="['change', 'blur']" hide-label class="mt-10">
                <a-input-password v-model="canInitUser.pwd" placeholder="密码" allow-clear>
                    <template #prefix><icon-lock /></template>
                </a-input-password>
            </a-form-item>
            <a-form-item field="checkpwd" :rules="[{ required: true, message:'请输入密码' }, {validator:(value,cb)=>{value!==canInitUser.pwd?cb('两次密码不一致'):cb()}}]" :validate-trigger="['change', 'blur']" hide-label class="mt-10">
                <a-input-password v-model="canInitUser.checkpwd" placeholder="确认密码" allow-clear>
                    <template #prefix><icon-lock /></template>
                </a-input-password>
            </a-form-item>
            <a-space :size="16" direction="vertical" class="mt-10">
                <a-button type="primary" html-type="submit" long :loading="loading">确定</a-button>
            </a-space>
        </a-form>
    </div>
    <a-modal :visible="drawer.show" width="auto" class="slidecapt-modal" hide-title :footer="false" :popup-container="false?'#allmodalbox':'body'">
        <slide-capt ref="slidecapt" @confirm="drawer.ok" @close="drawer.show=false;" />
    </a-modal>

  </div>
</template>

<script lang="ts" setup>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useI18n } from 'vue-i18n';
import { useStorage } from '@vueuse/core';
import { useUserStore,useNamespaceStore } from '@/store';
import useLoading from '@/hooks/loading';
import SlideCapt from "@/components/slide-capt.vue";
import axios from 'axios';
import { getK8sinfo } from '@/utils/auth';
import useK3kinfo from '@/hooks/k3k-info';

const router = useRouter();
const { t } = useI18n();
const errorMessage = ref(null);
const slidecapt = ref(null);
const { loading, setLoading } = useLoading();
const userStore = useUserStore();

const logoimg = ref(window.origin + '/assets/logo.png')

panelApi.get('/noauth/site/k3k-config',{noAlert:true}).then(res=>{
    if(res?.data?.data?.indexpage=='resource' && !sessionStorage.getItem('passResourcePage')){
        router.push({
            path: '/',
            query: router?.currentRoute?.value?.query || {},
        });
    }
}).catch(()=>{})


const canInitUser = reactive({
    init: false,
    username: '',
    pwd: '',
    checkpwd: '',
    allowConsoleRegister: false,
    captchaEnabled: true,
    configLoaded: false, // 配置是否已加载
});
const toInit = ({ errors, values, })=>{
    if (loading.value){ return };
    if (errors) { return };
    panelApi.post('/auth/init-user',{
        username: values.username,
        password: encodeURIComponent(values.pwd),
    }).then(res=>{
        Message.success('初始化成功');
        canInitUser.init = false;
    }).catch(err=>{
        errorMessage.value = err?.response?.data?.error || err?.response?.data?.message;
    })
}


panelApi.get('/noauth/site/init-user').then(res=>{
    let resData = res.data;
    if(res.data && res.data.code === 200 && res.data.data) {
        resData = res.data.data;
    }
    if(resData.allowConsoleRegister===true || resData.allowConsoleRegister==='true'){
        canInitUser.allowConsoleRegister = true;
    }
    if(resData.canInitUser===true || resData.canInitUser==='true'){
        canInitUser.init = true;
    }
    if(resData.captchaEnabled===false || resData.captchaEnabled==='false'){
        canInitUser.captchaEnabled = false;
    }
    canInitUser.configLoaded = true; // 标记配置已加载
})

const consoleLogin = ()=>{
    let policyName = router?.currentRoute?.value?.query?.policyName || '';
    let couponCode = router?.currentRoute?.value?.query?.couponCode || '';
    window.location.href = '/panel-api/v1/auth/console/oauth?redirect_uri='+encodeURIComponent(window.location.origin + '/console-login?policyName=' + policyName + '&couponCode=' + couponCode);
}
if(router?.currentRoute?.value?.query?.consolelogin=='1'){
    consoleLogin();
}

const loginConfig = useStorage('login-config', {
    rememberPassword: true,
    username: '', // 演示默认值
    password: '', // demo default value
});
const userInfo = reactive({
    username: loginConfig.value.username,
    password: loginConfig.value.password,
    point: '',
    key: '',
});
const drawer = reactive({
    show: false,
    ok: (data)=>{
        panelApi.post('/verify-captcha',{
            point: data.point,
            key: data.key,
        }).then(res=>{
            if(res.data?.ok){
                userInfo.point = data.point;
                userInfo.key = data.key;
                handleSubmit();
                drawer.show = false;
            }else{
                console.log(slidecapt)
                slidecapt.value.wrong();
            }
        })
    }
});

const namespaceActive = useNamespaceStore().namespace;

const testWeihu = async ()=>{
    let data = getK8sinfo();
    if(data['w7.cc/weihu']=='true'){ return true; }
    try{
        await k8sproxy.get('/version',{noAlert:true})
    }catch{
        return true;
    }
    return false;
}
const beforeTest = async ()=>{
    await useNamespaceStore().setNamespaceList().catch(()=>{})
    k8sproxy.get("/api/v1/namespaces/"+ namespaceActive +"/services/kubernetes", {loading:true, noAlert:true}).then(async res=>{
        let boo = await testWeihu()
        if(boo){
            router.push('/init-cluster')
            return;
        };
        const { redirect } = router.currentRoute.value.query;
        router.push(redirect? redirect : {name:'cluster-panel'} as any);
        Message.success({
            content: t('login.form.login.success'),
        });
    }).catch(()=>{
        router.push('/init-cluster')
        // router.push('/resource-loading')
    });
}

const submit = ({ errors, values, })=>{
    if (loading.value){ return };
    if (errors) { return };
    // 等待配置加载完成
    if(!canInitUser.configLoaded){
        Message.warning('配置加载中，请稍后...');
        return;
    }
    if(!canInitUser.captchaEnabled){
        handleSubmit();
    }else{
        drawer.show = true;
    }
}

const handleSubmit = async () => {
    setLoading(true);
    try {
        let {data} = await userStore.login({
            ...userInfo,
            password: encodeURIComponent(userInfo.password),
        });
        console.log('loooooooooogin',data)
        
        const authRequestID = router?.currentRoute?.value?.query?.authRequestID
        if(authRequestID){
            
            panelApi.post('/callback-url',{
                authRequestID: authRequestID,
            }).then(res=>{
                window.location.href = res.data.callbackUrl;
            });

            return;
        }

        const {data:k3kInfo} = await useK3kinfo();
        console.log('k3kinfo',k3kInfo)
        if(!data.isK3kUser){
            beforeTest();
        }else{
            let couponCode = router?.currentRoute?.value?.query?.couponCode || '';
            
            if(k3kInfo?.['w7.cc/need-create-order']=='true' || k3kInfo?.['w7.cc/need-renew']=='true'){
                router.push('/order-base?couponCode=' + couponCode);
            }else if(k3kInfo?.['w7.cc/k3k-job-status']=='complete'){
                beforeTest();
            }else{
                router.push('/init-cluster')
            }
        }
        const { rememberPassword } = loginConfig.value;
        const { username, password } = userInfo;
        // 实际生产环境需要进行加密存储。
        // The actual production environment requires encrypted storage.
        loginConfig.value.username = rememberPassword ? username : '';
        loginConfig.value.password = rememberPassword ? password : '';
    } catch (err) {
        errorMessage.value = err?.response?.data?.error || err?.response?.data?.message;
        // errorMessage.value = (err as Error).message;
    } finally {
        setLoading(false);
    }
};
const setRememberPassword = (value: boolean) => {
    loginConfig.value.rememberPassword = value;
};
</script>

<style>
.slidecapt-modal .arco-modal{background:transparent;}
.slidecapt-modal .arco-modal-body{padding:0; overflow:visible;}
</style>
<style lang="less" scoped>
.formbox{width:360px; margin-top:30px; padding:20px 20px 40px; background-color: var(--color-bg-2);; border-radius:10px;}
.colorfont{
    font-weight: 400;
    color: #333;
    font-size: 22px;
    background: linear-gradient(92.06deg, #ffaf49 -17.9%, #602c07 43.39%, #1b1303 99.4%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
}
.login-form {
  &-wrapper {
    width: 800px;
  }

  &-title {
    color: var(--color-text-1);
    font-weight: 500;
    font-size: 24px;
    line-height: 32px;
  }

  &-sub-title {
    color: var(--color-text-3);
    font-size: 16px;
    line-height: 24px;
  }

  &-error-msg {
    height: 32px;
    color: rgb(var(--red-6));
    line-height: 32px;
  }

  &-password-actions {
    display: flex;
    justify-content: space-between;
  }

  &-register-btn {
    color: var(--color-text-3) !important;
  }
}
</style>
