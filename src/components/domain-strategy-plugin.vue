<template>
    <div>
        <a-alert style="margin-bottom:12px;">
            此处仅显示已安装且支持规则配置的网关插件。规则状态仅控制当前域名，不影响插件的全局配置或其他域名。
        </a-alert>
        <a-table :data="plugins" :bordered="false" :pagination="false" row-key="name">
            <template #columns>
                <a-table-column title="插件">
                    <template #cell="{ record }">
                        <div class="df ai-c" style="gap:8px;">
                            <span>{{record.title}}</span>
                            <a-tag v-if="record.officialApp" color="arcoblue" size="small">官方</a-tag>
                        </div>
                        <div class="fs-12 c-99 mt-4">{{record.name}}{{record.version ? `@${record.version}` : ''}}</div>
                        <div v-if="record.description" class="fs-12 c-99 mt-4">{{record.description}}</div>
                    </template>
                </a-table-column>
                <a-table-column title="规则状态" :width="150">
                    <template #cell="{ record }">
                        <a-switch
                            :model-value="record.ruleEnabled"
                            @change="value=>toggleRule(record, value)"
                        />
                    </template>
                </a-table-column>
                <a-table-column title="操作" :width="120">
                    <template #cell="{ record }">
                        <a-link @click="openConfig(record)">配置</a-link>
                    </template>
                </a-table-column>
            </template>
        </a-table>

        <gateway-plugin-config
            :show="config.show"
            :plugin="config.plugin"
            :microapp="config.microapp"
            :ingress="data"
            scope="rule"
            @saved="getAllPlugin"
            @close="closeConfig"
        />
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import gatewayPluginConfig from '@/components/gateway-plugin-config.vue';
import {
    APPGROUP_API,
    MICROAPP_API,
    OFFICIAL_APP_ANNOTATION,
    WASM_PLUGIN_API,
    ensureGatewayPluginRule,
    getGatewayPluginRuleContext,
    getGatewayPluginRuleMatch,
    getPluginDescription,
    getResourceGroupName,
    getResolvedMicroappName,
    getPluginTitle,
    getPluginVersion,
    supportsRuleConfig,
} from '@/utils/gateway-plugin';

export default {
    props: ['data', 'show'],
    emits: ['pluginbadge', 'close'],
    components: { gatewayPluginConfig },
    data(){
        return {
            namespaceActive: '',
            plugins: [],
            config: { show: false, plugin: null, microapp: null },
        };
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    watch: {
        data: 'getAllPlugin',
        show(value){
            if(value){ this.getAllPlugin(); }
        },
    },
    methods: {
        async getAllPlugin(){
            const ingressName = this.data?.metadata?.name;
            if(!ingressName){ return; }
            const [pluginRes, microappRes, appGroupRes] = await Promise.all([
                k8sproxy.get(WASM_PLUGIN_API),
                k8sproxy.get(MICROAPP_API, { noAlert: true }).catch(()=>({ data: { items: [] } })),
                k8sproxy.get(APPGROUP_API),
            ]);
            const resources = (pluginRes?.data?.items || [])
                .filter(plugin=>supportsRuleConfig(plugin));
            const microapps = microappRes?.data?.items || [];
            const officialAppGroups = new Set((appGroupRes?.data?.items || [])
                .filter(group=>group?.metadata?.annotations?.[OFFICIAL_APP_ANNOTATION] === 'true')
                .map(group=>group?.metadata?.name));
            const names = [...new Set(resources.map(resource=>getResolvedMicroappName(resource, microapps)).filter(Boolean))];
            const frontendEntries = await Promise.all(names.map(async name=>{
                const info = await panelApi.get(`/microapp/${encodeURIComponent(name)}/info`, { noAlert: true })
                    .then(response=>response?.data || null)
                    .catch(()=>null);
                return [name, info];
            }));
            const frontendMap = Object.fromEntries(frontendEntries);
            const ruleContext = getGatewayPluginRuleContext(this.data, this.namespaceActive);
            this.plugins = resources.map(resource=>{
                const ruleMatch = getGatewayPluginRuleMatch(resource, ruleContext);
                const ruleIndex = ruleMatch.index;
                const rule = ruleIndex >= 0 ? resource?.spec?.matchRules?.[ruleIndex] : null;
                const microapp = getResolvedMicroappName(resource, microapps);
                const microappInfo = frontendMap[microapp] || null;
                const hasFrontend = (microappInfo?.spec?.bindings || []).some(binding=>
                    binding?.support === 'thirdparty_cd'
                    && binding?.name === 'normal'
                    && Array.isArray(binding?.menu)
                    && binding.menu.length > 0
                );
                return {
                    name: resource.metadata.name,
                    title: getPluginTitle(resource),
                    description: getPluginDescription(resource),
                    version: getPluginVersion(resource),
                    microapp,
                    microappInfo,
                    officialApp: officialAppGroups.has(getResourceGroupName(resource)),
                    hasFrontend,
                    ruleIndex,
                    ruleEnabled: Boolean(rule) && rule?.configDisable !== true,
                    resource,
                };
            });
            this.$emit('pluginbadge', this.plugins.filter(plugin=>plugin.ruleEnabled).length);
        },
        toggleRule(record, enabled){
            const data = JSON.parse(JSON.stringify(record.resource));
            const context = getGatewayPluginRuleContext(this.data, this.namespaceActive);
            const index = ensureGatewayPluginRule(data, context);
            data.spec.matchRules[index].configDisable = !enabled;
            return k8sproxy.put(`${WASM_PLUGIN_API}/${record.name}`, data, { loading: true }).then(()=>{
                this.$message.success(enabled ? '规则已启用' : '规则已停用');
                this.getAllPlugin();
            });
        },
        openConfig(record){
            this.config = { show: true, plugin: record.resource, microapp: record.microappInfo };
        },
        closeConfig(saved){
            this.config.show = false;
            if(saved){ this.getAllPlugin(); }
        },
    },
};
</script>
