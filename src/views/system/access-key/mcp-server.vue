<template>
    <div class="df df-c padding-20" style="height: 100%">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <h3>MCP Server 连接配置</h3>
            <a-alert type="info" class="mb-20">
                下方配置自动使用当前浏览器保存的登录 token。token 过期或重新登录后，请刷新此页面并更新 MCP 客户端配置。
            </a-alert>
            <p>服务地址</p>
            <a-input v-model="endpoint" placeholder="https://面板域名/panel-api/v1/mcp" />
            <p class="mt-20">MCP 客户端配置：</p>
            <pre class="mcp-config">{{ clientConfig }}</pre>
            <p>配置包含登录 token，请使用 HTTPS 连接并妥善保管。</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { API_BASE_PATH } from '@/config/api';
import { getToken } from '@/utils/auth';

const endpoint = ref(`${window.location.origin}${API_BASE_PATH}/mcp`);
const token = getToken();
const clientConfig = computed(() => JSON.stringify({
    mcpServers: {
        w7panel: {
            type: 'http',
            url: endpoint.value,
            headers: { Authorization: `Bearer ${token}` },
        },
    },
}, null, 2));
</script>

<style scoped>
.mcp-config {
    overflow-x: auto;
    padding: 16px;
    background: #f7f8fa;
    border-radius: 4px;
}
</style>
