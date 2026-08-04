<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="df jc-sb ai-c" style="gap:12px;">
            <a-button v-if="permission.includes('gateway/plugins/add')" type="primary" @click="openForm()">
                <template #icon><icon-plus /></template>
                添加插件
            </a-button>
            <a-input-search
                v-model="keyword"
                allow-clear
                placeholder="搜索插件名称"
                style="width:260px;"
            />
        </div>

        <div class="bg-white padding-20 mt-20">
            <a-alert style="margin-bottom:16px;">
                全局状态仅控制插件的全局配置，不影响域名规则；域名规则请在应用域名管理的“更多”中独立配置。
            </a-alert>
            <div v-if="groupedFilteredList.length" class="plugin-category-list">
              <section
                  v-for="group in groupedFilteredList"
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
                    row-key="key"
                >
                    <template #columns>
                    <a-table-column title="插件" :width="360">
                        <template #cell="{ record }">
                            <div class="df ai-c" style="gap:8px;">
                                <span>{{record.title}}</span>
                                <a-tag v-if="record.officialApp" color="arcoblue" size="small">官方</a-tag>
                                <a-popover
                                    v-if="record.upgrade?.canUpgrade"
                                    position="bottom"
                                    trigger="click"
                                    :content-style="{padding:'6px 10px 16px'}"
                                >
                                    <div class="cursor" style="color:rgb(var(--red-7));">
                                        <icon-exclamation-circle-fill />
                                        <span class="ml-2">新版本</span>
                                    </div>
                                    <template #content>
                                        <div>
                                            <div class="df ai-c" style="color:rgb(var(--red-7));">
                                                <icon-exclamation-circle-fill />
                                                <span class="ml-4 fs-16 b">新版本</span>
                                            </div>
                                            <div class="mt-10 c-00-6 txt-c">更新将升级该插件所属的整个应用制品。</div>
                                            <div class="mt-10 df ai-c jc-a">
                                                <a-button size="small" @click="showUpgradeDetail(record)">查看更新说明</a-button>
                                                <a-button size="small" type="primary" @click="toUpgrade(record)">立即更新</a-button>
                                            </div>
                                        </div>
                                    </template>
                                </a-popover>
                            </div>
                            <div class="fs-12 c-99 mt-4">{{record.identify}}{{record.version ? `@${record.version}` : ''}}</div>
                            <div v-if="record.description" class="fs-12 c-99 mt-4">{{record.description}}</div>
                        </template>
                    </a-table-column>
                    <a-table-column title="支持范围" :width="190">
                        <template #cell="{ record }">
                            <a-space>
                                <a-tag v-if="record.supportGlobal" color="arcoblue">全局配置</a-tag>
                                <a-tag v-if="record.supportRule" color="green">规则配置</a-tag>
                                <span v-if="!record.supportGlobal && !record.supportRule" class="c-99">未配置</span>
                            </a-space>
                        </template>
                    </a-table-column>
                    <a-table-column title="全局状态" :width="110">
                        <template #cell="{ record }">
                            <a-switch
                                v-if="record.installed && record.supportGlobal"
                                :model-value="record.enabled"
                                :loading="togglingNames.includes(record.name)"
                                :disabled="!permission.includes('gateway/plugins/edit')"
                                @change="enabled=>togglePlugin(record, enabled)"
                            />
                            <a-tag v-else-if="!record.installed" color="orangered">待安装</a-tag>
                            <span v-else class="c-99">--</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="210">
                        <template #cell="{ record }">
                            <a-link
                                v-if="record.installed && record.supportGlobal && permission.includes('gateway/plugins/edit')"
                                @click="openConfig(record)"
                            >全局配置</a-link>
                            <a-link
                                v-if="record.installed && permission.includes('gateway/plugins/edit') && !record.officialApp"
                                @click="openForm(record)"
                            >编辑</a-link>
                            <a-popconfirm
                                v-if="record.installed && record.appGroup && permission.includes('gateway/plugins/delete') && !record.denyDelete"
                                :content="getUninstallConfirm(record)"
                                position="lt"
                                :content-style="{maxWidth:'360px'}"
                                type="warning"
                                :ok-button-props="{status:'danger'}"
                                @ok="uninstallPluginApplication(record)"
                            >
                                <a-link status="danger">卸载</a-link>
                            </a-popconfirm>
                            <a-link
                                v-if="!record.installed && permission.includes('gateway/plugins/add')"
                                @click="toInstall(record)"
                            >安装</a-link>
                        </template>
                    </a-table-column>
                    </template>
                </a-table>
              </section>
            </div>
            <a-empty v-if="!groupedFilteredList.length" />
        </div>

        <a-drawer
            :visible="form.show"
            :width="760"
            unmount-on-close
            @ok="submitForm"
            @cancel="form.show=false"
        >
            <template #title>{{form.edit ? '编辑插件' : '添加插件'}}</template>
            <a-form ref="pluginForm" :model="form" :rules="rules" layout="vertical">
                <a-form-item label="插件名称" field="name">
                    <a-input
                        v-model="form.name"
                        :disabled="form.edit"
                        placeholder="Kubernetes 资源名称，例如 request-block"
                    />
                </a-form-item>
                <a-form-item label="显示名称" field="title">
                    <a-input v-model="form.title" placeholder="请输入插件显示名称" />
                </a-form-item>
                <a-form-item label="插件描述">
                    <a-textarea v-model="form.description" placeholder="请输入插件描述" :auto-size="{minRows:2,maxRows:4}" />
                </a-form-item>
                <a-form-item label="镜像地址" field="image">
                    <a-input v-model="form.image" placeholder="oci://... 或 http(s)://..." />
                </a-form-item>
                <div class="df" style="gap:16px;">
                    <a-form-item label="执行阶段" field="phase" style="flex:1;">
                        <a-select v-model="form.phase">
                            <a-option value="UNSPECIFIED_PHASE">默认阶段</a-option>
                            <a-option value="AUTHN">认证阶段</a-option>
                            <a-option value="AUTHZ">鉴权阶段</a-option>
                            <a-option value="STATS">统计阶段</a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="优先级" field="priority" style="flex:1;">
                        <a-input-number v-model="form.priority" :min="0" :max="1000" style="width:100%;" />
                    </a-form-item>
                </div>
                <a-form-item label="支持范围" field="scopes">
                    <a-checkbox v-model="form.supportGlobal">支持全局配置</a-checkbox>
                    <a-checkbox v-model="form.supportRule" class="ml-20">支持规则配置</a-checkbox>
                    <template #extra>全局配置默认开启；勾选规则配置后，插件会出现在应用域名管理的“更多”中。取消勾选会停用已有规则。</template>
                </a-form-item>
            </a-form>
        </a-drawer>

        <gateway-plugin-config
            :show="config.show"
            :plugin="config.plugin"
            :microapp="config.microapp"
            scope="global"
            @saved="onConfigSaved"
            @close="closeConfig"
        />

        <a-modal
            v-model:visible="upgradeDetail.show"
            title="版本说明"
            hide-cancel
            @ok="upgradeDetail.show=false"
        >
            <div class="df ai-c jc-b">
                <a-tag color="red">新版本</a-tag>
                <span class="c-99">版本：{{upgradeDetail.version}}</span>
            </div>
            <div class="mt-20 c-00-6" style="line-height:22px;white-space:pre-wrap;">
                {{upgradeDetail.description || '暂无更新说明'}}
            </div>
        </a-modal>
    </div>
