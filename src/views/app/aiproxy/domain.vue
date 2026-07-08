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
                    <a-input-tag v-model="routeForm.models" placeholder="输入后回车，支持多个模型" allow-clear />
                </a-form-item>
                <a-form-item label="认证">
                    <a-switch v-model="routeForm.authEnabled" />
                </a-form-item>
                <a-form-item v-if="routeForm.authEnabled" label="消费者">
                    <div class="df df-c" style="flex:1;">
                        <div v-for="(item,index) in consumers" :key="index" class="df ai-c mb-10">
                            <a-input v-model="item.name" placeholder="消费者名称" style="width:220px;" />
                            <a-input v-model="item.key" placeholder="留空保留原 Key，新增留空自动生成" class="ml-10" style="width:360px;" />
                            <span class="ml-10 cursor c-blue" @click="consumers.splice(index,1)">删除</span>
                        </div>
                        <span class="cursor c-blue" @click="consumers.push({name:'', key:''})">添加消费者</span>
                    </div>
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" @click="saveRoute">保存配置</a-button>
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
                    <td>模型</td>
                    <td>权重</td>
                    <td>状态</td>
                    <td style="width:240px;">操作</td>
                </tr>
                <tr v-for="item in providers" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>{{ providerTypeLabel(item.type) }}</td>
                    <td>{{ item.endpointUrl || '-' }}</td>
                    <td>{{ item.models.join(', ') || '-' }}</td>
                    <td>{{ item.weight }}</td>
                    <td>
                        <a-switch v-model="item.enabled" @change="toggleProvider(item)" />
                    </td>
                    <td>
                        <span v-if="permission.includes('gateway/aiproxy/edit')" class="cursor c-blue" @click="openProvider(item)">编辑</span>
                        <a-popconfirm v-if="permission.includes('gateway/aiproxy/delete')" :content="'确认要删除吗'" @ok="deleteProvider(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!providers.length">
                    <td colspan="7"><a-empty /></td>
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
                    <a-input-tag v-model="providerForm.tokens" :placeholder="providerForm.isEdit?'留空则保留原 Token':'输入后回车，支持多个 Token'" allow-clear />
                </a-form-item>
                <a-form-item v-if="needEndpointUrl(providerForm.type)" label="服务地址" field="endpointUrl">
                    <a-input v-model="providerForm.endpointUrl" :placeholder="providerEndpointPlaceholder(providerForm.type)" />
                </a-form-item>
                <a-form-item label="模型名称">
                    <a-input-tag v-model="providerForm.models" placeholder="输入后回车，支持多个模型" allow-clear />
                </a-form-item>
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

const AI_LABEL = 'w7.cc/gateway-ai-proxy';
const AI_DOMAIN_LABEL = 'w7.cc/gateway-ai-domain';
const AI_CONSUMER_LABEL = 'w7.cc/gateway-ai-consumer';
const PLUGIN_NAME = 'w7-ai-proxy';
const PLUGIN_NAMESPACE = 'higress-system';
const PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/ai-proxy:latest';
const MCPBRIDGE_NAME = 'default';

