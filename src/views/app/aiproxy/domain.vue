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
                    <td>Base URL</td>
                    <td>模型</td>
                    <td>权重</td>
                    <td>状态</td>
                    <td style="width:240px;">操作</td>
                </tr>
                <tr v-for="item in providers" :key="item.secretName">
                    <td>{{ item.name }}</td>
                    <td>{{ item.baseUrl }}</td>
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
                    <td colspan="6"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>

        <a-drawer :width="720" :visible="providerForm.show" @ok="saveProvider" @cancel="providerForm.show=false;" :popup-container="$popupContainer">
            <template #title>AI服务提供者</template>
            <a-form :model="providerForm" ref="providerForm" :rules="providerRules" auto-label-width class="padding-20">
                <a-form-item label="名称" field="name">
                    <a-input v-model="providerForm.name" :disabled="!!providerForm.secretName" placeholder="请输入名称" />
                </a-form-item>
                <a-form-item label="Base URL" field="baseUrl">
                    <a-input v-model="providerForm.baseUrl" placeholder="https://api.openai.com/v1" />
                </a-form-item>
                <a-form-item label="API Key" :field="providerForm.secretName ? '' : 'apiKey'">
                    <a-input-password v-model="providerForm.apiKey" :placeholder="providerForm.secretName?'留空则保留原 Key':'请输入 API Key'" />
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

function encode(value) {
    return btoa(unescape(encodeURIComponent(value || '')));
}

function decode(value) {
    if (!value) return '';
    try { return decodeURIComponent(escape(atob(value))); } catch { return ''; }
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
            routeForm: {
                models: [],
                authEnabled: false,
            },
            providerForm: {
                show: false,
                secretName: '',
                name: '',
                baseUrl: '',
                apiKey: '',
                models: [],
                weight: 100,
                enabled: true,
            },
            providerRules: {
                name: [{ required: true, message: '名称不能为空' }],
                baseUrl: [{ required: true, message: 'Base URL不能为空' }],
                apiKey: [{ required: true, message: 'API Key不能为空' }],
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
                this.providers = secrets.filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true').map(s=>this.secretToProvider(s));
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
        currentRule(){
            return (this.plugin?.spec?.matchRules || []).find(rule=>{
                return (rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name);
            }) || null;
        },
        openProvider(row){
            if(!row){
                this.providerForm = {
                    show: true,
                    secretName: '',
                    name: '',
                    baseUrl: '',
                    apiKey: '',
                    models: [],
                    weight: 100,
                    enabled: true,
                };
                return;
            }
            this.providerForm = {
                show: true,
                secretName: row.secretName,
                name: row.name,
                baseUrl: row.baseUrl,
                apiKey: '',
                models: [...row.models],
                weight: Number(row.weight) || 0,
                enabled: row.enabled,
            };
        },
        saveProvider(){
            this.$refs.providerForm.validate(async err=>{
                if(err) return;
                const form = this.providerForm;
                const name = form.secretName || 'ai-provider-' + this.ingress.metadata.name.replace(/^ai-/, '') + '-' + this.domainToName(form.name);
                const old = this.providers.find(i=>i.secretName==form.secretName);
                const data = {
                    apiVersion: 'v1',
                    kind: 'Secret',
                    metadata: {
                        name,
                        namespace: this.namespaceActive,
                        labels: {
                            [AI_LABEL]: 'true',
                            [AI_DOMAIN_LABEL]: this.ingress.metadata.name,
                        },
                        annotations: {
                            'w7.cc/provider-name': form.name,
                            'w7.cc/enabled': String(!!form.enabled),
                            'w7.cc/weight': String(Number(form.weight) || 0),
                            'w7.cc/models': JSON.stringify(form.models || []),
                        },
                    },
                    type: 'Opaque',
                    data: {
                        baseUrl: encode(form.baseUrl),
                        apiKey: encode(form.apiKey || old?.apiKey || ''),
                    },
                };
                if(form.secretName){
                    await k8sproxy.put('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+form.secretName, data);
                }else{
                    await k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/secrets', data);
                }
                this.providerForm.show = false;
                await this.getData();
                await this.syncRuleProviders();
                this.$message.success('操作成功');
            })
        },
        secretToProvider(secret){
            let models = [];
            try { models = JSON.parse(secret?.metadata?.annotations?.['w7.cc/models'] || '[]'); } catch {}
            return {
                secretName: secret.metadata.name,
                name: secret?.metadata?.annotations?.['w7.cc/provider-name'] || secret.metadata.name,
                baseUrl: decode(secret?.data?.baseUrl),
                apiKey: decode(secret?.data?.apiKey),
                models,
                weight: Number(secret?.metadata?.annotations?.['w7.cc/weight'] || 0),
                enabled: secret?.metadata?.annotations?.['w7.cc/enabled'] !== 'false',
            };
        },
        async toggleProvider(row){
            const data = {
                metadata: {
                    annotations: {
                        'w7.cc/enabled': String(!!row.enabled),
                    },
                },
            };
            await k8sproxy.patch('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+row.secretName, data, {
                headers: {'Content-Type': 'application/merge-patch+json'},
            });
            await this.getData();
            await this.syncRuleProviders();
        },
        async deleteProvider(row){
            await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+row.secretName);
            await this.getData();
            await this.syncRuleProviders();
            this.$message.success('操作成功');
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
        async syncRuleProviders(){
            const plugin = await this.getPlugin();
            if(!plugin) return;
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
                providers: this.providers.filter(i=>i.enabled).map(i=>({
                    name: i.name,
                    baseUrl: i.baseUrl,
                    apiKeySecret: i.secretName,
                    models: i.models || [],
                    weight: Number(i.weight) || 0,
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
            await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+PLUGIN_NAME, plugin);
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