</template>

<script>
import { Modal } from '@arco-design/web-vue';
import { k8sproxy, panelApi } from '@/utils/api';
import { getPermission } from '@/utils/auth';
import gatewayPluginConfig from '@/components/gateway-plugin-config.vue';
import {
    groupGatewayPlugins,
    loadGatewayPluginMarket,
    normalizeGatewayPluginIdentify,
} from '@/utils/gateway-plugin-market';
import {
    WASM_PLUGIN_API,
    GATEWAY_PLUGIN_ANNOTATIONS,
    getPluginDescription,
    getPluginTitle,
    getPluginVersion,
    isGlobalPluginEnabled,
    normalizePluginName,
    getResolvedMicroappName,
    setGlobalPluginEnabled,
    supportsGlobalConfig,
    supportsRuleConfig,
} from '@/utils/gateway-plugin';
import {
    APPGROUP_API,
    DENY_DELETE_ANNOTATION,
    MICROAPP_API,
    OFFICIAL_APP_ANNOTATION,
    RESOURCE_IDENTIFIE_ANNOTATION,
    RESOURCE_IDENTIFIE_LABEL,
    getResourceGroupName,
    loadResourcesByGroupNames,
} from '@/utils/w7panel-resource';

export default {
    components: { gatewayPluginConfig },
    data(){
        return {
            keyword: '',
            permission: getPermission() || [],
            resources: [],
            marketPlugins: [],
            microapps: [],
            microappInfoMap: {},
            appGroupMap: {},
            upgradeInfoMap: {},
            consoleInfo: {},
            upgradeDetail: { show: false, version: '', description: '' },
            togglingNames: [],
            collapsedCategories: [],
            form: this.emptyForm(),
            config: { show: false, plugin: null, microapp: null },
            rules: {
                name: [
                    { required: true, message: '请输入插件名称' },
                    { match: /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/, message: '仅支持小写字母、数字、点和横线' },
                ],
                title: [{ required: true, message: '请输入显示名称' }],
                image: [{ required: true, message: '请输入镜像地址' }],
                phase: [{ required: true, message: '请选择执行阶段' }],
                priority: [{ required: true, message: '请输入优先级' }],
            },
        };
    },
    computed: {
        list(){
            const installedByIdentify = new Map();
            this.resources.forEach(resource=>{
                const groupName = getResourceGroupName(resource);
                const appGroup = this.appGroupMap[groupName] || null;
                const identify = normalizeGatewayPluginIdentify(
                    appGroup?.spec?.identifie
                    || appGroup?.metadata?.annotations?.[RESOURCE_IDENTIFIE_ANNOTATION]
                    || resource?.metadata?.labels?.[RESOURCE_IDENTIFIE_LABEL]
                );
                if(identify && !installedByIdentify.has(identify)){
                    installedByIdentify.set(identify, resource);
                }
            });
            const marketIdentifies = new Set(this.marketPlugins.map(item=>normalizeGatewayPluginIdentify(item.identify)));
            const marketRows = this.marketPlugins.map(item=>{
                const resource = installedByIdentify.get(normalizeGatewayPluginIdentify(item.identify)) || null;
                return this.buildListRow(resource, item);
            });
            const legacyRows = this.resources
                .filter(resource=>{
                    const groupName = getResourceGroupName(resource);
                    const appGroup = this.appGroupMap[groupName] || null;
                    const identify = normalizeGatewayPluginIdentify(
                        appGroup?.spec?.identifie
                        || appGroup?.metadata?.annotations?.[RESOURCE_IDENTIFIE_ANNOTATION]
                        || resource?.metadata?.labels?.[RESOURCE_IDENTIFIE_LABEL]
                    );
                    return !identify || !marketIdentifies.has(identify);
                })
                .map(resource=>this.buildListRow(resource, null));
            return [...marketRows, ...legacyRows];
        },
        groupedFilteredList(){
            return groupGatewayPlugins(this.filteredList);
        },
        filteredList(){
            const keyword = this.keyword.trim().toLowerCase();
            if(!keyword){ return this.list; }
            return this.list.filter(item=>`${item.identify} ${item.title} ${item.description}`.toLowerCase().includes(keyword));
        },
    },
    created(){
        this.getList();
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
        buildListRow(resource, marketItem){
            if(!resource){
                return {
                    key: `market:${marketItem.identify}`,
                    name: '',
                    identify: marketItem.identify,
                    title: marketItem.name,
                    description: marketItem.description || '',
                    version: marketItem.latest_version || '',
                    pluginType: marketItem.plugin_type || '',
                    formulaUrl: marketItem.formula_url || '',
                    installed: false,
                    officialApp: false,
                    denyDelete: false,
                    upgrade: null,
                    enabled: false,
                    supportGlobal: false,
                    supportRule: false,
                    resource: null,
                    microappInfo: null,
                    groupName: '',
                    appGroup: null,
                };
            }
            const microappName = getResolvedMicroappName(resource, this.microapps);
            const microappInfo = this.microappInfoMap[microappName] || null;
            const groupName = getResourceGroupName(resource);
            const appGroup = this.appGroupMap[groupName] || null;
            return {
                key: `installed:${resource?.metadata?.name || marketItem?.identify || ''}`,
                name: resource?.metadata?.name || '',
                identify: marketItem?.identify || appGroup?.spec?.identifie || resource?.metadata?.labels?.[RESOURCE_IDENTIFIE_LABEL] || resource?.metadata?.name || '',
                title: marketItem?.name || getPluginTitle(resource),
                description: marketItem?.description || getPluginDescription(resource),
                version: getPluginVersion(resource) || marketItem?.latest_version || '',
                pluginType: marketItem?.plugin_type || '',
                formulaUrl: marketItem?.formula_url || '',
                installed: true,
                microappInfo,
                groupName,
                appGroup,
                officialApp: appGroup?.metadata?.annotations?.[OFFICIAL_APP_ANNOTATION] === 'true',
                denyDelete: appGroup?.metadata?.annotations?.[DENY_DELETE_ANNOTATION] === 'true',
                upgrade: this.upgradeInfoMap[groupName] || null,
                enabled: isGlobalPluginEnabled(resource),
                supportGlobal: supportsGlobalConfig(resource),
                supportRule: supportsRuleConfig(resource),
                resource,
            };
        },
        emptyForm(){
            return {
                show: false,
                edit: false,
                resource: null,
                name: '',
                title: '',
                description: '',
                image: '',
                phase: 'UNSPECIFIED_PHASE',
                priority: 0,
                supportGlobal: true,
                supportRule: false,
            };
        },
        async getList(){
            const [pluginRes, consoleRes, marketRes] = await Promise.all([
                k8sproxy.get(WASM_PLUGIN_API, { loading: true }),
                panelApi.get('/auth/console/info', { noAlert: true }).catch(()=>({ data: {} })),
                loadGatewayPluginMarket().catch(()=>[]),
            ]);
            this.resources = pluginRes?.data?.items || [];
            const groupNames = [...new Set(this.resources.map(resource=>getResourceGroupName(resource)).filter(Boolean))];
            const [microapps, appGroups] = await Promise.all([
                loadResourcesByGroupNames(k8sproxy, MICROAPP_API, groupNames, true),
                loadResourcesByGroupNames(k8sproxy, APPGROUP_API, groupNames, true),
            ]);
            this.microapps = microapps;
            this.appGroupMap = Object.fromEntries(appGroups
                .map(group=>[group?.metadata?.name, group]));
            this.consoleInfo = consoleRes?.data || {};
            this.marketPlugins = marketRes;
            await Promise.all([
                this.loadMicroappFrontendStatus(),
                this.loadUpgradeInfo(),
            ]);
        },
        async loadUpgradeInfo(){
            const groupNames = [...new Set(this.resources
                .map(resource=>getResourceGroupName(resource))
                .filter(groupName=>groupName && this.appGroupMap[groupName]))];
            const entries = await Promise.all(groupNames.map(async groupName=>{
                const group = this.appGroupMap[groupName];
                const info = await panelApi.get('/zpk/upgrade-info', {
                    noAlert: true,
                    params: {
                        namespace: group?.metadata?.namespace || 'default',
                        releaseName: groupName,
                        thirdpartyCDToken: this.consoleInfo?.thirdparty_cd_token || '',
                    },
                }).then(res=>res?.data || null).catch(()=>null);
                return [groupName, info];
            }));
            this.upgradeInfoMap = Object.fromEntries(entries.filter(([, info])=>info));
        },
        async loadMicroappFrontendStatus(){
            const names = [...new Set(this.resources.map(resource=>getResolvedMicroappName(resource, this.microapps)).filter(Boolean))];
            const entries = await Promise.all(names.map(async name=>{
                const info = await panelApi.get(`/microapp/${encodeURIComponent(name)}/info`, { noAlert: true })
                    .then(res=>res?.data || null)
                    .catch(()=>null);
                return [name, info];
            }));
            this.microappInfoMap = Object.fromEntries(entries);
        },
        openForm(row){
            if(!row){
                this.form = { ...this.emptyForm(), show: true };
                return;
            }
            if(row.officialApp){
                this.$message.warning('官方应用提供的插件不允许编辑');
                return;
            }
            const resource = row.resource;
            this.form = {
                show: true,
                edit: true,
                resource,
                name: row.name,
                title: row.title,
                description: row.description,
                image: resource?.spec?.url || '',
                phase: resource?.spec?.phase || 'UNSPECIFIED_PHASE',
                priority: Number(resource?.spec?.priority || 0),
                supportGlobal: row.supportGlobal,
                supportRule: row.supportRule,
            };
        },
        showUpgradeDetail(row){
            this.upgradeDetail = {
                show: true,
                version: row?.upgrade?.version || '',
                description: row?.upgrade?.description || '',
            };
        },
        toUpgrade(row){
            const groupName = row?.groupName;
            const zpkUrl = row?.upgrade?.zpkUrl || row?.appGroup?.spec?.zpkUrl || '';
            if(!groupName || !zpkUrl){
                this.$message.error('缺少应用制品更新信息');
                return;
            }
            this.$router.push({
                path: '/app/store-install',
                query: {
                    path: zpkUrl,
                    releasename: groupName,
                    thirdpartyCDToken: this.consoleInfo?.thirdparty_cd_token || '',
                    insClusterId: this.consoleInfo?.cluster_id || '',
                },
            });
        },
        toInstall(row){
            if(!row?.formulaUrl){
                this.$message.error('制品市场未返回插件安装地址');
                return;
            }
            this.$router.push({
                path: '/app/store-install',
                query: {
                    path: row.formulaUrl,
                    thirdpartyCDToken: this.consoleInfo?.thirdparty_cd_token || '',
                    insClusterId: this.consoleInfo?.cluster_id || '',
                },
            });
        },
        buildResource(){
            const data = this.form.edit
                ? JSON.parse(JSON.stringify(this.form.resource))
                : {
                    apiVersion: 'extensions.higress.io/v1alpha1',
                    kind: 'WasmPlugin',
                    metadata: { name: normalizePluginName(this.form.name), annotations: {}, labels: {} },
                    spec: {
                        defaultConfig: {},
                        matchRules: [],
                        failStrategy: 'FAIL_OPEN',
                    },
                };
            data.metadata = data.metadata || {};
            data.metadata.annotations = data.metadata.annotations || {};
            data.spec = data.spec || {};
            const annotations = data.metadata.annotations;
            annotations['higress.io/wasm-plugin-title'] = this.form.title;
            annotations['higress.io/wasm-plugin-description'] = this.form.description || '';
            annotations[GATEWAY_PLUGIN_ANNOTATIONS.supportGlobal] = String(this.form.supportGlobal);
            annotations[GATEWAY_PLUGIN_ANNOTATIONS.supportRule] = String(this.form.supportRule);
            data.spec.url = this.form.image;
            data.spec.phase = this.form.phase;
            data.spec.priority = Number(this.form.priority);
            if(!this.form.supportGlobal){ data.spec.defaultConfigDisable = true; }
            if(!this.form.supportRule){
                (data.spec.matchRules || []).forEach(rule=>{ rule.configDisable = true; });
            }
            if(!this.form.edit){
                data.spec.defaultConfigDisable = !this.form.supportGlobal;
            }
            return data;
        },
        submitForm(){
            if(!this.form.supportGlobal && !this.form.supportRule){
                this.$message.warning('请至少选择一种支持范围');
                return;
            }
            this.form.name = normalizePluginName(this.form.name);
            this.$refs.pluginForm.validate(async errors=>{
                if(errors){ return; }
                const activeRuleCount = (this.form.resource?.spec?.matchRules || [])
                    .filter(rule=>rule?.configDisable !== true).length;
                const disablingRuleSupport = this.form.edit
                    && supportsRuleConfig(this.form.resource)
                    && !this.form.supportRule
                    && activeRuleCount > 0;
                if(disablingRuleSupport){
                    const confirmed = await new Promise(resolve=>{
                        Modal.confirm({
                            title: '关闭规则配置支持？',
                            content: `关闭后，该插件将不再出现在域名“更多”中，现有 ${activeRuleCount} 条已启用规则将全部停用，重新开启规则配置支持时不会自动恢复。是否继续？`,
                            okText: '确认关闭',
                            cancelText: '取消',
                            okButtonProps: { status: 'danger' },
                            onOk: ()=>resolve(true),
                            onCancel: ()=>resolve(false),
                        });
                    });
                    if(!confirmed){ return; }
                }
                const data = this.buildResource();
                const request = this.form.edit
                    ? k8sproxy.put(`${WASM_PLUGIN_API}/${data.metadata.name}`, data, { loading: true })
                    : k8sproxy.post(WASM_PLUGIN_API, data, { loading: true });
                request.then(()=>{
                    this.$message.success(this.form.edit ? '修改成功' : '添加成功');
                    this.form.show = false;
                    this.getList();
                });
            });
        },
        togglePlugin(row, enabled){
            if(this.togglingNames.includes(row.name)){ return; }
            this.togglingNames.push(row.name);
            const data = setGlobalPluginEnabled(row.resource, enabled);
            return k8sproxy.put(`${WASM_PLUGIN_API}/${row.name}`, data, { loading: true }).then(()=>{
                this.$message.success(enabled ? '全局配置已启用' : '全局配置已停用');
                return this.getList();
            }).finally(()=>{
                this.togglingNames = this.togglingNames.filter(name=>name !== row.name);
            });
        },
        getUninstallConfirm(row){
            const title = row?.appGroup?.spec?.title || row?.title || row?.groupName;
            return `确认卸载应用“${title}”吗？该应用包含的全部网关插件及关联资源都将被删除。`;
        },
        uninstallPluginApplication(row){
            if(row.denyDelete){
                this.$message.warning('该插件所属应用禁止卸载');
                return;
            }
            if(!row?.appGroup || !row?.groupName){
                this.$message.error('未找到插件所属应用，无法执行卸载');
                return;
            }
            return k8sproxy.delete(`${APPGROUP_API}/${encodeURIComponent(row.groupName)}`, { loading: true }).then(()=>{
                this.$message.success('应用已卸载');
                this.getList();
            });
        },
        openConfig(row){
            this.config = { show: true, plugin: row.resource, microapp: row.microappInfo };
        },
        closeConfig(saved){
            this.config.show = false;
            if(saved){ this.getList(); }
        },
        onConfigSaved(){
            this.getList();
        },
    },
};
</script>

