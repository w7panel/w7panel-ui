<template>
    <div class="padding-20">
        <route-breadcrumb />
        <a-alert v-if="aiProxyPluginInstalled === false" type="warning" show-icon class="mb-20">
            <div class="df ai-c jc-b" style="width:100%;gap:16px;">
                <span>AI 代理插件尚未安装，安装后才能新增和配置 AI 代理域名。</span>
                <a-button v-if="permission.includes('gateway/plugins/add')" type="primary" size="small" class="df-s0" @click="installAIProxyPlugin">安装 AI 代理插件</a-button>
                <span v-else class="c-99 df-s0">请联系管理员安装</span>
            </div>
        </a-alert>
        <div v-if="permission.includes('gateway/aiproxy/add')" class="mb-20">
            <a-button type="primary" :disabled="!aiProxyPluginInstalled" @click="openForm()"><template #icon><icon-plus /></template>新增</a-button>
        </div>
        <div class="bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>域名</td>
                    <td>AI 代理</td>
                    <td>模型</td>
                    <td>认证</td>
                    <td>服务提供者</td>
                    <td style="width:260px;">操作</td>
                </tr>
                <tr v-for="item in list" :key="item.name">
                    <td>
                        <a :href="item.url" target="_blank" class="c-blue cursor">{{ item.url }}</a>
                    </td>
                    <td>{{ item.enabled ? '已开启' : '已关闭' }}</td>
                    <td>
                        <span v-if="item.models.length">{{ item.models.join(', ') }}</span>
                        <span v-else>-</span>
                    </td>
                    <td>{{ item.authEnabled ? '已启用' : '未启用' }}</td>
                    <td>{{ item.enabledProviders }}/{{ item.providers }}</td>
                    <td>
                        <span class="cursor c-blue" @click="toDomain(item)">编辑</span>
                        <span v-if="debug" class="ml-16 cursor c-blue" @click="openYaml(item)">YAML</span>
                        <a-popconfirm v-if="permission.includes('gateway/aiproxy/delete')" content="将检查并删除消费者、服务提供者和域名配置，确认继续吗？" @ok="toDelete(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!list.length">
                    <td colspan="6"><a-empty /></td>
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

        <a-modal
            :visible="deleteTask.show"
            title="删除AI代理"
            width="760px"
            :footer="false"
            :mask-closable="false"
            :esc-to-close="!deleteTask.running"
            :closable="!deleteTask.running"
            :popup-container="$popupContainer"
            @cancel="closeDeleteTask"
        >
            <div class="delete-task-content">
                <div class="df df-c ai-c">
                    <icon-check-circle-fill v-if="deleteTask.completed" style="font-size:80px;color:rgb(var(--green-6));" />
                    <icon-close-circle-fill v-else-if="deleteTask.failed" class="c-red" style="font-size:80px;" />
                    <img v-else src="@/assets/image/loading.png" class="loader" style="width:60px;height:auto;" alt="" />
                    <div class="fs-18 mt-16 c-99">
                        <span v-if="deleteTask.completed">删除任务成功</span>
                        <span v-else-if="deleteTask.failed">删除任务失败</span>
                        <span v-else>任务执行中</span>
                    </div>
                    <div class="mt-8 c-aa">{{ deleteTask.row?.url }}</div>
                </div>

                <div class="task mt-40">
                    <div v-for="step in deleteTask.steps" :key="step.key" class="item df ai-c jc-b">
                        <div class="fc" style="overflow:hidden;">
                            <div>{{ step.label }}</div>
                            <div v-if="step.error" class="delete-task-error one-hide" :title="step.error">{{ step.error }}</div>
                        </div>
                        <div class="df df-s0 ai-c ml-20">
                            <icon-check-circle-fill v-if="step.status=='success'" class="c-green" />
                            <span v-if="step.status=='success'" class="ml-6">已删除</span>
                            <icon-close-circle-fill v-if="step.status=='error'" class="c-red" />
                            <span v-if="step.status=='error'" class="ml-6 c-red">失败</span>
                            <icon-loading v-if="step.status=='running'" />
                            <span v-if="step.status=='running'" class="ml-6">删除中...</span>
                            <span v-if="step.status=='pending'" class="c-99">未执行</span>
                        </div>
                    </div>
                </div>

                <div v-if="!deleteTask.running" class="mt-20 df ai-c jc-c">
                    <a-button v-if="deleteTask.failed" type="outline" @click="closeDeleteTask">关闭</a-button>
                    <a-button v-if="deleteTask.failed" type="primary" class="ml-20" @click="retryDeleteTask">重新删除</a-button>
                    <a-button v-if="deleteTask.completed" type="primary" @click="closeDeleteTask">返回列表</a-button>
                </div>
            </div>
        </a-modal>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getPermission, getUserInfo } from '@/utils/auth';
