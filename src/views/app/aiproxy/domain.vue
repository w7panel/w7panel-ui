<template>
    <div class="padding-20">
        <Breadcrumb :routes="routes" />
        <div class="bg-white padding-20 mb-20">
            <div class="fs-16 mb-20">路由配置</div>
            <a-form :model="routeForm" auto-label-width>
                <a-form-item label="域名">
                    <span>{{ host || '-' }}</span>
                </a-form-item>
                <a-form-item label="模型名称">
                    <a-input-tag v-model="routeForm.models" :disabled="!permission.includes('gateway/aiproxy/edit')" placeholder="输入后回车，支持多个模型；留空表示不限制" allow-clear />
                </a-form-item>
                <a-form-item label="认证">
                    <a-switch v-model="routeForm.authEnabled" :disabled="!permission.includes('gateway/aiproxy/edit')" />
                </a-form-item>
                <a-form-item v-if="routeForm.authEnabled" label="消费者">
                    <div class="df df-c" style="flex:1;">
                        <div v-for="(item,index) in consumers" :key="index" class="df ai-c mb-10">
                            <a-input v-model="item.name" :disabled="!permission.includes('gateway/aiproxy/edit')" placeholder="消费者名称" style="width:220px;" />
                            <a-input v-model="item.key" :disabled="!permission.includes('gateway/aiproxy/edit')" placeholder="留空保留原 Key，新增留空自动生成" class="ml-10" style="width:360px;" />
                            <span v-if="permission.includes('gateway/aiproxy/edit')" class="ml-10 cursor c-blue" @click="consumers.splice(index,1)">删除</span>
                        </div>
                        <span v-if="permission.includes('gateway/aiproxy/edit')" class="cursor c-blue" @click="consumers.push({name:'', key:''})">添加消费者</span>
                    </div>
                </a-form-item>
                <a-form-item>
                    <a-button v-if="permission.includes('gateway/aiproxy/edit')" type="primary" @click="saveRoute">保存配置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <div class="mb-20" v-if="permission.includes('gateway/aiproxy/add')">
            <a-button type="primary" @click="openProvider()"><template #icon><icon-plus /></template>新增服务提供者</a-button>
        </div>
        <div class="bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td>服务地址</td>
                    <td>权重</td>
                    <td>状态</td>
                    <td style="width:240px;">操作</td>
                </tr>
                <tr v-for="item in providers" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>{{ providerTypeLabel(item.type) }}</td>
                    <td>{{ item.endpointUrl || '-' }}</td>
                    <td>{{ item.weight }}</td>
                    <td>
                        <a-switch v-model="item.enabled" :disabled="!permission.includes('gateway/aiproxy/edit')" @change="toggleProvider(item)" />
                    </td>
                    <td>
                        <span v-if="permission.includes('gateway/aiproxy/edit')" class="cursor c-blue" @click="openProvider(item)">编辑</span>
                        <a-popconfirm v-if="permission.includes('gateway/aiproxy/delete')" :content="'确认要删除吗'" @ok="deleteProvider(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!providers.length">
                    <td colspan="6"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>

        <a-drawer :width="720" :visible="providerForm.show" @ok="saveProvider" @cancel="providerForm.show=false;" :popup-container="$popupContainer">
            <template #title>AI服务提供者</template>
            <a-form :model="providerForm" ref="providerForm" :rules="providerRules" auto-label-width class="padding-20">
                <a-form-item label="供应商" field="type">
                    <a-select v-model="providerForm.type" :disabled="providerForm.isEdit" @change="changeProviderType">
                        <a-option v-for="item in providerTypes" :key="item.value" :label="item.label" :value="item.value"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="名称" field="name">
                    <a-input v-model="providerForm.name" :disabled="providerForm.isEdit" placeholder="请输入名称，仅支持字母、数字、点和中划线" />
                </a-form-item>
                <a-form-item label="协议">
                    <a-select v-model="providerForm.protocol">
                        <a-option label="openai/v1" value="openai/v1"></a-option>
                        <a-option label="original" value="original"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="API Tokens">
                    <a-input-tag
                        v-model="providerForm.tokens"
                        v-model:input-value="providerForm.tokenInput"
                        :retain-input-value="{blur:true,create:false}"
                        :placeholder="providerForm.isEdit?'留空则保留原 Token':'输入后回车，支持多个 Token'"
                        allow-clear
                    />
                </a-form-item>
                <a-form-item v-if="showEndpointUrl(providerForm.type)" label="服务地址" field="endpointUrl">
                    <a-input v-model="providerForm.endpointUrl" :placeholder="providerEndpointPlaceholder(providerForm.type)" />
                </a-form-item>
                <template v-if="providerForm.type == 'qwen'">
                    <a-form-item label="开启互联网搜索">
                        <a-switch v-model="providerForm.rawConfigs.qwenEnableSearch" />
                    </a-form-item>
                    <a-form-item label="OpenAI 兼容模式">
                        <a-switch v-model="providerForm.rawConfigs.qwenEnableCompatible" />
                    </a-form-item>
                    <a-form-item label="自定义域名" field="rawConfigs.qwenDomain">
                        <a-input v-model="providerForm.rawConfigs.qwenDomain" placeholder="dashscope.aliyuncs.com" />
                    </a-form-item>
                    <a-form-item label="文件 ID">
                        <a-input-tag v-model="providerForm.rawConfigs.qwenFileIds" placeholder="输入后回车，支持多个文件 ID" allow-clear />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'zhipuai'">
                    <a-form-item label="自定义域名" field="rawConfigs.zhipuDomain">
                        <a-input v-model="providerForm.rawConfigs.zhipuDomain" placeholder="open.bigmodel.cn" />
                    </a-form-item>
                    <a-form-item label="Code Plan 模式">
                        <a-switch v-model="providerForm.rawConfigs.zhipuCodePlanMode" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'claude'">
                    <a-form-item label="Claude API 版本" field="rawConfigs.claudeVersion">
                        <a-input v-model="providerForm.rawConfigs.claudeVersion" placeholder="2023-06-01" />
                    </a-form-item>
                    <a-form-item label="Claude Code 模式">
                        <a-switch v-model="providerForm.rawConfigs.claudeCodeMode" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'ollama'">
                    <a-form-item label="Ollama 服务主机名" field="rawConfigs.ollamaServerHost">
                        <a-input v-model="providerForm.rawConfigs.ollamaServerHost" placeholder="127.0.0.1" />
                    </a-form-item>
                    <a-form-item label="Ollama 服务端口" field="rawConfigs.ollamaServerPort">
                        <a-input-number v-model="providerForm.rawConfigs.ollamaServerPort" :min="1" :max="65535" style="width:200px;" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'vllm'">
                    <a-form-item label="vLLM BaseURL" field="rawConfigs.vllmCustomUrl">
                        <a-input v-model="providerForm.rawConfigs.vllmCustomUrl" placeholder="http://127.0.0.1:8000/v1" />
                    </a-form-item>
                    <a-form-item label="备用 BaseURL">
                        <a-input-tag v-model="providerForm.rawConfigs.vllmExtraCustomUrls" placeholder="输入后回车，支持多个备用 BaseURL" allow-clear />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'bedrock'">
                    <a-form-item label="AWS 区域" field="rawConfigs.awsRegion">
                        <a-input v-model="providerForm.rawConfigs.awsRegion" placeholder="us-east-1" />
                    </a-form-item>
                    <a-form-item label="Access Key" field="rawConfigs.awsAccessKey">
                        <a-input v-model="providerForm.rawConfigs.awsAccessKey" placeholder="请输入 Access Key" />
                    </a-form-item>
                    <a-form-item label="Secret Key" field="rawConfigs.awsSecretKey">
                        <a-input-password v-model="providerForm.rawConfigs.awsSecretKey" placeholder="请输入 Secret Key" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'vertex'">
                    <a-form-item label="Vertex 区域" field="rawConfigs.vertexRegion">
                        <a-input v-model="providerForm.rawConfigs.vertexRegion" placeholder="global" />
                    </a-form-item>
                    <a-form-item label="项目 ID" field="rawConfigs.vertexProjectId">
                        <a-input v-model="providerForm.rawConfigs.vertexProjectId" placeholder="请输入 Google Cloud 项目 ID" />
                    </a-form-item>
                    <a-form-item label="认证 JSON" field="rawConfigs.vertexAuthKey">
                        <a-textarea v-model="providerForm.rawConfigs.vertexAuthKey" placeholder="请输入服务账号 JSON" :auto-size="{minRows:4,maxRows:8}" />
                    </a-form-item>
                    <a-form-item label="令牌刷新提前量">
                        <a-input-number v-model="providerForm.rawConfigs.vertexTokenRefreshAhead" :min="1" :max="1800" placeholder="留空表示仅过期时刷新" style="width:240px;" />
                    </a-form-item>
                </template>
                <a-form-item label="权重">
                    <a-input-number v-model="providerForm.weight" :min="0" style="width:200px;" />
                </a-form-item>
                <a-form-item label="启用">
                    <a-switch v-model="providerForm.enabled" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getPermission } from '@/utils/auth';