<style scoped>
.plugin-category-list{overflow:hidden;border:1px solid var(--color-border-2);border-radius:4px;background:var(--color-bg-2);}
.plugin-category + .plugin-category{border-top:1px solid var(--color-border-1);}
.plugin-category__title{display:flex;align-items:center;justify-content:space-between;width:100%;height:44px;padding:0 16px;border:0;background:var(--color-bg-2);font-size:14px;font-weight:500;color:var(--color-text-1);cursor:pointer;text-align:left;transition:background-color .2s,color .2s,box-shadow .2s;}
.plugin-category:not(.plugin-category--collapsed)>.plugin-category__title{background:var(--color-primary-light-1);color:rgb(var(--primary-6));box-shadow:inset 3px 0 0 rgb(var(--primary-6));}
.plugin-category__title:hover{background:var(--color-fill-1);color:rgb(var(--primary-6));}
.plugin-category__title :deep(.arco-icon){font-size:13px;color:var(--color-text-3);transition:color .2s;}
.plugin-category__title:hover :deep(.arco-icon){color:rgb(var(--primary-6));}
.plugin-category:not(.plugin-category--collapsed)>.plugin-category__title :deep(.arco-icon){color:rgb(var(--primary-6));}
.plugin-category__count{font-size:12px;font-weight:400;color:var(--color-text-3);}
.plugin-category :deep(.arco-table-container){border-top:1px solid var(--color-border-1);}
</style>
