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
                <a-form-item label="模型名称">
                    <a-input-tag v-model="form.models" placeholder="输入后回车，支持多个模型" allow-clear />
                </a-form-item>
                <a-form-item label="认证">
                    <a-switch v-model="form.authEnabled" />
                </a-form-item>
                <template v-if="form.authEnabled">
                    <a-form-item label="消费者">
                        <a-input v-model="form.consumerName" placeholder="请输入消费者名称" />
                    </a-form-item>
                    <a-form-item label="Key">
                        <a-input v-model="form.consumerKey" placeholder="留空自动生成" />
                    </a-form-item>
                </template>
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

const AI_LABEL = 'w7.cc/gateway-ai-proxy';
const AI_DOMAIN_LABEL = 'w7.cc/gateway-ai-domain';
const AI_CONSUMER_LABEL = 'w7.cc/gateway-ai-consumer';
const PLUGIN_NAME = 'w7-ai-proxy';
const PLUGIN_NAMESPACE = 'higress-system';
const PLUGIN_URL = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/ai-proxy:latest';

function encode(value) {
    return btoa(unescape(encodeURIComponent(value || '')));
}

function decode(value) {
    if (!value) return '';
    try { return decodeURIComponent(escape(atob(value))); } catch { return ''; }
}

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
                models: [],
                authEnabled: false,
                consumerName: 'default',
                consumerKey: '',
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
                    const ssl = ing?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    const rule = this.findRule(rules, ing, host);
                    const providers = this.secrets.filter(s=>s?.metadata?.labels?.[AI_DOMAIN_LABEL] == ing.metadata.name && s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true');
                    return {
                        name: ing.metadata.name,
                        host,
                        url: (ssl?'https://':'http://') + host,
                        models: rule?.config?.models || [],
                        authEnabled: !!rule?.config?.auth?.enabled,
                        providers: providers.length,
                        enabledProviders: providers.filter(s=>s?.metadata?.annotations?.['w7.cc/enabled'] !== 'false').length,
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
                models: [],
                authEnabled: false,
                consumerName: 'default',
                consumerKey: '',
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
                try {
                    const domain = this.fullDomain();
                    const ingress = await this.createIngress(domain, this.form.autoSsl);
                    const plugin = await this.ensurePlugin();
                    const rules = plugin.spec.matchRules || [];
                    const consumers = [];
                    if(this.form.authEnabled){
                        const key = this.form.consumerKey || this.createToken();
                        const consumerName = this.form.consumerName || 'default';
                        await this.saveConsumerSecret(ingress.metadata.name, this.form.consumerName || 'default', key);
                        consumers.push({ name: consumerName, keySecret: this.consumerSecretName(ingress.metadata.name, consumerName) });
                        this.$message.info('消费者 Key：' + key);
                    }
                    rules.push(this.buildRule(ingress, domain, this.form.models, this.form.authEnabled, consumers));
                    plugin.spec.matchRules = rules;
                    await this.savePlugin(plugin);
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
                    name: 'ai-' + this.domainToName(domain),
                    namespace: this.namespaceActive,
                    annotations: {
                        'kubernetes.io/ingress.class': 'higress',
                        'higress.io/resource-definer': 'higress',
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
                                        apiGroup: 'extensions.higress.io',
                                        kind: 'WasmPlugin',
                                        name: PLUGIN_NAME,
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
                data.spec.tls = [{ hosts: [domain], secretName: this.domainToName(domain) + '-tls-secret' }];
            }
            return k8sproxy.post('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses', data).then(res=>res.data);
        },
        ensurePlugin(){
            if(this.plugin) return Promise.resolve(JSON.parse(JSON.stringify(this.plugin)));
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
                    defaultConfigDisable: true,
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
        buildRule(ingress, domain, models, authEnabled, consumers){
            return {
                ingress: [ingress.metadata.name],
                domain: [domain],
                config: {
                    managedBy: 'w7panel',
                    domain,
                    models: models || [],
                    providers: [],
                    auth: {
                        enabled: !!authEnabled,
                        type: 'key-auth',
                        consumers: consumers || [],
                    },
                },
            };
        },
        saveConsumerSecret(domainName, consumerName, key){
            const name = this.consumerSecretName(domainName, consumerName);
            const data = {
                apiVersion: 'v1',
                kind: 'Secret',
                metadata: {
                    name,
                    namespace: this.namespaceActive,
                    labels: {
                        [AI_LABEL]: 'true',
                        [AI_DOMAIN_LABEL]: domainName,
                        [AI_CONSUMER_LABEL]: 'true',
                    },
                    annotations: {
                        'w7.cc/consumer-name': consumerName,
                    },
                },
                type: 'Opaque',
                data: { key: encode(key) },
            };
            return k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/secrets', data);
        },
        consumerSecretName(domainName, consumerName){
            return 'ai-consumer-' + domainName.replace(/^ai-/, '') + '-' + this.domainToName(consumerName);
        },
        async toDelete(row){
            useLoadingStore().loading = true;
            try {
                const plugin = await this.getPlugin();
                if(plugin){
                    const host = row.host;
                    plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(host) || (rule?.ingress || []).includes(row.name)));
                    await this.savePlugin(plugin);
                }
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
        domainToName(str){
            return String(str || '').replace(/\*/g,'x').replace(/(\.|\/|_|:)/g,'-').toLowerCase();
        },
        createToken(){
            return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(i=>('0'+i.toString(16)).slice(-2)).join('');
        },
    },
}
</script>
