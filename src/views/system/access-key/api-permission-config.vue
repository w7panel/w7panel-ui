<template>
    <div class="bg-white padding-20">
        <a-alert type="info" class="mb-20">此处配置的 API 权限对所有 API 密钥生效。</a-alert>
        <a-form :model="form" auto-label-width>
            <a-form-item label="全部API">
                <a-switch v-model="form.apiAll" :disabled="loading || saving || (!form.apiAll && !canGrantAllApi)" @change="setApiAll" />
            </a-form-item>
            <a-form-item v-if="!form.apiAll" label="API列表">
                <div class="api-permission-panel">
                    <div class="api-permission-toolbar">
                        <a-input-search v-model="form.search" placeholder="搜索 PATH / 说明 / Method" allow-clear />
                        <a-space>
                            <a-button size="small" :disabled="loading || saving" @click="selectAll">全选</a-button>
                            <a-button size="small" :disabled="loading || saving" @click="clearAll">清空</a-button>
                        </a-space>
                    </div>
                    <div class="api-permission-table">
                        <table class="com-table">
                            <tbody>
                                <tr><td>URL</td><td style="width:220px;">Method</td></tr>
                                <tr v-for="group in filteredGroups" :key="group.path">
                                    <td>
                                        <div>{{ group.path }}</div>
                                        <div class="api-desc">{{ group.title }}</div>
                                    </td>
                                    <td>
                                        <a-select
                                            :model-value="selectedMethods(group)"
                                            multiple
                                            allow-clear
                                            :disabled="loading || saving"
                                            placeholder="方法匹配值，可多选"
                                            style="width:220px;"
                                            @change="methods => setMethods(group, methods)"
                                        >
                                            <a-option v-for="route in group.routes" :key="route.method" :label="route.method" :value="route.method" :disabled="!apiRouteAllowed(route)" />
                                        </a-select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-if="otherRules.length" class="mt-20">
                        <div class="mb-10">路由目录外的现有规则</div>
                        <a-space v-for="rule in otherRules" :key="rule.path" class="other-rule">
                            <span>{{ rule.path }}：{{ rule.method.join(', ') }}</span>
                            <a-button size="mini" status="danger" :disabled="saving" @click="removeOtherRule(rule.path)">移除</a-button>
                        </a-space>
                    </div>
                </div>
            </a-form-item>
        </a-form>
        <a-button type="primary" :loading="saving" :disabled="loading || !permission" @click="save">保存</a-button>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { resolveApiRouteDescription, getLoadedApiRouteDescriptions } from '@/utils/api-route-description';
import { loadPermissionApiCatalog } from '@/utils/permission-api-catalog';
import { allowsExclusiveGrant, loadExclusivePolicy } from '@/utils/permission-exclusives';

const permissionUrl = '/apis/w7panel.w7.com/v1alpha1/permissions/api';
const routeKey = route => `${route.method} ${route.path}`;
const methodVerb = method => ({ GET: 'get', HEAD: 'get', POST: 'create', PUT: 'update', PATCH: 'patch', DELETE: 'delete' })[method] || method.toLowerCase();