import {
    AI_LABEL,
    AI_DOMAIN_LABEL,
    AI_CONSUMER_LABEL,
    AI_MODELS_ANNOTATION,
    AI_AUTH_ANNOTATION,
    AI_PROVIDERS_ANNOTATION,
    consumerResourceId,
    consumerSecretName,
    domainResourcePrefix,
    providerResourceId,
    providerServiceName,
    readRouteProviders,
    readStringArray,
    resourceName,
    validateProviderWeights,
} from '@/utils/ai-proxy';

const PLUGIN_NAME = 'ai-proxy.internal';
const PLUGIN_NAMESPACE = 'higress-system';
const PLUGIN_VERSION = '2.0.0';
const PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/ai-proxy:2.0.0';
const BUILTIN_PLUGIN_VERSION = '2.0.0';
const KEY_AUTH_PLUGIN_NAME = 'key-auth.internal';
const KEY_AUTH_PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/key-auth:2.0.0';
const MODEL_VALIDATION_PLUGIN_NAME = 'request-validation.internal';
const MODEL_VALIDATION_PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/request-validation:2.0.0';
const MCPBRIDGE_NAME = 'default';

const PROVIDER_TYPES = [
    { label: 'OpenAI/OpenAI兼容服务', value: 'openai', endpoint: 'https://api.openai.com/v1' },
    { label: '通义千问', value: 'qwen', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { label: '月之暗面', value: 'moonshot', endpoint: 'https://api.moonshot.cn' },
    { label: 'Azure OpenAI', value: 'azure', endpoint: 'https://example.openai.azure.com/openai/deployments/deployment/chat/completions?api-version=2024-02-15-preview', requiredEndpoint: true },
    { label: 'Anthropic Claude', value: 'claude', endpoint: 'https://api.anthropic.com' },
    { label: '百川智能', value: 'baichuan', endpoint: 'https://api.baichuan-ai.com' },
    { label: '零一万物', value: 'yi', endpoint: 'https://api.lingyiwanwu.com' },
    { label: '智谱AI', value: 'zhipuai', endpoint: 'https://open.bigmodel.cn' },
    { label: '360智脑', value: 'ai360', endpoint: 'https://api.360.cn' },
    { label: '文心一言', value: 'baidu', endpoint: 'https://qianfan.baidubce.com' },
    { label: '阶跃星辰', value: 'stepfun', endpoint: 'https://api.stepfun.com' },
    { label: '豆包', value: 'doubao', endpoint: 'https://ark.cn-beijing.volces.com' },
    { label: 'MiniMax', value: 'minimax', endpoint: 'https://api.minimax.chat' },
    { label: 'Google Gemini', value: 'gemini', endpoint: 'https://generativelanguage.googleapis.com' },
    { label: 'Cohere', value: 'cohere', endpoint: 'https://api.cohere.com' },
    { label: '扣子', value: 'coze', endpoint: 'https://api.coze.cn' },
    { label: 'DeepSeek', value: 'deepseek', endpoint: 'https://api.deepseek.com' },
    { label: 'GitHub模型', value: 'github', endpoint: 'https://models.inference.ai.azure.com' },
    { label: 'Groq', value: 'groq', endpoint: 'https://api.groq.com' },
    { label: 'Ollama', value: 'ollama', endpoint: 'http://127.0.0.1:11434', requiredEndpoint: true },
    { label: 'Mistral', value: 'mistral', endpoint: 'https://api.mistral.ai' },
    { label: 'AWS Bedrock', value: 'bedrock', endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com' },
    { label: 'Google Vertex', value: 'vertex', endpoint: 'https://aiplatform.googleapis.com' },
    { label: 'OpenRouter', value: 'openrouter', endpoint: 'https://openrouter.ai' },
    { label: 'Grok', value: 'grok', endpoint: 'https://api.x.ai' },
    { label: 'vLLM', value: 'vllm', endpoint: 'http://127.0.0.1:8000/v1', requiredEndpoint: true },
];

const DEFAULT_ENDPOINTS = {
    openai: 'https://api.openai.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    moonshot: 'https://api.moonshot.cn',
    claude: 'https://api.anthropic.com',
    baichuan: 'https://api.baichuan-ai.com',
    yi: 'https://api.lingyiwanwu.com',
    zhipuai: 'https://open.bigmodel.cn',
    ai360: 'https://api.360.cn',
    baidu: 'https://qianfan.baidubce.com',
    stepfun: 'https://api.stepfun.com',
    doubao: 'https://ark.cn-beijing.volces.com',
    minimax: 'https://api.minimax.chat',
    gemini: 'https://generativelanguage.googleapis.com',
    cohere: 'https://api.cohere.com',
    coze: 'https://api.coze.cn',
    deepseek: 'https://api.deepseek.com',
    github: 'https://models.inference.ai.azure.com',
    groq: 'https://api.groq.com',
    mistral: 'https://api.mistral.ai',
    openrouter: 'https://openrouter.ai',
    grok: 'https://api.x.ai',
};

const DEFAULT_PROVIDER_ENDPOINTS = {
    moonshot: { domain: 'api.moonshot.cn', port: 443, protocol: 'https' },
    ai360: { domain: 'api.360.cn', port: 443, protocol: 'https' },
    github: { domain: 'models.inference.ai.azure.com', port: 443, protocol: 'https' },
    groq: { domain: 'api.groq.com', port: 443, protocol: 'https' },
    baichuan: { domain: 'api.baichuan-ai.com', port: 443, protocol: 'https' },
    yi: { domain: 'api.lingyiwanwu.com', port: 443, protocol: 'https' },
    deepseek: { domain: 'api.deepseek.com', port: 443, protocol: 'https' },
    baidu: { domain: 'qianfan.baidubce.com', port: 443, protocol: 'https' },
    stepfun: { domain: 'api.stepfun.com', port: 443, protocol: 'https' },
    minimax: { domain: 'api.minimax.chat', port: 443, protocol: 'https' },
    gemini: { domain: 'generativelanguage.googleapis.com', port: 443, protocol: 'https' },
    mistral: { domain: 'api.mistral.ai', port: 443, protocol: 'https' },
    cohere: { domain: 'api.cohere.com', port: 443, protocol: 'https' },
    doubao: { domain: 'ark.cn-beijing.volces.com', port: 443, protocol: 'https' },
    coze: { domain: 'api.coze.cn', port: 443, protocol: 'https' },
    openrouter: { domain: 'openrouter.ai', port: 443, protocol: 'https' },
    grok: { domain: 'api.x.ai', port: 443, protocol: 'https' },
};

function encode(value) {
    return btoa(unescape(encodeURIComponent(value || '')));
}

function decode(value) {
    if (!value) return '';
    try { return decodeURIComponent(escape(atob(value))); } catch { return ''; }
}

function clone(data) {
    return JSON.parse(JSON.stringify(data || {}));
}

function compact(arr) {
    return (arr || []).map(i=>String(i || '').trim()).filter(i=>i);
}

export default {
    data(){
        return {
            namespaceActive: '',
            permission: [],
            ingress: null,
            plugin: null,
            host: '',
            providers: [],
            consumers: [],
            providerTypes: PROVIDER_TYPES,
            routeForm: {
                models: [],
                authEnabled: false,
            },
            providerForm: {
                show: false,
                isEdit: false,
                rawConfigs: {},
                type: 'openai',
                name: '',
                protocol: 'openai/v1',
                tokens: [],
                tokenInput: '',
                endpointUrl: DEFAULT_ENDPOINTS.openai,
                weight: 100,
                enabled: true,
            },
            providerRules: {
                type: [{ required: true, message: '供应商不能为空' }],
                name: [{ required: true, message: '名称不能为空' }],
                endpointUrl: [{ validator: (value, cb) => {
                    if (this.needEndpointUrl(this.providerForm.type) && !value) {
                        cb('服务地址不能为空');
                        return;
                    }
                    cb();
                }}],
            },
            routes: [
                {name:'root'},
                {name:'gateway', label:'网关管理'},
                {name:'gateway-aiproxy', label:'AI代理'},
                {name:'domain', label:'域名'},
            ],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.permission = getPermission() || [];
        this.getData();
    },
    methods: {
        async getData(){
            useLoadingStore().loading = true;
            try {
                const name = this.$route.query.name;
                const [ingRes, plugin, secretRes] = await Promise.all([
                    k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+name),
                    this.getPlugin(),
                    k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+name, { noAlert: true }),
                ]);
                this.ingress = ingRes.data;
                this.host = this.ingress?.spec?.rules?.[0]?.host || '';
                this.plugin = plugin;
                const rule = this.currentRule();
                const annotations = this.ingress?.metadata?.annotations || {};
                this.routeForm.models = readStringArray(annotations[AI_MODELS_ANNOTATION] || rule?.config?.models);
                this.routeForm.authEnabled = annotations[AI_AUTH_ANNOTATION] === 'true' || !!rule?.config?.auth?.enabled;
                const secrets = secretRes?.data?.items || [];
                const legacyProviders = secrets.filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true').map(s=>this.secretToProvider(s));
                const storedProviders = readRouteProviders(annotations[AI_PROVIDERS_ANNOTATION]);
                const providerRefs = storedProviders.length ? storedProviders : (rule?.config?.providers || []);
                const routeProviders = this.routeProviders(providerRefs, plugin);
                this.providers = routeProviders.length ? routeProviders : legacyProviders;
                this.consumers = secrets.filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] == 'true').map(s=>({
                    secretName: s.metadata.name,
                    name: s.metadata?.annotations?.['w7.cc/consumer-name'] || s.metadata.name,
                    key: '',
                    oldKey: decode(s?.data?.key),
                }));
            } finally {
                useLoadingStore().loading = false;
            }
        },
        getPlugin(){
            return k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+PLUGIN_NAME, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        async savePlugin(plugin){
            const res = await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+PLUGIN_NAME, plugin);
            this.plugin = res.data;
            return res.data;
        },
        ensurePlugin(){
            if(this.plugin){
                const plugin = clone(this.plugin);
                plugin.metadata = plugin.metadata || {};
                plugin.metadata.labels = plugin.metadata.labels || {};
                plugin.spec = plugin.spec || {};
                plugin.spec.url = PLUGIN_URL;
                plugin.metadata.labels['higress.io/resource-definer'] = 'higress';
                plugin.metadata.labels['higress.io/wasm-plugin-name'] = 'ai-proxy';
                plugin.metadata.labels['higress.io/wasm-plugin-version'] = PLUGIN_VERSION;
                plugin.metadata.labels['higress.io/wasm-plugin-built-in'] = 'true';
                return Promise.resolve(plugin);
            }
            const data = {
                apiVersion: 'extensions.higress.io/v1alpha1',
                kind: 'WasmPlugin',
                metadata: {
                    name: PLUGIN_NAME,
                    namespace: PLUGIN_NAMESPACE,
                    labels: {
                        [AI_LABEL]: 'true',
                        'higress.io/resource-definer': 'higress',
                        'higress.io/wasm-plugin-name': 'ai-proxy',
                        'higress.io/wasm-plugin-version': PLUGIN_VERSION,
                        'higress.io/wasm-plugin-built-in': 'true',
                    },
                    annotations: {
                        'higress.io/wasm-plugin-title': 'AI代理',
                        'higress.io/wasm-plugin-description': 'AI代理',
                    },
                },
                spec: {
                    defaultConfigDisable: false,
                    defaultConfig: { providers: [] },
                    failStrategy: 'FAIL_OPEN',
                    phase: 'UNSPECIFIED_PHASE',
                    priority: 20,
                    url: PLUGIN_URL,
                    matchRules: [],
                },
            };
            return k8sproxy.post('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins', data).then(res=>res.data);
        },
        currentRule(){
            return (this.plugin?.spec?.matchRules || []).find(rule=>{
                return (rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name);
            }) || null;
        },
        globalProviderMap(plugin){
            const providers = plugin?.spec?.defaultConfig?.providers || [];
            const map = {};
            providers.forEach(item=>{
                if(item?.id) map[item.id] = item;
            });
            return map;
        },
        routeProviders(providerRefs, plugin){
            const providerMap = this.globalProviderMap(plugin);
            return (providerRefs || []).map(item=>{
                const legacyId = item.id || item.provider || item.name;
                const name = item.name || legacyId;
                const id = providerResourceId(this.ingress?.metadata?.name || '', name);
                const config = providerMap[id] || providerMap[legacyId] || {};
                return {
                    ...this.providerConfigToForm(config, item),
                    id,
                    name,
                    weight: Number(item.weight) || 0,
                    enabled: item.enabled !== false,
                };
            }).filter(item=>item.id && item.name);
        },
        openProvider(row){
            if(!row){
                this.providerForm = {
                    show: true,
                    isEdit: false,
                    originalName: '',
                    originalId: '',
                    rawConfigs: this.defaultRawConfigs('openai'),
                    type: 'openai',
                    name: '',
                    protocol: 'openai/v1',
                    tokens: [],
                    tokenInput: '',
                    endpointUrl: DEFAULT_ENDPOINTS.openai,
                    weight: 100,
                    enabled: true,
                };
                return;
            }
            this.providerForm = {
                show: true,
                isEdit: true,
                originalName: row.name,
                originalId: row.id,
                rawConfigs: clone(row.rawConfigs),
                type: row.type || 'openai',
                name: row.name,
                protocol: row.protocol || 'openai/v1',
                tokens: [],
                tokenInput: '',
                oldTokens: [...(row.tokens || [])],
                endpointUrl: row.endpointUrl || this.providerEndpointPlaceholder(row.type),
                weight: Number(row.weight) || 0,
                enabled: row.enabled,
            };
        },
        saveProvider(){
            this.$refs.providerForm.validate(async err=>{
                if(err) return;
                const name = this.domainToName(this.providerForm.name);
                if(!/^[a-z0-9](?:[a-z0-9.-]{0,61}[a-z0-9])?$/.test(name)){
                    this.$message.error('名称仅支持字母、数字、点和中划线，且不能以符号开头或结尾');
                    return;
                }
                const providerError = this.validateProviderConfig(this.providerForm);
                if(providerError){
                    this.$message.error(providerError);
                    return;
                }
                if(!this.providerForm.isEdit && this.providers.some(item=>item.name == name)){
                    this.$message.error('该域名下已存在同名服务提供者');
                    return;
                }
                this.providerForm.name = name;
                const pendingToken = String(this.providerForm.tokenInput || '').trim();
                if(pendingToken && !this.providerForm.tokens.includes(pendingToken)){
                    this.providerForm.tokens.push(pendingToken);
                }
                this.providerForm.tokenInput = '';
                const candidate = this.providerFormToProvider(this.providerForm);
                const nextProviders = this.providers
                    .filter(item=>item.id != candidate.id && item.id != this.providerForm.originalId)
                    .concat([candidate]);
                const weightError = validateProviderWeights(nextProviders);
                if(weightError){
                    this.$message.error(weightError);
                    return;
                }
                useLoadingStore().loading = true;
                try {
                    await this.syncProviderResources(this.providerForm, nextProviders);
                    this.providerForm.show = false;
                    await this.getData();
                    this.$message.success('操作成功');
                } catch(error) {
                    this.$message.error(error?.message || '服务提供者保存失败');
                } finally {
                    useLoadingStore().loading = false;
                }
            })
        },
        secretToProvider(secret){
            const baseUrl = decode(secret?.data?.baseUrl);
            const apiKey = decode(secret?.data?.apiKey);
            return {
                secretName: secret.metadata.name,
                name: secret?.metadata?.annotations?.['w7.cc/provider-name'] || secret.metadata.name,
                type: 'openai',
                protocol: 'openai/v1',
                tokens: apiKey ? [apiKey] : [],
                rawConfigs: baseUrl ? { openaiCustomUrl: baseUrl } : {},
                endpointUrl: baseUrl,
                weight: Number(secret?.metadata?.annotations?.['w7.cc/weight'] || 0),
                enabled: secret?.metadata?.annotations?.['w7.cc/enabled'] !== 'false',
            };
        },
        async toggleProvider(row){
            const error = validateProviderWeights(this.providers);
            if(error){
                row.enabled = !row.enabled;
                this.$message.error(error);
                return;
            }
            await this.syncRuleProviders(this.providers);
            await this.getData();
        },
        async deleteProvider(row){
            useLoadingStore().loading = true;
            try {
                const nextProviders = this.providers.filter(item=>item.name != row.name);
                await this.removeProviderResources(row.name, nextProviders);
                await this.getData();
                this.$message.success('操作成功');
            } finally {
                useLoadingStore().loading = false;
            }
        },
        async saveRoute(){
            const models = compact(this.routeForm.models);
            const consumerNames = this.consumers.map(i=>String(i.name || '').trim()).filter(Boolean);
            if(this.routeForm.authEnabled && !consumerNames.length){
                this.$message.error('启用认证时至少需要配置一个消费者');
                return;
            }
            if(new Set(consumerNames.map(resourceName)).size != consumerNames.length){
                this.$message.error('消费者名称不能重复');
                return;
            }
            const weightError = validateProviderWeights(this.providers);
            if(weightError){
                this.$message.error(weightError);
                return;
            }
            useLoadingStore().loading = true;
            try {
                this.routeForm.models = models;
                await this.saveConsumers();
                await this.syncKeyAuthPlugin();
                await this.syncModelValidationPlugin();
                await this.syncRuleProviders();
                await this.getData();
                this.$message.success('操作成功');
            } finally {
                useLoadingStore().loading = false;
            }
        },
        async saveConsumers(){
            const existing = this.consumers.filter(i=>i.name && i.secretName).map(i=>i.secretName);
            const secretRes = await k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+this.ingress.metadata.name+','+AI_CONSUMER_LABEL+'=true', { noAlert: true });
            const oldSecrets = secretRes?.data?.items || [];
            for(const old of oldSecrets){
                if(!existing.includes(old.metadata.name)){
                    await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+old.metadata.name, { noAlert: true });
                }
            }
            for(const consumer of this.consumers.filter(i=>i.name)){
                const generated = !consumer.key && !consumer.oldKey;
                const key = consumer.key || consumer.oldKey || this.createToken();
                const name = consumer.secretName || consumerSecretName(this.ingress.metadata.name, consumer.name);
                const data = {
                    apiVersion: 'v1',
                    kind: 'Secret',
                    metadata: {
                        name,
                        namespace: this.namespaceActive,
                        labels: {
                            [AI_LABEL]: 'true',
                            [AI_DOMAIN_LABEL]: this.ingress.metadata.name,
                            [AI_CONSUMER_LABEL]: 'true',
                        },
                        annotations: {
                            'w7.cc/consumer-name': consumer.name,
                        },
                    },
                    type: 'Opaque',
                    data: { key: encode(key) },
                };
                if(consumer.secretName){
                    await k8sproxy.put('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+consumer.secretName, data);
                }else{
                    await k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/secrets', data);
                    consumer.secretName = name;
                }
                consumer.oldKey = key;
                consumer.key = '';
                if(generated) this.$message.info('消费者 '+consumer.name+' 的 Key：'+key);
            }
        },
        getManagedPlugin(name){
            return k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+name, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        async ensureManagedPlugin(name, url, title, defaultConfig, defaultConfigDisable, priority){
            const old = await this.getManagedPlugin(name);
            if(old) return old;
            const pluginName = name.replace(/\.internal$/, '');
            const data = {
                apiVersion: 'extensions.higress.io/v1alpha1',
                kind: 'WasmPlugin',
                metadata: {
                    name,
                    namespace: PLUGIN_NAMESPACE,
                    labels: {
                        [AI_LABEL]: 'true',
                        'higress.io/resource-definer': 'higress',
                        'higress.io/wasm-plugin-name': pluginName,
                        'higress.io/wasm-plugin-version': BUILTIN_PLUGIN_VERSION,
                        'higress.io/wasm-plugin-built-in': 'true',
                    },
                    annotations: {
                        'higress.io/wasm-plugin-title': title,
                        'higress.io/wasm-plugin-description': title,
                    },
                },
                spec: {
                    url,
                    failStrategy: 'FAIL_OPEN',
                    phase: 'AUTHN',
                    priority,
                    defaultConfigDisable,
                    defaultConfig,
                    matchRules: [],
                },
            };
            return k8sproxy.post('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins', data).then(res=>res.data);
        },
        normalizeManagedPlugin(plugin, name, url, priority){
            const result = plugin || {};
            const pluginName = name.replace(/\.internal$/, '');
            result.metadata = result.metadata || {};
            result.metadata.labels = result.metadata.labels || {};
            result.metadata.labels['higress.io/resource-definer'] = 'higress';
            result.metadata.labels['higress.io/wasm-plugin-name'] = pluginName;
            result.metadata.labels['higress.io/wasm-plugin-version'] = BUILTIN_PLUGIN_VERSION;
            result.metadata.labels['higress.io/wasm-plugin-built-in'] = 'true';
            result.spec = result.spec || {};
            result.spec.url = url;
            result.spec.failStrategy = 'FAIL_OPEN';
            result.spec.phase = 'AUTHN';
            result.spec.priority = priority;
            return result;
        },
        async syncKeyAuthPlugin(){
            const currentConsumers = this.consumers.filter(i=>i.name).map(item=>({
                name: consumerResourceId(this.ingress.metadata.name, item.name),
                credential: item.oldKey || item.key,
            }));
            let plugin = await this.getManagedPlugin(KEY_AUTH_PLUGIN_NAME);
            if(!plugin && !this.routeForm.authEnabled) return;
            if(!plugin){
                plugin = await this.ensureManagedPlugin(
                    KEY_AUTH_PLUGIN_NAME,
                    KEY_AUTH_PLUGIN_URL,
                    'AI代理 Key Auth',
                    { global_auth: false, consumers: currentConsumers, keys: ['x-api-key', 'apikey'], in_header: true, in_query: true },
                    false,
                    310,
                );
            }
            plugin = this.normalizeManagedPlugin(plugin, KEY_AUTH_PLUGIN_NAME, KEY_AUTH_PLUGIN_URL, 310);
            plugin.spec = plugin.spec || {};
            plugin.spec.defaultConfigDisable = false;
            plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
            plugin.spec.defaultConfig.global_auth = false;
            plugin.spec.defaultConfig.keys = ['x-api-key', 'apikey'];
            plugin.spec.defaultConfig.in_header = true;
            plugin.spec.defaultConfig.in_query = true;
            const prefix = domainResourcePrefix(this.ingress.metadata.name);
            const otherConsumers = (plugin.spec.defaultConfig.consumers || []).filter(item=>!String(item?.name || '').startsWith(prefix));
            const otherCredentials = new Set(otherConsumers.flatMap(item=>item?.credentials || [item?.credential]).filter(Boolean));
            const duplicate = currentConsumers.find(item=>otherCredentials.has(item.credential));
            if(duplicate) throw new Error('消费者 Key 已被其他域名使用，请更换 Key');
            if(new Set(currentConsumers.map(item=>item.credential)).size != currentConsumers.length){
                throw new Error('同一域名下的消费者 Key 不能重复');
            }
            plugin.spec.defaultConfig.consumers = otherConsumers.concat(currentConsumers);
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress.metadata.name)));
            if(this.routeForm.authEnabled){
                plugin.spec.matchRules.push({
                    domain: [this.host],
                    config: { allow: currentConsumers.map(item=>item.name) },
                    configDisable: false,
                });
            }
            await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+KEY_AUTH_PLUGIN_NAME, plugin);
        },
        async syncModelValidationPlugin(){
            const models = compact(this.routeForm.models);
            let plugin = await this.getManagedPlugin(MODEL_VALIDATION_PLUGIN_NAME);
            if(!plugin && !models.length) return;
            if(!plugin){
                plugin = await this.ensureManagedPlugin(
                    MODEL_VALIDATION_PLUGIN_NAME,
                    MODEL_VALIDATION_PLUGIN_URL,
                    'AI代理模型白名单',
                    { body_schema: { type: 'object' } },
                    true,
                    220,
                );
            }
            plugin = this.normalizeManagedPlugin(plugin, MODEL_VALIDATION_PLUGIN_NAME, MODEL_VALIDATION_PLUGIN_URL, 220);
            plugin.spec = plugin.spec || {};
            plugin.spec.defaultConfigDisable = true;
            if(!plugin.spec.defaultConfig || !Object.keys(plugin.spec.defaultConfig).length){
                plugin.spec.defaultConfig = { body_schema: { type: 'object' } };
            }
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress.metadata.name)));
            if(models.length){
                plugin.spec.matchRules.push({
                    domain: [this.host],
                    config: {
                        body_schema: {
                            type: 'object',
                            required: ['model'],
                            properties: { model: { type: 'string', enum: models } },
                        },
                        rejected_code: 403,
                        rejected_msg: '请求使用的模型不在该域名允许列表中',
                    },
                    configDisable: false,
                });
            }
            await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+MODEL_VALIDATION_PLUGIN_NAME, plugin);
        },
        async syncRuleProviders(providerList){
            const providers = (providerList || this.providers).map(item=>({
                ...item,
                id: providerResourceId(this.ingress.metadata.name, item.name),
            }));
            const weightError = validateProviderWeights(providers);
            if(weightError) throw new Error(weightError);
            const plugin = await this.ensurePlugin();
            const oldRules = plugin.spec.matchRules || [];
            const legacyRule = oldRules.find(rule=>(rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name));
            const legacyIds = (legacyRule?.config?.providers || []).map(item=>item?.provider || item?.name).filter(Boolean);
            const otherReferencedIds = new Set(oldRules.filter(rule=>rule !== legacyRule).flatMap(rule=>(rule?.config?.providers || []).map(item=>item?.provider || item?.name)).filter(Boolean));
            const currentIds = new Set(providers.map(item=>item.id));
            const staleLegacyIds = legacyIds.filter(id=>!currentIds.has(id) && !otherReferencedIds.has(id));
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name)));
            if(staleLegacyIds.length){
                const defaultConfig = this.ensureDefaultConfig(plugin);
                defaultConfig.providers = (defaultConfig.providers || []).filter(item=>!staleLegacyIds.includes(item?.id));
                plugin.spec.matchRules = plugin.spec.matchRules.filter(rule=>!staleLegacyIds.some(id=>(rule?.service || []).includes(this.providerServiceName(id)+'.dns') || (rule?.service || []).includes(this.providerServiceName(id)+'.static')));
                for(const id of staleLegacyIds){
                    await this.removeMcpBridgeRegistry(this.providerServiceName(id));
                }
            }
            providers.forEach(provider=>{
                this.upsertGlobalProvider(plugin, provider);
                this.upsertProviderServiceRule(plugin, provider);
            });
            const orphanProviderIds = this.pruneOrphanManagedProviderRules(plugin);
            for(const id of orphanProviderIds){
                await this.removeMcpBridgeRegistry(this.providerServiceName(id));
            }
            for(const provider of providers){
                await this.upsertMcpBridgeRegistry(provider);
            }
            await this.savePlugin(plugin);
            this.providers = providers;
            await this.syncIngressRouteState(providers);
        },
        async syncProviderResources(form, providerList){
            const nextProvider = this.providerFormToProvider(form);
            const nextProviders = providerList || this.providers.filter(item=>item.id != nextProvider.id && item.id != form.originalId).concat([nextProvider]);
            await this.syncRuleProviders(nextProviders);
        },
        async removeProviderResources(providerName, nextProviders){
            const plugin = await this.ensurePlugin();
            const defaultConfig = this.ensureDefaultConfig(plugin);
            const providerId = this.providers.find(item=>item.name == providerName)?.id || providerResourceId(this.ingress.metadata.name, providerName);
            defaultConfig.providers = (defaultConfig.providers || []).filter(item=>item?.id != providerId);
            const serviceName = this.providerServiceName(providerId);
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                return !((rule?.service || []).includes(serviceName + '.dns') || (rule?.service || []).includes(serviceName + '.static'));
            });
            await this.removeMcpBridgeRegistry(serviceName);
            await this.savePlugin(plugin);
            await this.syncRuleProviders(nextProviders);
        },
        ensureDefaultConfig(plugin){
            plugin.spec = plugin.spec || {};
            plugin.spec.defaultConfigDisable = false;
            plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
            plugin.spec.defaultConfig.providers = plugin.spec.defaultConfig.providers || [];
            plugin.spec.matchRules = plugin.spec.matchRules || [];
            return plugin.spec.defaultConfig;
        },
        pruneOrphanManagedProviderRules(plugin){
            const providerIds = new Set((plugin?.spec?.defaultConfig?.providers || []).map(item=>item?.id).filter(Boolean));
            const orphanIds = new Set();
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                const activeProviderId = String(rule?.config?.activeProviderId || '');
                if(!activeProviderId.startsWith('ai-scope-') || providerIds.has(activeProviderId)) return true;
                orphanIds.add(activeProviderId);
                return false;
            });
            return [...orphanIds];
        },
        upsertGlobalProvider(plugin, provider){
            const defaultConfig = this.ensureDefaultConfig(plugin);
            const providers = defaultConfig.providers;
            const index = providers.findIndex(item=>item?.id == provider.id);
            const config = this.providerToPluginConfig(provider);
            if(index > -1) providers.splice(index, 1, config);
            else providers.push(config);
        },
        upsertProviderServiceRule(plugin, provider){
            plugin.spec.matchRules = plugin.spec.matchRules || [];
            const serviceName = this.providerUpstreamService(provider);
            const serviceBaseName = this.providerServiceName(provider.id);
            plugin.spec.matchRules = plugin.spec.matchRules.filter(rule=>{
                const services = rule?.service || [];
                return !services.includes(serviceBaseName + '.dns') && !services.includes(serviceBaseName + '.static');
            });
            const rule = {
                service: [serviceName],
                config: { activeProviderId: provider.id },
                configDisable: false,
            };
            plugin.spec.matchRules.push(rule);
        },
        providerFormToProvider(form){
            const rawConfigs = this.normalizeProviderRawConfigs(form.type, form.rawConfigs);
            return {
                id: providerResourceId(this.ingress.metadata.name, form.name),
                name: form.name,
                type: form.type || 'openai',
                protocol: form.protocol || 'openai/v1',
                tokens: compact(form.tokens).length ? compact(form.tokens) : compact(form.oldTokens),
                endpointUrl: this.formEndpointUrl(form, rawConfigs),
                rawConfigs,
                weight: Number(form.weight) || 0,
                enabled: form.enabled !== false,
            };
        },
        providerToPluginConfig(provider){
            const config = clone(provider.rawConfigs);
            config.id = provider.id;
            config.type = provider.type;
            config.protocol = this.pluginProtocol(provider.protocol);
            const tokens = compact(provider.tokens);
            if(tokens.length) config.apiTokens = tokens;
            else delete config.apiTokens;
            delete config.modelMapping;
            this.applyEndpointConfig(config, provider);
            return config;
        },
        providerConfigToForm(config, routeItem){
            const protocol = config.protocol == 'original' ? 'original' : 'openai/v1';
            return {
                rawConfigs: { ...this.defaultRawConfigs(config.type || routeItem?.type || 'openai'), ...clone(config) },
                type: config.type || routeItem?.type || 'openai',
                protocol,
                tokens: config.apiTokens || [],
                endpointUrl: this.configEndpointUrl(config),
            };
        },
        pluginProtocol(protocol){
            return protocol == 'original' ? 'original' : 'openai';
        },
        applyEndpointConfig(config, provider){
            const endpoint = String(provider.endpointUrl || '').trim();
            if(provider.type == 'openai'){
                if(endpoint && endpoint != DEFAULT_ENDPOINTS.openai) config.openaiCustomUrl = endpoint;
                else delete config.openaiCustomUrl;
                delete config.openaiExtraCustomUrls;
            }else if(provider.type == 'qwen'){
                const host = this.urlHost(config.qwenDomain);
                if(host) config.qwenDomain = host;
                else delete config.qwenDomain;
                config.qwenEnableCompatible = config.qwenEnableCompatible !== false;
                config.qwenEnableSearch = !!config.qwenEnableSearch;
                config.qwenFileIds = compact(config.qwenFileIds);
                if(!config.qwenFileIds.length) delete config.qwenFileIds;
            }else if(provider.type == 'azure'){
                config.azureServiceUrl = endpoint;
            }else if(provider.type == 'claude'){
                if(endpoint && endpoint != DEFAULT_ENDPOINTS.claude) config.claudeCustomUrl = endpoint;
                else delete config.claudeCustomUrl;
                if(!config.claudeVersion) config.claudeVersion = '2023-06-01';
                config.claudeCodeMode = !!config.claudeCodeMode;
            }else if(provider.type == 'ollama'){
                const url = this.parseUrl(endpoint);
                config.ollamaServerHost = String(config.ollamaServerHost || url?.hostname || endpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')).trim();
                config.ollamaServerPort = Number(config.ollamaServerPort || url?.port || 11434);
            }else if(provider.type == 'vllm'){
                config.vllmCustomUrl = String(config.vllmCustomUrl || endpoint || '').trim();
                config.vllmExtraCustomUrls = compact(config.vllmExtraCustomUrls);
                if(!config.vllmExtraCustomUrls.length) delete config.vllmExtraCustomUrls;
            }else if(provider.type == 'zhipuai'){
                const host = this.urlHost(config.zhipuDomain) || this.urlHost(endpoint || DEFAULT_ENDPOINTS.zhipuai);
                if(host && host != 'open.bigmodel.cn') config.zhipuDomain = host;
                else delete config.zhipuDomain;
                config.zhipuCodePlanMode = config.zhipuCodePlanMode !== false;
            }else if(provider.type == 'bedrock'){
                config.awsRegion = String(config.awsRegion || 'us-east-1').trim();
                config.awsAccessKey = String(config.awsAccessKey || '').trim();
                config.awsSecretKey = String(config.awsSecretKey || '').trim();
            }else if(provider.type == 'vertex'){
                config.vertexRegion = String(config.vertexRegion || 'global').trim().toLowerCase();
                config.vertexProjectId = String(config.vertexProjectId || '').trim();
                config.vertexAuthKey = String(config.vertexAuthKey || '').trim();
                config.vertexAuthServiceName = 'vertex-auth.internal';
            }
        },
        configEndpointUrl(config){
            if(config.openaiCustomUrl) return config.openaiCustomUrl;
            if(config.azureServiceUrl) return config.azureServiceUrl;
            if(config.claudeCustomUrl) return config.claudeCustomUrl;
            if(config.vllmCustomUrl) return config.vllmCustomUrl;
            if(config.ollamaServerHost) return 'http://' + config.ollamaServerHost + ':' + (config.ollamaServerPort || 11434);
            if(config.type == 'qwen' || config.qwenDomain) return 'https://' + (config.qwenDomain || 'dashscope.aliyuncs.com') + '/' + (config.qwenEnableCompatible === false ? 'api/v1/services/aigc' : 'compatible-mode/v1');
            if(config.zhipuDomain) return 'https://' + config.zhipuDomain;
            if(config.awsRegion) return 'https://bedrock-runtime.' + config.awsRegion + '.amazonaws.com';
            if(config.vertexRegion) return config.vertexRegion == 'global' ? 'https://aiplatform.googleapis.com' : 'https://' + config.vertexRegion + '-aiplatform.googleapis.com';
            return DEFAULT_ENDPOINTS[config.type] || '';
        },
        formEndpointUrl(form, rawConfigs){
            const config = clone(rawConfigs || {});
            config.type = form.type;
            const provider = { type: form.type, endpointUrl: form.endpointUrl, rawConfigs: config };
            this.applyEndpointConfig(config, provider);
            return this.configEndpointUrl(config);
        },
        normalizeProviderRawConfigs(type, rawConfigs){
            const config = clone(rawConfigs || {});
            if(type == 'qwen'){
                config.qwenDomain = this.urlHost(config.qwenDomain);
                if(!config.qwenDomain) delete config.qwenDomain;
                config.qwenEnableCompatible = config.qwenEnableCompatible !== false;
                config.qwenEnableSearch = !!config.qwenEnableSearch;
                config.qwenFileIds = compact(config.qwenFileIds);
                if(!config.qwenFileIds.length) delete config.qwenFileIds;
            }else if(type == 'zhipuai'){
                config.zhipuDomain = this.urlHost(config.zhipuDomain);
                if(!config.zhipuDomain) delete config.zhipuDomain;
                config.zhipuCodePlanMode = config.zhipuCodePlanMode !== false;
            }else if(type == 'claude'){
                config.claudeVersion = String(config.claudeVersion || '2023-06-01').trim();
                config.claudeCodeMode = !!config.claudeCodeMode;
            }else if(type == 'ollama'){
                config.ollamaServerHost = String(config.ollamaServerHost || '').trim();
                config.ollamaServerPort = Number(config.ollamaServerPort || 11434);
            }else if(type == 'vllm'){
                config.vllmCustomUrl = String(config.vllmCustomUrl || '').trim();
                config.vllmExtraCustomUrls = compact(config.vllmExtraCustomUrls);
                if(!config.vllmExtraCustomUrls.length) delete config.vllmExtraCustomUrls;
            }else if(type == 'vertex' && !config.vertexTokenRefreshAhead){
                delete config.vertexTokenRefreshAhead;
            }
            return config;
        },
        providerServiceName(providerName){
            return providerServiceName(providerName);
        },
        providerUpstreamService(provider){
            return this.providerServiceName(provider.id) + '.' + this.providerRegistryType(provider);
        },
        providerRegistryType(provider){
            const endpoint = this.providerEndpoint(provider);
            const host = endpoint?.hostname || '';
            return /^\d+\.\d+\.\d+\.\d+$/.test(host) ? 'static' : 'dns';
        },
        providerEndpoint(provider){
            const url = this.parseUrl(provider.endpointUrl || this.configEndpointUrl(this.providerToPluginConfig(provider)) || DEFAULT_ENDPOINTS[provider.type]);
            if(url) return url;
            return null;
        },
        async getMcpBridge(){
            return k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        async ensureMcpBridge(){
            const old = await this.getMcpBridge();
            if(old) return old;
            const data = {
                apiVersion: 'networking.higress.io/v1',
                kind: 'McpBridge',
                metadata: { name: MCPBRIDGE_NAME, namespace: PLUGIN_NAMESPACE },
                spec: { registries: [], proxies: [] },
            };
            return k8sproxy.post('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges', data).then(res=>res.data);
        },
        async upsertMcpBridgeRegistry(provider){
            const mcp = await this.ensureMcpBridge();
            mcp.spec = mcp.spec || {};
            mcp.spec.registries = mcp.spec.registries || [];
            mcp.spec.proxies = mcp.spec.proxies || [];
            const registries = this.providerRegistries(provider);
            registries.forEach(registry=>{
                const index = mcp.spec.registries.findIndex(item=>item?.name == registry.name);
                if(index > -1) mcp.spec.registries.splice(index, 1, registry);
                else mcp.spec.registries.push(registry);
            });
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        async removeMcpBridgeRegistry(serviceName){
            const mcp = await this.getMcpBridge();
            if(!mcp?.spec?.registries) return;
            mcp.spec.registries = mcp.spec.registries.filter(item=>item?.name != serviceName);
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        providerRegistry(provider){
            const defaultEndpoint = DEFAULT_PROVIDER_ENDPOINTS[provider.type];
            if(defaultEndpoint && !provider.endpointUrl){
                return {
                    name: this.providerServiceName(provider.id),
                    type: 'dns',
                    protocol: defaultEndpoint.protocol,
                    domain: defaultEndpoint.domain,
                    port: defaultEndpoint.port,
                };
            }
            const endpoint = this.providerEndpoint(provider);
            const protocol = endpoint?.protocol?.replace(':','') || 'https';
            const host = endpoint?.hostname || '';
            const port = Number(endpoint?.port || (protocol == 'http' ? 80 : 443));
            const type = this.providerRegistryType(provider);
            return {
                name: this.providerServiceName(provider.id),
                type,
                protocol,
                domain: type == 'static' ? (host + ':' + port) : host,
                port: type == 'static' ? 80 : port,
            };
        },
        providerRegistries(provider){
            const registries = [this.providerRegistry(provider)];
            if(provider.type == 'vertex'){
                registries.push({
                    name: 'vertex-auth.internal',
                    type: 'dns',
                    protocol: 'https',
                    domain: 'oauth2.googleapis.com',
                    port: 443,
                });
            }
            return registries;
        },
        async syncIngressRouteState(providerList){
            if(!this.ingress) return;
            const ingress = clone(this.ingress);
            ingress.metadata = ingress.metadata || {};
            ingress.metadata.annotations = ingress.metadata.annotations || {};
            ingress.metadata.annotations[AI_MODELS_ANNOTATION] = JSON.stringify(compact(this.routeForm.models));
            ingress.metadata.annotations[AI_AUTH_ANNOTATION] = String(!!this.routeForm.authEnabled);
            ingress.metadata.annotations[AI_PROVIDERS_ANNOTATION] = JSON.stringify((providerList || []).map(item=>({
                id: item.id,
                name: item.name,
                weight: Number(item.weight) || 0,
                enabled: item.enabled !== false,
            })));
            const destination = this.providerDestination(providerList);
            if(destination) ingress.metadata.annotations['higress.io/destination'] = destination;
            else delete ingress.metadata.annotations['higress.io/destination'];
            await k8sproxy.put('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+ingress.metadata.name, ingress);
            this.ingress = ingress;
        },
        providerDestination(providerList){
            const enabledProviders = (providerList || []).filter(item=>item.enabled !== false);
            if(!enabledProviders.length) return '';
            const lines = enabledProviders.map(item=>{
                const registry = this.providerRegistry(item);
                const service = this.providerUpstreamService(item) + ':' + registry.port;
                if(enabledProviders.length == 1) return service;
                return (Number(item.weight) || 0) + '% ' + service;
            });
            return lines.join('\n');
        },
        parseUrl(value){
            if(!value) return null;
            try { return new URL(value); } catch { return null; }
        },
        urlHost(value){
            const url = this.parseUrl(value);
            return url?.hostname || String(value || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
        },
        changeProviderType(value){
            this.providerForm.endpointUrl = this.providerEndpointPlaceholder(value);
            this.providerForm.tokens = [];
            this.providerForm.tokenInput = '';
            this.providerForm.rawConfigs = this.defaultRawConfigs(value);
        },
        defaultRawConfigs(type){
            if(type == 'bedrock') return { awsRegion: 'us-east-1', awsAccessKey: '', awsSecretKey: '' };
            if(type == 'vertex') return { vertexRegion: 'global', vertexProjectId: '', vertexAuthKey: '', vertexTokenRefreshAhead: undefined };
            if(type == 'zhipuai') return { zhipuDomain: '', zhipuCodePlanMode: true };
            if(type == 'qwen') return { qwenDomain: '', qwenEnableCompatible: true, qwenEnableSearch: false, qwenFileIds: [] };
            if(type == 'claude') return { claudeVersion: '2023-06-01', claudeCodeMode: false };
            if(type == 'ollama') return { ollamaServerHost: '127.0.0.1', ollamaServerPort: 11434 };
            if(type == 'vllm') return { vllmCustomUrl: 'http://127.0.0.1:8000/v1', vllmExtraCustomUrls: [] };
            return {};
        },
        validateProviderConfig(form){
            const rawConfigs = form.rawConfigs || {};
            if(form.type == 'qwen' && String(rawConfigs.qwenDomain || '').trim()){
                const rawDomain = String(rawConfigs.qwenDomain).trim();
                try {
                    const url = new URL(rawDomain.includes('://') ? rawDomain : 'https://' + rawDomain);
                    if(!url.hostname) return 'Qwen 自定义域名格式不正确';
                } catch {
                    return 'Qwen 自定义域名格式不正确';
                }
            }
            if(form.type == 'azure'){
                const endpoint = String(form.endpointUrl || '').trim();
                if(!endpoint) return 'Azure 服务 URL 不能为空';
                try {
                    const url = new URL(endpoint);
                    if(!url.searchParams.get('api-version')) return 'Azure 服务 URL 必须包含 api-version 查询参数';
                } catch {
                    return 'Azure 服务 URL 格式不正确';
                }
            }
            if(form.type == 'ollama'){
                if(!rawConfigs.ollamaServerHost) return 'Ollama 服务主机名不能为空';
                if(!rawConfigs.ollamaServerPort) return 'Ollama 服务端口不能为空';
            }
            if(form.type == 'vllm'){
                if(!rawConfigs.vllmCustomUrl) return 'vLLM BaseURL 不能为空';
                if(!this.parseUrl(rawConfigs.vllmCustomUrl)) return 'vLLM BaseURL 格式不正确';
                const invalid = compact(rawConfigs.vllmExtraCustomUrls).find(item=>!this.parseUrl(item));
                if(invalid) return '备用 BaseURL 格式不正确：' + invalid;
            }
            if(form.type == 'bedrock'){
                if(!rawConfigs.awsRegion) return 'AWS 区域不能为空';
                if(!rawConfigs.awsAccessKey) return 'Access Key 不能为空';
                if(!rawConfigs.awsSecretKey) return 'Secret Key 不能为空';
            }
            if(form.type == 'vertex'){
                if(!rawConfigs.vertexRegion) return 'Vertex 区域不能为空';
                if(!rawConfigs.vertexProjectId) return '项目 ID 不能为空';
                if(!rawConfigs.vertexAuthKey) return '认证 JSON 不能为空';
                try {
                    const auth = JSON.parse(rawConfigs.vertexAuthKey);
                    if(!auth.client_email || !auth.private_key_id || !auth.private_key || !auth.token_uri){
                        return '认证 JSON 缺少 client_email/private_key_id/private_key/token_uri';
                    }
                } catch {
                    return '认证 JSON 格式不正确';
                }
            }
            return '';
        },
        showEndpointUrl(type){
            return !!this.providerEndpointPlaceholder(type) && !['bedrock', 'vertex', 'qwen', 'zhipuai', 'ollama', 'vllm'].includes(type);
        },
        needEndpointUrl(type){
            const item = PROVIDER_TYPES.find(i=>i.value == type);
            return !!item?.requiredEndpoint || ['openai', 'azure', 'claude'].includes(type);
        },
        providerEndpointPlaceholder(type){
            return PROVIDER_TYPES.find(i=>i.value == type)?.endpoint || '';
        },
        providerTypeLabel(type){
            return PROVIDER_TYPES.find(i=>i.value == type)?.label || type || '-';
        },
        domainToName(str){
            return String(str || '').replace(/\*/g,'x').replace(/(\.|\/|_|:|\s+)/g,'-').toLowerCase();
        },
        createToken(){
            return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(i=>('0'+i.toString(16)).slice(-2)).join('');
        },
    },
}
</script>
