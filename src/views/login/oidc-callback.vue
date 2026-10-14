<template>
  <div class="oidc-callback">正在完成 OIDC 登录…</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { panelApi } from '@/utils/api';
import { setRefreshToken, setToken } from '@/utils/auth';
import useK3kinfo from '@/hooks/k3k-info';

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const error = String(route.query.error || '');
  const errorDescription = String(route.query.error_description || error);
  if (error) {
    router.replace({ name: 'login', query: { oidc_error: errorDescription } });
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
    const { data: k3kInfo = {} } = await useK3kinfo().catch(() => ({ data: {} }));
    router.replace({
      path: k3kInfo?.['w7.cc/role'] === 'normal'
        ? '/appgroup/w7panel-ckm-root/micro'
        : '/cluster/panel',
    });
  } catch (err: any) {
    router.replace({ name: 'login', query: { oidc_error: err?.response?.data?.error || err?.message || 'OIDC 登录失败' } });
  }
});
</script>

<style scoped>
.oidc-callback { display:flex; min-height:100vh; align-items:center; justify-content:center; color:var(--color-text-2); }
</style>
