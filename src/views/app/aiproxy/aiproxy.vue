<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div v-if="permission.includes('gateway/aiproxy/add')" class="mb-20">
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新增</a-button>
        </div>
        <div class="bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>域名</td>
                    <td>模型</td>
                    <td>认证</td>
                    <td>服务提供者</td>
                    <td style="width:260px;">操作</td>
                </tr>
                <tr v-for="item in list" :key="item.name">
                    <td>
                        <a :href="item.url" target="_blank" class="c-blue cursor">{{ item.url }}</a>
                    </td>
                    <td>
                        <span v-if="item.models.length">{{ item.models.join(', ') }}</span>
                        <span v-else>-</span>
                    </td>
                    <td>{{ item.authEnabled ? '已启用' : '未启用' }}</td>
                    <td>{{ item.enabledProviders }}/{{ item.providers }}</td>
                    <td>
                        <span class="cursor c-blue" @click="toDomain(item)">服务提供者</span>
                        <span v-if="debug" class="ml-16 cursor c-blue" @click="openYaml(item)">YAML</span>
                        <a-popconfirm v-if="permission.includes('gateway/aiproxy/delete')" :content="'确认要删除吗'" @ok="toDelete(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!list.length">
                    <td colspan="5"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>

        <a-drawer :width="700" :visible="form.show" @ok="submit" @cancel="form.show=false;" :popup-container="$popupContainer">
            <template #title>AI代理</template>
            <a-form :model="form" ref="form" :rules="rules" auto-label-width class="padding-20">
                <a-form-item label="访问域名" field="domain">
                    <div class="df ai-c" style="flex:1;">
                        <a-input v-model="form.domain" :disabled="whiteList.length && form.whiteDomain==-1" placeholder="请输入域名" :spellcheck="false">
                            <template #prepend>{{form.autoSsl?'https://':'http://'}}</template>
                            <template v-if="whiteList.length && form.whiteDomain!=-1" #append>
                                <a-select v-model="form.whiteDomain">
                                    <a-option v-for="(wd, index) in whiteList" :key="index" :label="'.'+wd.domain" :value="index"></a-option>
                                </a-select>
                            </template>
                        </a-input>
                        <a-checkbox v-model="form.autoSsl" class="ml-16 df-s0">https证书</a-checkbox>
                    </div>
                </a-form-item>
            </a-form>
        </a-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getPermission, getUserInfo } from '@/utils/auth';
import {
    AI_LABEL,
    AI_DOMAIN_LABEL,
    AI_CONSUMER_LABEL,
    AI_AUTH_ANNOTATION,
    AI_MODELS_ANNOTATION,
    AI_PROVIDERS_ANNOTATION,
    domainResourcePrefix,
    providerServiceName,
    readRouteProviders,
    readStringArray,
    scopedName,
} from '@/utils/ai-proxy';

const PLUGIN_NAME = 'ai-proxy.internal';
const PLUGIN_NAMESPACE = 'higress-system';
const PLUGIN_VERSION = '2.0.0';
const PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/ai-proxy:2.0.0';
const KEY_AUTH_PLUGIN_NAME = 'key-auth.internal';
const MODEL_VALIDATION_PLUGIN_NAME = 'request-validation.internal';
const MCPBRIDGE_NAME = 'default';

