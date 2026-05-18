<template>
    <!-- <div class="padding-20" style="height:100%;overflow:auto;">
        <Breadcrumb :routes="topbc" /> -->

    <div>
        <div class="bg-white">
            <a-tabs v-model:active-key="activeTab" class="manage-tabs">
                <a-tab-pane key="rate-limit" title="限流管理"></a-tab-pane>
                <a-tab-pane key="response-content" title="响应内容"></a-tab-pane>
                <a-tab-pane key="redis-config" title="Redis 配置"></a-tab-pane>
            </a-tabs>

            <div v-if="activeTab === 'rate-limit'" class="tab-panel">
                <a-spin :loading="loading">
                    <a-form ref="formRef" :model="form" auto-label-width style="width:1000px;">
                        <a-form-item label="限流调试" class="debug-switch-item">
                            <a-switch v-model="form.show_limit_quota_header" />
                            <template #extra>开启后将在响应头中返回限流剩余额度，便于联调和排查。</template>
                        </a-form-item>

                        <a-form-item label="限流模式" class="mode-select-item">
                            <a-select v-model="form.mode" style="width: 320px;">
                                <a-option value="global_threshold" label="全局限流模式"></a-option>
                                <a-option value="rule_items" label="动态限流模式"></a-option>
                            </a-select>
                        </a-form-item>

                        <div v-if="form.mode === 'global_threshold'" class="mode-box">
                            <a-form-item label="限流策略">
                                <a-select v-model="form.global_threshold.period" placeholder="选择周期" style="width: 220px;">
                                    <a-option
                                        v-for="item in thresholdOptions"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value"
                                    ></a-option>
                                </a-select>
                                <a-input-number
                                    v-model="form.global_threshold.value"
                                    :min="1"
                                    placeholder="输入阈值"
                                    style="margin-left:10px; width: 220px;"
                                />
                            </a-form-item>
                        </div>

                        <div v-else class="mode-box">
                            <a-form-item label="限流策略">
                                <div class="df df-c ai-s" style="flex:1;">
                                    <a-button type="primary" @click="addRuleItem">新建策略</a-button>

                                    <div
                                        v-for="(item, index) in form.rule_items"
                                        :key="item.id"
                                        class="mt-20"
                                        style="padding: 20px; background: var(--color-neutral-1); width: 100%;"
                                    >
                                        <div class="df ai-c jc-e mb-10">
                                            <a-button status="danger" type="text" @click="removeRuleItem(index)">删除设置块</a-button>
                                        </div>

                                        <a-form-item label="限流类型">
                                            <div class="df ai-c limit-type-row">
                                                <a-select
                                                    v-model="item.limitType"
                                                    placeholder="请选择限流类型"
                                                    style="width: 320px;"
                                                    @change="handleLimitTypeChange(item)"
                                                >
                                                    <a-option
                                                        v-for="option in getLimitTypeOptions(item)"
                                                        :key="option.value"
                                                        :label="option.label"
                                                        :value="option.value"
                                                    ></a-option>
                                                </a-select>
                                                <a-checkbox
                                                    v-model="item.dynamicValue"
                                                    :disabled="isDynamicValueLocked(item)"
                                                    @change="handleDynamicValueChange(item)"
                                                >
                                                    动态值
                                                </a-checkbox>
                                            </div>
                                        </a-form-item>

                                        <a-form-item label="匹配名称">
                                            <a-select
                                                v-if="isIpType(getActualLimitType(item))"
                                                v-model="item.limitValue"
                                                placeholder="请选择 IP 来源"
                                                style="width: 320px;"
                                            >
                                                <a-option
                                                    v-for="option in ipSourceOptions"
                                                    :key="option"
                                                    :label="option"
                                                    :value="option"
                                                ></a-option>
                                            </a-select>
                                            <a-input
                                                v-else
                                                v-model="item.limitValue"
                                                :disabled="isConsumerType(getActualLimitType(item))"
                                                :placeholder="limitValuePlaceholder(getActualLimitType(item))"
                                                style="width: 320px;"
                                            />
                                        </a-form-item>

                                        <table class="com-table">
                                            <tbody>
                                                <tr class="thead">
                                                    <td style="width: 50%;">Key</td>
                                                    <td style="width: 20%;">周期</td>
                                                    <td style="width: 15%;">阈值(次)</td>
                                                    <td style="width: 15%;">操作</td>
                                                </tr>
                                                <tr v-for="(limitKey, keyIndex) in item.limit_keys" :key="limitKey.id">
                                                    <td style="white-space:nowrap;">
                                                        <a-select v-model="limitKey.key_type" placeholder="Key 类型" @change="v=>v=='full'?(limitKey.key=''):null" style="width:120px;margin-right:10px;">
                                                            <a-option label="前缀匹配" value="prefix"></a-option>
                                                            <a-option label="正则匹配" value="regex"></a-option>
                                                            <a-option label="全量匹配" value="full"></a-option>
                                                            <a-option label="精准匹配" value="exact"></a-option>
                                                        </a-select>
                                                        <a-input v-if="limitKey.key_type=='full'" readonly model-value=".*" style="width:300px;" :input-attrs="{style:'color:var(--color-text-3);'}">
                                                            <template #prepend><span style="color:var(--color-text-3);">regexp:^</span></template>
                                                        </a-input>
                                                        <a-input
                                                            v-else
                                                            v-model="limitKey.key"
                                                            :spellcheck="false"
                                                            :placeholder="'请输入key'"
                                                            :disabled="limitKey.key_type=='full'"
                                                            style="width:300px;"
                                                        >
                                                            <template v-if="limitKey.key_type!=='exact'" #prepend><span style="color:var(--color-text-3);">regexp:^</span></template>
                                                            <template v-if="limitKey.key_type=='prefix'" #append><span style="color:var(--color-text-3);">.*</span></template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-select v-model="limitKey.period" placeholder="周期">
                                                            <a-option
                                                                v-for="option in thresholdOptions"
                                                                :key="option.value"
                                                                :label="option.label"
                                                                :value="option.value"
                                                            ></a-option>
                                                        </a-select>
                                                    </td>
                                                    <td class="cell-number">
                                                        <a-input-number
                                                            v-model="limitKey.value"
                                                            :min="1"
                                                            placeholder="阈值"
                                                            style="width: 100%;"
                                                        />
                                                    </td>
                                                    <td>
                                                        <a-button type="text" status="danger" @click="removeLimitKey(item, keyIndex)">删除</a-button>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colspan="4" class="cursor add-row" @click="addLimitKey(item)">
                                                        <div class="df ai-c jc-c">
                                                            <icon-plus :size="14" class="c-99" />
                                                            <span class="c-99 lh-1" style="margin-left:6px;">新增子规则</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </a-form-item>
                        </div>
                    </a-form>
                </a-spin>
            </div>

            <div v-else-if="activeTab === 'response-content'" class="tab-panel">
                <a-spin :loading="loading">
                    <a-form :model="form" layout="vertical" auto-label-width>
                        <div class="form-grid">
                            <a-form-item label="限流返回码">
                                <a-input-number v-model="form.rejected_code" :min="100" :max="599" style="width: 100%;" />
                            </a-form-item>
                            <a-form-item label="限流返回内容" class="grid-span-2">
                                <a-textarea
                                    v-model="form.rejected_msg"
                                    :spellcheck="false"
                                    placeholder="请输入返回内容"
                                    style="height: 120px;"
                                />
                            </a-form-item>
                        </div>
                    </a-form>
                </a-spin>
            </div>

            <div v-else class="tab-panel">
                <a-spin :loading="loading">
                    <a-form :model="form" layout="vertical" auto-label-width>
                        <div class="form-grid">
                            <a-form-item label="服务地址或 IP">
                                <a-input
                                    v-model="form.redis.service_name"
                                    :spellcheck="false"
                                    placeholder="例如：redis.default.svc.cluster.local 或 10.0.0.8"
                                />
                            </a-form-item>
                            <a-form-item label="服务端口">
                                <a-input-number v-model="form.redis.service_port" :min="1" :max="65535" style="width: 100%;" />
                            </a-form-item>
                            <a-form-item label="用户名">
                                <a-input v-model="form.redis.username" :spellcheck="false" placeholder="可选" />
                            </a-form-item>
                            <a-form-item label="密码">
                                <a-input-password v-model="form.redis.password" :spellcheck="false" placeholder="可选" />
                            </a-form-item>
                            <a-form-item label="超时时间(ms)">
                                <a-input-number v-model="form.redis.timeout" :min="1" style="width: 100%;" />
                            </a-form-item>
                            <a-form-item label="数据库编号">
                                <a-input-number v-model="form.redis.database" :min="0" style="width: 100%;" />
                            </a-form-item>
                        </div>
                    </a-form>
                </a-spin>
            </div>

            <!-- <a-button type="primary" :loading="submitting" @click="submit">保存</a-button> -->
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

