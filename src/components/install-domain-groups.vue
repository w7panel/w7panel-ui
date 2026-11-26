<template>
    <div class="install-domain-groups">
        <a-form-item v-if="groups.length" label="域名" :required="selectedGroup?.required">
            <div class="domain-group-fields">
                <a-tabs v-if="groups.length > 1" v-model:active-key="activeGroup" type="card-gutter" hide-content class="domain-group-tabs">
                    <a-tab-pane v-for="group in groups" :key="group.param">
                        <template #title>
                            <strong v-if="group.required" class="arco-form-item-label-required-symbol" aria-label="必填">
                                <svg fill="currentColor" viewBox="0 0 1024 1024" width="1em" height="1em" aria-hidden="true"><path d="M583.338667 17.066667c18.773333 0 34.133333 15.36 34.133333 34.133333v349.013333l313.344-101.888a34.133333 34.133333 0 0 1 43.008 22.016l42.154667 129.706667a34.133333 34.133333 0 0 1-21.845334 43.178667l-315.733333 102.4 208.896 287.744a34.133333 34.133333 0 0 1-7.509333 47.786666l-110.421334 80.213334a34.133333 34.133333 0 0 1-47.786666-7.509334L505.685333 706.218667 288.426667 1005.226667a34.133333 34.133333 0 0 1-47.786667 7.509333l-110.421333-80.213333a34.133333 34.133333 0 0 1-7.509334-47.786667l214.186667-295.253333L29.013333 489.813333a34.133333 34.133333 0 0 1-22.016-43.008l42.154667-129.877333a34.133333 34.133333 0 0 1 43.008-22.016l320.512 104.106667L412.672 51.2c0-18.773333 15.36-34.133333 34.133333-34.133333h136.533334z" /></svg>
                            </strong>
                            <span>{{ group.title }}</span>
                            <span v-if="!group.required" class="domain-group-status">选填</span>
                        </template>
                    </a-tab-pane>
                </a-tabs>
                <div v-if="selectedGroup" class="df ai-c" style="width:100%">
                    <a-input v-model="selectedGroup.host" :disabled="selectedGroup.hostLocked || (primaryLocked && selectedGroup.param === 'default') || selectedGroup.inheritDefault" placeholder="请输入完整域名" @change="changed" />
                    <wildcard-auto-ssl class="ml-10" style="white-space: nowrap;" v-model="selectedGroup.autoSSL" v-model:profile-id="selectedGroup.dnsProfileId" v-model:auto-resolve="selectedGroup.autoResolve" :required="selectedGroup.forceSSL" :host="selectedGroup.host" :namespace="namespace" @update:model-value="changed" />
                </div>
                <a-alert v-if="error" class="domain-group-error" type="error">{{ error }}</a-alert>
            </div>
        </a-form-item>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import WildcardAutoSsl from './wildcard-auto-ssl.vue';
import { domainGroupError } from '@/utils/install-domain-group-values';

const props = defineProps({ modelValue: { type: Array, required: true }, namespace: { type: String, required: true }, whiteList: { type: Array, default: () => [] }, primaryLocked: Boolean });
const emit = defineEmits(['update:modelValue']);
const error = ref('');
const groups = computed(() => props.modelValue ?? []);
const activeGroup = ref('');
const selectedGroup = computed(() => groups.value.find(group => group.param === activeGroup.value) || groups.value[0]);
watch(() => groups.value.map(group => group.param), params => {
    if (!params.includes(activeGroup.value)) activeGroup.value = params[0] || '';
}, { immediate: true });

function changed() {
    error.value = '';
    emit('update:modelValue', props.modelValue);
}

function validate() {
    const invalid = groups.value.find(group => domainGroupError(group));
    error.value = invalid ? domainGroupError(invalid) : '';
    if (invalid) activeGroup.value = invalid.param;
    return !error.value;
}

defineExpose({ validate });
</script>

<style scoped>
.domain-group-fields {
    width: 100%;
    min-width: 0;
}

.domain-group-error {
    margin-top: 12px;
}
.domain-group-tabs {
    margin-bottom: 16px;
}
.domain-group-status {
    margin-left: 8px;
    color: var(--color-text-3);
    font-size: 12px;
    font-weight: normal;
}
</style>
