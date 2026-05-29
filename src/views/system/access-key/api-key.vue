<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />

        <div class="mb-20">
            <a-button type="primary" @click="openCreate()"><template #icon><icon-plus /></template>新增</a-button>
        </div>
        <div class="bg-white padding-20 fc">
            <a-alert type="warning" class="mb-20">
                <template #title>安全提示：</template>
                <ul style="padding-inline-start: 18px; margin: 0;">
                    <li>您的 API 密钥代表您的账号身份和所拥有的权限，使用面板 API 可以操作您名下的所有面板云资源。</li>
                    <li>为了您的财产和服务安全，请妥善保存和定期更换密钥，请勿通过任何方式（如 GitHub）上传或者分享您的密钥信息。</li>
                    <li>使用低版本 TLS（安全传输层协议）调用 API 有安全风险，建议使用 TLS1.2 及以上版本。</li>
                </ul>
            </a-alert>
            <a-alert type="info" class="mb-20">
                <template #title>使用提示：</template>
                <ul style="padding-inline-start: 18px; margin: 0;">
                    <li>API密钥是构建面板 API 请求的重要凭证。用于您<a class="cursor c-blue" target="_blank" href="https://github.com/w7panel/w7panel/blob/dev-v1/docs/hawk/calling.md">调用API</a>时生成签名，查看<a class="cursor c-blue" target="_blank" href="https://github.com/w7panel/w7panel/blob/dev-v1/docs/hawk/signature.md">生成签名算法</a></li>
                    <li>最近访问时间指最近一次使用密钥调用 API 接口的时间。此时间仅供判断密钥近期是否活跃，以此决定是否要禁用或删除密钥。</li>
                </ul>
            </a-alert>
            <a-table class="cptable" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="clientName">
                        <template #cell="{ record }">{{ record.clientName }}</template>
                    </a-table-column>
                    <a-table-column title="clientId">
                        <template #cell="{ record }">{{ record.clientId }}</template>
                    </a-table-column>
                    <a-table-column title="clientSecret" width="360">
                        <template #cell="{ record }">
                            <span v-if="record._showSecret">{{ record.clientSecret }}</span>
                            <span v-else>{{ record.clientSecret ? '••••••••' : '-' }}</span>
                            <icon-eye v-if="record.clientSecret" class="ml-6 cursor c-99" @click="record._showSecret = !record._showSecret" />
                        </template>
                    </a-table-column>
                    <a-table-column title="状态" :width="100">
                        <template #cell="{ record }">
                            <a-switch :model-value="record.enabled !== false" @change="(val) => toggleEnabled(record, val)" />
                        </template>
                    </a-table-column>
                    <a-table-column title="创建时间">
                        <template #cell="{ record }">{{ record.createTime }}</template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-tooltip content="yaml">
                                <i class="opt-icon" @click="openYaml(record._name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="编辑">
                                <i class="opt-icon" @click="openEdit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm content="确定要删除吗？" @ok="handleDelete(record)" class="popconfirm-delete" type="warning" :ok-button-props="{ status: 'danger' }">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>

        <a-drawer v-model:visible="form.visible" title="API Client" :width="800" :footer="true" @ok="handleSubmit" @cancel="form.visible = false" :ok-loading="form.submitting" unmount-on-close>
            <a-form :model="form.data" ref="formRef" auto-label-width>
                <a-form-item label="clientName" field="clientName" :rules="[{ required: true, message: '请输入 clientName' }]">
                    <a-input v-model="form.data.clientName" placeholder="请输入 clientName" />
                </a-form-item>
                <a-form-item label="clientId" field="clientId" :rules="[{ required: true, message: '请输入 clientId' }]">
                    <a-input v-model="form.data.clientId" :disabled="form.isEdit" placeholder="请输入 clientId" />
                </a-form-item>
                <a-form-item label="clientSecret" field="clientSecret" :rules="[{ required: true, message: '请输入 clientSecret' }]">
                    <a-input v-model="form.data.clientSecret" readonly placeholder="请输入 clientSecret" style="flex:1;" />
                    <a-button type="primary" @click="form.data.clientSecret = generateSecret()">{{ form.isEdit ? '重新生成' : '生成' }}</a-button>
                </a-form-item>
            </a-form>
        </a-drawer>

        <yaml-drawer :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false"></yaml-drawer>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import dayjs from 'dayjs';
