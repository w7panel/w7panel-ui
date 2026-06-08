<template>
    <div class="padding-20 dns-page">
        <Breadcrumb :routes="topbc" />
        <div class="title-row">
            
            <a-button type="primary" :disabled="form.show" @click="openRecordForm()">
                <template #icon><icon-plus /></template>
                添加记录
            </a-button>
        </div>

        <div class="bg-white padding-20 mt-20">
            <table class="com-table dns-record-table">
                <tbody>
                    <tr>
                        <td>主机记录</td>
                        <td>类型</td>
                        <td>记录值</td>
                        <td>TTL</td>
                        <td>MX优先级</td>
                        <td style="width:180px;">操作</td>
                    </tr>
                    <template v-if="isAdding">
                        <tr class="record-edit-row">
                            <td>
                                <div>
                                    <div v-if="form.type=='A'" class="mb-10">{{fullDomain(form.name)||'{域名}'}} 指向 {{ form.value?form.value:'{IPv4地址}'}}</div>
                                    <div v-if="form.type=='AAAA'" class="mb-10">{{fullDomain(form.name)||'{域名}'}} 指向 {{ form.value?form.value:'{IPv6地址}'}}</div>
                                    <div v-if="form.type=='CNAME'" class="mb-10">{{fullDomain(form.name)||'{域名}'}} 是 {{ form.value?form.value:'{域名}'}} 的别名</div>
                                    <div v-if="form.type=='TXT'" class="mb-10">{{fullDomain(form.name)||'{域名}'}} 具有 {{ form.value?form.value:'{文本内容}'}}</div>
                                    <div v-if="form.type=='MX'" class="mb-10">{{ form.value?form.value:'{邮件服务器}'}} 为 {{fullDomain(form.name)||'{域名}'}} 处理邮件</div>
                                    <div v-if="form.type=='NS'" class="mb-10">{{fullDomain(form.name)||'{域名}'}} 将由 {{ form.value?form.value:'{DNS服务器}'}} 提供解析服务</div>
                                </div>
                                <a-input v-model="form.name" placeholder="@ 或 www" allow-clear @mouseover="setHelpFocus('name')" />
                            </td>
                            <td>
                                <a-select v-model="form.type" @change="handleTypeChange" @mouseover="setHelpFocus('type')">
                                    <a-option label="A" value="A"></a-option>
                                    <a-option label="AAAA" value="AAAA"></a-option>
                                    <a-option label="CNAME" value="CNAME"></a-option>
                                    <a-option label="TXT" value="TXT"></a-option>
                                    <a-option label="MX" value="MX"></a-option>
                                    <a-option label="NS" value="NS"></a-option>
                                </a-select>
                            </td>
                            <td><a-input v-model="form.value" :placeholder="valuePlaceholder" allow-clear @mouseover="setHelpFocus('value')" /></td>
                            <td><a-input-number v-model="form.ttl" :min="1" :max="86400" @mouseover="setHelpFocus('ttl')" /></td>
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
                        <tr>
                            <td colspan="6" style="background:var(--color-neutral-2);">
                                <resolution-help :focus="helpFocus" :domain="domain" :type="form.type" @setValue="setFormValue"></resolution-help>
                            </td>
                        </tr>
                    </template>
                    <template v-for="item in records" :key="item.id">
                        <tr v-if="isEditing(item)" class="record-edit-row">
                            <td>
                                <a-input v-model="form.name" placeholder="@ 或 www" allow-clear @mouseover="setHelpFocus('name')" />
                            </td>
                            <td>
                                <a-select v-model="form.type" @change="handleTypeChange" @mouseover="setHelpFocus('type')">
                                    <a-option label="A" value="A"></a-option>
                                    <a-option label="AAAA" value="AAAA"></a-option>
                                    <a-option label="CNAME" value="CNAME"></a-option>
                                    <a-option label="TXT" value="TXT"></a-option>
                                    <a-option label="MX" value="MX"></a-option>
                                    <a-option label="NS" value="NS"></a-option>
                                </a-select>
                            </td>
                            <td><a-input v-model="form.value" :placeholder="valuePlaceholder" allow-clear @mouseover="setHelpFocus('value')" /></td>
                            <td><a-input-number v-model="form.ttl" :min="1" :max="86400" @mouseover="setHelpFocus('ttl')" /></td>
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
                        <tr v-else>
                            <td>
                                <div>{{ item.name || '@' }}</div>
                            </td>
                            <td>{{ item.type }}</td>
                            <td>{{ item.value }}</td>
                            <td>{{ item.ttl }}</td>
                            <td>{{ item.type === 'MX' ? item.mxPriority : '-' }}</td>
                            <td>
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
                    </template>
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
import ResolutionHelp from './resolution-help.vue';

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
    components: {
        ResolutionHelp,
    },
    data() {
        return {
            records: [],
            form: defaultForm(),
            helpFocus: 'name',
            topbc: [
                {name:'root'},
                {name: "cluster", label: "集群管理"},
                {name: "cluster-dns", label: "私有DNS解析"},
                {name: "dns-records", label: this.$route.params.domain},
            ],
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
                NS: 'f1g1ns1.dnspod.net',
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
            if(!name){return ''}
            if(name=='@'){return this.domain;}
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
                this.helpFocus = 'name';
                return;
            }
            this.form = { ...defaultForm(), show: true };
            this.helpFocus = 'name';
        },
        cancelRecordForm() {
            this.form = defaultForm();
            this.helpFocus = 'name';
        },
        isEditing(row) {
            return this.form.show && this.form.id && this.form.id === row.id;
        },
        setHelpFocus(focus) {
            this.helpFocus = focus || 'name';
        },
        handleTypeChange() {
            this.setHelpFocus('type');
            if (this.form.type !== 'MX') {
                this.form.mxPriority = 10;
            }
        },
        setFormValue(field, value) {
            if (!field || !this.form.show) { return; }
            this.form[field] = value;
            this.setHelpFocus(field);
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
.com-table.dns-record-table td {
    vertical-align: bottom;
}

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

.sub-title{
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
