<template>
    <div class="padding-20">
        <route-breadcrumb :data="{ id: config.name || $route.params.id }" />
        <div>
            <a-button type="primary" @click="openForm(config.id)">
                <template #icon><icon-edit /></template>编辑配置
            </a-button>
        </div>

        <div class="bg-white mt-20 padding-20">
            <div class="df ai-c jc-b">
                <div>
                    <div class="fs-20 fw-600">{{ config.name }}</div>
                    <div class="mt-8 c-99">
                        创建时间：{{ window.formatDate(config.createdAt) }}
                        <span class="ml-20">更新时间：</span>
                        <span :style="{ color: isUpdated ? 'rgb(var(--danger-6))' : '' }">{{ window.formatDate(config.updatedAt) }}</span>
                        <icon-sync v-if="isUpdated" class="ml-6" style="color: rgb(var(--danger-6));" />
                    </div>
                </div>
                <div v-if="config.inherit?.configName">
                    <a-tag color="arcoblue">继承：{{ config.inherit.configName }} / {{ config.inherit.version || '公共配置' }}</a-tag>
                </div>
            </div>

            <a-tabs class="mt-20" v-model:active-key="activeTab">
                <a-tab-pane key="data" title="配置数据">
                    <div class="mb-16">
                        <a-space wrap>
                            <a-tag :color="selectedVersion === '__all__' ? 'arcoblue' : 'gray'" class="cursor" @click="selectedVersion='__all__'">全部</a-tag>
                            <a-tag
                                v-for="version in versionOptions"
                                :key="version"
                                :color="selectedVersion === version ? 'arcoblue' : 'gray'"
                                class="cursor"
                                @click="selectedVersion=version"
                            >
                                {{ version }}
                            </a-tag>
                        </a-space>
                    </div>
                    <a-table :data="displayItems" :pagination="false">
                        <template #columns>
                            <a-table-column title="version" :width="120">
                                <template #cell="{ record }">{{ record.version || '公共' }}</template>
                            </a-table-column>
                            <a-table-column title="name" data-index="name" />
                            <a-table-column title="value" data-index="value" />
                            <a-table-column title="remark" data-index="remark" />
                            <a-table-column title="来源" :width="160">
                                <template #cell="{ record }">
                                    <a-tag :color="record.source === 'inherit' ? 'arcoblue' : 'green'">
                                        {{ record.source === 'inherit' ? `继承自 ${record.sourceConfigName}` : '当前配置' }}
                                    </a-tag>
                                </template>
                            </a-table-column>
                        </template>
                    </a-table>
                </a-tab-pane>

                <a-tab-pane key="deploy" title="配置部署">
                    <div class="mb-16">
                        <a-button type="primary" @click="openStrategyForm()">
                            <template #icon><icon-plus /></template>新增部署策略
                        </a-button>
                    </div>
                    <a-table :data="config.strategies || []" :pagination="false">
                        <template #columns>
                            <a-table-column title="部署应用">
                                <template #cell="{ record }">
                                    {{ record.targetGroup }} / {{ record.targetApp }} / {{ record.targetContainer }}
                                </template>
                            </a-table-column>
                            <a-table-column title="类型" :width="130">
                                <template #cell="{ record }">{{ record.type === 'env' ? '环境变量' : '配置文件' }}</template>
                            </a-table-column>
                            <a-table-column title="挂载路径" :width="180">
                                <template #cell="{ record }">{{ record.type === 'file' ? record.mountPath : '-' }}</template>
                            </a-table-column>
                            <a-table-column title="上次版本" :width="120">
                                <template #cell="{ record }">{{ record.lastAppliedVersion || '-' }}</template>
                            </a-table-column>
                            <a-table-column title="自动部署" :width="100">
                                <template #cell="{ record }">{{ record.autoDeploy ? '开启' : '关闭' }}</template>
                            </a-table-column>
                            <a-table-column title="上次应用时间" :width="180">
                                <template #cell="{ record }">{{ record.lastAppliedAt ? window.formatDate(record.lastAppliedAt) : '-' }}</template>
                            </a-table-column>
                            <a-table-column title="状态" :width="100">
                                <template #cell="{ record }">
                                    <a-tag :color="isStrategyStale(record) ? 'red' : 'green'">{{ isStrategyStale(record) ? '待应用' : '已应用' }}</a-tag>
                                </template>
                            </a-table-column>
                            <a-table-column title="操作" :width="220">
                                <template #cell="{ record, rowIndex }">
                                    <a-button size="mini" type="outline" @click="openStrategyForm(record, rowIndex)">编辑</a-button>
                                    <a-button class="ml-8" size="mini" status="danger" type="outline" @click="removeStrategy(rowIndex)">删除</a-button>
                                    <a-button class="ml-8" size="mini" type="primary" :disabled="!isStrategyStale(record)" @click="openApplyModal(record, rowIndex)">应用</a-button>
                                </template>
                            </a-table-column>
                        </template>
                    </a-table>
                </a-tab-pane>
            </a-tabs>
        </div>

        <form-drawer :show="form.show" :id="form.id" :config-list="rawList" @close="closeForm" />

        <a-modal v-model:visible="strategyForm.visible" :title="strategyForm.index > -1 ? '编辑部署策略' : '新增部署策略'" @ok="saveStrategy" width="920px" unmountOnClose>
            <a-form :model="strategyForm.form" auto-label-width>
                <a-form-item label="策略类型" required>
                    <a-radio-group v-model="strategyForm.form.type">
                        <a-radio value="env">环境变量类型</a-radio>
                        <a-radio value="file">配置文件类型</a-radio>
                    </a-radio-group>
                </a-form-item>
                <a-form-item label="部署目标" required>
                    <select-container @complete="onStrategyTargetChange" />
                </a-form-item>
                <a-form-item v-if="strategyForm.targetLabel" label="已选应用">
                    {{ strategyForm.targetLabel }}
                </a-form-item>
                <a-form-item v-if="strategyForm.form.type === 'file'" label="挂载路径" required>
                    <a-input v-model="strategyForm.form.mountPath" placeholder="例如 /app/config-center" style="width: 360px;" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal v-model:visible="applyModal.visible" title="应用部署策略" @ok="applyCurrentStrategy" width="720px" unmountOnClose>
            <a-form :model="applyModal.form" auto-label-width>
                <a-form-item label="部署应用">
                    {{ applyModal.targetLabel }}
                </a-form-item>
                <a-form-item label="配置版本">
                    <a-select v-model="applyModal.form.version" allow-clear placeholder="选择版本，留空表示仅公共配置" style="width: 320px;">
                        <a-option v-for="version in versionOptions" :key="version" :value="version" :label="version" />
                    </a-select>
                </a-form-item>
                <a-form-item label="自动部署">
                    <a-switch v-model="applyModal.form.autoDeploy" />
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import { useNamespaceStore } from '@/store';
import formDrawer from './form-drawer.vue';
import selectContainer from '@/components/select-container.vue';
import {
    applyDeploymentStrategy,
    buildConfigCenterMap,
    buildPreviewItems,
    createStrategyId,
    fillStrategyGeneratedNames,
    getConfigCenter,
    getAvailableVersions,
    isRecentUpdated,
    listConfigCenters,
    normalizeStrategy,
    resolveConfigVersionItems,
    runAutoDeployForConfigChain,
    touchDescendants,
    updateConfigCenter,
} from './shared';

