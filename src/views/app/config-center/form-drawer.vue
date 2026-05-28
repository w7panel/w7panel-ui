<template>
    <a-drawer :width="1200" :visible="visible" @cancel="closeDrawer()" @ok="submit" unmountOnClose>
        <template #title>{{ id ? '编辑配置' : '创建配置' }}</template>
        <a-form ref="formRef" :model="form" :rules="rules" auto-label-width class="padding-10">
            <a-form-item label="名称" field="name">
                <a-input v-model="form.name" size="large" placeholder="请输入配置名称" style="width: 460px;" />
            </a-form-item>

            <a-form-item label="版本池">
                <div style="width: 100%;">
                    <a-input-tag v-model="form.versions" placeholder="输入版本后回车，可留空表示公共配置" style="width: 460px;" />
                    <div class="fs-12 c-99 mt-8">版本池用于给下方配置项选择版本，配置项版本为空时会作为公共配置。</div>
                </div>
            </a-form-item>

            <a-form-item label="继承配置">
                <a-select
                    v-model="inheritValue"
                    allow-search
                    allow-clear
                    placeholder="搜索并选择已有配置 + version"
                    style="width: 460px;"
                    @change="onInheritChange"
                >
                    <a-option v-for="item in inheritOptions" :key="item.value" :value="item.value" :label="item.label" />
                </a-select>
            </a-form-item>

            <a-form-item label="文本快速配置">
                <div style="width: 100%;">
                    <div class="df ai-c">
                        <a-select v-model="quickVersion" allow-clear allow-search placeholder="导入到指定版本，可留空" style="width: 220px;">
                            <a-option v-for="version in form.versions" :key="version" :value="version" :label="version" />
                        </a-select>
                        <a-button class="ml-10" type="primary" @click="applyQuickInput">导入到表格</a-button>
                    </div>
                    <a-textarea
                        v-model="quickInput"
                        class="mt-10"
                        placeholder="支持多行 key=value，自动导入到配置表格"
                        :auto-size="{ minRows: 5, maxRows: 8 }"
                    />
                </div>
            </a-form-item>

            <a-form-item label="配置项" required>
                <div style="width: 100%;">
                    <table class="com-table">
                        <tbody>
                            <tr>
                                <td style="width: 180px;">version</td>
                                <td style="width: 220px;">name</td>
                                <td>value</td>
                                <td style="width: 220px;">remark</td>
                                <td style="width: 100px;">操作</td>
                            </tr>
                            <tr>
                                <td colspan="5" class="cursor" style="background: var(--color-neutral-1);" @click="addRow()">
                                    <div class="df ai-c jc-c">
                                        <icon-plus :size="14" class="c-99" />
                                        <span class="c-99 ml-6">添加配置项</span>
                                    </div>
                                </td>
                            </tr>
                            <tr v-for="(item, index) in form.items" :key="index">
                                <td style="vertical-align: top;">
                                    <a-select v-model="item.version" allow-clear allow-search allow-create placeholder="公共配置" style="width: 160px;" @change="syncVersionsFromRows">
                                        <a-option v-for="version in form.versions" :key="version" :value="version" :label="version" />
                                    </a-select>
                                </td>
                                <td style="vertical-align: top;">
                                    <a-input v-model="item.name" placeholder="必填" @paste="quickPaste($event, index)" />
                                </td>
                                <td>
                                    <a-textarea v-model="item.value" placeholder="可为空" :auto-size="{ minRows: 1, maxRows: 4 }" />
                                </td>
                                <td style="vertical-align: top;">
                                    <a-input v-model="item.remark" placeholder="可为空" />
                                </td>
                                <td style="vertical-align: top;">
                                    <span class="c-blue cursor" @click="removeRow(index)">删除</span>
                                </td>
                            </tr>
                            <tr v-if="!form.items.length">
                                <td colspan="5"><a-empty /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </a-form-item>

            <a-form-item v-if="previewItems.length" label="生效预览">
                <div style="width: 100%;">
                    <a-table :data="previewItems" :pagination="false" size="small">
                        <template #columns>
                            <a-table-column title="来源" :width="150">
                                <template #cell="{ record }">
                                    <a-tag :color="record.source === 'inherit' ? 'arcoblue' : 'green'">
                                        {{ record.source === 'inherit' ? `继承自 ${record.sourceConfigName}` : '当前配置' }}
                                    </a-tag>
                                </template>
                            </a-table-column>
                            <a-table-column title="version" data-index="version" :width="120">
                                <template #cell="{ record }">
                                    {{ record.version || '公共' }}
                                </template>
                            </a-table-column>
                            <a-table-column title="name" data-index="name" />
                            <a-table-column title="value" data-index="value" />
                            <a-table-column title="remark" data-index="remark" />
                        </template>
                    </a-table>
                </div>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script>
import { useNamespaceStore } from '@/store';
import {
    buildConfigCenterMap,
    buildPreviewItems,
    createConfigCenter,
    getAvailableVersions,
    getConfigCenter,
    normalizeConfigCenter,
    updateConfigCenter,
    validateNoCircularInherit,
} from './shared';

