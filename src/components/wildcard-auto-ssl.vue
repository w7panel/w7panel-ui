<template>
    <span>
        <a-checkbox :model-value="modelValue" :disabled="disabled" @change="toggle">自动SSL证书</a-checkbox>
        <a-button v-if="modelValue && host.startsWith('*.')" type="text" size="mini" @click="toggle(true)">配置</a-button>
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
                        <a-button class="ml-8" :disabled="!profiles.length" @click="reuseVisible = true">复用已有配置</a-button>
                    </a-form-item>
                    <a-form-item v-for="field in providerFields[form.provider]" :key="field.key" :label="field.label">
                        <a-input-password v-model="form.credentials[field.key]" :placeholder="field.placeholder || '请输入密钥'" allow-clear />
                    </a-form-item>
                </template>
                <a-form-item v-else label="DNS 平台">
                    {{ providerNames[selectedProfile?.provider] }}（复用 {{ selectedProfile?.name || selectedProfile?.zone }}）
                    <a-button type="text" class="ml-8" @click="selected = ''">新建配置</a-button>
                </a-form-item>
                <a-alert v-if="selectedProfile && !wildcardInZone(host, selectedProfile.zone)" type="info">将验证当前泛域名，并为它创建独立的 DNS 配置。</a-alert>
                <a-form-item label="自动解析">
                    <a-checkbox :model-value="resolveSelected" :disabled="!parseConfigured" @change="resolveSelected = $event">自动解析</a-checkbox>
                    <a-tooltip :content="parseTip">
                        <icon-question-circle class="ml-8 c-orange" />
                    </a-tooltip>
                </a-form-item>
            </a-form>
        </a-modal>
        <a-modal v-model:visible="reuseVisible" title="复用已有配置" :footer="false" :popup-container="$popupContainer">
            <a-empty v-if="!profiles.length" description="暂无可复用配置" />
            <div v-for="profile in profiles" :key="profile.id" class="mb-12">
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

const props = defineProps({ modelValue: Boolean, profileId: { type: String, default: '' }, autoResolve: Boolean, host: { type: String, default: '' }, namespace: { type: String, required: true }, disabled: Boolean });
const emit = defineEmits(['update:modelValue', 'update:profileId', 'update:autoResolve']);
const visible = ref(false);
const reuseVisible = ref(false);
const busy = ref(false);
const selected = ref('');
const profiles = ref([]);
const resolveSelected = ref(false);
const parseConfigured = ref(false);
const parseTip = ref('系统尚未配置域名解析记录，请联系管理员获取。');
const form = reactive({ provider: 'alidns', credentials: {} });
const providerNames = { alidns: '阿里云 DNS', dnspod: 'DNSPod', cloudflare: 'Cloudflare', route53: 'Route53' };
const providerOptions = Object.entries(providerNames).map(([value, label]) => ({ value, label }));
const providerFields = {
    alidns: [{ key: 'ALICLOUD_ACCESS_KEY', label: 'AccessKey ID' }, { key: 'ALICLOUD_SECRET_KEY', label: 'AccessKey Secret' }],
    dnspod: [{ key: 'DNSPOD_API_KEY', label: 'API Token', placeholder: 'ID,Token' }],
    cloudflare: [{ key: 'CLOUDFLARE_DNS_API_TOKEN', label: 'API Token' }],
    route53: [{ key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID' }, { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key' }, { key: 'AWS_REGION', label: 'Region', placeholder: '例如 us-east-1' }],
};
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
        emit('update:autoResolve', false);
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
        const [response, parse] = await Promise.all([
            panelApi.get('/dns-profiles'),
            panelApi.get('/domain-parse', { noAlert: true }).catch(error => ({ error })),
        ]);
        profiles.value = response?.data || [];
        const spec = parse?.data?.spec || {};
        const ips = Array.isArray(spec.ips) ? spec.ips.filter(ip => typeof ip === 'string' && ip.trim()).map(ip => ip.trim()) : [];
        const type = spec.type || 'A';
        const validIp = ip => ip.split('.').length === 4 && ip.split('.').every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
        const cname = spec.cname?.trim().replace(/\.$/, '').toLowerCase() || '';
        const validCname = cname.length <= 253 && cname.includes('.') && cname.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
        parseConfigured.value = type.toUpperCase() === 'A' ? ips.length > 0 && ips.every(validIp) : type.toUpperCase() === 'CNAME' && validCname;
        resolveSelected.value = parseConfigured.value;
        parseTip.value = parse?.error && parse.error?.response?.status !== 404
            ? '读取系统域名解析配置失败，请稍后重试。'
            : parseConfigured.value
                ? `保存域名后自动创建 ${type.toUpperCase() === 'A' ? 'A' : 'CNAME'} 记录，指向 ${type.toUpperCase() === 'A' ? ips.join('、') : spec.cname}。已有不同记录时停止，不会覆盖。`
                : '系统尚未配置域名解析记录，请联系管理员获取。';
        if (!profiles.value.some(profile => profile.id === selected.value)) selected.value = '';
        visible.value = true;
    } finally {
        busy.value = false;
    }
}

async function confirm() {
    busy.value = true;
    try {
        let id = selected.value;
        if (!id || (selectedProfile.value && !wildcardInZone(props.host, selectedProfile.value.zone))) {
            const payload = id
                ? { namespace: props.namespace, host: props.host, sourceProfileId: id }
                : { namespace: props.namespace, host: props.host, provider: form.provider, credentials: form.credentials };
            const response = await panelApi.post('/dns-profiles', payload);
            id = response?.data?.id;
        }
        if (!id) throw new Error('DNS 配置未保存');
        emit('update:profileId', id);
        emit('update:autoResolve', resolveSelected.value);
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
