<template>
    <div class="padding-20 dns-page">
        <route-breadcrumb />
        <div class="title-row">
            <div class="title-content">
                <div class="dns-domain-title">{{ domain }}</div>
                <div class="sub-title">解析记录</div>
            </div>
            <div class="toolbar">
                <a-button @click="$router.push({ name: 'dns-zones' })">
                    <template #icon><icon-left /></template>
                    返回
                </a-button>
                <a-button type="primary" :disabled="form.show" @click="openRecordForm()">
                    <template #icon><icon-plus /></template>
                    添加记录
                </a-button>
                <a-button @click="getRecords">
                    <template #icon><icon-refresh /></template>
                </a-button>
            </div>
        </div>

        <div class="bg-white padding-20 mt-20">
            <table class="com-table">
                <tbody>
                    <tr>
                        <td>主机记录</td>
                        <td>类型</td>
                        <td>记录值</td>
                        <td>TTL</td>
                        <td>MX优先级</td>
                        <td style="width:180px;">操作</td>
                    </tr>
                    <tr v-if="isAdding" class="record-edit-row">
                        <td>
                            <a-input v-model="form.name" placeholder="@ 或 www" allow-clear />
                            <div class="full-domain">{{ fullDomain(form.name) }}</div>
                        </td>
                        <td>
                            <a-select v-model="form.type" @change="handleTypeChange">
                                <a-option label="A" value="A"></a-option>
                                <a-option label="AAAA" value="AAAA"></a-option>
                                <a-option label="CNAME" value="CNAME"></a-option>
                                <a-option label="TXT" value="TXT"></a-option>
                                <a-option label="MX" value="MX"></a-option>
                            </a-select>
                        </td>
                        <td><a-input v-model="form.value" :placeholder="valuePlaceholder" allow-clear /></td>
                        <td><a-input-number v-model="form.ttl" :min="1" :max="86400" /></td>
                        <td>
                            <a-input-number v-if="form.type === 'MX'" v-model="form.mxPriority" :min="1" :max="65535" />
                            <span v-else>-</span>
                        </td>
                        <td>
                            <a-tooltip content="保存">
                                <i class="opt-icon c-green" @click="submitRecord"><icon-check /></i>
                            </a-tooltip>
                            <a-tooltip content="取消">
                                <i class="opt-icon c-99" @click="cancelRecordForm"><icon-close /></i>
                            </a-tooltip>
                        </td>
                    </tr>
                    <tr v-for="item in records" :key="item.id" :class="{ 'record-edit-row': isEditing(item) }">
                        <td v-if="isEditing(item)">
                            <a-input v-model="form.name" placeholder="@ 或 www" allow-clear />
                            <div class="full-domain">{{ fullDomain(form.name) }}</div>
                        </td>
                        <td v-else>
                            <div>{{ item.name || '@' }}</div>
                            <div class="full-domain">{{ fullDomain(item.name) }}</div>
                        </td>
                        <td v-if="isEditing(item)">
                            <a-select v-model="form.type" @change="handleTypeChange">
                                <a-option label="A" value="A"></a-option>
                                <a-option label="AAAA" value="AAAA"></a-option>
                                <a-option label="CNAME" value="CNAME"></a-option>
                                <a-option label="TXT" value="TXT"></a-option>
                                <a-option label="MX" value="MX"></a-option>
                            </a-select>
                        </td>
                        <td v-else>{{ item.type }}</td>
                        <td v-if="isEditing(item)"><a-input v-model="form.value" :placeholder="valuePlaceholder" allow-clear /></td>
                        <td v-else>{{ item.value }}</td>
                        <td v-if="isEditing(item)"><a-input-number v-model="form.ttl" :min="1" :max="86400" /></td>
                        <td v-else>{{ item.ttl }}</td>
                        <td v-if="isEditing(item)">
                            <a-input-number v-if="form.type === 'MX'" v-model="form.mxPriority" :min="1" :max="65535" />
                            <span v-else>-</span>
                        </td>
                        <td v-else>{{ item.type === 'MX' ? item.mxPriority : '-' }}</td>
                        <td v-if="isEditing(item)">
                            <a-tooltip content="保存">
                                <i class="opt-icon c-green" @click="submitRecord"><icon-check /></i>
                            </a-tooltip>
                            <a-tooltip content="取消">
                                <i class="opt-icon c-99" @click="cancelRecordForm"><icon-close /></i>
                            </a-tooltip>
                        </td>
                        <td v-else>
                            <a-tooltip content="编辑">
                                <i class="opt-icon" :class="{ disabled: form.show }" @click="openRecordForm(item)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm content="确认要删除该记录吗" @ok="deleteRecord(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{ status: 'danger' }" :disabled="form.show">
                                <a-tooltip content="删除">
                                    <i class="opt-icon" :class="{ disabled: form.show }"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </td>
                    </tr>
                    <tr v-if="!records.length && !isAdding">
                        <td colspan="6"><a-empty /></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';

const defaultForm = () => ({
    show: false,
    id: '',
    name: '@',
    type: 'A',
    value: '',
    ttl: 60,
    mxPriority: 10,
});

export default {
    data() {
        return {
            records: [],
            form: defaultForm(),
        };
    },
    computed: {
        domain() {
            return this.$route.params.domain;
        },
        valuePlaceholder() {
            const placeholders = {
                A: '1.1.1.1',
                AAAA: '2001:db8::1',
                CNAME: 'target.example.com',
                TXT: '文本内容',
                MX: 'mail.example.com',
            };
            return placeholders[this.form.type] || '';
        },
        isAdding() {
            return this.form.show && !this.form.id;
        },
    },
    created() {
        this.getRecords();
    },
    methods: {
        fullDomain(name) {
            if (!name || name === '@') { return this.domain; }
            return `${name}.${this.domain}`;
        },
        getRecords() {
            panelApi.get('/dns/zones/' + encodeURIComponent(this.domain) + '/records', { loading: true }).then((res) => {
                this.records = res?.data || [];
            });
        },
        openRecordForm(row) {
            if (this.form.show) { return; }
            if (row) {
                this.form = {
                    show: true,
                    id: row.id,
                    name: row.name || '@',
                    type: row.type || 'A',
                    value: row.value || '',
                    ttl: row.ttl || 60,
                    mxPriority: row.mxPriority || 10,
                };
                return;
            }
            this.form = { ...defaultForm(), show: true };
        },
        cancelRecordForm() {
            this.form = defaultForm();
        },
        isEditing(row) {
            return this.form.show && this.form.id && this.form.id === row.id;
        },
        handleTypeChange() {
            if (this.form.type !== 'MX') {
                this.form.mxPriority = 10;
            }
        },
        validateForm() {
            if (!this.form.name) {
                this.$message.error('请输入主机记录');
                return false;
            }
            if (!this.form.value) {
                this.$message.error('请输入记录值');
                return false;
            }
            return true;
        },
        recordPayload() {
            return {
                name: this.form.name,
                type: this.form.type,
                value: this.form.value,
                ttl: Number(this.form.ttl) || 60,
                mxPriority: Number(this.form.mxPriority) || 10,
            };
        },
        submitRecord() {
            if (!this.validateForm()) { return false; }
            const base = '/dns/zones/' + encodeURIComponent(this.domain) + '/records';
            const request = this.form.id
                ? panelApi.put(base + '/' + encodeURIComponent(this.form.id), this.recordPayload(), { loading: true })
                : panelApi.post(base, this.recordPayload(), { loading: true });
            return request.then(() => {
                this.$message.success('操作成功');
                this.form = defaultForm();
                this.getRecords();
            });
        },
        deleteRecord(row) {
            panelApi.delete('/dns/zones/' + encodeURIComponent(this.domain) + '/records/' + encodeURIComponent(row.id), { loading: true }).then(() => {
                this.$message.success('删除成功');
                this.getRecords();
            });
        },
    },
};
</script>

<style scoped>
.title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.title-content {
    min-width: 0;
}

.toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.dns-domain-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
    overflow-wrap: anywhere;
}

.sub-title,
.full-domain {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 18px;
}

.record-edit-row :deep(.arco-input-wrapper),
.record-edit-row :deep(.arco-select),
.record-edit-row :deep(.arco-input-number) {
    width: 100%;
}

.opt-icon.disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

@media (max-width: 720px) {
    .title-row {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
