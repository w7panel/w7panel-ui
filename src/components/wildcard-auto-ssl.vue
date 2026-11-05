<template>
    <span>
        <a-checkbox :model-value="modelValue" :disabled="disabled" @change="toggle">自动SSL证书</a-checkbox>
        <a-modal v-model:visible="visible" title="泛域名 DNS-01 配置" :mask-closable="false" :ok-loading="busy" :on-before-ok="confirm" @cancel="visible=false" :popup-container="$popupContainer">
            <a-alert type="info" class="mb-16">泛域名证书需要 DNS-01 验证。密钥只保存在服务端，验证成功后才能启用自动 HTTPS。</a-alert>
            <a-form :model="form" auto-label-width>
                <a-form-item label="泛域名">{{ host }}</a-form-item>
                <a-form-item label="已有配置">
                    <a-select v-model="selected" placeholder="选择同一区域的已验证配置">
                        <a-option v-for="profile in matchingProfiles" :key="profile.id" :value="profile.id" :label="`${profile.name || '未命名配置'} · ${providerNames[profile.provider]} · ${profile.zone}`" />
                    </a-select>
                    <a-button type="text" class="ml-8" @click="selected = ''">新建配置</a-button>
                    <a-popconfirm v-if="selected" content="删除该 DNS 配置？正在使用的配置无法删除。" @ok="removeSelected">
                        <a-button type="text" status="danger" class="ml-8">删除</a-button>
                    </a-popconfirm>
                </a-form-item>
                <template v-if="!selected">
                    <a-form-item label="配置名称"><a-input v-model="form.name" :max-length="80" placeholder="例如生产环境阿里云" /></a-form-item>
                    <a-form-item label="DNS 平台"><a-select v-model="form.provider" :options="providerOptions" /></a-form-item>
                    <a-form-item label="DNS 区域"><a-input v-model="form.zone" placeholder="例如 example.com" /></a-form-item>
                    <a-form-item v-for="field in providerFields[form.provider]" :key="field.key" :label="field.label">
                        <a-input-password v-model="form.credentials[field.key]" :placeholder="field.placeholder || '请输入密钥'" allow-clear />
                    </a-form-item>
                </template>
            </a-form>
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
const busy = ref(false);
const selected = ref('');
const profiles = ref([]);
const form = reactive({ name: '', provider: 'alidns', zone: '', credentials: {} });
const providerNames = { alidns: '阿里云 DNS', dnspod: 'DNSPod', cloudflare: 'Cloudflare', route53: 'Route53' };
const providerOptions = Object.entries(providerNames).map(([value, label]) => ({ value, label }));
const providerFields = {
    alidns: [{ key: 'ALICLOUD_ACCESS_KEY', label: 'AccessKey ID' }, { key: 'ALICLOUD_SECRET_KEY', label: 'AccessKey Secret' }],
    dnspod: [{ key: 'DNSPOD_API_KEY', label: 'API Token', placeholder: 'ID,Token' }],
    cloudflare: [{ key: 'CLOUDFLARE_DNS_API_TOKEN', label: 'API Token' }],
    route53: [{ key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID' }, { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key' }, { key: 'AWS_REGION', label: 'Region', placeholder: '例如 us-east-1' }],
};
const matchingProfiles = computed(() => profiles.value.filter(profile => wildcardInZone(props.host, profile.zone)));

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
    form.zone = props.host.slice(2).replace(/\.$/, '');
    form.name = '';
    form.credentials = {};
    selected.value = props.profileId;
    busy.value = true;
    try {
        const response = await panelApi.get('/dns-profiles');
        profiles.value = response?.data || [];
        if (!matchingProfiles.value.some(profile => profile.id === selected.value)) selected.value = matchingProfiles.value[0]?.id || '';
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
            if (!form.name.trim()) throw new Error('请输入配置名称');
            if (!wildcardInZone(props.host, form.zone)) throw new Error('DNS 区域与泛域名不匹配');
            const response = await panelApi.post('/dns-profiles', { namespace: props.namespace, name: form.name.trim(), provider: form.provider, zone: form.zone, credentials: form.credentials });
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

async function removeSelected() {
    busy.value = true;
    try {
        await panelApi.delete(`/dns-profiles/${selected.value}`);
        profiles.value = profiles.value.filter(profile => profile.id !== selected.value);
        selected.value = matchingProfiles.value[0]?.id || '';
    } finally {
        busy.value = false;
    }
}
</script>
