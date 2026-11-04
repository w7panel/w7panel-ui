<template>
    <div class="backup-page padding-20 df df-c">
        <route-breadcrumb />
        <div class="backup-content bg-white">
            <div v-if="status === 'loading'" class="backup-status">正在检查备份组件…</div>
            <a-empty v-else-if="status === 'missing'" class="mt-40">备份组件未安装，<span class="c-blue cursor" @click="installVisible = true">点击安装</span></a-empty>
            <a-empty v-else-if="status === 'installing'" class="mt-40">备份组件尚未安装完成，<span class="c-blue cursor" @click="checkBackup">刷新状态</span></a-empty>
            <a-empty v-else-if="status === 'error'" class="mt-40">备份组件加载失败，<span class="c-blue cursor" @click="checkBackup">重试</span></a-empty>
            <gateway-plugin-microapp v-else-if="microApp" :microapp="microApp" route="#/" instance-name="w7panel-backup" @error="status = 'error'" />
        </div>
        <store-install-drawer :show="installVisible" path="https://zpk.w7.cc/zpk/respo/info/w7panel-backup" @close="installVisible = false" @installedStatusSuccess="installVisible = false; checkBackup()" />
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { panelApi, k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import gatewayPluginMicroapp from '@/components/gateway-plugin-microapp.vue';
import storeInstallDrawer from '@/components/store-install-drawer.vue';

const status = ref('loading');
const microApp = ref(null);
const installVisible = ref(false);
let requestId = 0;

async function checkBackup() {
    const currentRequest = ++requestId;
    status.value = 'loading';
    microApp.value = null;
    const namespace = useNamespaceStore().namespace;
    const groupRequest = k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${encodeURIComponent(namespace)}/appgroups/w7panel-backup`, { noAlert: true })
        .catch(error => ({ error }));
    try {
        const response = await panelApi.get('/microapp/w7panel-backup/info', { noAlert: true });
        if (currentRequest !== requestId) return;
        if (!response?.data?.metadata?.name) throw new Error('备份组件前端未就绪');
        microApp.value = response.data;
        status.value = 'ready';
    } catch {
        if (currentRequest !== requestId) return;
        const group = await groupRequest;
        if (currentRequest !== requestId) return;
        status.value = group?.error
            ? group.error?.response?.status === 404 ? 'missing' : 'error'
            : group?.data?.status?.deployStatus === 'deployed' ? 'error' : 'installing';
    }
}

onMounted(checkBackup);
onBeforeUnmount(() => { requestId++; });
</script>

<style scoped>
.backup-page { height: 100%; min-height: 0; }
.backup-content { flex: 1; min-height: 480px; }
.backup-status { padding: 20px; color: var(--color-text-3); }
.backup-content :deep(wujie-app) { display: block; height: 100%; overflow: auto; }
</style>