const PROVIDER_TYPES = [
    { label: 'OpenAI', value: 'openai', endpoint: 'https://api.openai.com/v1' },
    { label: 'Qwen', value: 'qwen', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { label: 'Azure OpenAI', value: 'azure', endpoint: 'https://example.openai.azure.com/openai/deployments/deployment/chat/completions?api-version=2024-02-15-preview', requiredEndpoint: true },
    { label: 'Claude', value: 'claude', endpoint: 'https://api.anthropic.com' },
    { label: 'DeepSeek', value: 'deepseek', endpoint: 'https://api.deepseek.com' },
    { label: 'Moonshot', value: 'moonshot', endpoint: 'https://api.moonshot.cn' },
    { label: 'Ollama', value: 'ollama', endpoint: 'http://127.0.0.1:11434', requiredEndpoint: true },
    { label: 'vLLM', value: 'vllm', endpoint: 'http://127.0.0.1:8000/v1', requiredEndpoint: true },
];

const DEFAULT_ENDPOINTS = {
    openai: 'https://api.openai.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    claude: 'https://api.anthropic.com',
    deepseek: 'https://api.deepseek.com',
    moonshot: 'https://api.moonshot.cn',
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
                endpointUrl: DEFAULT_ENDPOINTS.openai,
                models: [],
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
                this.routeForm.models = rule?.config?.models || [];
                this.routeForm.authEnabled = !!rule?.config?.auth?.enabled;
                const secrets = secretRes?.data?.items || [];
                const legacyProviders = secrets.filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true').map(s=>this.secretToProvider(s));
                const routeProviders = this.routeProviders(rule, plugin);
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
            if(this.plugin) return Promise.resolve(clone(this.plugin));
            const data = {
                apiVersion: 'extensions.higress.io/v1alpha1',
                kind: 'WasmPlugin',
                metadata: {
                    name: PLUGIN_NAME,
                    namespace: PLUGIN_NAMESPACE,
                    labels: {
                        [AI_LABEL]: 'true',
                        'higress.io/wasm-plugin-name': 'ai-proxy',
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
        routeProviders(rule, plugin){
            const providerMap = this.globalProviderMap(plugin);
            return (rule?.config?.providers || []).map(item=>{
                const name = item.provider || item.name;
                const config = providerMap[name] || {};
                return {
                    ...this.providerConfigToForm(config, item),
                    name,
                    models: item.models || this.modelMappingToModels(item.modelMapping) || [],
                    weight: Number(item.weight) || 0,
                    enabled: item.enabled !== false,
                };
            }).filter(item=>item.name);
        },
        modelMappingToModels(modelMapping){
            if(!modelMapping) return [];
            return Object.keys(modelMapping).filter(key=>key && key != '*');
        },
        openProvider(row){
            if(!row){
                this.providerForm = {
                    show: true,
                    isEdit: false,
                    originalName: '',
                    rawConfigs: {},
                    type: 'openai',
                    name: '',
                    protocol: 'openai/v1',
                    tokens: [],
                    endpointUrl: DEFAULT_ENDPOINTS.openai,
                    models: [],
                    weight: 100,
                    enabled: true,
                };
                return;
            }
            this.providerForm = {
                show: true,
                isEdit: true,
                originalName: row.name,
                rawConfigs: clone(row.rawConfigs),
                type: row.type || 'openai',
                name: row.name,
                protocol: row.protocol || 'openai/v1',
                tokens: [],
                oldTokens: [...(row.tokens || [])],
                endpointUrl: row.endpointUrl || this.providerEndpointPlaceholder(row.type),
                models: [...row.models],
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
                this.providerForm.name = name;
                useLoadingStore().loading = true;
                try {
                    await this.syncProviderResources(this.providerForm);
                    this.providerForm.show = false;
                    await this.getData();
                    this.$message.success('操作成功');
                } finally {
                    useLoadingStore().loading = false;
                }
            })
        },
        secretToProvider(secret){
            let models = [];
            try { models = JSON.parse(secret?.metadata?.annotations?.['w7.cc/models'] || '[]'); } catch {}
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
                models,
                weight: Number(secret?.metadata?.annotations?.['w7.cc/weight'] || 0),
                enabled: secret?.metadata?.annotations?.['w7.cc/enabled'] !== 'false',
            };
        },
        async toggleProvider(row){
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
            await this.saveConsumers();
            await this.syncRuleProviders();
            await this.getData();
            this.$message.success('操作成功');
        },
        async saveConsumers(){
            const existing = this.consumers.filter(i=>i.secretName).map(i=>i.secretName);
            const secretRes = await k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+this.ingress.metadata.name+','+AI_CONSUMER_LABEL+'=true', { noAlert: true });
            const oldSecrets = secretRes?.data?.items || [];
            for(const old of oldSecrets){
                if(!existing.includes(old.metadata.name)){
                    await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+old.metadata.name, { noAlert: true });
                }
            }
            for(const consumer of this.consumers.filter(i=>i.name)){
                const key = consumer.key || consumer.oldKey || this.createToken();
                const name = consumer.secretName || 'ai-consumer-' + this.ingress.metadata.name.replace(/^ai-/, '') + '-' + this.domainToName(consumer.name);
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
                }
            }
        },
        async syncRuleProviders(providerList){
            const plugin = await this.ensurePlugin();
            const rules = plugin.spec.matchRules || [];
            let rule = rules.find(rule=>{
                return (rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name);
            });
            if(!rule){
                rule = { ingress: [this.ingress.metadata.name], domain: [this.host], config: {} };
                rules.push(rule);
            }
            rule.config = {
                ...(rule.config || {}),
                managedBy: 'w7panel',
                domain: this.host,
                models: this.routeForm.models || [],
                providers: (providerList || this.providers).map(i=>({
                    provider: i.name,
                    models: i.models || [],
                    weight: Number(i.weight) || 0,
                    enabled: i.enabled !== false,
                    modelMapping: this.modelsToModelMapping(i.models || []),
                })),
                auth: {
                    enabled: !!this.routeForm.authEnabled,
                    type: 'key-auth',
                    consumers: this.routeForm.authEnabled ? this.consumers.filter(i=>i.name).map(i=>({
                        name: i.name,
                        keySecret: i.secretName || ('ai-consumer-' + this.ingress.metadata.name.replace(/^ai-/, '') + '-' + this.domainToName(i.name)),
                    })) : [],
                },
            };
            plugin.spec.matchRules = rules;
            await this.savePlugin(plugin);
            await this.syncIngressDestination(providerList || this.providers);
        },
        async syncProviderResources(form){
            const nextProvider = this.providerFormToProvider(form);
            const nextProviders = this.providers.filter(item=>item.name != nextProvider.name && item.name != form.originalName).concat([nextProvider]);
            const plugin = await this.ensurePlugin();
            this.upsertGlobalProvider(plugin, nextProvider);
            this.upsertProviderServiceRule(plugin, nextProvider);
            await this.upsertMcpBridgeRegistry(nextProvider);
            await this.savePlugin(plugin);
            await this.syncRuleProviders(nextProviders);
        },
        async removeProviderResources(providerName, nextProviders){
            const plugin = await this.ensurePlugin();
            const defaultConfig = this.ensureDefaultConfig(plugin);
            defaultConfig.providers = (defaultConfig.providers || []).filter(item=>item?.id != providerName);
            const serviceName = this.providerServiceName(providerName);
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
        upsertGlobalProvider(plugin, provider){
            const defaultConfig = this.ensureDefaultConfig(plugin);
            const providers = defaultConfig.providers;
            const index = providers.findIndex(item=>item?.id == provider.name);
            const config = this.providerToPluginConfig(provider);
            if(index > -1) providers.splice(index, 1, config);
            else providers.push(config);
        },
        upsertProviderServiceRule(plugin, provider){
            plugin.spec.matchRules = plugin.spec.matchRules || [];
            const serviceName = this.providerUpstreamService(provider);
            const serviceBaseName = this.providerServiceName(provider.name);
            plugin.spec.matchRules = plugin.spec.matchRules.filter(rule=>{
                const services = rule?.service || [];
                return !services.includes(serviceBaseName + '.dns') && !services.includes(serviceBaseName + '.static');
            });
            const rule = {
                service: [serviceName],
                config: { activeProviderId: provider.name },
                configDisable: false,
            };
            plugin.spec.matchRules.push(rule);
        },
        providerFormToProvider(form){
            return {
                name: form.name,
                type: form.type || 'openai',
                protocol: form.protocol || 'openai/v1',
                tokens: compact(form.tokens).length ? compact(form.tokens) : compact(form.oldTokens),
                endpointUrl: form.endpointUrl,
                rawConfigs: clone(form.rawConfigs),
                models: form.models || [],
                weight: Number(form.weight) || 0,
                enabled: form.enabled !== false,
            };
        },
        providerToPluginConfig(provider){
            const config = clone(provider.rawConfigs);
            config.id = provider.name;
            config.type = provider.type;
            config.protocol = this.pluginProtocol(provider.protocol);
            const tokens = compact(provider.tokens);
            if(tokens.length) config.apiTokens = tokens;
            else delete config.apiTokens;
            this.applyEndpointConfig(config, provider);
            return config;
        },
        providerConfigToForm(config, routeItem){
            const protocol = config.protocol == 'original' ? 'original' : 'openai/v1';
            return {
                rawConfigs: clone(config),
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
                const host = this.urlHost(endpoint || DEFAULT_ENDPOINTS.qwen);
                if(host && host != 'dashscope.aliyuncs.com') config.qwenDomain = host;
                else delete config.qwenDomain;
                config.qwenEnableCompatible = true;
                config.qwenEnableSearch = !!config.qwenEnableSearch;
            }else if(provider.type == 'azure'){
                config.azureServiceUrl = endpoint;
            }else if(provider.type == 'claude'){
                if(endpoint && endpoint != DEFAULT_ENDPOINTS.claude) config.claudeCustomUrl = endpoint;
                else delete config.claudeCustomUrl;
            }else if(provider.type == 'ollama'){
                const url = this.parseUrl(endpoint);
                config.ollamaServerHost = url?.hostname || endpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
                config.ollamaServerPort = Number(url?.port || 11434);
            }else if(provider.type == 'vllm'){
                config.vllmCustomUrl = endpoint;
                delete config.vllmExtraCustomUrls;
            }
        },
        configEndpointUrl(config){
            if(config.openaiCustomUrl) return config.openaiCustomUrl;
            if(config.azureServiceUrl) return config.azureServiceUrl;
            if(config.claudeCustomUrl) return config.claudeCustomUrl;
            if(config.vllmCustomUrl) return config.vllmCustomUrl;
            if(config.ollamaServerHost) return 'http://' + config.ollamaServerHost + ':' + (config.ollamaServerPort || 11434);
            if(config.qwenDomain) return 'https://' + config.qwenDomain + '/compatible-mode/v1';
            return DEFAULT_ENDPOINTS[config.type] || '';
        },
        modelsToModelMapping(models){
            const mapping = {};
            (models || []).forEach(model=>{
                if(model) mapping[model] = model;
            });
            return mapping;
        },
        providerServiceName(providerName){
            return 'llm-' + providerName + '.internal';
        },
        providerUpstreamService(provider){
            return this.providerServiceName(provider.name) + '.' + this.providerRegistryType(provider);
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
            const registry = this.providerRegistry(provider);
            const index = mcp.spec.registries.findIndex(item=>item?.name == registry.name);
            if(index > -1) mcp.spec.registries.splice(index, 1, registry);
            else mcp.spec.registries.push(registry);
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        async removeMcpBridgeRegistry(serviceName){
            const mcp = await this.getMcpBridge();
            if(!mcp?.spec?.registries) return;
            mcp.spec.registries = mcp.spec.registries.filter(item=>item?.name != serviceName);
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        providerRegistry(provider){
            const endpoint = this.providerEndpoint(provider);
            const protocol = endpoint?.protocol?.replace(':','') || 'https';
            const host = endpoint?.hostname || '';
            const port = Number(endpoint?.port || (protocol == 'http' ? 80 : 443));
            const type = this.providerRegistryType(provider);
            return {
                name: this.providerServiceName(provider.name),
                type,
                protocol,
                domain: type == 'static' ? (host + ':' + port) : host,
                port: type == 'static' ? 80 : port,
            };
        },
        async syncIngressDestination(providerList){
            if(!this.ingress) return;
            const ingress = clone(this.ingress);
            ingress.metadata = ingress.metadata || {};
            ingress.metadata.annotations = ingress.metadata.annotations || {};
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
            this.providerForm.rawConfigs = {};
        },
        needEndpointUrl(type){
            const item = PROVIDER_TYPES.find(i=>i.value == type);
            return !!item?.requiredEndpoint || ['openai', 'azure', 'claude', 'ollama', 'vllm'].includes(type);
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
