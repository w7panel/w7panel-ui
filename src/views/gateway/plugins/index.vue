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
            <a-table :data="filteredList" :bordered="false" :pagination="false" row-key="name">
                <template #columns>
                    <a-table-column title="插件" :width="360">
                        <template #cell="{ record }">
                            <div class="b">{{record.title}}</div>
                            <div class="fs-12 c-99 mt-4">{{record.name}}{{record.version ? `@${record.version}` : ''}}</div>
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
                    <a-table-column title="状态" :width="100">
                        <template #cell="{ record }">
                            <a-tag :color="record.enabled ? 'green' : 'gray'">
                                {{record.enabled ? '已启用' : '已停用'}}
                            </a-tag>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="270">
                        <template #cell="{ record }">
                            <a-link
                                v-if="record.supportGlobal && permission.includes('gateway/plugins/edit')"
                                :disabled="!record.enabled"
                                @click="openConfig(record)"
                            >全局配置</a-link>
                            <a-link v-if="permission.includes('gateway/plugins/edit')" @click="openForm(record)">编辑</a-link>
                            <a-popconfirm
                                v-if="permission.includes('gateway/plugins/edit')"
                                :content="record.enabled ? '停用后插件的全局配置和所有规则都会停止生效，是否继续？' : '是否重新启用该插件？'"
                                position="lt"
                                :content-style="{maxWidth:'360px'}"
                                type="warning"
                                @ok="togglePlugin(record)"
                            >
                                <a-link>{{record.enabled ? '停用' : '启用'}}</a-link>
                            </a-popconfirm>
                            <a-popconfirm
                                v-if="permission.includes('gateway/plugins/delete')"
                                content="卸载后插件及其全部规则配置将被删除，是否继续？"
                                position="lt"
                                :content-style="{maxWidth:'360px'}"
                                type="warning"
                                :ok-button-props="{status:'danger'}"
                                @ok="removePlugin(record)"
                            >
                                <a-link status="danger">卸载</a-link>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
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
                    <template #extra>全局配置默认开启；勾选规则配置后，插件会出现在应用域名管理的“更多”中。</template>
                </a-form-item>
                <a-form-item v-if="!form.edit" label="配置前端包">
                    <a-input v-model="form.microapp" placeholder="可选，填写 MicroApp 名称" allow-clear />
                    <template #extra>配置后按照 MicroApp 方式加载操作界面；留空时显示 YAML 配置。</template>
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
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { getPermission } from '@/utils/auth';
import gatewayPluginConfig from '@/components/gateway-plugin-config.vue';
import {
    MICROAPP_API,
    WASM_PLUGIN_API,
    GATEWAY_PLUGIN_ANNOTATIONS,
    getPluginDescription,
    getPluginMicroapp,
    getPluginTitle,
    getPluginVersion,
    isGatewayPluginEnabled,
    normalizePluginName,
    getResolvedMicroappName,
    setGatewayPluginEnabled,
    supportsGlobalConfig,
    supportsRuleConfig,
} from '@/utils/gateway-plugin';

export default {
    components: { gatewayPluginConfig },
    data(){
        return {
            keyword: '',
            permission: getPermission() || [],
            resources: [],
            microapps: [],
            microappInfoMap: {},
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
            return this.resources.map(resource=>{
                const microappName = getResolvedMicroappName(resource, this.microapps);
                const microappInfo = this.microappInfoMap[microappName] || null;
                return {
                    name: resource?.metadata?.name || '',
                    title: getPluginTitle(resource),
                    description: getPluginDescription(resource),
                    version: getPluginVersion(resource),
                    microappInfo,
                    enabled: isGatewayPluginEnabled(resource),
                    supportGlobal: supportsGlobalConfig(resource),
                    supportRule: supportsRuleConfig(resource),
                    resource,
                };
            });
        },
        filteredList(){
            const keyword = this.keyword.trim().toLowerCase();
            if(!keyword){ return this.list; }
            return this.list.filter(item=>`${item.name} ${item.title} ${item.description}`.toLowerCase().includes(keyword));
        },
    },
    created(){
        this.getList();
    },
    methods: {
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
                microapp: '',
            };
        },
        async getList(){
            const [pluginRes, microappRes] = await Promise.all([
                k8sproxy.get(WASM_PLUGIN_API, { loading: true }),
                k8sproxy.get(MICROAPP_API, { noAlert: true }).catch(()=>({ data: { items: [] } })),
            ]);
            this.resources = pluginRes?.data?.items || [];
            this.microapps = microappRes?.data?.items || [];
            return this.loadMicroappFrontendStatus();
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
                microapp: getPluginMicroapp(resource),
            };
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
            annotations[GATEWAY_PLUGIN_ANNOTATIONS.enabled] = annotations[GATEWAY_PLUGIN_ANNOTATIONS.enabled] || 'true';
            annotations[GATEWAY_PLUGIN_ANNOTATIONS.supportGlobal] = String(this.form.supportGlobal);
            annotations[GATEWAY_PLUGIN_ANNOTATIONS.supportRule] = String(this.form.supportRule);
            if(this.form.microapp){
                annotations[GATEWAY_PLUGIN_ANNOTATIONS.microapp] = this.form.microapp.trim();
            }else{
                delete annotations[GATEWAY_PLUGIN_ANNOTATIONS.microapp];
            }
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
            this.$refs.pluginForm.validate(errors=>{
                if(errors){ return; }
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
        togglePlugin(row){
            const data = setGatewayPluginEnabled(row.resource, !row.enabled);
            return k8sproxy.put(`${WASM_PLUGIN_API}/${row.name}`, data, { loading: true }).then(()=>{
                this.$message.success(row.enabled ? '插件已停用' : '插件已启用');
                this.getList();
            });
        },
        removePlugin(row){
            return k8sproxy.delete(`${WASM_PLUGIN_API}/${row.name}`, { loading: true }).then(()=>{
                this.$message.success('插件已卸载');
                this.getList();
            });
        },
        openConfig(row){
            if(!row.enabled){ return; }
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
