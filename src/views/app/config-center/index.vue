<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="openForm()">
                <template #icon><icon-plus /></template>新建配置
            </a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <a-table :data="list" :pagination="false">
                <template #columns>
                    <a-table-column title="名称">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <span class="c-blue cursor" @click="$router.push({ name: 'app-config-center-detail', params: { id: record.id } })">
                                    {{ record.name }}
                                </span>
                                <icon-sync v-if="record.isRecentUpdated" class="ml-8" style="color: rgb(var(--danger-6));" />
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="版本数" :width="120">
                        <template #cell="{ record }">{{ record.versionCount }}</template>
                    </a-table-column>
                    <a-table-column title="配置项" :width="120">
                        <template #cell="{ record }">{{ record.itemCount }}</template>
                    </a-table-column>
                    <a-table-column title="继承配置" :width="220">
                        <template #cell="{ record }">
                            {{ record.inheritLabel || '-' }}
                        </template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="createdAtFormat" :width="180" />
                    <a-table-column title="更新时间" :width="220">
                        <template #cell="{ record }">
                            <span :style="{ color: record.isRecentUpdated ? 'rgb(var(--danger-6))' : '' }">{{ record.updatedAtFormat }}</span>
                            <a-tag v-if="record.isRecentUpdated" class="ml-8" color="red">更新</a-tag>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="160">
                        <template #cell="{ record }">
                            <a-tooltip content="编辑">
                                <i class="opt-icon" @click="openForm(record.id)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm content="确定删除该配置吗？" position="lt" type="warning" :ok-button-props="{ status: 'danger' }" @ok="removeItem(record)">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <form-drawer :show="form.show" :id="form.id" :config-list="rawList" @close="closeForm" />
    </div>
</template>

<script>
import { useNamespaceStore } from '@/store';
import dayjs from 'dayjs';
import formDrawer from './form-drawer.vue';
import { buildConfigCenterMap, deleteConfigCenter, getAvailableVersions, isRecentUpdated, listConfigCenters, runAutoDeployForConfigChain, touchDescendants } from './shared';

export default {
    components: {
        formDrawer,
    },
    data() {
        return {
            namespaceActive: '',
            rawList: [],
            list: [],
            form: {
                show: false,
                id: '',
            },
        };
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    methods: {
        async getList() {
            const configs = await listConfigCenters(this.namespaceActive);
            const configMap = buildConfigCenterMap(configs);
            this.rawList = configs;
            this.list = configs
                .map(item => {
                    const versions = getAvailableVersions(item, configMap);
                    return {
                        ...item,
                        versionCount: versions.length,
                        itemCount: item.items?.length || 0,
                        inheritLabel: item.inherit?.configName ? `${item.inherit.configName} / ${item.inherit.version || '公共配置'}` : '',
                        createdAtFormat: window.formatDate(item.createdAt),
                        updatedAtFormat: window.formatDate(item.updatedAt),
                        isRecentUpdated: isRecentUpdated(item.updatedAt, item.createdAt),
                        updatedAtTimestamp: dayjs(item.updatedAt).valueOf(),
                    };
                })
                .sort((a, b) => b.updatedAtTimestamp - a.updatedAtTimestamp);
        },
        openForm(id = '') {
            this.form.id = id;
            this.form.show = true;
        },
        async closeForm(payload) {
            this.form.show = false;
            if (payload?.refresh) {
                await this.getList();
                const updatedAt = new Date().toISOString();
                const refreshed = await listConfigCenters(this.namespaceActive);
                const configMap = refreshed.reduce((result, item) => {
                    result[item.id] = item;
                    return result;
                }, {});
                await touchDescendants(this.namespaceActive, payload.id, configMap, updatedAt);
                const latest = await listConfigCenters(this.namespaceActive);
                const latestMap = latest.reduce((result, item) => {
                    result[item.id] = item;
                    return result;
                }, {});
                await runAutoDeployForConfigChain(this.namespaceActive, payload.id, latestMap, updatedAt);
                await this.getList();
            }
        },
        async removeItem(record) {
            await deleteConfigCenter(this.namespaceActive, record.id);
            this.$message.success('删除成功');
            this.getList();
        },
    },
};
</script>
