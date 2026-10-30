<template>
    <div class="df df-c padding-20" style="height: 100%">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <h3>MCP Server 连接配置</h3>
            <a-radio-group v-model="authMode" type="button" class="mb-20">
                <a-radio value="oidc">OIDC 登录</a-radio>
                <a-radio value="token">面板 Token（兼容）</a-radio>
            </a-radio-group>
            <a-alert v-if="authMode === 'oidc'" type="info" class="mb-20">
                MCP 客户端通过浏览器完成 OAuth 登录。客户端需支持固定 Client ID；在其 OAuth 设置中填写下方 Client ID 与 Scopes。如服务端配置了 Client Secret，还需在客户端填写；服务端未开放动态客户端登记。
            </a-alert>
            <a-alert v-else type="info" class="mb-20">
                下方配置使用当前浏览器保存的登录 token。token 过期或重新登录后，请刷新页面并更新客户端配置。
            </a-alert>
            <p>服务地址</p>
            <a-input v-model="endpoint" placeholder="https://面板域名/panel-api/v1/mcp" />
            <template v-if="authMode === 'oidc'">
                <p class="mt-20">Client ID</p>
                <a-input v-model="clientId" placeholder="default" />
                <p class="mt-20">Scopes：openid mcp offline_access</p>
            </template>
            <p class="mt-20">MCP 客户端配置：</p>
            <pre class="mcp-config">{{ clientConfig }}</pre>
            <p v-if="authMode === 'oidc'">客户端配置格式各不相同：将服务地址填入 MCP HTTP 地址，并在客户端的 OAuth 设置中填写上述 Client ID 与 Scopes。</p>
            <p v-else>配置包含登录 token，请使用 HTTPS 连接并妥善保管。</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { API_BASE_PATH } from '@/config/api';
import { getToken } from '@/utils/auth';

const endpoint = ref(`${window.location.origin}${API_BASE_PATH}/mcp`);
const authMode = ref<'oidc' | 'token'>('oidc');
const clientId = ref('default');
const token = getToken();
const clientConfig = computed(() => JSON.stringify({
    mcpServers: {
        w7panel: {
            type: 'http',
            url: endpoint.value,
            ...(authMode.value === 'token' ? { headers: { Authorization: `Bearer ${token}` } } : {}),
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