export default {
    props: ['show', 'id', 'configList'],
    data() {
        return {
            visible: false,
            namespaceActive: '',
            existingResource: null,
            quickInput: '',
            quickVersion: '',
            inheritValue: '',
            form: {
                id: '',
                name: '',
                versions: [],
                inherit: null,
                items: [],
                strategies: [],
                createdAt: '',
                updatedAt: '',
            },
            rules: {
                name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            },
        };
    },
    computed: {
        configMap() {
            return buildConfigCenterMap(this.configList || []);
        },
        inheritOptions() {
            const options = [];
            (this.configList || []).forEach(config => {
                if (config.id === this.id) {
                    return;
                }
                const versions = getAvailableVersions(config, this.configMap);
                options.push({
                    value: JSON.stringify({ configId: config.id, configName: config.name, version: '' }),
                    label: `${config.name} / 公共配置`,
                });
                versions.forEach(version => {
                    options.push({
                        value: JSON.stringify({ configId: config.id, configName: config.name, version }),
                        label: `${config.name} / ${version}`,
                    });
                });
            });
            return options;
        },
        previewItems() {
            return buildPreviewItems({
                ...this.form,
                items: this.form.items,
                name: this.form.name,
            }, this.configMap);
        },
    },
    watch: {
        show(value) {
            this.visible = value;
            if (value) {
                this.init();
            }
        },
        id() {
            if (this.visible) {
                this.init();
            }
        },
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
    },
    methods: {
        async init() {
            this.quickInput = '';
            this.quickVersion = '';
            this.existingResource = null;
            if (!this.id) {
                this.form = {
                    id: '',
                    name: '',
                    versions: [],
                    inherit: null,
                    items: [],
                    strategies: [],
                    createdAt: '',
                    updatedAt: '',
                };
                this.inheritValue = '';
                return;
            }
            const { resource, config } = await getConfigCenter(this.namespaceActive, this.id);
            this.existingResource = resource;
            this.form = {
                ...normalizeConfigCenter(config),
                versions: getAvailableVersions(config, this.configMap),
            };
            this.inheritValue = this.form.inherit ? JSON.stringify(this.form.inherit) : '';
        },
        closeDrawer(payload) {
            this.visible = false;
            this.$emit('close', payload || false);
        },
        addRow() {
            this.form.items.push({
                version: '',
                name: '',
                value: '',
                remark: '',
            });
        },
        removeRow(index) {
            this.form.items.splice(index, 1);
        },
        parseQuickText(text, version) {
            return String(text || '')
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const index = line.indexOf('=');
                    if (index < 0) {
                        return {
                            version: version || '',
                            name: line,
                            value: '',
                            remark: '',
                        };
                    }
                    return {
                        version: version || '',
                        name: line.slice(0, index).trim(),
                        value: line.slice(index + 1),
                        remark: '',
                    };
                })
                .filter(item => item.name);
        },
        applyQuickInput() {
            const rows = this.parseQuickText(this.quickInput, this.quickVersion);
            if (!rows.length) {
                this.$message.warning('未识别到有效配置项');
                return;
            }
            this.form.items.push(...rows);
            this.syncVersionsFromRows();
            this.quickInput = '';
            this.$message.success(`已导入 ${rows.length} 条配置项`);
        },
        quickPaste(event, index) {
            const current = this.form.items[index];
            const text = event.clipboardData?.getData('text') || '';
            if (current?.name || !text.includes('=')) {
                return;
            }
            const rows = this.parseQuickText(text, current?.version || '');
            if (!rows.length) {
                return;
            }
            event.preventDefault();
            this.form.items.splice(index, 1, ...rows);
            this.syncVersionsFromRows();
        },
        syncVersionsFromRows() {
            const versions = new Set(this.form.versions || []);
            this.form.items.forEach(item => {
                if (item.version) {
                    versions.add(item.version);
                }
            });
            this.form.versions = Array.from(versions);
        },
        onInheritChange(value) {
            this.inheritValue = value || '';
            this.form.inherit = value ? JSON.parse(value) : null;
        },
        async submit() {
            this.$refs.formRef.validate(async (errors) => {
                if (errors) {
                    return;
                }
                const items = (this.form.items || [])
                    .map(item => ({
                        version: item.version || '',
                        name: String(item.name || '').trim(),
                        value: item.value ?? '',
                        remark: item.remark ?? '',
                    }))
                    .filter(item => item.name);

                if (!items.length) {
                    this.$message.warning('请至少添加一条配置项');
                    return;
                }

                const payload = {
                    ...this.form,
                    items,
                    versions: undefined,
                    inherit: this.form.inherit,
                    updatedAt: new Date().toISOString(),
                    createdAt: this.form.createdAt || new Date().toISOString(),
                };
                const tempMap = {
                    ...this.configMap,
                    [payload.id || '__draft__']: payload,
                };
                if (!validateNoCircularInherit({
                    ...payload,
                    id: payload.id || '__draft__',
                }, tempMap)) {
                    this.$message.error('继承链存在循环，请重新选择继承配置');
                    return;
                }

                if (this.id) {
                    const saved = await updateConfigCenter(this.namespaceActive, payload, this.existingResource);
                    this.$message.success('修改成功');
                    this.closeDrawer({ refresh: true, id: saved.id });
                } else {
                    const saved = await createConfigCenter(this.namespaceActive, payload);
                    this.$message.success('创建成功');
                    this.closeDrawer({ refresh: true, id: saved.id });
                }
            });
        },
    },
};
</script>