const PLUGIN_LABEL = 'cluster-key-rate-limit';
const DEFAULT_TITLE = '限流管理';
const DEFAULT_IMAGE = 'oci://higress-registry.cn-hangzhou.cr.aliyuncs.com/plugins/key-cluster-rate-limit:1.0.0';
const HIGRESS_NAMESPACE = 'higress-system';

const thresholdOptions = [
    { label: '每秒', value: 'query_per_second' },
    { label: '每分钟', value: 'query_per_minute' },
    { label: '每小时', value: 'query_per_hour' },
    { label: '每天', value: 'query_per_day' },
];

const ipSourceOptions = ['from-header-x-forwarded-for', 'from-remote-addr'];

const limitTypeOptions = [
    {
        label: '按请求 Header',
        dynamicLabel: '按请求 Header 动态值',
        value: 'header',
        fixedType: 'limit_by_header',
        dynamicType: 'limit_by_per_header',
        dynamicDefault: false,
        dynamicLocked: false,
    },
    {
        label: '按请求 URL参数名',
        dynamicLabel: '按请求 URL参数动态值',
        value: 'param',
        fixedType: 'limit_by_param',
        dynamicType: 'limit_by_per_param',
        dynamicDefault: false,
        dynamicLocked: false,
    },
    {
        label: '按请求 Cookie',
        dynamicLabel: '按请求 Cookie 动态值',
        value: 'cookie',
        fixedType: 'limit_by_cookie',
        dynamicType: 'limit_by_per_cookie',
        dynamicDefault: false,
        dynamicLocked: false,
    },
    {
        label: '按请求 Consumer',
        dynamicLabel: '按请求 Consumer 动态值',
        value: 'consumer',
        fixedType: 'limit_by_consumer',
        dynamicType: 'limit_by_per_consumer',
        dynamicDefault: false,
        dynamicLocked: false,
    },
    {
        label: '按请求 IP',
        dynamicLabel: '按请求 IP 动态值',
        value: 'ip',
        fixedType: '',
        dynamicType: 'limit_by_per_ip',
        dynamicDefault: true,
        dynamicLocked: true,
    },
];

