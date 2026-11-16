<template>
    <div class="install-domain-groups">
        <a-form-item v-for="group in modelValue" :key="group.param" :label="group.title" :required="group.required">
            <div class="df ai-c" style="width:100%">
                <a-input v-model="group.host" :disabled="group.hostLocked || (primaryLocked && group.param === 'default') || group.inheritDefault" placeholder="请输入完整域名" @change="changed" />
                <wildcard-auto-ssl class="ml-10" v-model="group.autoSSL" v-model:profile-id="group.dnsProfileId" v-model:auto-resolve="group.autoResolve" :required="group.forceSSL" :host="group.host" :namespace="namespace" @update:model-value="changed" />
            </div>
        </a-form-item>
        <a-alert v-if="error" type="error">{{ error }}</a-alert>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import WildcardAutoSsl from './wildcard-auto-ssl.vue';
import { domainGroupError } from '@/utils/install-domain-group-values';

const props = defineProps({ modelValue: { type: Array, required: true }, namespace: { type: String, required: true }, whiteList: { type: Array, default: () => [] }, primaryLocked: Boolean });
const emit = defineEmits(['update:modelValue']);
const error = ref('');

function changed() {
    error.value = '';
    emit('update:modelValue', props.modelValue);
}

function validate() {
    error.value = props.modelValue.map(domainGroupError).find(Boolean) || '';
    return !error.value;
}

defineExpose({ validate });
</script>
