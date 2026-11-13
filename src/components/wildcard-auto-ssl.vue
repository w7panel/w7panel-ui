<template>
    <span>
        <a-checkbox :model-value="modelValue" :disabled="disabled" @change="toggle">自动SSL证书</a-checkbox>
        <a-modal v-model:visible="visible" title="泛域名证书配置" :mask-closable="false" :ok-loading="busy" :on-before-ok="confirm" @cancel="visible=false" :popup-container="$popupContainer">
            <a-alert type="info" class="mb-20 wildcard-ssl-tip">
                <div>使用提示：</div>
                <div>DNS-01 模式：需要对接 DNS 平台的 API 密钥，每次证书签发时自动更新 TXT 解析记录，全自动化。</div>
                <div>DNS-PERSIST-01 模式：需要手动去 DNS 平台添加一条 TXT 解析记录，后续证书签发时无需修改，半自动化。</div>
            </a-alert>
            <a-form :model="form" auto-label-width>
                <a-form-item label="泛域名">{{ host }}</a-form-item>
                <a-form-item label="验证模式">
                    <a-radio-group model-value="dns-01">
                        <a-radio value="dns-01">DNS-01</a-radio>
                        <a-radio value="dns-persist-01" disabled>DNS-PERSIST-01（签发服务支持后开放）</a-radio>
                    </a-radio-group>
                </a-form-item>
                <template v-if="!selected">
                    <a-form-item label="DNS 平台">
                        <a-select v-model="form.provider" :options="providerOptions" />
                        <a-button class="ml-8" :disabled="!matchingProfiles.length" @click="reuseVisible = true">复用已有配置</a-button>
                    </a-form-item>
                    <a-form-item v-for="field in providerFields[form.provider]" :key="field.key" :label="field.label">
                        <a-input-password v-model="form.credentials[field.key]" :placeholder="field.placeholder || '请输入密钥'" allow-clear />
                    </a-form-item>
                </template>
                <a-form-item v-else label="DNS 平台">
                    {{ providerNames[selectedProfile?.provider] }}（复用 {{ selectedProfile?.name || selectedProfile?.zone }}）
                    <a-button type="text" class="ml-8" @click="selected = ''">新建配置</a-button>
                </a-form-item>
            </a-form>
        </a-modal>
        <a-modal v-model:visible="reuseVisible" title="复用已有配置" :footer="false" :popup-container="$popupContainer">
            <a-empty v-if="!matchingProfiles.length" description="暂无可复用配置" />
            <div v-for="profile in matchingProfiles" :key="profile.id" class="mb-12">
                <a-button type="text" @click="selected = profile.id; reuseVisible = false">*.{{ profile.zone }} - {{ providerNames[profile.provider] }}</a-button>
                <a-popconfirm content="删除该 DNS 配置？正在使用的配置无法删除。" @ok="removeProfile(profile.id)">
                    <a-button type="text" status="danger">删除</a-button>
                </a-popconfirm>
            </div>
        </a-modal>
    </span>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { panelApi } from '@/utils/api';
import { Message } from '@arco-design/web-vue';

const props = defineProps({ modelValue: Boolean, profileId: { type: String, default: '' }, host: { type: String, default: '' }, namespace: { type: String, required: true }, disabled: Boolean });
const emit = defineEmits(['update:modelValue', 'update:profileId']);
const visible = ref(false);
const reuseVisible = ref(false);
const busy = ref(false);
const selected = ref('');
const profiles = ref([]);
const form = reactive({ provider: 'alidns', credentials: {} });
const providerNames = { alidns: '阿里云 DNS', dnspod: 'DNSPod', cloudflare: 'Cloudflare', route53: 'Route53' };
const providerOptions = Object.entries(providerNames).map(([value, label]) => ({ value, label }));
const providerFields = {
    alidns: [{ key: 'ALICLOUD_ACCESS_KEY', label: 'AccessKey ID' }, { key: 'ALICLOUD_SECRET_KEY', label: 'AccessKey Secret' }],
    dnspod: [{ key: 'DNSPOD_API_KEY', label: 'API Token', placeholder: 'ID,Token' }],
    cloudflare: [{ key: 'CLOUDFLARE_DNS_API_TOKEN', label: 'API Token' }],
    route53: [{ key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID' }, { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key' }, { key: 'AWS_REGION', label: 'Region', placeholder: '例如 us-east-1' }],
};
const matchingProfiles = computed(() => profiles.value.filter(profile => wildcardInZone(props.host, profile.zone)));
const selectedProfile = computed(() => profiles.value.find(profile => profile.id === selected.value));

function wildcardInZone(host, zone) {
    const suffix = host.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
    const base = zone.toLowerCase().replace(/\.$/, '');
    return host.startsWith('*.') && (suffix === base || suffix.endsWith('.' + base));
}

watch(() => [props.host, props.modelValue, props.profileId], ([host, enabled, profile]) => {
    if (host.startsWith('*.') && enabled && !profile) {
        emit('update:modelValue', false);
        emit('update:profileId', '');
    }
}, { immediate: true });

async function toggle(value) {
    if (!value) {
        emit('update:modelValue', false);
        emit('update:profileId', '');
        return;
    }
    if (!props.host.startsWith('*.')) {
        emit('update:modelValue', true);
        return;
    }
    form.credentials = {};
    selected.value = props.profileId;
    busy.value = true;
    try {
        const response = await panelApi.get('/dns-profiles');
        profiles.value = response?.data || [];
        if (!matchingProfiles.value.some(profile => profile.id === selected.value)) selected.value = '';
        visible.value = true;
    } finally {
        busy.value = false;
    }
}

async function confirm() {
    busy.value = true;
    try {
        let id = selected.value;
        if (!id) {
            const response = await panelApi.post('/dns-profiles', { namespace: props.namespace, host: props.host, provider: form.provider, credentials: form.credentials });
            id = response?.data?.id;
        }
        if (!id) throw new Error('DNS 配置未保存');
        emit('update:profileId', id);
        emit('update:modelValue', true);
        visible.value = false;
        return true;
    } catch (error) {
        Message.error(error.message || 'DNS 验证失败');
        return false;
    } finally {
        busy.value = false;
    }
}

async function removeProfile(id) {
    busy.value = true;
    try {
        await panelApi.delete(`/dns-profiles/${id}`);
        profiles.value = profiles.value.filter(profile => profile.id !== id);
        if (selected.value === id) selected.value = '';
    } finally {
        busy.value = false;
    }
}
</script>

<style scoped>
.wildcard-ssl-tip :deep(.arco-alert-icon) {
    align-self: flex-start;
}
</style>
