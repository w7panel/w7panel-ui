<template>
  <div class="oidc-callback">{{ loginError || '正在完成 OIDC 登录…' }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { panelApi } from '@/utils/api';
import { continueAuthorization } from '@/utils/login-continuation';
import { setRefreshToken, setToken } from '@/utils/auth';
import useK3kinfo from '@/hooks/k3k-info';

const loginError = ref('');
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const error = String(route.query.error || '');
  const errorDescription = String(route.query.error_description || error);
  if (error) {
    loginError.value = errorDescription;
    return;
  }

  try {
    const response = await panelApi.post('/auth/oidc/callback', {
      code: String(route.query.code || ''),
      state: String(route.query.state || ''),
    });
    const data = response.data?.data || response.data || {};
    if (!data.token) throw new Error('OIDC 登录未返回 Panel Token');
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    if(await continueAuthorization(data.authRequestID, panelApi, url => { window.location.href = url; })) return;
    const { data: k3kInfo = {} } = await useK3kinfo().catch(() => ({ data: {} }));
    router.replace({
      path: k3kInfo?.['w7.cc/role'] === 'normal'
        ? '/appgroup/w7panel-ckm-root/micro'
        : '/cluster/panel',
    });
  } catch (err: any) {
    loginError.value = err?.response?.data?.error || err?.message || '登录或授权失败，请从原应用重新登录';
  }
});
</script>

<style scoped>
.oidc-callback { display:flex; min-height:100vh; align-items:center; justify-content:center; color:var(--color-text-2); }
</style>