function createLimitKey() {
    return {
        id: `${Date.now()}-${Math.random()}`,
        key: '',
        key_type: 'prefix',
        period: 'query_per_second',
        value: 1,
    };
}

function createRuleItem() {
    return {
        id: `${Date.now()}-${Math.random()}`,
        limitType: 'header',
        dynamicValue: false,
        limitValue: '',
        limit_keys: [createLimitKey()],
    };
}

function createDefaultForm() {
    return {
        name: '',
        title: DEFAULT_TITLE,
        description: DEFAULT_TITLE,
        image: DEFAULT_IMAGE,
        priority: 20,
        disabled: true,
        rule_name: '',
        show_limit_quota_header: false,
        rejected_code: 429,
        rejected_msg: 'Too many requests',
        mode: 'global_threshold',
        global_threshold: {
            period: 'query_per_second',
            value: 1,
        },
        rule_items: [createRuleItem()],
        redis: {
            service_name: '',
            service_port: 6379,
            username: '',
            password: '',
            timeout: 1000,
            database: 0,
        },
    };
}

export default {
    props: ['name'],
    data() {
        return {
            topbc: [
                { name: 'root' },
                { name: 'cluster-key-rate-limit', label: '限流控制' },
            ],
            activeTab: 'rate-limit',
            loading: false,
            submitting: false,
            loadError: '',
            editData: null,
            thresholdOptions,
            ipSourceOptions,
            limitTypeOptions,
            form: createDefaultForm(),
        };
    },
    created() {
        if(this.name){
            this.loadConfig();
        }
    },
    watch: {
        name(v) {
            v && this.loadConfig();
        },
    },
    methods: {
        getLimitTypeOption(type) {
            return limitTypeOptions.find((item) => item.value === type) || limitTypeOptions[0];
        },
        getActualLimitType(item = {}) {
            const option = this.getLimitTypeOption(item.limitType);
            if (option.dynamicLocked) {
                return option.dynamicType;
            }
            return item.dynamicValue ? option.dynamicType : option.fixedType;
        },
        getLimitTypeOptions(item = {}) {
            const actualType = this.getActualLimitType(item);
            return limitTypeOptions.map((option) => ({
                ...option,
                label: item.limitType === option.value && actualType === option.dynamicType ? option.dynamicLabel : option.label,
            }));
        },
        isDynamicValueLocked(item = {}) {
            return this.getLimitTypeOption(item.limitType).dynamicLocked;
        },
        normalizeRuleItem(item = {}) {
            const option = this.getLimitTypeOption(item.limitType);
            if (option.dynamicLocked) {
                item.dynamicValue = true;
            } else if (typeof item.dynamicValue !== 'boolean') {
                item.dynamicValue = !!option.dynamicDefault;
            }
            const actualType = this.getActualLimitType(item);
            if (this.isIpType(actualType) && !ipSourceOptions.includes(item.limitValue)) {
                [item.limitValue] = ipSourceOptions;
            }
            if (this.isConsumerType(actualType)) {
                item.limitValue = '';
            }
            return item;
        },
        handleLimitTypeChange(item) {
            this.normalizeRuleItem(item);
        },
        handleDynamicValueChange(item) {
            this.normalizeRuleItem(item);
        },
        isConsumerType(type) {
            return type === 'limit_by_consumer' || type === 'limit_by_per_consumer';
        },
        isIpType(type) {
            return type === 'limit_by_per_ip';
        },
        limitValuePlaceholder(type) {
            if (type === 'limit_by_per_ip') {
                return '例如：from-header-x-forwarded-for 或 from-remote-addr';
            }
            if (this.isConsumerType(type)) {
                return 'Consumer 类型无需填写';
            }
            return '例如：Header 名、URL 参数名或 Cookie 名';
        },
        // limitKeyPlaceholder(type) {
        //     if (type === 'limit_by_per_ip') {
        //         return '例如：1.1.1.1、1.1.1.0/24、0.0.0.0/0';
        //     }
        //     if (
        //         type === 'limit_by_per_header' ||
        //         type === 'limit_by_per_param' ||
        //         type === 'limit_by_per_consumer' ||
        //         type === 'limit_by_per_cookie'
        //     ) {
        //         return '支持固定值、regexp:^a.* 或 *';
        //     }
        //     return '请输入 key';
        // },
        generateRuleName() {
            const suffix = this.createName(10).replace(/^cluster-key-rate-limit-/, '');
            return `rate-limit-rule-${suffix}`;
        },
        parseThreshold(obj = {}) {
            const find = thresholdOptions.find((item) => Number(obj?.[item.value]) > 0);
            return {
                period: find?.value || 'query_per_second',
                value: find ? Number(obj[find.value]) : 1,
            };
        },
        buildThreshold(period, value) {
            return {
                [period]: Number(value),
            };
        },
        parseLimitKey(rawKey = '') {
            const text = String(rawKey || '');
            if (text === '*' || text === 'regexp:^.*') {
                return {
                    key: '',
                    key_type: 'full',
                };
            }
            const prefixMatch = text.match(/^regexp:\^(.*)\.\*$/);
            if (prefixMatch) {
                return {
                    key: prefixMatch[1],
                    key_type: 'prefix',
                };
            }
            const regexMatch = text.match(/^regexp:\^(.*)$/);
            if (regexMatch) {
                return {
                    key: regexMatch[1],
                    key_type: 'regex',
                };
            }
            return {
                key: text,
                key_type: 'exact',
            };
        },
        buildLimitKey(keyItem = {}) {
            const keyType = keyItem.key_type || 'exact';
            const key = String(keyItem.key || '');
            if (keyType === 'full') {
                return 'regexp:^.*';
            }
            if (keyType === 'prefix') {
                return `regexp:^${key}.*`;
            }
            if (keyType === 'regex') {
                return `regexp:^${key}`;
            }
            return key;
        },
        parseRuleItem(item = {}) {
            const option =
                limitTypeOptions.find(
                    (current) =>
                        (current.fixedType && Object.prototype.hasOwnProperty.call(item, current.fixedType)) ||
                        (current.dynamicType && Object.prototype.hasOwnProperty.call(item, current.dynamicType))
                ) || limitTypeOptions[0];
            const actualType =
                option.fixedType && Object.prototype.hasOwnProperty.call(item, option.fixedType) ? option.fixedType : option.dynamicType;
            return this.normalizeRuleItem({
                id: `${Date.now()}-${Math.random()}`,
                limitType: option.value,
                dynamicValue: actualType === option.dynamicType,
                limitValue: item[actualType] ?? '',
                limit_keys: (item.limit_keys || []).map((keyItem) => ({
                    id: `${Date.now()}-${Math.random()}`,
                    ...this.parseLimitKey(keyItem.key || ''),
                    ...this.parseThreshold(keyItem),
                })),
            });
        },
        buildRuleItem(item) {
            const actualType = this.getActualLimitType(item);
            return {
                [actualType]: this.isConsumerType(actualType) ? '' : item.limitValue,
                limit_keys: item.limit_keys.map((keyItem) => ({
                    key: this.buildLimitKey(keyItem),
                    ...this.buildThreshold(keyItem.period, keyItem.value),
                })),
            };
        },
        loadConfig() {
            this.loading = true;
            this.loadError = '';
            // const selector = encodeURIComponent(`higress.io/wasm-plugin-name=${PLUGIN_LABEL}`);
            // k8sproxy.get(`/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins?labelSelector=${selector}`,{
            k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+this.name,{
                loading:true
            }).then((res) => {
                    const current = res.data;

                    if (!current) {
                        this.editData = null;
                        this.form = {
                            ...createDefaultForm(),
                        };
                        return;
                    }

                    const config = current?.spec?.defaultConfig || {};
                    this.editData = JSON.parse(JSON.stringify(current));
                    this.form = {
                        ...createDefaultForm(),
                        name: current?.metadata?.name || '',
                        title: current?.metadata?.annotations?.['higress.io/wasm-plugin-title'] || DEFAULT_TITLE,
                        description: current?.metadata?.annotations?.['higress.io/wasm-plugin-description'] || DEFAULT_TITLE,
                        image: current?.spec?.url || DEFAULT_IMAGE,
                        priority: current?.spec?.priority || 20,
                        disabled: current?.spec?.defaultConfigDisable !== false,
                        rule_name: config.rule_name || this.generateRuleName(),
                        show_limit_quota_header: !!config.show_limit_quota_header,
                        rejected_code: Number(config.rejected_code || 429),
                        rejected_msg: config.rejected_msg || 'Too many requests',
                        mode: config.global_threshold ? 'global_threshold' : 'rule_items',
                        global_threshold: this.parseThreshold(config.global_threshold),
                        rule_items: (config.rule_items || []).length
                            ? config.rule_items.map((item) => this.parseRuleItem(item))
                            : [this.normalizeRuleItem(createRuleItem())],
                        redis: {
                            service_name: config?.redis?.service_name || '',
                            service_port: Number(config?.redis?.service_port || 6379),
                            username: config?.redis?.username || '',
                            password: config?.redis?.password || '',
                            timeout: Number(config?.redis?.timeout || 1000),
                            database: Number(config?.redis?.database || 0),
                        },
                    };
                })
                .catch(() => {
                    this.loadError = '限流配置加载失败，请稍后重试。';
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        addRuleItem() {
            this.form.rule_items.push(this.normalizeRuleItem(createRuleItem()));
        },
        removeRuleItem(index) {
            if (this.form.rule_items.length === 1) {
                this.$message.warning('至少保留一个设置块');
                return;
            }
            this.form.rule_items.splice(index, 1);
        },
        addLimitKey(item) {
            item.limit_keys.push(createLimitKey());
        },
        removeLimitKey(item, index) {
            if (item.limit_keys.length === 1) {
                this.$message.warning('至少保留一条子规则');
                return;
            }
            item.limit_keys.splice(index, 1);
        },
        validateBasicForm() {
            if (!this.form.redis.service_name) {
                this.$message.error('请输入 Redis 服务地址或 IP');
                return false;
            }
            return true;
        },
        isIpv4(value = '') {
            const text = String(value).trim();
            const parts = text.split('.');
            if (parts.length !== 4) {
                return false;
            }
            return parts.every((part) => {
                if (!/^\d+$/.test(part)) {
                    return false;
                }
                const num = Number(part);
                return num >= 0 && num <= 255;
            });
        },
        getRedisProxyServiceName(ip) {
            return `redis-ip-${String(ip).trim().replace(/\./g, '-')}`;
        },
        buildRedisServiceData(serviceName, port) {
            return {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: {
                    name: serviceName,
                    namespace: HIGRESS_NAMESPACE,
                    labels: {
                        'w7.cc/created-by': 'cluster-key-rate-limit',
                    },
                },
                spec: {
                    ports: [
                        {
                            name: `tcp-${port}`,
                            protocol: 'TCP',
                            port,
                            targetPort: port,
                        },
                    ],
                },
            };
        },
        buildRedisEndpointsData(serviceName, redisHost, port) {
            return {
                apiVersion: 'v1',
                kind: 'Endpoints',
                metadata: {
                    name: serviceName,
                    namespace: HIGRESS_NAMESPACE,
                    labels: {
                        'w7.cc/created-by': 'cluster-key-rate-limit',
                    },
                },
                subsets: [
                    {
                        addresses: [{ ip: redisHost }],
                        ports: [
                            {
                                name: `tcp-${port}`,
                                port,
                                protocol: 'TCP',
                            },
                        ],
                    },
                ],
            };
        },
        async getK8sResource(path) {
            return k8sproxy
                .get(path, { noAlert: true })
                .then((res) => res?.data || null)
                .catch(() => null);
        },
        async ensureRedisService() {
            const redisHost = String(this.form.redis.service_name || '').trim();
            if (!this.isIpv4(redisHost)) {
                return redisHost;
            }

            const serviceName = this.getRedisProxyServiceName(redisHost);
            const port = Number(this.form.redis.service_port || 6379);
            const servicePath = `/api/v1/namespaces/${HIGRESS_NAMESPACE}/services/${serviceName}`;
            const endpointPath = `/api/v1/namespaces/${HIGRESS_NAMESPACE}/endpoints/${serviceName}`;
            const serviceData = this.buildRedisServiceData(serviceName, port);
            const endpointsData = this.buildRedisEndpointsData(serviceName, redisHost, port);
            const [serviceExists, endpointExists] = await Promise.all([
                this.getK8sResource(servicePath),
                this.getK8sResource(endpointPath),
            ]);

            if (!serviceExists) {
                await k8sproxy.post(`/api/v1/namespaces/${HIGRESS_NAMESPACE}/services`, serviceData);
            }
            if (!endpointExists) {
                await k8sproxy.post(`/api/v1/namespaces/${HIGRESS_NAMESPACE}/endpoints`, endpointsData);
            } else {
                await k8sproxy.patch(endpointPath, {
                    metadata: endpointsData.metadata,
                    subsets: endpointsData.subsets,
                });
            }

            return `${serviceName}.${HIGRESS_NAMESPACE}.svc.cluster.local`;
        },
        validateDynamicForm() {
            if (this.form.mode === 'global_threshold') {
                if (!this.form.global_threshold.period || !Number(this.form.global_threshold.value)) {
                    this.$message.error('请补全全局限流阈值');
                    return false;
                }
                return true;
            }

            if (!this.form.rule_items.length) {
                this.$message.error('请至少添加一个设置块');
                return false;
            }

            for (let i = 0; i < this.form.rule_items.length; i++) {
                const item = this.form.rule_items[i];
                const actualType = this.getActualLimitType(item);
                if (!item.limitType) {
                    this.$message.error(`设置块 ${i + 1} 缺少限流类型`);
                    return false;
                }
                if (!this.isConsumerType(actualType) && !item.limitValue) {
                    this.$message.error(`设置块 ${i + 1} 缺少匹配名称`);
                    return false;
                }
                if (!item.limit_keys?.length) {
                    this.$message.error(`设置块 ${i + 1} 缺少子规则`);
                    return false;
                }
                for (let j = 0; j < item.limit_keys.length; j++) {
                    const keyItem = item.limit_keys[j];
                    if (keyItem.key_type !== 'full' && !keyItem.key) {
                        this.$message.error(`设置块 ${i + 1} 的第 ${j + 1} 条子规则缺少 key`);
                        return false;
                    }
                    if (!keyItem.period || !Number(keyItem.value)) {
                        this.$message.error(`设置块 ${i + 1} 的第 ${j + 1} 条子规则阈值不完整`);
                        return false;
                    }
                }
            }
            return true;
        },
        formToData(redisServiceName = this.form.redis.service_name) {
            this.form.title = this.form.title || DEFAULT_TITLE;
            this.form.description = this.form.description || DEFAULT_TITLE;
            this.form.image = this.form.image || DEFAULT_IMAGE;
            if (!this.form.rule_name) {
                this.form.rule_name = this.generateRuleName();
            }

            const defaultConfig = {
                rule_name: this.form.rule_name,
                show_limit_quota_header: !!this.form.show_limit_quota_header,
                rejected_code: Number(this.form.rejected_code || 429),
                rejected_msg: this.form.rejected_msg || 'Too many requests',
                redis: {
                    service_name: redisServiceName,
                    service_port: Number(this.form.redis.service_port || 6379),
                    timeout: Number(this.form.redis.timeout || 1000),
                    database: Number(this.form.redis.database || 0),
                },
            };

            if (this.form.redis.username) {
                defaultConfig.redis.username = this.form.redis.username;
            }
            if (this.form.redis.password) {
                defaultConfig.redis.password = this.form.redis.password;
            }

            if (this.form.mode === 'global_threshold') {
                defaultConfig.global_threshold = this.buildThreshold(this.form.global_threshold.period, this.form.global_threshold.value);
            } else {
                defaultConfig.rule_items = this.form.rule_items.map((item) => this.buildRuleItem(item));
            }

            const data = this.editData
                ? JSON.parse(JSON.stringify(this.editData))
                : {
                      apiVersion: 'extensions.higress.io/v1alpha1',
                      kind: 'WasmPlugin',
                      metadata: {
                          name: this.createName(),
                          labels: {
                              'higress.io/wasm-plugin-name': PLUGIN_LABEL,
                          },
                          annotations: {},
                      },
                      spec: {
                          defaultConfig: {},
                          defaultConfigDisable: true,
                          failStrategy: 'FAIL_OPEN',
                          phase: 'UNSPECIFIED_PHASE',
                          priority: 20,
                          url: '',
                      },
                  };

            data.metadata = data.metadata || {};
            data.metadata.labels = data.metadata.labels || {};
            data.metadata.annotations = data.metadata.annotations || {};
            data.metadata.labels['higress.io/wasm-plugin-name'] = PLUGIN_LABEL;
            data.metadata.annotations['higress.io/wasm-plugin-title'] = this.form.title;
            data.metadata.annotations['higress.io/wasm-plugin-description'] = this.form.description;

            data.spec = data.spec || {};
            data.spec.defaultConfig = defaultConfig;
            data.spec.defaultConfigDisable = this.form.disabled;
            data.spec.failStrategy = data.spec.failStrategy || 'FAIL_OPEN';
            data.spec.phase = data.spec.phase || 'UNSPECIFIED_PHASE';
            data.spec.priority = Number(this.form.priority || 20);
            data.spec.url = this.form.image;
            return data;
        },
        submit() {
            if (!this.validateBasicForm()) {
                return;
            }
            if (!this.validateDynamicForm()) {
                return;
            }

            this.submitting = true;
            const request = Promise.resolve()
                .then(() => this.ensureRedisService())
                .then((serviceName) => {
                    const nextData = this.formToData(serviceName);
// 测试
// console.log(nextData);
// return Promise.reject();
                    return this.form.name
                        ? k8sproxy.put(`/apis/extensions.higress.io/v1alpha1/namespaces/${HIGRESS_NAMESPACE}/wasmplugins/${this.form.name}`, nextData)
                        : k8sproxy.post(`/apis/extensions.higress.io/v1alpha1/namespaces/${HIGRESS_NAMESPACE}/wasmplugins`, nextData);
                });

            request
                .then(() => {
                    this.$message.success('保存成功');
                    this.$emit('submit');
                    this.loadConfig();
                })
                .finally(() => {
                    this.submitting = false;
                });
        },
        createName(length = 8) {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            let value = '';
            for (let i = 0; i < length; i++) {
                value += chars[parseInt(Math.random() * chars.length, 10)];
            }
            return `cluster-key-rate-limit-${value}`;
        },
    },
};
</script>

<style scoped>
.page-header {
    gap: 16px;
}

.tab-panel {
    padding:0 20px ;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;
}

.grid-span-2 {
    grid-column: span 2;
}

.mode-box {
    margin-top: 16px;
}

.debug-switch-item :deep(.arco-form-item-content-flex) {
    align-items: center;
}

.mode-select-item {
    margin-bottom: 0;
}

.limit-type-row {
    gap: 12px;
    flex-wrap: wrap;
}

.add-row {
    background: var(--color-neutral-1);
}

.add-row:hover {
    background: var(--color-fill-2);
}

.cell-number {
    min-width: 120px;
}

.threshold-row {
    display: flex;
    gap: 12px;
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .grid-span-2 {
        grid-column: span 1;
    }

    .threshold-row {
        flex-direction: column;
    }
}
</style>