export default {
    components: {
        formDrawer,
        selectContainer,
    },
    data() {
        return {
            namespaceActive: '',
            activeTab: 'data',
            selectedVersion: '__all__',
            rawList: [],
            config: {
                id: '',
                name: '',
                items: [],
                strategies: [],
            },
            resource: null,
            form: {
                show: false,
                id: '',
            },
            strategyForm: {
                visible: false,
                index: -1,
                form: {
                    id: '',
                    type: 'env',
                    targetGroup: '',
                    targetApp: '',
                    targetKind: '',
                    targetContainer: '',
                    mountPath: '',
                    autoDeploy: false,
                    lastSelectedVersion: '',
                    lastAppliedVersion: '',
                    lastAppliedAt: '',
                    generatedConfigMapName: '',
                },
                targetLabel: '',
            },
            applyModal: {
                visible: false,
                index: -1,
                strategyId: '',
                targetLabel: '',
                form: {
                    version: '',
                    autoDeploy: false,
                },
            },
        };
    },
    computed: {
        configMap() {
            return buildConfigCenterMap(this.rawList || []);
        },
        versionOptions() {
            return getAvailableVersions(this.config, this.configMap);
        },
        displayItems() {
            if (this.selectedVersion === '__all__') {
                return buildPreviewItems(this.config, this.configMap);
            }
            return this.resolveVersionItems(this.selectedVersion);
        },
        isUpdated() {
            return isRecentUpdated(this.config.updatedAt, this.config.createdAt);
        },
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    methods: {
        async init() {
            await this.refreshList();
            await this.loadDetail();
        },
        async refreshList() {
            this.rawList = await listConfigCenters(this.namespaceActive);
        },
        async loadDetail() {
            const { resource, config } = await getConfigCenter(this.namespaceActive, this.$route.params.id);
            this.resource = resource;
            this.config = fillStrategyGeneratedNames(config);
        },
        resolveVersionItems(version) {
            return resolveConfigVersionItems(this.config, this.configMap, version);
        },
        openForm(id) {
            this.form.id = id;
            this.form.show = true;
        },
        async closeForm(payload) {
            this.form.show = false;
            if (payload?.refresh) {
                await this.handleConfigSaved();
            }
        },
        async handleConfigSaved() {
            await this.refreshList();
            await this.loadDetail();
            const map = this.configMap;
            const updatedAt = new Date().toISOString();
            await touchDescendants(this.namespaceActive, this.config.id, map, updatedAt);
            await this.refreshList();
            await runAutoDeployForConfigChain(this.namespaceActive, this.config.id, this.configMap, updatedAt);
            await this.refreshList();
            await this.loadDetail();
        },
        openStrategyForm(record, index = -1) {
            const strategy = record ? normalizeStrategy(record) : normalizeStrategy({ id: createStrategyId(), type: 'env' });
            this.strategyForm = {
                visible: true,
                index,
                form: strategy,
                targetLabel: strategy.targetApp ? `${strategy.targetGroup} / ${strategy.targetApp} / ${strategy.targetContainer}` : '',
            };
        },
        onStrategyTargetChange(target) {
            this.strategyForm.form = {
                ...this.strategyForm.form,
                targetGroup: target.group || '',
                targetApp: target.app || '',
                targetKind: target.kind || '',
                targetContainer: target.container || '',
            };
            this.strategyForm.targetLabel = `${target.group} / ${target.app} / ${target.container}`;
        },
        async saveStrategy() {
            const current = this.strategyForm.form;
            if (!current.targetApp || !current.targetKind || !current.targetContainer) {
                this.$message.warning('请选择完整的部署目标');
                return;
            }
            if (current.type === 'file' && !current.mountPath) {
                this.$message.warning('请输入挂载路径');
                return;
            }
            const strategies = [...(this.config.strategies || [])];
            const payload = {
                ...current,
            };
            if (this.strategyForm.index > -1) {
                strategies.splice(this.strategyForm.index, 1, payload);
            } else {
                strategies.push(payload);
            }
            await this.persistStrategies(strategies, '部署策略已保存');
            this.strategyForm.visible = false;
        },
        async removeStrategy(index) {
            const strategies = [...(this.config.strategies || [])];
            strategies.splice(index, 1);
            await this.persistStrategies(strategies, '部署策略已删除');
        },
        async persistStrategies(strategies, message) {
            const next = fillStrategyGeneratedNames({
                ...this.config,
                strategies,
                updatedAt: new Date().toISOString(),
            });
            this.config = await updateConfigCenter(this.namespaceActive, next, this.resource);
            this.resource = (await getConfigCenter(this.namespaceActive, this.config.id)).resource;
            await this.refreshList();
            this.$message.success(message);
        },
        isStrategyStale(strategy) {
            return !strategy.lastAppliedAt || new Date(strategy.lastAppliedAt).getTime() < new Date(this.config.updatedAt).getTime();
        },
        openApplyModal(strategy, index) {
            this.applyModal = {
                visible: true,
                index,
                strategyId: strategy.id,
                targetLabel: `${strategy.targetGroup} / ${strategy.targetApp} / ${strategy.targetContainer}`,
                form: {
                    version: strategy.lastSelectedVersion || '',
                    autoDeploy: !!strategy.autoDeploy,
                },
            };
        },
        async applyCurrentStrategy() {
            const strategy = this.config.strategies[this.applyModal.index];
            if (!strategy) {
                return;
            }
            const version = this.applyModal.form.version || '';
            const nextStrategies = [...this.config.strategies];
            const nextStrategy = {
                ...strategy,
                autoDeploy: !!this.applyModal.form.autoDeploy,
                lastSelectedVersion: version,
            };
            await applyDeploymentStrategy(this.namespaceActive, this.config, this.configMap, nextStrategy, version);
            nextStrategy.lastAppliedVersion = version;
            nextStrategy.lastAppliedAt = new Date().toISOString();
            nextStrategies.splice(this.applyModal.index, 1, nextStrategy);
            await this.persistStrategies(nextStrategies, '部署策略已应用，目标 Pod 将重启');
            this.applyModal.visible = false;
        },
    },
};
</script>
