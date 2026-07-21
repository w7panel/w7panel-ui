<template>
    <a-drawer
        :visible="visible"
        :width="scope === 'global' ? 1200 : 1000"
        :footer="false"
        unmount-on-close
        @cancel="close"
    >
        <template #title>{{ title }}</template>

        <a-alert type="info" show-icon class="plugin-config-scope-alert">
            <template v-if="scope === 'rule'">
                当前配置仅作用于
                <strong>{{ domain || '当前域名' }}</strong>
                对应的网关规则
                <span v-if="ingressName">（Ingress：{{ ingressName }}）</span>，不影响插件的全局配置。
            </template>
            <template v-else>
                当前配置作用于整个集群的网关请求，不绑定具体域名或 Ingress；域名级差异策略请使用规则配置。
            </template>
        </a-alert>

        <a-spin class="plugin-config-spin" :loading="loading">
            <template v-if="showFrontend">
                <div class="plugin-config-actions">
                    <a-button @click="openYaml">YAML 详情</a-button>
                </div>
                <div
                    class="plugin-config-layout"
                    :class="{'is-rule':scope === 'rule','without-menu':!showMenuNavigation}"
                >
                    <template v-if="scope === 'global' && showMenuNavigation">
                        <aside class="plugin-config-menu">
                            <template v-for="role in menuRoles" :key="role.name">
                                <div class="plugin-config-role">{{role.title}}端</div>
                                <a-menu
                                    :selected-keys="[activeRoute]"
                                    @menu-item-click="changeRoute"
                                >
                                    <a-menu-item v-for="menu in role.menus" :key="menu.do">
                                        {{menu.title}}
                                    </a-menu-item>
                                </a-menu>
                            </template>
                        </aside>
                    </template>
                    <div class="plugin-config-content">
                        <a-tabs
                            v-if="scope === 'rule' && showMenuNavigation"
                            :active-key="activeRoute"
                            @change="changeRoute"
                        >
                            <a-tab-pane v-for="menu in flatMenus" :key="menu.do" :title="menu.title" />
                        </a-tabs>
                        <gateway-plugin-microapp
                            v-if="microappInfo"
                            :microapp="microappInfo"
                            :route="activeRoute"
                            :instance-name="instanceName"
                            :context-props="microContextProps"
                            @error="fallbackToYaml"
                        />
                    </div>
                </div>
            </template>

            <div v-else-if="!loading" class="plugin-yaml-config">
                <div class="plugin-yaml-config__toolbar">
                    <div class="plugin-yaml-config__switch">
                        <span>开启状态</span>
                        <a-switch v-model="form.enabled" :disabled="!yamlEditing" />
                    </div>
                    <a-space>
                        <template v-if="yamlEditing">
                            <a-button type="primary" @click="submitYaml">保存</a-button>
                            <a-button @click="cancelYamlEdit">取消</a-button>
                        </template>
                        <template v-else>
                            <a-button type="primary" @click="startYamlEdit">编辑</a-button>
                            <a-button @click="cancelYamlView">取消</a-button>
                        </template>
                    </a-space>
                </div>
                <div class="plugin-yaml-config__label">YAML 配置</div>
                <div class="plugin-yaml-config__editor">
                    <yaml-input
                        :key="`${editorId}-${yamlEditing ? 'edit' : 'preview'}`"
                        :domid="editorId"
                        :value="form.yaml"
                        :readonly="!yamlEditing"
                        @submit="value=>form.yaml=value"
                    />
                </div>
            </div>
        </a-spin>
    </a-drawer>
</template>

