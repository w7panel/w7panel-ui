<template>
    <div class="padding-20 dns-page">
        <route-breadcrumb />
        <div class="toolbar">
            <a-button type="primary" @click="openZoneForm">
                <template #icon><icon-plus /></template>
                新增域名
            </a-button>
            <!-- <a-button @click="openServerDrawer">
                <template #icon><icon-settings /></template>
                DNS服务器
            </a-button>
            <a-button @click="getZones">
                <template #icon><icon-refresh /></template>
            </a-button> -->
        </div>

        <div class="bg-white padding-20 mt-20">
            <table class="com-table">
                <tbody>
                    <tr>
                        <td>域名</td>
                        <td>记录数</td>
                        <td>更新时间</td>
                        <td style="width:220px;">操作</td>
                    </tr>
                    <tr v-for="item in zones" :key="item.domain">
                        <td>
                            <span class="c-blue cursor" @click="toDetail(item.domain)">{{ item.domain }}</span>
                        </td>
                        <td>{{ item.recordNum || 0 }}</td>
                        <td>{{ formatTime(item.updateTime) }}</td>
                        <td>
                            <a-tooltip content="解析记录">
                                <i class="opt-icon" @click="toDetail(item.domain)"><icon-list /></i>
                            </a-tooltip>
                            <a-popconfirm content="确认要删除该域名及全部解析记录吗" @ok="deleteZone(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{ status: 'danger' }">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </td>
                    </tr>
                    <tr v-if="!zones.length">
                        <td colspan="4"><a-empty /></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <a-modal v-model:visible="zoneForm.show" title="新增域名" @ok="submitZone" @cancel="zoneForm.show=false">
            <a-form :model="zoneForm" auto-label-width>
                <a-form-item label="域名" required>
                    <a-input v-model="zoneForm.domain" placeholder="example.com" allow-clear />
                </a-form-item>
            </a-form>
        </a-modal>

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';

export default {
    data() {
        return {
            zones: [],
            zoneForm: {
                show: false,
                domain: '',
            },
        };
    },
    computed: {
    },
    created() {
        this.getZones();
    },
    methods: {
        formatTime(value) {
            if (!value) { return '-'; }
            return window.formatDate ? window.formatDate(value) : value;
        },
        openZoneForm() {
            this.zoneForm = { show: true, domain: '' };
        },
        getZones() {
            panelApi.get('/dns/zones', { loading: true }).then((res) => {
                this.zones = res?.data || [];
            });
        },
        submitZone() {
            const domain = (this.zoneForm.domain || '').trim();
            if (!domain) {
                this.$message.error('请输入域名');
                return false;
            }
            return panelApi.post('/dns/zones', { domain }, { loading: true }).then(() => {
                this.$message.success('操作成功');
                this.zoneForm.show = false;
                this.getZones();
            });
        },
        deleteZone(row) {
            panelApi.delete('/dns/zones/' + encodeURIComponent(row.domain), { loading: true }).then(() => {
                this.$message.success('删除成功');
                this.getZones();
            });
        },
        toDetail(domain) {
            this.$router.push({ name: 'dns-records', params: { domain } });
        },
    },
};
</script>

<style scoped>
.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
}

.server-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.server-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
}

.server-info {
    display: grid;
    gap: 12px;
    padding: 16px;
    background: var(--color-neutral-1);
}

.server-info > div {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 12px;
}

.label {
    color: var(--color-text-3);
}
</style>
