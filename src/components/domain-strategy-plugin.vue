<template>
    <div>
        <a-alert style="margin-bottom:12px;">
            此处仅显示已启用且支持规则配置的网关插件。插件安装、停用和卸载请前往“网关管理 → 网关插件”。
        </a-alert>
        <a-table :data="plugins" :bordered="false" :pagination="false" row-key="name">
            <template #columns>
                <a-table-column title="插件">
                    <template #cell="{ record }">
                        <div class="b">{{record.title}}{{record.version ? `@${record.version}` : ''}}</div>
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
                <a-table-column title="配置方式" :width="150">
                    <template #cell="{ record }">
                        <a-tag v-if="record.hasFrontend" color="arcoblue">操作界面</a-tag>
                        <a-tag v-else>YAML</a-tag>
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
    MICROAPP_API,
    WASM_PLUGIN_API,
    getIngressRuleIndex,
    getPluginDescription,
    getResolvedMicroappName,
    getPluginTitle,
    getPluginVersion,
    isGatewayPluginEnabled,
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
            const [pluginRes, microappRes] = await Promise.all([
                k8sproxy.get(WASM_PLUGIN_API),
                k8sproxy.get(MICROAPP_API, { noAlert: true }).catch(()=>({ data: { items: [] } })),
            ]);
            const resources = (pluginRes?.data?.items || [])
                .filter(plugin=>isGatewayPluginEnabled(plugin) && supportsRuleConfig(plugin));
            const microapps = microappRes?.data?.items || [];
            const names = [...new Set(resources.map(resource=>getResolvedMicroappName(resource, microapps)).filter(Boolean))];
            const frontendEntries = await Promise.all(names.map(async name=>{
                const info = await panelApi.get(`/microapp/${encodeURIComponent(name)}/info`, { noAlert: true })
                    .then(response=>response?.data || null)
                    .catch(()=>null);
                return [name, info];
            }));
            const frontendMap = Object.fromEntries(frontendEntries);
            this.plugins = resources.map(resource=>{
                const ruleIndex = getIngressRuleIndex(resource, this.namespaceActive, ingressName);
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
                    hasFrontend,
                    ruleIndex,
                    ruleEnabled: rule?.configDisable === false,
                    resource,
                };
            });
            this.$emit('pluginbadge', this.plugins.filter(plugin=>plugin.ruleEnabled).length);
        },
        toggleRule(record, enabled){
            const data = JSON.parse(JSON.stringify(record.resource));
            data.spec = data.spec || {};
            data.spec.matchRules = data.spec.matchRules || [];
            let index = getIngressRuleIndex(data, this.namespaceActive, this.data.metadata.name);
            if(index < 0){
                data.spec.matchRules.push({
                    ingress: [`${this.namespaceActive}/${this.data.metadata.name}`],
                    config: {},
                    configDisable: !enabled,
                });
            }else{
                data.spec.matchRules[index].configDisable = !enabled;
            }
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
