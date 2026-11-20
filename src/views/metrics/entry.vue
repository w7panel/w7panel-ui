<template>
    <default-layout>
        <div class="padding-20">
            <a-spin v-if="loading" tip="正在检查监控应用" />
            <a-result v-else-if="error" status="error" title="无法检查监控应用" :subtitle="error">
                <template #extra><a-button @click="checkInstalled">重试</a-button></template>
            </a-result>
            <a-result v-else status="warning" title="未安装监控应用" subtitle="安装面板监控后即可查看监控大屏和管理监控插件。">
                <template #extra>
                    <a-button type="primary" @click="install">去安装</a-button>
                </template>
            </a-result>
        </div>
    </default-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DefaultLayout from '@/components/default-layout.vue';
import { k8sproxy } from '@/utils/api';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const installUrl = 'https://zpk.w7.cc/zpk/respo/info/w7panel_metrics';

function install() {
    router.push({ path: '/app/store-install', query: { path: installUrl } });
}

async function checkInstalled() {
    loading.value = true;
    error.value = '';
    try {
        const response = await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/default/appgroups/w7panel-metrics', { noAlert: true });
        if (response?.data?.metadata?.name) {
            await router.replace('/appgroup/w7panel-metrics/micro?do=%23%2Fdashboard');
            return;
        }
    } catch (cause: any) {
        if (cause?.response?.status !== 404) error.value = cause?.message || '请稍后重试';
    }
    loading.value = false;
}
onMounted(checkInstalled);
</script>