import {
    cleanupIngressPluginRules,
    ensureGatewayPluginRule,
    getGatewayPluginRuleContext,
    getGatewayPluginRuleMatch,
} from '@/utils/gateway-plugin';
import {
    AI_LABEL,
    AI_DOMAIN_LABEL,
    AI_CONSUMER_LABEL,
    AI_AUTH_ANNOTATION,
    AI_MODELS_ANNOTATION,
    AI_PROVIDERS_ANNOTATION,
    AI_PROXY_PLUGIN_ARTIFACT,
    KEY_AUTH_PLUGIN_ARTIFACT,
    REQUEST_VALIDATION_PLUGIN_ARTIFACT,
    domainResourcePrefix,
    providerServiceName,
    readRouteProviders,
    readStringArray,
    loadInstalledPluginArtifacts,
    scopedName,
} from '@/utils/ai-proxy';

const PLUGIN_NAME = 'ai-proxy.internal';
const PLUGIN_NAMESPACE = 'higress-system';
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
            aiProxyPluginInstalled: null,
            aiProxyPluginName: PLUGIN_NAME,
            keyAuthPluginName: KEY_AUTH_PLUGIN_NAME,
            modelValidationPluginName: MODEL_VALIDATION_PLUGIN_NAME,
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
            deleteTask: {
                show: false,
                running: false,
                completed: false,
                failed: false,
                row: null,
                context: null,
                steps: [],
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
        async cleanupIngressPluginRules(ingressNames){
            return cleanupIngressPluginRules(k8sproxy, this.namespaceActive, ingressNames);
        },
        async getWhiteList(){
            let wl = getUserInfo()?.['w7.cc/domain-white-list'] || '[]';
            try { wl = JSON.parse(wl); } catch { wl = []; }
            this.whiteList = (wl || []).filter(i=>!i.disabled);
        },
        async getData(){
            useLoadingStore().loading = true;
            try {
                const [ingRes, secretRes, dependencies] = await Promise.all([
                    k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses?labelSelector='+AI_LABEL+'=true'),
                    k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true', { noAlert: true }),
                    loadInstalledPluginArtifacts(k8sproxy, [
                        { artifact: AI_PROXY_PLUGIN_ARTIFACT },
                    ]),
                ]);
                const [aiProxy] = dependencies;
                this.ingresses = ingRes?.data?.items || [];
                this.plugin = aiProxy.plugin;
                this.aiProxyPluginInstalled = aiProxy.installed;
                this.aiProxyPluginName = aiProxy.plugin?.metadata?.name || PLUGIN_NAME;
                this.secrets = secretRes?.data?.items || [];
                const rules = this.plugin?.spec?.matchRules || [];
                let pluginChanged = false;
                this.list = this.ingresses.map(ing=>{
                    const host = ing?.spec?.rules?.[0]?.host || '';
                    const annotations = ing?.metadata?.annotations || {};
                    const ssl = ing?.metadata?.annotations?.['cert-manager.io/cluster-issuer'] == 'w7-letsencrypt-prod';
                    const rule = this.findRule(rules, ing, host);
                    const providers = readRouteProviders(annotations[AI_PROVIDERS_ANNOTATION]);
                    const legacyRouteProviders = rule?.config?.providers || [];
                    const legacyProviders = this.secrets.filter(s=>s?.metadata?.labels?.[AI_DOMAIN_LABEL] == ing.metadata.name && s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true');
                    const effectiveProviders = providers.length ? providers : legacyRouteProviders;
                    const ruleContext = getGatewayPluginRuleContext(ing, this.namespaceActive);
                    let ruleMatch = getGatewayPluginRuleMatch(this.plugin, ruleContext);
                    if(this.plugin && this.permission.includes('gateway/aiproxy/edit') && (ruleMatch.index < 0 || this.plugin.spec.matchRules[ruleMatch.index]?.configDisable === true)){
                        const index = ensureGatewayPluginRule(this.plugin, ruleContext);
                        this.plugin.spec.matchRules[index].configDisable = false;
                        pluginChanged = true;
                        ruleMatch = getGatewayPluginRuleMatch(this.plugin, ruleContext);
                    }
                    const providerCount = effectiveProviders.length || legacyProviders.length;
                    const enabledProviderCount = effectiveProviders.length ? effectiveProviders.filter(i=>i?.enabled !== false).length : legacyProviders.filter(s=>s?.metadata?.annotations?.['w7.cc/enabled'] !== 'false').length;
                    return {
                        name: ing.metadata.name,
                        host,
                        url: (ssl?'https://':'http://') + host,
                        models: readStringArray(annotations[AI_MODELS_ANNOTATION] || rule?.config?.models),
                        authEnabled: annotations[AI_AUTH_ANNOTATION] === 'true' || !!rule?.config?.auth?.enabled,
                        enabled: ruleMatch.index >= 0 && this.plugin?.spec?.matchRules?.[ruleMatch.index]?.configDisable !== true,
                        providers: providerCount,
                        enabledProviders: enabledProviderCount,
                        ingress: ing,
                    }
                });
                if(pluginChanged){
                    const response = await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.aiProxyPluginName, this.plugin);
                    this.plugin = response?.data || this.plugin;
                }
            } finally {
                useLoadingStore().loading = false;
            }
        },
        getPlugin(){
            return this.getManagedPlugin(this.aiProxyPluginName);
        },
        findRule(rules, ing, host){
            return (rules || []).find(rule=>{
                return (rule?.domain || []).includes(host) || (rule?.ingress || []).includes(ing.metadata.name);
            }) || null;
        },
        openForm(){
            if(!this.aiProxyPluginInstalled || !this.plugin){
                this.$message.warning('请先安装 AI 代理插件');
                return;
            }
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
                if(!this.aiProxyPluginInstalled || !this.plugin){
                    this.$message.warning('请先安装 AI 代理插件');
                    return;
                }
                useLoadingStore().loading = true;
                try {
                    const domain = this.fullDomain();
                    await this.createIngress(domain, this.form.autoSsl);
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
        installAIProxyPlugin(){
            this.$router.push({
                path: '/app/store-install',
                query: { path: AI_PROXY_PLUGIN_ARTIFACT.installUrl },
            });
        },
        savePlugin(plugin){
            return k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.aiProxyPluginName, plugin);
        },
        async toDelete(row){
            this.deleteTask = {
                show: true,
                running: true,
                completed: false,
                failed: false,
                row,
                context: null,
                steps: this.createDeleteSteps(),
            };
            await this.runDeleteTask();
        },
        createDeleteSteps(){
            return [
                { key: 'consumers', label: '消费者数据', status: 'pending', error: '' },
                { key: 'providers', label: '服务提供者数据', status: 'pending', error: '' },
                { key: 'domain', label: '域名配置数据', status: 'pending', error: '' },
            ];
        },
        closeDeleteTask(){
            if(this.deleteTask.running) return;
            this.deleteTask.show = false;
        },
        async retryDeleteTask(){
            if(this.deleteTask.running || !this.deleteTask.row) return;
            this.deleteTask.steps.forEach(step=>{
                if(step.status != 'success'){
                    step.status = 'pending';
                    step.error = '';
                }
            });
            this.deleteTask.failed = false;
            this.deleteTask.completed = false;
            this.deleteTask.running = true;
            await this.runDeleteTask();
        },
        async runDeleteTask(){
            const row = this.deleteTask.row;
            try {
                const discovered = await this.discoverDeleteContext(row);
                this.deleteTask.context = this.mergeDeleteContext(this.deleteTask.context, discovered);
                await this.runDeleteStep('consumers', ()=>this.deleteConsumerResources(row), ()=>this.verifyConsumerResourcesDeleted(row));
                await this.runDeleteStep('providers', ()=>this.deleteProviderResources(row), ()=>this.verifyProviderResourcesDeleted(row));
                await this.runDeleteStep('domain', ()=>this.deleteDomainResources(row), ()=>this.verifyDomainResourcesDeleted(row));
                this.deleteTask.completed = true;
                this.$message.success('AI 代理及关联资源已全部删除');
                await this.getData().catch(()=>this.$message.warning('删除已完成，列表刷新失败，请手动刷新页面'));
            } catch(error) {
                this.deleteTask.failed = true;
                const failedStep = this.deleteTask.steps.find(step=>step.status == 'running') || this.deleteTask.steps.find(step=>step.status != 'success');
                if(failedStep){
                    failedStep.status = 'error';
                    failedStep.error = error?.response?.data?.message || error?.message || '删除或检测失败';
                }
            } finally {
                this.deleteTask.running = false;
            }
        },
        async runDeleteStep(key, remove, verify){
            const step = this.deleteTask.steps.find(item=>item.key == key);
            if(!step || step.status == 'success') return;
            step.status = 'running';
            step.error = '';
            await remove();
            await this.waitForDeleteVerification(verify, step.label + '仍有残留资源');
            step.status = 'success';
        },
        async discoverDeleteContext(row){
            const [keyAuth, modelValidation] = await loadInstalledPluginArtifacts(k8sproxy, [
                { artifact: KEY_AUTH_PLUGIN_ARTIFACT },
                { artifact: REQUEST_VALIDATION_PLUGIN_ARTIFACT },
            ]);
            this.keyAuthPluginName = keyAuth.plugin?.metadata?.name || KEY_AUTH_PLUGIN_NAME;
            this.modelValidationPluginName = modelValidation.plugin?.metadata?.name || MODEL_VALIDATION_PLUGIN_NAME;
            const [plugin, keyAuthPlugin] = await Promise.all([
                this.getPluginStrict(),
                this.getManagedPlugin(this.keyAuthPluginName),
            ]);
            const prefix = domainResourcePrefix(row.name);
            const annotationProviders = readRouteProviders(row.ingress?.metadata?.annotations?.[AI_PROVIDERS_ANNOTATION]);
            const legacyRule = this.findRule(plugin?.spec?.matchRules || [], row.ingress, row.host);
            const providerIds = annotationProviders.map(item=>item.id)
                .concat((legacyRule?.config?.providers || []).map(item=>item.provider || item.name))
                .concat((plugin?.spec?.defaultConfig?.providers || []).map(item=>item?.id).filter(id=>String(id || '').startsWith(prefix)))
                .concat((plugin?.spec?.matchRules || []).map(rule=>rule?.config?.activeProviderId).filter(id=>String(id || '').startsWith(prefix)))
                .filter(Boolean);
            const keyRules = (keyAuthPlugin?.spec?.matchRules || []).filter(rule=>this.ruleMatchesDomain(rule, row));
            const consumerNames = keyRules.flatMap(rule=>rule?.config?.allow || [])
                .concat((keyAuthPlugin?.spec?.defaultConfig?.consumers || []).map(item=>item?.name).filter(name=>String(name || '').startsWith(prefix)))
                .filter(Boolean);
            return {
                providerIds: [...new Set(providerIds)],
                consumerNames: [...new Set(consumerNames)],
                registryNames: [...new Set(providerIds.map(providerServiceName))],
            };
        },
        mergeDeleteContext(oldContext, nextContext){
            const old = oldContext || {};
            const next = nextContext || {};
            return {
                providerIds: [...new Set([...(old.providerIds || []), ...(next.providerIds || [])])],
                consumerNames: [...new Set([...(old.consumerNames || []), ...(next.consumerNames || [])])],
                registryNames: [...new Set([...(old.registryNames || []), ...(next.registryNames || [])])],
            };
        },
        async deleteConsumerResources(row){
            await this.removeDomainPluginConfig(this.keyAuthPluginName, row, true);
            const secrets = (await this.getDomainSecrets(row.name)).filter(secret=>secret?.metadata?.labels?.[AI_CONSUMER_LABEL] == 'true');
            await this.deleteSecrets(secrets);
        },
        async verifyConsumerResourcesDeleted(row){
            const [plugin, secrets] = await Promise.all([
                this.getManagedPlugin(this.keyAuthPluginName),
                this.getDomainSecrets(row.name),
            ]);
            const prefix = domainResourcePrefix(row.name);
            const consumerNames = new Set(this.deleteTask.context?.consumerNames || []);
            const hasRule = (plugin?.spec?.matchRules || []).some(rule=>this.ruleMatchesDomain(rule, row));
            const hasConsumer = (plugin?.spec?.defaultConfig?.consumers || []).some(item=>{
                const name = String(item?.name || '');
                return name.startsWith(prefix) || consumerNames.has(name);
            });
            const hasSecret = secrets.some(secret=>secret?.metadata?.labels?.[AI_CONSUMER_LABEL] == 'true');
            return !hasRule && !hasConsumer && !hasSecret;
        },
        async deleteProviderResources(row){
            const context = this.deleteTask.context || {};
            const providerIds = context.providerIds || [];
            const plugin = await this.getPluginStrict();
            if(plugin){
                const prefix = domainResourcePrefix(row.name);
                plugin.spec = plugin.spec || {};
                plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
                plugin.spec.defaultConfig.providers = (plugin.spec.defaultConfig.providers || []).filter(item=>{
                    const id = String(item?.id || '');
                    return !providerIds.includes(id) && !id.startsWith(prefix);
                });
                plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                    const matchedDomain = this.ruleMatchesDomain(rule, row);
                    const matchedService = providerIds.some(id=>rule?.config?.activeProviderId == id || (rule?.service || []).includes(providerServiceName(id)+'.dns') || (rule?.service || []).includes(providerServiceName(id)+'.static'));
                    return !matchedDomain && !matchedService;
                });
                await this.savePlugin(plugin);
            }
            await this.removeMcpRegistries(providerIds);
            const secrets = (await this.getDomainSecrets(row.name)).filter(secret=>secret?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true');
            await this.deleteSecrets(secrets);
        },
        async verifyProviderResourcesDeleted(row){
            const [plugin, mcp, secrets] = await Promise.all([
                this.getPluginStrict(),
                this.getMcpBridge(),
                this.getDomainSecrets(row.name),
            ]);
            const context = this.deleteTask.context || {};
            const providerIds = new Set(context.providerIds || []);
            const registryNames = new Set(context.registryNames || []);
            const prefix = domainResourcePrefix(row.name);
            const hasProvider = (plugin?.spec?.defaultConfig?.providers || []).some(item=>providerIds.has(item?.id) || String(item?.id || '').startsWith(prefix));
            const hasRule = (plugin?.spec?.matchRules || []).some(rule=>{
                if(this.ruleMatchesDomain(rule, row)) return true;
                return [...providerIds].some(id=>rule?.config?.activeProviderId == id || (rule?.service || []).includes(providerServiceName(id)+'.dns') || (rule?.service || []).includes(providerServiceName(id)+'.static'));
            });
            const hasRegistry = (mcp?.spec?.registries || []).some(item=>registryNames.has(item?.name));
            const hasSecret = secrets.some(secret=>secret?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true');
            return !hasProvider && !hasRule && !hasRegistry && !hasSecret;
        },
        async deleteDomainResources(row){
            await this.removeDomainPluginConfig(this.modelValidationPluginName, row, false);
            const ingress = await this.getIngress(row.name);
            if(ingress){
                await this.cleanupIngressPluginRules([row.name]);
                await k8sproxy.delete('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+row.name, { noAlert: true });
            }
        },
        async verifyDomainResourcesDeleted(row){
            const [plugin, ingress] = await Promise.all([
                this.getManagedPlugin(this.modelValidationPluginName),
                this.getIngress(row.name),
            ]);
            const hasRule = (plugin?.spec?.matchRules || []).some(rule=>this.ruleMatchesDomain(rule, row));
            return !hasRule && !ingress;
        },
        ruleMatchesDomain(rule, row){
            return (rule?.domain || []).includes(row.host) || (rule?.ingress || []).includes(row.name);
        },
        getManagedPlugin(name){
            return this.getOptionalResource('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+name);
        },
        getPluginStrict(){
            return this.getOptionalResource('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.aiProxyPluginName);
        },
        getMcpBridge(){
            return this.getOptionalResource('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME);
        },
        getDomainSecrets(domainName){
            return k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+domainName, { noAlert: true })
                .then(res=>res?.data?.items || []);
        },
        getIngress(name){
            return this.getOptionalResource('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+name);
        },
        getOptionalResource(url){
            return k8sproxy.get(url, { noAlert: true }).then(res=>res.data).catch(error=>{
                if(error?.response?.status == 404) return null;
                throw error;
            });
        },
        async deleteSecrets(secrets){
            for(const secret of secrets || []){
                await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+secret.metadata.name, { noAlert: true });
            }
        },
        async waitForDeleteVerification(verify, errorMessage){
            for(let attempt=0; attempt<12; attempt+=1){
                if(await verify()) return;
                await new Promise(resolve=>setTimeout(resolve, 300));
            }
            throw new Error(errorMessage);
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

<style scoped>
.delete-task-content {
    padding: 20px 30px 10px;
}

.task {
    width: 100%;
    border: 1px solid var(--color-neutral-3);
    border-radius: 4px;
}

.task .item {
    min-height: 62px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--color-neutral-3);
}

.task .item:last-child {
    border-bottom: none;
}

.delete-task-error {
    max-width: 480px;
    margin-top: 4px;
    color: rgb(var(--red-6));
    font-size: 12px;
    line-height: 18px;
}

.loader {
    animation: spin 3s linear infinite;
    vertical-align: middle;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