<script>
import jsyaml from 'js-yaml';
import { panelApi, k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import yamlInput from '@/components/yaml-input.vue';
import gatewayPluginMicroapp from '@/components/gateway-plugin-microapp.vue';
import {
    WASM_PLUGIN_API,
    getIngressRuleIndex,
    getPluginMicroapp,
    getPluginTitle,
} from '@/utils/gateway-plugin';

const ROLE_TITLE = {
    founder: '创始人',
    found: '创始人',
    normal: '普通用户',
};

export default {
    props: {
        show: { type: Boolean, default: false },
        plugin: { type: Object, default: null },
        microapp: { type: Object, default: null },
        scope: { type: String, default: 'global' },
        ingress: { type: Object, default: null },
    },
    emits: ['close', 'saved'],
    components: { yamlInput, gatewayPluginMicroapp },
    data(){
        return {
            visible: false,
            loading: false,
            namespaceActive: '',
            localPlugin: null,
            microappInfo: null,
            menuRoles: [],
            activeRoute: '',
            forceYaml: false,
            yamlVisible: false,
            yamlEditing: false,
            yamlSnapshot: { enabled: false, yaml: '' },
            form: { enabled: false, yaml: '' },
        };
    },
    computed: {
        title(){
            return `${getPluginTitle(this.localPlugin || this.plugin)} - ${this.scope === 'rule' ? '规则配置' : '全局配置'}`;
        },
        hasFrontend(){
            return Boolean(this.microappInfo && !this.forceYaml);
        },
        showFrontend(){
            return this.hasFrontend && !this.yamlVisible;
        },
        flatMenus(){
            return this.menuRoles.flatMap(role=>role.menus || []);
        },
        showMenuNavigation(){
            return this.flatMenus.length > 1;
        },
        ingressName(){
            return this.ingress?.metadata?.name || '';
        },
        domain(){
            return this.ingress?.spec?.rules?.[0]?.host || '';
        },
        instanceName(){
            return `${this.localPlugin?.metadata?.name || 'plugin'}-${this.scope}-${this.ingressName || 'global'}`;
        },
        editorId(){
            return `gateway-plugin-yaml-${this.instanceName.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        },
        microContextProps(){
            const config = this.getCurrentConfig();
            return {
                configScope: this.scope,
                pluginId: this.localPlugin?.metadata?.name || '',
                namespace: this.scope === 'rule' ? this.namespaceActive : '',
                ingressName: this.scope === 'rule' ? this.ingressName : '',
                domain: this.scope === 'rule' ? this.domain : '',
                path: this.scope === 'rule' ? this.ingress?.spec?.rules?.[0]?.http?.paths?.[0]?.path || '' : '',
                pluginConfig: config.config,
                pluginEnabled: config.enabled,
                // 兼容已接入旧字段名的插件前端。
                pluginConfigEnabled: config.enabled,
                microappRole: this.menuRoles[0]?.name || (this.scope === 'rule' ? 'normal' : 'founder'),
                savePluginConfig: (value, enabled)=>this.saveMicroConfig(value, enabled),
            };
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    watch: {
        show: {
            immediate: true,
            handler(value){
                this.visible = value;
                if(value){ this.init(); }
            },
        },
    },
    methods: {
        async init(){
            if(!this.plugin){ return; }
            this.loading = true;
            this.forceYaml = false;
            this.yamlVisible = false;
            this.yamlEditing = false;
            this.microappInfo = null;
            this.menuRoles = [];
            this.activeRoute = '';
            this.localPlugin = JSON.parse(JSON.stringify(this.plugin));
            const current = this.getCurrentConfig();
            this.form = {
                enabled: current.enabled,
                yaml: jsyaml.dump(current.config || {}, { lineWidth: -1, noRefs: true }),
            };

            let item = this.microapp;
            const explicitMicroapp = getPluginMicroapp(this.localPlugin);
            if(!item && explicitMicroapp){
                item = await panelApi.get(`/microapp/${encodeURIComponent(explicitMicroapp)}/info`, { noAlert: true })
                    .then(res=>res?.data || null)
                    .catch(()=>null);
            }
            if(item){
                const menuRoles = this.getMenus(item?.spec?.bindings || []);
                const hasFrontendMenu = menuRoles.some(role=>Array.isArray(role.menus) && role.menus.length > 0);
                if(hasFrontendMenu){
                    this.microappInfo = item;
                    this.menuRoles = menuRoles;
                    this.activeRoute = this.flatMenus.find(menu=>menu.is_default == 1)?.do
                        || this.flatMenus[0]?.do
                        || '';
                }
            }
            if(!this.hasFrontend){
                this.yamlVisible = true;
                this.yamlEditing = false;
                this.rememberYamlSnapshot();
            }
            this.loading = false;
        },
        flattenMenus(menus){
            const sorted = [...(menus || [])].sort((a,b)=>(b.displayorder || 0) - (a.displayorder || 0));
            const children = new Map();
            sorted.forEach(menu=>{
                if(menu.parent){
                    children.set(menu.parent, [...(children.get(menu.parent) || []), menu]);
                }
            });
            const result = [];
            const append = menu=>{
                if(menu.do){ result.push(menu); }
                (children.get(menu.do) || []).forEach(append);
            };
            sorted.filter(menu=>!menu.parent).forEach(append);
            return result;
        },
        getMenus(bindings){
            const roles = (bindings || [])
                .filter(binding=>binding.support === 'thirdparty_cd')
                .map(binding=>({
                    name: binding.name,
                    title: ROLE_TITLE[binding.name] || binding.name,
                    menus: this.flattenMenus(binding.menu || []),
                }))
                .filter(role=>role.menus.length);

            if(this.scope === 'rule'){
                const normal = roles.find(role=>role.name === 'normal');
                return normal ? [normal] : [];
            }
            const founder = roles.find(role=>role.name === 'founder')
                || roles.find(role=>role.name === 'found');
            return founder ? [founder] : [];
        },
        changeRoute(route){
            this.activeRoute = route;
        },
        fallbackToYaml(){
            this.forceYaml = true;
            this.yamlVisible = true;
            this.yamlEditing = false;
            this.syncYamlForm();
            this.rememberYamlSnapshot();
        },
        syncYamlForm(){
            const current = this.getCurrentConfig();
            this.form = {
                enabled: current.enabled,
                yaml: jsyaml.dump(current.config || {}, { lineWidth: -1, noRefs: true }),
            };
        },
        rememberYamlSnapshot(){
            this.yamlSnapshot = { ...this.form };
        },
        openYaml(){
            this.syncYamlForm();
            this.rememberYamlSnapshot();
            this.yamlVisible = true;
            this.yamlEditing = false;
        },
        startYamlEdit(){
            this.rememberYamlSnapshot();
            this.yamlEditing = true;
        },
        cancelYamlEdit(){
            this.form = { ...this.yamlSnapshot };
            this.yamlEditing = false;
        },
        cancelYamlView(){
            if(this.hasFrontend){
                this.yamlVisible = false;
                return;
            }
            this.close();
        },
        getCurrentConfig(){
            const plugin = this.localPlugin || {};
            if(this.scope === 'global'){
                return {
                    config: plugin?.spec?.defaultConfig || {},
                    enabled: plugin?.spec?.defaultConfigDisable === false,
                };
            }
            const index = getIngressRuleIndex(plugin, this.namespaceActive, this.ingressName);
            const rule = index >= 0 ? plugin?.spec?.matchRules?.[index] : null;
            return {
                config: rule?.config || {},
                enabled: rule?.configDisable === false,
            };
        },
        applyConfig(config, enabled){
            const data = JSON.parse(JSON.stringify(this.localPlugin));
            data.spec = data.spec || {};
            if(this.scope === 'global'){
                data.spec.defaultConfig = config || {};
                data.spec.defaultConfigDisable = enabled !== true;
            }else{
                data.spec.matchRules = data.spec.matchRules || [];
                let index = getIngressRuleIndex(data, this.namespaceActive, this.ingressName);
                if(index < 0){
                    data.spec.matchRules.push({
                        ingress: [`${this.namespaceActive}/${this.ingressName}`],
                        config: {},
                        configDisable: true,
                    });
                    index = data.spec.matchRules.length - 1;
                }
                data.spec.matchRules[index].config = config || {};
                data.spec.matchRules[index].configDisable = enabled !== true;
            }
            return data;
        },
        persist(data){
            return k8sproxy.put(`${WASM_PLUGIN_API}/${data.metadata.name}`, data, { loading: true }).then(res=>{
                this.localPlugin = res?.data || data;
                this.$message.success('保存成功');
                this.$emit('saved', this.localPlugin);
                return this.localPlugin;
            });
        },
        saveMicroConfig(value, enabled){
            return this.persist(this.applyConfig(value || {}, enabled !== false));
        },
        submitYaml(){
            let config;
            try{
                config = jsyaml.load(this.form.yaml || '') || {};
                if(typeof config !== 'object' || Array.isArray(config)){
                    throw new Error('配置必须是 YAML 对象');
                }
            }catch(error){
                this.$message.error(error?.message || 'YAML 格式错误');
                return;
            }
            this.persist(this.applyConfig(config, this.form.enabled)).then(()=>{
                this.syncYamlForm();
                this.rememberYamlSnapshot();
                this.yamlEditing = false;
            });
        },
        close(saved){
            this.visible = false;
            this.$emit('close', saved === true);
        },
    },
};
</script>

<style scoped>
.plugin-config-scope-alert{margin-bottom:12px;}
.plugin-config-actions{display:flex;justify-content:flex-end;margin-bottom:12px;}
.plugin-config-layout{display:flex;height:calc(100vh - 164px);min-height:520px;}
.plugin-config-menu{width:220px;flex:0 0 220px;border-right:1px solid var(--color-border-2);overflow:auto;padding-right:12px;}
.plugin-config-role{padding:12px 16px 6px;color:var(--color-text-3);font-size:12px;}
.plugin-config-content{flex:1;min-width:0;height:100%;padding-left:16px;}
.plugin-config-layout.without-menu .plugin-config-content{padding-left:0;}
.plugin-config-layout.is-rule{display:block;height:calc(100vh - 150px);}
.plugin-config-layout.is-rule .plugin-config-content{padding-left:0;}
.plugin-config-spin{display:block;width:100%;height:100%;}
.plugin-config-spin :deep(.arco-spin-children){height:100%;}
.plugin-yaml-config{height:calc(100vh - 180px);min-height:480px;}
.plugin-yaml-config__toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;height:32px;}
.plugin-yaml-config__switch{display:flex;align-items:center;gap:16px;}
.plugin-yaml-config__label{margin:18px 0 8px;color:var(--color-text-2);}
.plugin-yaml-config__editor{height:calc(100% - 80px);min-height:380px;}
.plugin-yaml-config__editor :deep(.yaml-input){width:100%;height:100%;border:1px solid var(--color-border-2);}
</style>
