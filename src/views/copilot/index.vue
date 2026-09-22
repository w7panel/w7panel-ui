<template>
  <div class="com-container copilot-page">
    <div class="bg-white padding-20 copilot-shell">
      <div class="df jc-b ai-c">
        <div><div class="fs-18 b">运维 Copilot</div><div class="c-99 mt-6">基于当前集群权限进行诊断；变更必须确认后才会执行。</div></div>
        <a-button @click="loadContext" :loading="contextLoading">刷新集群上下文</a-button>
      </div>
      <a-alert class="mt-16" type="warning">Copilot 不读取 Secret 内容。模型生成的资源变更会先进行服务端 dry-run 校验。</a-alert>
      <div v-if="context" class="c-99 fs-12 mt-8">当前诊断范围：{{ context.namespace }} · {{ context.nodes?.length || 0 }} 个节点 · {{ context.pods?.length || 0 }} 个 Pod · 指标{{ context.metrics === 'available' ? '可用' : '不可用' }}</div>
      <div class="copilot-conversation mt-16">
        <div v-for="(message, index) in messages" :key="index" :class="['copilot-message', message.role]">
          <div v-if="message.role === 'user'" class="user-message">{{ message.content }}</div>
          <Renderer v-else-if="message.content" :response="message.content" :library="copilotLibrary" :is-streaming="streaming && index === messages.length - 1" @error="handleRenderError" />
        </div>
        <a-empty v-if="!messages.length" description="例如：检查 default 命名空间近期 Pod 异常，并给出处理建议" />
      </div>
      <div class="df mt-16">
        <a-textarea v-model="input" :auto-size="{ minRows: 2, maxRows: 5 }" placeholder="描述要诊断的问题或希望执行的资源变更" @keydown.enter.exact.prevent="send" />
        <a-button class="ml-12" type="primary" :loading="streaming" :disabled="!input.trim()" @click="send">发送</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import { Renderer } from '@openuidev/vue-lang';
import { panelApi } from '@/utils/api';
import { getToken } from '@/utils/auth';
import { useNamespaceStore } from '@/store';
import { copilotLibrary } from '@/utils/copilot-ui';

const input = ref('');
const streaming = ref(false);
const contextLoading = ref(false);
const context = ref<any>(null);
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

const loadContext = async () => {
  contextLoading.value = true;
  try {
    context.value = (await panelApi.get('/copilot/context', { params: { namespace: useNamespaceStore().namespace } })).data;
  } finally {
    contextLoading.value = false;
  }
};

const send = async () => {
  const content = input.value.trim();
  if (!content || streaming.value) return;
  messages.value.push({ role: 'user', content });
  messages.value.push({ role: 'assistant', content: '' });
  input.value = '';
  streaming.value = true;
  try {
    const baseURL = axios.defaults.baseURL || '';
    const response = await fetch(`${baseURL}/panel-api/v1/copilot/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify({ namespace: useNamespaceStore().namespace, messages: [...messages.value.slice(0, -2), { role: 'user', content }] }),
    });
    if (!response.ok || !response.body) throw new Error('Copilot 请求失败');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try { messages.value[messages.value.length - 1].content += JSON.parse(data).choices?.[0]?.delta?.content || ''; } catch {}
      }
    }
  } catch (error: any) {
    messages.value.pop();
    Message.error(error?.message || 'Copilot 请求失败');
  } finally {
    streaming.value = false;
  }
};

const createProposal = async (event: Event) => {
  const detail = (event as CustomEvent).detail;
  try {
    const proposal = (await panelApi.post('/copilot/actions', detail)).data;
    Modal.confirm({ title: `${proposal.operation === 'delete' ? '删除' : '变更'} ${proposal.resource}`, content: '已通过服务端权限与 dry-run 校验。确认后将立即执行。', onOk: async () => { await panelApi.post(`/copilot/actions/${proposal.id}/confirm`); Message.success('资源变更已执行'); }, onCancel: () => panelApi.post(`/copilot/actions/${proposal.id}/reject`) });
  } catch (error: any) { Message.error(error?.response?.data?.msg || '资源提案校验失败'); }
};

const handleRenderError = () => Message.warning('Copilot 输出包含无法渲染的内容，请重新提问。');
onMounted(() => { window.addEventListener('w7panel-copilot-proposal', createProposal); loadContext(); });
onBeforeUnmount(() => window.removeEventListener('w7panel-copilot-proposal', createProposal));
</script>

<style scoped>
.copilot-shell { max-width: 1000px; margin: 0 auto; }
.copilot-conversation { min-height: 420px; max-height: calc(100vh - 300px); overflow: auto; background: var(--color-fill-1); padding: 16px; border-radius: 4px; }
.copilot-message { margin-bottom: 12px; }
.user-message { margin-left: auto; max-width: 75%; padding: 10px 12px; background: rgb(var(--primary-6)); color: #fff; border-radius: 8px; white-space: pre-wrap; }
:deep(.copilot-card) { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 8%); }
:deep(.copilot-card h3) { margin: 0 0 12px; }
:deep(.copilot-text) { white-space: pre-wrap; line-height: 1.7; }
:deep(.copilot-metric) { display: inline-flex; flex-direction: column; min-width: 120px; padding: 10px; margin: 0 8px 8px 0; background: var(--color-fill-2); border-radius: 4px; }
:deep(.copilot-alert) { padding: 10px; border-radius: 4px; margin: 8px 0; }
:deep(.copilot-alert.warning) { background: rgb(var(--orange-1)); color: rgb(var(--orange-6)); }
:deep(.copilot-alert.error) { background: rgb(var(--red-1)); color: rgb(var(--red-6)); }
:deep(.copilot-yaml pre) { max-height: 260px; overflow: auto; padding: 10px; background: #1e1e1e; color: #ddd; border-radius: 4px; }
</style>
