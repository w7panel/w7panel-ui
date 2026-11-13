<template>
    <div class="com-container">
        <route-breadcrumb />
        <div class="bg-white padding-20 mt-20">
            <div class="title fs-16">集群系统信息</div>
            <a-form :model="info" class="mt-20" label-align="left" auto-label-width>
                <a-form-item label="集群版本"><span>{{info.gitVersion || '-'}}</span></a-form-item>
                <a-form-item label="创建时间"><span>{{info.creationTimestamp || '-'}}</span></a-form-item>
                <a-form-item label="集群模式">
                    <div v-if="!config.edit || config.type != 1" class="mr-10">{{config.titles[config.type] || '-'}}</div>
                    <a-select v-else v-model="config.editType" size="mini" class="mr-10">
                        <a-option :value="1" label="单机（内嵌sqlite）" />
                        <a-option :value="2" label="高可用（内嵌etcd）" />
                        <a-option :value="3" label="高可用（外部数据库）" />
                    </a-select>
                    <a-button v-if="config.edit" size="mini" type="primary" @click="configEdit">确定</a-button>
                    <span v-else-if="config.type == 1" class="c-blue cursor" @click="config.edit = true">修改</span>
                </a-form-item>
            </a-form>
        </div>
        <a-drawer :width="700" :visible="config.dialog" @ok="setConfigtype3" @cancel="config.dialog=false;config.edit=false" unmountOnClose :popup-container="$popupContainer">
            <template #title>数据库</template>
            <a-form :model="config.form" ref="configdb" :rules="dbrules" auto-label-width>
                <a-form-item label="数据库类型">
                    <a-select v-model="config.form.type" size="large" @change="computedDsn">
                        <a-option label="mysql" value="mysql" /><a-option label="postgres" value="postgres" />
                    </a-select>
                </a-form-item>
                <a-form-item label="地址" field="path"><a-input v-model="config.form.path" :spellcheck="false" size="large" @input="computedDsn" @change="computedDsn" /></a-form-item>
                <a-form-item label="端口" field="port"><a-input v-model="config.form.port" type="number" size="large" @input="computedDsn" @change="computedDsn" /></a-form-item>
                <a-form-item label="用户名" field="uname"><a-input v-model="config.form.uname" size="large" @input="computedDsn" @change="computedDsn" /></a-form-item>
                <a-form-item label="用户密码" field="upwd"><a-input v-model="config.form.upwd" size="large" @input="computedDsn" @change="computedDsn" /></a-form-item>
                <a-form-item label="数据库名" field="db"><a-input v-model="config.form.db" size="large" @input="computedDsn" @change="computedDsn" /></a-form-item>
                <a-form-item label="DSN" field="dsn"><a-input v-model="config.form.dsn" :spellcheck="false" size="large" /></a-form-item>
            </a-form>
        </a-drawer>
        <a-modal v-model:visible="haWarn" title="提示" @ok="haSelect(true)" @cancel="haSelect(false)">
            <div>切换高可用模式后，允许注册多个master节点，但切换过程不可逆，是否继续？</div>
        </a-modal>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';

export default {
    data() {
        return {
            info: { gitVersion: '', creationTimestamp: '' },
            config: {
                edit: false, type: 0, editType: 0,
                titles: ['', '单机（内嵌sqlite）', '高可用（内嵌etcd）', '高可用（外部数据库）'],
                dialog: false,
                form: { type: 'mysql', path: '', port: '', uname: '', upwd: '', db: '', dsn: '' },
            },
            dbrules: {
                path: [{ required: true, message: '请输入地址' }],
                port: [{ required: true, message: '请输入端口' }],
                uname: [{ required: true, message: '请输入用户名' }],
                upwd: [{ required: true, message: '请输入密码' }],
                db: [{ required: true, message: '请输入数据库名' }],
                dsn: [{ required: true, message: '请输入' }],
            },
            haWarn: false,
        };
    },
    created() {
        k8sproxy.get('/version', { noAlert: true }).then(res => { this.info.gitVersion = res?.data?.gitVersion || ''; });
        k8sproxy.get(`/api/v1/namespaces/${useNamespaceStore().namespace}/services/kubernetes`, { noAlert: true }).then(res => {
            this.info.creationTimestamp = window.formatDate(res?.data?.metadata?.creationTimestamp);
        });
        this.getConfig();
    },
    methods: {
        getConfig() {
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/k3sconfigs/config').then(res => {
                const data = res?.data?.spec?.data || {};
                if (data['k3s.cluster-init'] === 'false' && data['k3s.datastore-endpoint'] === '') this.config.type = this.config.editType = 1;
                else if (data['k3s.cluster-init'] === 'true') this.config.type = this.config.editType = 2;
                else if (data['k3s.datastore-endpoint']) this.config.type = this.config.editType = 3;
            });
        },
        configEdit() {
            if (this.config.editType === 1) { this.config.edit = false; return; }
            this.haWarn = true;
        },
        haSelect(confirmed) {
            this.haWarn = false;
            if (!confirmed) { this.config.editType = this.config.type; return; }
            if (this.config.editType === 3) {
                this.config.dialog = true;
                this.config.form = { type: 'mysql', path: '', port: '', uname: '', upwd: '', db: '', dsn: '' };
            } else if (this.config.editType === 2) {
                this.patchConfig({ 'k3s.cluster-init': 'true' }).then(() => { this.config.edit = false; this.getConfig(); });
            }
        },
        computedDsn() {
            const f = this.config.form;
            const params = { mysql: 'charset=utf8mb4', postgres: 'sslmode=disable' }[f.type];
            f.dsn = `${f.type}://${f.uname}:${f.upwd}@${f.path}:${f.port}/${f.db}?${params}`;
        },
        setConfigtype3() {
            this.$refs.configdb.validate(err => {
                if (err) return;
                this.patchConfig({ 'k3s.datastore-endpoint': this.config.form.dsn }).then(() => {
                    this.config.edit = false;
                    this.config.dialog = false;
                    this.getConfig();
                });
            });
        },
        patchConfig(data) {
            return k8sproxy.patch('/apis/w7panel.w7.com/v1alpha1/k3sconfigs/config', {
                metadata: { labels: { 'data-hash': String(Date.now()) } }, spec: { data },
            }, { headers: { 'Content-Type': 'application/merge-patch+json' } }).then(res => {
                this.$message.success('操作成功');
                return res;
            });
        },
    },
};
</script>
