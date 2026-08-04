<template>
    <div>
        <a-alert style="margin-bottom:12px;">
            此处仅显示已安装且支持规则配置的网关插件。规则状态仅控制当前域名，不影响插件的全局配置或其他域名。
        </a-alert>
        <div v-if="groupedPlugins.length" class="plugin-category-list">
          <section
              v-for="group in groupedPlugins"
              :key="group.key"
              class="plugin-category"
              :class="{'plugin-category--collapsed':isCategoryCollapsed(group.key)}"
          >
            <button type="button" class="plugin-category__title" @click="toggleCategory(group.key)">
                <span class="df ai-c" style="gap:6px;">
                    <icon-right v-if="isCategoryCollapsed(group.key)" />
                    <icon-down v-else />
                    <span>{{group.title}}</span>
                </span>
                <span class="plugin-category__count">{{group.items.length}} 个插件</span>
            </button>
            <a-table
                v-show="!isCategoryCollapsed(group.key)"
                :data="group.items"
                :bordered="false"
                :pagination="false"
                :show-header="false"
                row-key="name"
            >
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
          </section>
        </div>
        <a-empty v-if="!groupedPlugins.length" />

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
    groupGatewayPlugins,
    loadGatewayPluginMarket,
    normalizeGatewayPluginIdentify,
} from '@/utils/gateway-plugin-market';
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
            collapsedCategories: [],
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
    computed: {
        groupedPlugins(){
            return groupGatewayPlugins(this.plugins);
        },
    },
    methods: {
        isCategoryCollapsed(category){
            return this.collapsedCategories.includes(category);
        },
        toggleCategory(category){
            this.collapsedCategories = this.isCategoryCollapsed(category)
                ? this.collapsedCategories.filter(item=>item !== category)
                : [...this.collapsedCategories, category];
        },
        async getAllPlugin(){
            const ingressName = this.data?.metadata?.name;
            if(!ingressName){ return; }
            const [pluginRes, microappRes, appGroupRes, marketRes] = await Promise.all([
                k8sproxy.get(WASM_PLUGIN_API),
                k8sproxy.get(MICROAPP_API, { noAlert: true }).catch(()=>({ data: { items: [] } })),
                k8sproxy.get(APPGROUP_API),
                loadGatewayPluginMarket().catch(()=>[]),
            ]);
            const resources = (pluginRes?.data?.items || [])
                .filter(plugin=>supportsRuleConfig(plugin));
            const microapps = microappRes?.data?.items || [];
            const appGroups = appGroupRes?.data?.items || [];
            const appGroupMap = Object.fromEntries(appGroups.map(group=>[group?.metadata?.name, group]));
            const marketTypeMap = Object.fromEntries(marketRes.map(item=>[
                normalizeGatewayPluginIdentify(item.identify),
                item.plugin_type || '',
            ]));
            const officialAppGroups = new Set(appGroups
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
                const appGroup = appGroupMap[getResourceGroupName(resource)] || null;
                const identify = normalizeGatewayPluginIdentify(
                    appGroup?.spec?.identifie
                    || appGroup?.metadata?.annotations?.['w7.cc/identifie']
                    || resource?.metadata?.labels?.['w7.cc/identifie']
                );
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
                    pluginType: marketTypeMap[identify] || '',
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

<style scoped>
.plugin-category-list{overflow:hidden;border:1px solid var(--color-border-2);border-radius:4px;background:var(--color-bg-2);}
.plugin-category + .plugin-category{border-top:1px solid var(--color-border-1);}
.plugin-category__title{display:flex;align-items:center;justify-content:space-between;width:100%;height:44px;padding:0 14px;border:0;background:var(--color-bg-2);font-size:14px;font-weight:500;color:var(--color-text-1);cursor:pointer;text-align:left;transition:background-color .2s,color .2s,box-shadow .2s;}
.plugin-category:not(.plugin-category--collapsed)>.plugin-category__title{background:var(--color-primary-light-1);color:rgb(var(--primary-6));box-shadow:inset 3px 0 0 rgb(var(--primary-6));}
.plugin-category__title:hover{background:var(--color-fill-1);color:rgb(var(--primary-6));}
.plugin-category__title :deep(.arco-icon){font-size:13px;color:var(--color-text-3);transition:color .2s;}
.plugin-category__title:hover :deep(.arco-icon){color:rgb(var(--primary-6));}
.plugin-category:not(.plugin-category--collapsed)>.plugin-category__title :deep(.arco-icon){color:rgb(var(--primary-6));}
.plugin-category__count{font-size:12px;font-weight:400;color:var(--color-text-3);}
.plugin-category :deep(.arco-table-container){border-top:1px solid var(--color-border-1);}
</style>