export default {
    components: { yamlDrawer },
    data(){
        return {
            namespaceActive: '',
            list: [],
            ingresses: [],
            plugin: null,
            secrets: [],
            permission: [],
            debug: false,
            whiteList: [],
            form: {
                show: false,
                domain: '',
                whiteDomain: -1,
                autoSsl: false,
            },
            rules: {
                domain: [{ required: true, message: '域名不能为空' }],
            },
            yamlData: { show: false },
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getWhiteList();
        this.getData();
    },
    methods: {
        async getWhiteList(){
            let wl = getUserInfo()?.['w7.cc/domain-white-list'] || '[]';
            try { wl = JSON.parse(wl); } catch { wl = []; }
            this.whiteList = (wl || []).filter(i=>!i.disabled);
        },
        async getData(){
            useLoadingStore().loading = true;
            try {
                const [ingRes, plugin, secretRes] = await Promise.all([
                    k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector='+AI_LABEL+'=true'),
                    this.getPlugin(),
                    k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true', { noAlert: true }),
                ]);
                this.ingresses = ingRes?.data?.items || [];
                this.plugin = plugin;
                this.secrets = secretRes?.data?.items || [];
                const rules = plugin?.spec?.matchRules || [];
                this.list = this.ingresses.map(ing=>{
                    const host = ing?.spec?.rules?.[0]?.host || '';
                    const annotations = ing?.metadata?.annotations || {};
                    const ssl = ing?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    const rule = this.findRule(rules, ing, host);
                    const providers = readRouteProviders(annotations[AI_PROVIDERS_ANNOTATION]);
                    const legacyRouteProviders = rule?.config?.providers || [];
                    const legacyProviders = this.secrets.filter(s=>s?.metadata?.labels?.[AI_DOMAIN_LABEL] == ing.metadata.name && s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true');
                    const effectiveProviders = providers.length ? providers : legacyRouteProviders;
                    const providerCount = effectiveProviders.length || legacyProviders.length;
                    const enabledProviderCount = effectiveProviders.length ? effectiveProviders.filter(i=>i?.enabled !== false).length : legacyProviders.filter(s=>s?.metadata?.annotations?.['w7.cc/enabled'] !== 'false').length;
                    return {
                        name: ing.metadata.name,
                        host,
                        url: (ssl?'https://':'http://') + host,
                        models: readStringArray(annotations[AI_MODELS_ANNOTATION] || rule?.config?.models),
                        authEnabled: annotations[AI_AUTH_ANNOTATION] === 'true' || !!rule?.config?.auth?.enabled,
                        providers: providerCount,
                        enabledProviders: enabledProviderCount,
                        ingress: ing,
                    }
                });
            } finally {
                useLoadingStore().loading = false;
            }
        },
        getPlugin(){
            return k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+PLUGIN_NAME, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        findRule(rules, ing, host){
            return (rules || []).find(rule=>{
                return (rule?.domain || []).includes(host) || (rule?.ingress || []).includes(ing.metadata.name);
            }) || null;
        },
        openForm(){
            this.form = {
                show: true,
                domain: '',
                whiteDomain: this.whiteList.length ? 0 : -1,
                autoSsl: false,
            };
        },
        fullDomain(){
            let domain = this.form.domain || '';
            if(this.whiteList.length && this.form.whiteDomain!=-1){
                domain = domain.replace(/\.$/,'') + '.' + this.whiteList?.[this.form.whiteDomain]?.domain;
            }
            return domain.toLowerCase();
        },
        async submit(){
            this.$refs.form.validate(async err=>{
                if(err) return;
                useLoadingStore().loading = true;
                let ingress = null;
                try {
                    const domain = this.fullDomain();
                    ingress = await this.createIngress(domain, this.form.autoSsl);
                    try {
                        await this.ensurePlugin();
                    } catch (error) {
                        await k8sproxy.delete('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+ingress.metadata.name, { noAlert: true }).catch(()=>{});
                        throw error;
                    }
                    this.$message.success('操作成功');
                    this.form.show = false;
                    this.getData();
                } finally {
                    useLoadingStore().loading = false;
                }
            })
        },
        createIngress(domain, autoSsl){
            const data = {
                apiVersion: 'networking.k8s.io/v1',
                kind: 'Ingress',
                metadata: {
                    name: scopedName('ai', domain),
                    namespace: this.namespaceActive,
                    annotations: {
                        'kubernetes.io/ingress.class': 'higress',
                        'higress.io/resource-definer': 'higress',
                        [AI_MODELS_ANNOTATION]: '[]',
                        [AI_AUTH_ANNOTATION]: 'false',
                        [AI_PROVIDERS_ANNOTATION]: '[]',
                    },
                    labels: {
                        'higress.io/resource-definer': 'higress',
                        [AI_LABEL]: 'true',
                    },
                },
                spec: {
                    rules: [{
                        host: domain,
                        http: {
                            paths: [{
                                path: '/',
                                pathType: 'Prefix',
                                backend: {
                                    resource: {
                                        apiGroup: 'networking.higress.io',
                                        kind: 'McpBridge',
                                        name: 'default',
                                    },
                                },
                            }],
                        },
                    }],
                },
            };
            if(autoSsl){
                data.metadata.annotations['cert-manager.io/cluster-issuer'] = 'w7-letsencrypt-prod';
                data.metadata.annotations['cert-manager.io/renew-before'] = '30m';
                data.metadata.annotations['higress.io/ssl-redirect'] = 'false';
                data.spec.tls = [{ hosts: [domain], secretName: scopedName(domain, 'tls-secret') }];
            }
            return k8sproxy.post('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses', data).then(res=>res.data);
        },
        ensurePlugin(){
            if(this.plugin){
                const plugin = JSON.parse(JSON.stringify(this.plugin));
                plugin.metadata = plugin.metadata || {};
                plugin.metadata.labels = plugin.metadata.labels || {};
                plugin.spec = plugin.spec || {};
                const labels = plugin.metadata.labels;
                const needsUpdate = plugin.spec.url != PLUGIN_URL
                    || labels['higress.io/resource-definer'] != 'higress'
                    || labels['higress.io/wasm-plugin-name'] != 'ai-proxy'
                    || labels['higress.io/wasm-plugin-version'] != PLUGIN_VERSION
                    || labels['higress.io/wasm-plugin-built-in'] != 'true';
                plugin.spec.url = PLUGIN_URL;
                labels['higress.io/resource-definer'] = 'higress';
                labels['higress.io/wasm-plugin-name'] = 'ai-proxy';
                labels['higress.io/wasm-plugin-version'] = PLUGIN_VERSION;
                labels['higress.io/wasm-plugin-built-in'] = 'true';
                if(needsUpdate){
                    return this.savePlugin(plugin).then(res=>res.data || plugin);
                }
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
        savePlugin(plugin){
            return k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+PLUGIN_NAME, plugin);
        },
        async toDelete(row){
            useLoadingStore().loading = true;
            try {
                const plugin = await this.getPlugin();
                if(plugin){
                    const annotationProviders = readRouteProviders(row.ingress?.metadata?.annotations?.[AI_PROVIDERS_ANNOTATION]);
                    const legacyRule = this.findRule(plugin.spec.matchRules || [], row.ingress, row.host);
                    const providerIds = annotationProviders.map(i=>i.id).concat((legacyRule?.config?.providers || []).map(i=>i.provider || i.name)).filter(Boolean);
                    plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
                    plugin.spec.defaultConfig.providers = (plugin.spec.defaultConfig.providers || []).filter(item=>!providerIds.includes(item?.id));
                    plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                        const matchedDomain = (rule?.domain || []).includes(row.host) || (rule?.ingress || []).includes(row.name);
                        const matchedService = providerIds.some(id=>(rule?.service || []).includes(providerServiceName(id)+'.dns') || (rule?.service || []).includes(providerServiceName(id)+'.static'));
                        return !matchedDomain && !matchedService;
                    });
                    await this.savePlugin(plugin);
                    await this.removeMcpRegistries(providerIds);
                }
                await this.removeDomainPluginConfig(KEY_AUTH_PLUGIN_NAME, row, true);
                await this.removeDomainPluginConfig(MODEL_VALIDATION_PLUGIN_NAME, row, false);
                const secrets = this.secrets.filter(s=>s?.metadata?.labels?.[AI_DOMAIN_LABEL] == row.name);
                for(const secret of secrets){
                    await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+secret.metadata.name, { noAlert: true });
                }
                await k8sproxy.delete('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+row.name);
                this.$message.success('操作成功');
                this.getData();
            } finally {
                useLoadingStore().loading = false;
            }
        },
        async removeMcpRegistries(providerIds){
            if(!providerIds.length) return;
            const url = '/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME;
            const mcp = await k8sproxy.get(url, { noAlert: true }).then(res=>res.data).catch(()=>null);
            if(!mcp?.spec?.registries) return;
            const names = providerIds.map(providerServiceName);
            mcp.spec.registries = mcp.spec.registries.filter(item=>!names.includes(item?.name));
            await k8sproxy.put(url, mcp);
        },
        async removeDomainPluginConfig(pluginName, row, removeConsumers){
            const url = '/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+pluginName;
            const plugin = await k8sproxy.get(url, { noAlert: true }).then(res=>res.data).catch(()=>null);
            if(!plugin) return;
            plugin.spec = plugin.spec || {};
            const matchedRules = (plugin.spec.matchRules || []).filter(rule=>(rule?.domain || []).includes(row.host) || (rule?.ingress || []).includes(row.name));
            const matchedConsumers = new Set(matchedRules.flatMap(rule=>rule?.config?.allow || []));
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(row.host) || (rule?.ingress || []).includes(row.name)));
            if(removeConsumers){
                const prefix = domainResourcePrefix(row.name);
                plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
                plugin.spec.defaultConfig.consumers = (plugin.spec.defaultConfig.consumers || []).filter(item=>{
                    const name = String(item?.name || '');
                    return !name.startsWith(prefix) && !matchedConsumers.has(name);
                });
            }
            await k8sproxy.put(url, plugin);
        },
        toDomain(row){
            this.$router.push('/gateway/aiproxy-domain?name='+row.name);
        },
        openYaml(row){
            this.yamlData = {
                show: true,
                title: row.name,
                data: row.ingress,
                submit: data => k8sproxy.put('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+data?.metadata?.name, data).then(()=>{
                    this.$message.success('修改成功');
                    this.yamlData.show = false;
                    this.getData();
                }),
            };
        },
    },
}
</script>