import yamlDrawer from '@/components/yaml-drawer.vue';

const GROUP = 'w7panel.w7.com';
const VERSION = 'v1alpha1';
const RESOURCE = 'apiclients';
const KIND = 'ApiClient';

function randomId() {
    return Math.random().toString(36).substring(2, 10);
}

function randomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function buildSpec(data) {
    return {
        clientName: data.clientName,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
    };
}

export default {
    components: { yamlDrawer },
    data() {
        return {
            namespaceActive: 'default',
            list: [],
            yamlData: {
                show: false,
                data: {},
                title: '',
                submit: () => {},
            },
            form: {
                visible: false,
                isEdit: false,
                editName: '',
                submitting: false,
                data: this.getDefaultFormData(),
            },
        };
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    methods: {
        getList() {
            k8sproxy.get(`/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}`).then(res => {
                let list = res.data?.items || [];
                this.list = list.map(i => ({
                    _name: i.metadata?.name,
                    _showSecret: false,
                    createTime: dayjs(i.metadata?.creationTimestamp).format('YYYY-MM-DD HH:mm:ss'),
                    ...i.spec,
                }));
            });
        },
        generateSecret() {
            return randomSecret();
        },
        getDefaultFormData() {
            return {
                clientName: '',
                clientId: randomId(),
                clientSecret: randomSecret(),
            };
        },
        openCreate() {
            this.form.data = this.getDefaultFormData();
            this.form.isEdit = false;
            this.form.editName = '';
            this.form.visible = true;
        },
        openEdit(record) {
            this.form.data = {
                clientName: record.clientName || '',
                clientId: record.clientId || '',
                clientSecret: record.clientSecret || '',
            };
            this.form.isEdit = true;
            this.form.editName = record._name;
            this.form.visible = true;
        },
        handleSubmit() {
            this.$refs.formRef?.validate?.().then(errors => {
                if (errors) return;
                this.form.submitting = true;
                const spec = buildSpec(this.form.data);
                const apiBase = `/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}`;
                const request = this.form.isEdit
                    ? k8sproxy.get(`${apiBase}/${this.form.editName}`).then(res => {
                        const crd = res.data;
                        crd.spec = spec;
                        return k8sproxy.put(`${apiBase}/${this.form.editName}`, crd);
                    })
                    : k8sproxy.post(apiBase, {
                        apiVersion: `${GROUP}/${VERSION}`,
                        kind: KIND,
                        metadata: {
                            name: this.form.data.clientId || randomId(),
                            namespace: this.namespaceActive,
                        },
                        spec,
                    });
                request
                    .then(() => {
                        this.$message.success(this.form.isEdit ? '编辑成功' : '创建成功');
                        this.form.visible = false;
                        this.getList();
                    })
                    .catch(() => {})
                    .finally(() => { this.form.submitting = false; });
            });
        },
        handleDelete(record) {
            k8sproxy
                .delete(`/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}/${record._name}`)
                .then(() => {
                    this.$message.success('删除成功');
                    this.getList();
                })
                .catch(() => {});
        },
        toggleEnabled(record, val) {
            k8sproxy.patch(`/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}/${record._name}`, {
                spec: { enabled: val },
            }, {
                headers: { 'Content-Type': 'application/merge-patch+json' },
            }).then(() => {
                this.$message.success('操作成功');
                this.getList();
            }).catch(() => {});
        },
        openYaml(name) {
            k8sproxy.get(`/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}/${name}`, { loading: true }).then(res => {
                if (!res?.data) return;
                this.yamlData = {
                    show: true,
                    data: res.data,
                    title: res.data?.metadata?.name || name,
                    submit: (data) => {
                        try {
                            data.metadata.resourceVersion = res.data.metadata.resourceVersion;
                        } catch {}
                        return k8sproxy.put(`/apis/${GROUP}/${VERSION}/namespaces/${this.namespaceActive}/${RESOURCE}/${data?.metadata?.name}`, data).then(() => {
                            this.yamlData = { ...this.yamlData, show: false };
                            this.$message.success('操作成功');
                            this.getList();
                        });
                    },
                };
            });
        },
    },
};
</script>
<style scoped>
</style>