export default {
    data() {
        return {
            permission: null,
            routes: [],
            descriptions: getLoadedApiRouteDescriptions(),
            exclusiveRules: null,
            loading: true,
            saving: false,
            changedPaths: new Set(),
            removedPaths: new Set(),
            cleared: false,
            form: { apiAll: false, search: '', selectedKeys: [] },
        };
    },
    computed: {
		canGrantAllApi() { return this.exclusiveRules && allowsExclusiveGrant(this.exclusiveRules.rules, this.exclusiveRules.clusterType, [], {'*': ['*']}); },
        groups() {
            const groups = new Map();
            this.routes.forEach(route => {
                if (!groups.has(route.path)) groups.set(route.path, { path: route.path, routes: [], title: '' });
                const group = groups.get(route.path);
                group.routes.push(route);
                if (!group.title && route.description) group.title = route.description;
            });
            return Array.from(groups.values());
        },
        filteredGroups() {
            const search = this.form.search.trim().toLowerCase();
            if (!search) return this.groups;
            return this.groups.filter(group =>
                group.path.toLowerCase().includes(search)
                || group.title.toLowerCase().includes(search)
                || group.routes.some(route => route.method.toLowerCase().includes(search)));
        },
        otherRules() {
            const catalogPaths = new Set(this.groups.map(group => group.path));
            return (this.permission?.spec?.apiRules || []).filter(rule =>
                rule.path && rule.path !== '*' && !catalogPaths.has(rule.path) && !this.removedPaths.has(rule.path) && !this.cleared);
        },
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            this.loading = true;
            try {
                const [permission, catalog, exclusiveRules] = await Promise.all([
                    k8sproxy.get(permissionUrl),
                    loadPermissionApiCatalog(),
					loadExclusivePolicy(),
                ]);
				this.exclusiveRules = exclusiveRules;
                this.permission = permission.data;
                this.descriptions = catalog.descriptions;
                this.routes = catalog.routes.map(route => {
                    const method = String(route.method || route.Method || '').toUpperCase();
                    const path = route.path || route.Path || '';
                    return {
                        method,
                        path,
                        verb: route.verb || route.Verb || methodVerb(method),
                        description: resolveApiRouteDescription(this.descriptions, {
                            method, route: path,
                            fallback: route.description || route.title || route.Description || route.Title || '',
                        }),
                    };
                }).filter(route => route.method && route.path);
                const rules = Object.fromEntries((this.permission?.spec?.apiRules || []).map(rule => [rule.path, rule.method || []]));
                this.form.apiAll = (rules['*'] || []).includes('*');
                this.form.selectedKeys = this.routes.filter(route =>
                    this.form.apiAll || (rules[route.path] || []).some(verb => verb === '*' || verb === route.verb)).map(routeKey);
                this.changedPaths = new Set();
                this.removedPaths = new Set();
                this.cleared = false;
            } catch (error) {
                this.$message.error('API权限加载失败');
            } finally {
                this.loading = false;
            }
        },
        setApiAll(enabled) {
            if (!enabled) this.groups.forEach(group => this.changedPaths.add(group.path));
        },
        selectedMethods(group) {
            const selected = new Set(this.form.selectedKeys);
            return group.routes.filter(route => selected.has(routeKey(route))).map(route => route.method);
        },
        setMethods(group, methods) {
            const selected = new Set(this.form.selectedKeys);
            const chosen = new Set(methods || []);
            group.routes.forEach(route => chosen.has(route.method) && this.apiRouteAllowed(route) ? selected.add(routeKey(route)) : selected.delete(routeKey(route)));
            this.form.selectedKeys = Array.from(selected);
            this.changedPaths.add(group.path);
        },
        selectAll() {
            this.form.selectedKeys = this.routes.filter(this.apiRouteAllowed).map(routeKey);
            this.groups.forEach(group => this.changedPaths.add(group.path));
        },
        clearAll() {
            this.form.selectedKeys = [];
            this.cleared = true;
            this.groups.forEach(group => this.changedPaths.add(group.path));
        },
        removeOtherRule(path) {
            this.removedPaths.add(path);
        },
		apiRouteAllowed(route) {
			return this.exclusiveRules && allowsExclusiveGrant(this.exclusiveRules.rules, this.exclusiveRules.clusterType, [], {[route.path]: [route.verb]});
		},
        async save() {
            if (!this.permission || this.saving) return;
            this.saving = true;
            try {
                const { data } = await k8sproxy.get(permissionUrl);
                let rules = this.cleared ? new Map() : new Map((data.spec?.apiRules || []).map(rule => [rule.path, rule.method || []]));
                if (this.form.apiAll) {
                    rules = new Map([['*', ['*']]]);
                } else {
                    rules.delete('*');
                    this.removedPaths.forEach(path => rules.delete(path));
                    const selected = new Set(this.form.selectedKeys);
                    this.groups.filter(group => this.changedPaths.has(group.path)).forEach(group => {
                        const verbs = [...new Set(group.routes.filter(route => selected.has(routeKey(route))).map(route => route.verb))];
                        if (verbs.length) rules.set(group.path, verbs);
                        else rules.delete(group.path);
                    });
                }
                data.spec.apiRules = Array.from(rules, ([path, method]) => ({ path, method }));
				const exclusiveRules = await loadExclusivePolicy();
				if (!allowsExclusiveGrant(exclusiveRules.rules, exclusiveRules.clusterType, data.spec.menuRules || [], Object.fromEntries(rules))) throw new Error('所选 API 不允许授予当前集群');
                await k8sproxy.put(permissionUrl, data);
                this.$message.success('保存成功');
                await this.load();
            } catch (error) {
                this.$message.error('API权限保存失败');
            } finally {
                this.saving = false;
            }
        },
    },
};
</script>

<style scoped>
.api-permission-panel { width: 100%; }
.api-permission-toolbar { display: flex; gap: 12px; justify-content: space-between; margin-bottom: 12px; }
.api-permission-toolbar .arco-input-wrapper { max-width: 360px; }
.api-permission-table { max-height: 500px; overflow: auto; }
.api-desc { color: var(--color-text-3); font-size: 12px; }
.other-rule { display: flex; margin-bottom: 8px; }
</style>
