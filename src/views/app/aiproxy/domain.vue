<template>
    <div class="padding-20">
        <Breadcrumb :routes="routes" />
        <div class="bg-white padding-20 mb-20">
            <div class="fs-16 mb-20">路由配置</div>
            <a-form :model="routeForm" auto-label-width>
                <a-form-item label="域名">
                    <span>{{ host || '-' }}</span>
                </a-form-item>
                <a-form-item label="模型名称">
                    <div style="width:100%;">
                        <a-input-tag v-model="routeForm.models" :disabled="!permission.includes('gateway/aiproxy/edit') || !requestValidationPluginInstalled" placeholder="输入后回车，支持多个模型；留空表示不限制" allow-clear />
                        <div v-if="requestValidationPluginInstalled === false" class="c-99 mt-4">
                            尚未安装请求校验插件
                            <a-link v-if="permission.includes('gateway/plugins/add')" @click="installRequestValidationPlugin">立即安装</a-link>
                            <span v-else>，请联系管理员安装</span>
                        </div>
                    </div>
                </a-form-item>
                <a-form-item label="认证">
                    <div class="df ai-c" style="gap:12px;">
                        <a-switch v-model="routeForm.authEnabled" :disabled="!permission.includes('gateway/aiproxy/edit') || !keyAuthPluginInstalled" />
                        <span v-if="keyAuthPluginInstalled === false" class="c-99">
                            尚未安装 Key Auth 认证插件
                            <a-link v-if="permission.includes('gateway/plugins/add')" @click="installKeyAuthPlugin">立即安装</a-link>
                            <span v-else>，请联系管理员安装</span>
                        </span>
                    </div>
                </a-form-item>
                <a-form-item v-if="routeForm.authEnabled && keyAuthPluginInstalled" label="消费者">
                    <div class="consumer-config">
                        <div v-if="permission.includes('gateway/aiproxy/edit')" class="mb-10">
                            <a-button type="outline" size="small" @click="openConsumer()">
                                <template #icon><icon-plus /></template>
                                添加消费者
                            </a-button>
                        </div>
                        <table v-if="consumers.length" class="com-table consumer-table"><tbody>
                            <tr>
                                <td>消费者名称</td>
                                <td>认证方式</td>
                                <td style="width:150px;">操作</td>
                            </tr>
                            <tr v-for="(item,index) in consumers" :key="item.secretName || item.name">
                                <td>{{item.name}}</td>
                                <td>Key Auth</td>
                                <td>
                                    <span v-if="permission.includes('gateway/aiproxy/edit')" class="cursor c-blue" @click="openConsumer(item,index)">编辑</span>
                                    <a-popconfirm
                                        v-if="permission.includes('gateway/aiproxy/edit')"
                                        content="删除后将同步清理 Key Auth 插件中的消费者配置，确认删除吗？"
                                        position="lt"
                                        type="warning"
                                        :ok-button-props="{status:'danger'}"
                                        @ok="deleteConsumer(index)"
                                    >
                                        <span class="ml-16 cursor c-blue">删除</span>
                                    </a-popconfirm>
                                </td>
                            </tr>
                        </tbody></table>
                        <a-empty v-else description="暂无消费者" />
                    </div>
                </a-form-item>
                <a-form-item>
                    <a-button v-if="permission.includes('gateway/aiproxy/edit')" type="primary" @click="saveRoute">保存配置</a-button>
                </a-form-item>
            </a-form>
        </div>

        <div class="mb-20" v-if="permission.includes('gateway/aiproxy/add')">
            <a-button type="primary" @click="openProvider()"><template #icon><icon-plus /></template>新增服务提供者</a-button>
        </div>
        <div class="bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td>服务地址</td>
                    <td>权重</td>
                    <td>状态</td>
                    <td style="width:240px;">操作</td>
                </tr>
                <tr v-for="item in providers" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>{{ providerTypeLabel(item.type) }}</td>
                    <td>{{ item.endpointUrl || '-' }}</td>
                    <td>{{ item.weight }}</td>
                    <td>
                        <a-switch v-model="item.enabled" :disabled="!permission.includes('gateway/aiproxy/edit')" @change="toggleProvider(item)" />
                    </td>
                    <td>
                        <span v-if="permission.includes('gateway/aiproxy/edit')" class="cursor c-blue" @click="openProvider(item)">编辑</span>
                        <a-popconfirm v-if="permission.includes('gateway/aiproxy/delete')" :content="'确认要删除吗'" @ok="deleteProvider(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="ml-16 cursor c-blue">删除</span>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!providers.length">
                    <td colspan="6"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>

        <a-modal
            v-model:visible="consumerForm.show"
            :title="consumerForm.isEdit?'编辑消费者':'添加消费者'"
            width="600px"
            :mask-closable="false"
            :popup-container="$popupContainer"
            @ok="saveConsumer"
            @cancel="consumerForm.show=false"
        >
            <a-form ref="consumerForm" :model="consumerForm" :rules="consumerRules" auto-label-width>
                <a-form-item label="消费者名称" field="name">
                    <a-input v-model="consumerForm.name" disabled />
                    <template #extra>名称由系统自动生成，用于稳定关联域名和插件配置，不允许修改。</template>
                </a-form-item>
                <div class="mb-10">认证方式</div>
                <a-tabs v-model:active-key="consumerForm.authType" size="small">
                    <a-tab-pane key="key-auth" title="Key Auth">
                        <a-form-item label="认证令牌" field="values">
                            <div class="consumer-token-list">
                                <div v-for="(token,index) in consumerForm.values" :key="index" class="df ai-c mb-10">
                                    <a-input v-model="consumerForm.values[index]" placeholder="请输入认证令牌" allow-clear />
                                    <a-button class="ml-10" title="随机生成" @click="consumerForm.values[index]=createToken()"><icon-refresh /></a-button>
                                    <a-button class="ml-10" :disabled="consumerForm.values.length<=1" title="删除" @click="removeConsumerToken(index)"><icon-minus /></a-button>
                                </div>
                                <a-button type="outline" size="small" @click="consumerForm.values.push('')">
                                    <template #icon><icon-plus /></template>
                                    添加令牌
                                </a-button>
                            </div>
                        </a-form-item>
                        <a-form-item label="令牌来源" field="source">
                            <a-select v-model="consumerForm.source" @change="changeConsumerTokenSource">
                                <a-option label="Authorization: Bearer ${value}" value="BEARER" />
                                <a-option label="自定义 HTTP Header" value="HEADER" />
                                <a-option label="查询参数" value="QUERY" />
                            </a-select>
                        </a-form-item>
                        <a-form-item v-if="consumerForm.source=='HEADER'" label="Header 名称" field="tokenKey">
                            <a-input v-model="consumerForm.tokenKey" placeholder="请输入 Header 名称" />
                        </a-form-item>
                        <a-form-item v-if="consumerForm.source=='QUERY'" label="参数名称" field="tokenKey">
                            <a-input v-model="consumerForm.tokenKey" placeholder="请输入参数名称" />
                        </a-form-item>
                    </a-tab-pane>
                </a-tabs>
            </a-form>
        </a-modal>

        <a-drawer :width="760" :visible="providerForm.show" @ok="saveProvider" @cancel="providerForm.show=false;" :popup-container="$popupContainer">
            <template #title>AI服务提供者</template>
            <a-form :model="providerForm" ref="providerForm" :rules="providerRules" auto-label-width class="padding-20">
                <a-form-item label="供应商" field="type">
                    <a-select v-model="providerForm.type" :disabled="providerForm.isEdit" @change="changeProviderType">
                        <a-option v-for="item in providerTypes" :key="item.value" :label="item.label" :value="item.value"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="名称" field="name">
                    <a-input v-model="providerForm.name" :disabled="providerForm.isEdit" placeholder="请输入名称，仅支持字母、数字、点和中划线" />
                </a-form-item>
                <a-form-item label="协议">
                    <a-select v-model="providerForm.protocol">
                        <a-option label="openai/v1" value="openai/v1"></a-option>
                        <a-option label="original" value="original"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item v-if="!providerUsesCustomCredentials(providerForm.type)" label="API Tokens">
                    <div class="provider-list-input">
                        <div v-for="(token,index) in providerForm.tokens" :key="index" class="df ai-c mb-10">
                            <a-input v-model="providerForm.tokens[index]" :placeholder="providerForm.isEdit?'留空则保留原 Token':'请输入 API Token'" allow-clear />
                            <a-button class="ml-10" :disabled="providerForm.tokens.length<=1" @click="removeProviderToken(index)"><icon-minus /></a-button>
                        </div>
                        <a-button type="outline" size="small" @click="providerForm.tokens.push('')"><template #icon><icon-plus /></template>添加 Token</a-button>
                    </div>
                </a-form-item>
                <template v-if="providerForm.type == 'openai'">
                    <a-form-item label="OpenAI 服务类型" required>
                        <a-select v-model="providerForm.serverType" @change="changeProviderServerType">
                            <a-option label="OpenAI 官方服务" value="official" />
                            <a-option label="自定义 OpenAI 兼容服务" value="custom" />
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="providerForm.serverType == 'custom'" label="自定义服务类型" required>
                        <a-select v-model="providerForm.customServerType">
                            <a-option label="URL" value="url" />
                            <a-option label="Kubernetes 服务" value="service" />
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="providerForm.serverType == 'custom' && providerForm.customServerType == 'url'" label="自定义服务 URL" required>
                        <div class="provider-list-input">
                            <div v-for="(url,index) in providerForm.rawConfigs.openaiCustomUrls" :key="index" class="df ai-c mb-10">
                                <a-input v-model="providerForm.rawConfigs.openaiCustomUrls[index]" placeholder="例如：http://10.0.0.1:8000/v1" allow-clear />
                                <a-button class="ml-10" :disabled="providerForm.rawConfigs.openaiCustomUrls.length<=1" @click="providerForm.rawConfigs.openaiCustomUrls.splice(index,1)"><icon-minus /></a-button>
                            </div>
                            <a-button type="outline" size="small" @click="providerForm.rawConfigs.openaiCustomUrls.push('')"><template #icon><icon-plus /></template>添加 URL</a-button>
                        </div>
                    </a-form-item>
                    <template v-if="providerForm.serverType == 'custom' && providerForm.customServerType == 'service'">
                        <a-form-item label="Kubernetes 服务" required>
                            <a-select v-model="providerForm.rawConfigs.openaiCustomService" allow-search placeholder="请选择服务和端口">
                                <a-option v-for="item in providerServiceOptions" :key="item.value" :label="item.label" :value="item.value" />
                            </a-select>
                        </a-form-item>
                        <a-form-item label="请求路径" required>
                            <a-input v-model="providerForm.rawConfigs.openaiCustomServicePath" placeholder="例如：/v1" />
                        </a-form-item>
                        <a-form-item label="Host 请求头">
                            <a-input v-model="providerForm.rawConfigs.openaiCustomServiceHost" placeholder="可选，留空使用服务 DNS" />
                        </a-form-item>
                    </template>
                </template>
                <template v-if="providerForm.type == 'qwen'">
                    <a-form-item label="开启互联网搜索">
                        <a-switch v-model="providerForm.rawConfigs.qwenEnableSearch" />
                    </a-form-item>
                    <a-form-item label="OpenAI 兼容模式">
                        <a-switch v-model="providerForm.rawConfigs.qwenEnableCompatible" />
                    </a-form-item>
                    <a-form-item label="服务类型" required>
                        <a-select v-model="providerForm.serverType" @change="changeProviderServerType">
                            <a-option label="阿里云百炼官方服务" value="official" />
                            <a-option label="自定义服务域名" value="custom" />
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="providerForm.serverType == 'custom'" label="自定义域名" field="rawConfigs.qwenDomain">
                        <a-input v-model="providerForm.rawConfigs.qwenDomain" placeholder="dashscope.aliyuncs.com" />
                    </a-form-item>
                    <a-form-item label="文件 ID">
                        <a-input-tag v-model="providerForm.rawConfigs.qwenFileIds" placeholder="输入后回车，支持多个文件 ID" allow-clear />
                    </a-form-item>
                    <a-form-item label="推理内容处理模式">
                        <a-select v-model="providerForm.rawConfigs.reasoningContentMode" allow-clear placeholder="不设置则使用插件默认行为">
                            <a-option label="透传 reasoning_content" value="passthrough" />
                            <a-option label="忽略 reasoning_content" value="ignore" />
                            <a-option label="拼接到 content" value="concat" />
                        </a-select>
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'azure'">
                    <a-form-item label="Azure 服务 URL" required>
                        <a-input v-model="providerForm.rawConfigs.azureServiceUrl" placeholder="https://example.openai.azure.com/openai/deployments/deployment/chat/completions?api-version=2024-02-15-preview" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'zhipuai'">
                    <a-form-item label="自定义域名" field="rawConfigs.zhipuDomain">
                        <a-input v-model="providerForm.rawConfigs.zhipuDomain" placeholder="open.bigmodel.cn" />
                    </a-form-item>
                    <a-form-item label="Code Plan 模式">
                        <a-switch v-model="providerForm.rawConfigs.zhipuCodePlanMode" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'claude'">
                    <a-form-item label="Claude 服务类型" required>
                        <a-select v-model="providerForm.serverType" @change="changeProviderServerType">
                            <a-option label="Anthropic 官方服务" value="official" />
                            <a-option label="自定义服务 URL" value="custom" />
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="providerForm.serverType == 'custom'" label="自定义服务 URL" required>
                        <a-input v-model="providerForm.rawConfigs.claudeCustomUrl" placeholder="https://api.example.com" />
                    </a-form-item>
                    <a-form-item label="Claude API 版本" field="rawConfigs.claudeVersion">
                        <a-input v-model="providerForm.rawConfigs.claudeVersion" placeholder="2023-06-01" />
                    </a-form-item>
                    <a-form-item label="Claude Code 模式">
                        <a-switch v-model="providerForm.rawConfigs.claudeCodeMode" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'ollama'">
                    <a-form-item label="Ollama 服务主机名" field="rawConfigs.ollamaServerHost">
                        <a-input v-model="providerForm.rawConfigs.ollamaServerHost" placeholder="127.0.0.1" />
                    </a-form-item>
                    <a-form-item label="Ollama 服务端口" field="rawConfigs.ollamaServerPort">
                        <a-input-number v-model="providerForm.rawConfigs.ollamaServerPort" :min="1" :max="65535" style="width:200px;" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'vllm'">
                    <a-form-item label="vLLM 服务 URL" required>
                        <div class="provider-list-input">
                            <div v-for="(url,index) in providerForm.rawConfigs.vllmCustomUrls" :key="index" class="df ai-c mb-10">
                                <a-input v-model="providerForm.rawConfigs.vllmCustomUrls[index]" placeholder="例如：http://10.0.0.1:8000/v1" allow-clear />
                                <a-button class="ml-10" :disabled="providerForm.rawConfigs.vllmCustomUrls.length<=1" @click="providerForm.rawConfigs.vllmCustomUrls.splice(index,1)"><icon-minus /></a-button>
                            </div>
                            <a-button type="outline" size="small" @click="providerForm.rawConfigs.vllmCustomUrls.push('')"><template #icon><icon-plus /></template>添加 URL</a-button>
                        </div>
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'bedrock'">
                    <a-form-item label="AWS 区域" field="rawConfigs.awsRegion">
                        <a-select v-model="providerForm.rawConfigs.awsRegion" allow-search allow-create>
                            <a-option v-for="region in awsRegions" :key="region" :label="region" :value="region" />
                        </a-select>
                    </a-form-item>
                    <a-form-item label="Access Key" field="rawConfigs.awsAccessKey">
                        <a-input v-model="providerForm.rawConfigs.awsAccessKey" placeholder="请输入 Access Key" />
                    </a-form-item>
                    <a-form-item label="Secret Key" field="rawConfigs.awsSecretKey">
                        <a-input-password v-model="providerForm.rawConfigs.awsSecretKey" placeholder="请输入 Secret Key" />
                    </a-form-item>
                </template>
                <template v-if="providerForm.type == 'vertex'">
                    <a-form-item label="Vertex 区域" field="rawConfigs.vertexRegion">
                        <a-select v-model="providerForm.rawConfigs.vertexRegion" allow-search allow-create>
                            <a-option v-for="region in vertexRegions" :key="region" :label="region" :value="region" />
                        </a-select>
                    </a-form-item>
                    <a-form-item label="项目 ID" field="rawConfigs.vertexProjectId">
                        <a-input v-model="providerForm.rawConfigs.vertexProjectId" placeholder="请输入 Google Cloud 项目 ID" />
                    </a-form-item>
                    <a-form-item label="认证 JSON" field="rawConfigs.vertexAuthKey">
                        <a-textarea v-model="providerForm.rawConfigs.vertexAuthKey" placeholder="请输入服务账号 JSON" :auto-size="{minRows:4,maxRows:8}" />
                    </a-form-item>
                    <a-form-item label="令牌刷新提前量">
                        <a-input-number v-model="providerForm.rawConfigs.vertexTokenRefreshAhead" :min="1" :max="1800" placeholder="留空表示仅过期时刷新" style="width:240px;" />
                    </a-form-item>
                    <a-form-item label="Gemini 安全设置">
                        <div class="provider-safety-settings">
                            <table v-if="providerForm.safetySettings.length" class="com-table"><tbody>
                                <tr><td>安全类别</td><td>拦截阈值</td><td style="width:70px;">操作</td></tr>
                                <tr v-for="(item,index) in providerForm.safetySettings" :key="index">
                                    <td><a-select v-model="item.category" allow-search><a-option v-for="category in geminiSafetyCategories" :key="category" :label="category" :value="category" /></a-select></td>
                                    <td><a-select v-model="item.threshold" allow-search><a-option v-for="threshold in geminiSafetyThresholds" :key="threshold" :label="threshold" :value="threshold" /></a-select></td>
                                    <td><span class="cursor c-blue" @click="providerForm.safetySettings.splice(index,1)">删除</span></td>
                                </tr>
                            </tbody></table>
                            <a-button type="outline" size="small" class="mt-10" @click="providerForm.safetySettings.push({category:'',threshold:''})"><template #icon><icon-plus /></template>添加安全设置</a-button>
                        </div>
                    </a-form-item>
                </template>
                <a-form-item label="流式首包超时（毫秒）">
                    <a-input-number v-model="providerForm.rawConfigs.firstByteTimeout" :min="0" placeholder="留空表示使用插件默认值" style="width:100%;" />
                </a-form-item>
                <a-form-item label="Token 故障转移">
                    <a-switch v-model="providerForm.failoverEnabled" />
                    <template #extra>Token 请求连续失败后自动切换，并通过健康检查恢复。</template>
                </a-form-item>
                <template v-if="providerForm.failoverEnabled">
                    <a-form-item label="连续失败阈值"><a-input-number v-model="providerForm.failover.failureThreshold" :min="1" style="width:100%;" /></a-form-item>
                    <a-form-item label="连续成功阈值"><a-input-number v-model="providerForm.failover.successThreshold" :min="1" style="width:100%;" /></a-form-item>
                    <a-form-item label="健康检查间隔（毫秒）"><a-input-number v-model="providerForm.failover.healthCheckInterval" :min="1" style="width:100%;" /></a-form-item>
                    <a-form-item label="健康检查超时（毫秒）"><a-input-number v-model="providerForm.failover.healthCheckTimeout" :min="1" style="width:100%;" /></a-form-item>
                    <a-form-item label="健康检查模型" required>
                        <a-select v-model="providerForm.failover.healthCheckModel" allow-search allow-create placeholder="选择预置模型或输入模型名称">
                            <a-option v-for="model in providerModelOptions(providerForm.type)" :key="model" :label="model" :value="model" />
                        </a-select>
                    </a-form-item>
                </template>
                <a-form-item label="代理服务器">
                    <a-select v-model="providerForm.proxyName" allow-clear placeholder="不使用代理服务器">
                        <a-option v-for="item in proxyServerOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </a-select>
                    <template #extra>使用 Higress McpBridge 中已配置的代理服务器访问上游服务。</template>
                </a-form-item>
                <a-form-item label="权重">
                    <a-input-number v-model="providerForm.weight" :min="0" style="width:200px;" />
                </a-form-item>
                <a-form-item label="启用">
                    <a-switch v-model="providerForm.enabled" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getPermission } from '@/utils/auth';
import {
    AI_LABEL,
    AI_DOMAIN_LABEL,
    AI_CONSUMER_LABEL,
    AI_MODELS_ANNOTATION,
    AI_AUTH_ANNOTATION,
    AI_PROVIDERS_ANNOTATION,
    KEY_AUTH_PLUGIN_ARTIFACT,
    AI_PROXY_PLUGIN_ARTIFACT,
    REQUEST_VALIDATION_PLUGIN_ARTIFACT,
    consumerResourceId,
    consumerSecretName,
    domainResourcePrefix,
    providerResourceId,
    providerServiceName,
    readRouteProviders,
    readStringArray,
    resourceName,
    loadInstalledPluginArtifacts,
    validateProviderWeights,
} from '@/utils/ai-proxy';

const PLUGIN_NAME = 'ai-proxy.internal';
const PLUGIN_NAMESPACE = 'higress-system';
const KEY_AUTH_PLUGIN_NAME = 'key-auth.internal';
const MODEL_VALIDATION_PLUGIN_NAME = 'request-validation.internal';
const MCPBRIDGE_NAME = 'default';

const PROVIDER_TYPES = [
    { label: 'OpenAI/OpenAI兼容服务', value: 'openai', endpoint: 'https://api.openai.com/v1' },
    { label: '通义千问', value: 'qwen', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { label: '月之暗面', value: 'moonshot', endpoint: 'https://api.moonshot.cn' },
    { label: 'Azure OpenAI', value: 'azure', endpoint: 'https://example.openai.azure.com/openai/deployments/deployment/chat/completions?api-version=2024-02-15-preview', requiredEndpoint: true },
    { label: 'Anthropic Claude', value: 'claude', endpoint: 'https://api.anthropic.com' },
    { label: '百川智能', value: 'baichuan', endpoint: 'https://api.baichuan-ai.com' },
    { label: '零一万物', value: 'yi', endpoint: 'https://api.lingyiwanwu.com' },
    { label: '智谱AI', value: 'zhipuai', endpoint: 'https://open.bigmodel.cn' },
    { label: '360智脑', value: 'ai360', endpoint: 'https://api.360.cn' },
    { label: '文心一言', value: 'baidu', endpoint: 'https://qianfan.baidubce.com' },
    { label: '阶跃星辰', value: 'stepfun', endpoint: 'https://api.stepfun.com' },
    { label: '豆包', value: 'doubao', endpoint: 'https://ark.cn-beijing.volces.com' },
    { label: 'MiniMax', value: 'minimax', endpoint: 'https://api.minimax.chat' },
    { label: 'Google Gemini', value: 'gemini', endpoint: 'https://generativelanguage.googleapis.com' },
    { label: 'Cohere', value: 'cohere', endpoint: 'https://api.cohere.com' },
    { label: '扣子', value: 'coze', endpoint: 'https://api.coze.cn' },
    { label: 'DeepSeek', value: 'deepseek', endpoint: 'https://api.deepseek.com' },
    { label: 'GitHub模型', value: 'github', endpoint: 'https://models.inference.ai.azure.com' },
    { label: 'Groq', value: 'groq', endpoint: 'https://api.groq.com' },
    { label: 'Ollama', value: 'ollama', endpoint: 'http://127.0.0.1:11434', requiredEndpoint: true },
    { label: 'Mistral', value: 'mistral', endpoint: 'https://api.mistral.ai' },
    { label: 'AWS Bedrock', value: 'bedrock', endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com' },
    { label: 'Google Vertex', value: 'vertex', endpoint: 'https://aiplatform.googleapis.com' },
    { label: 'OpenRouter', value: 'openrouter', endpoint: 'https://openrouter.ai' },
    { label: 'Grok', value: 'grok', endpoint: 'https://api.x.ai' },
    { label: 'vLLM', value: 'vllm', endpoint: 'http://127.0.0.1:8000/v1', requiredEndpoint: true },
];

const PROVIDER_MODEL_OPTIONS = {
    openai: ['gpt-3', 'gpt-35-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'],
    qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    azure: ['gpt-3', 'gpt-35-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'],
    claude: ['claude-opus-4-1', 'claude-opus-4-0', 'claude-sonnet-4-0', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
    baichuan: ['Baichuan4-Turbo', 'Baichuan4-Air', 'Baichuan4', 'Baichuan3-Turbo', 'Baichuan3-Turbo-128k', 'Baichuan2-Turbo'],
    yi: ['yi-lightning', 'yi-large', 'yi-medium', 'yi-medium-200k', 'yi-spark', 'yi-large-rag', 'yi-large-fc', 'yi-large-turbo'],
    zhipuai: ['GLM-4-Plus', 'GLM-4-0520', 'GLM-4-Long', 'GLM-4-AirX', 'GLM-4-Air', 'GLM-4-FlashX', 'GLM-4-Flash', 'GLM-4-AllTools', 'GLM-4'],
    baidu: ['ERNIE-4.0-8K', 'ERNIE-4.0-8K-Latest', 'ERNIE-4.0-Turbo-8K', 'ERNIE-3.5-8K', 'ERNIE-3.5-128K'],
    stepfun: ['step-1-8k', 'step-1-32k', 'step-1-128k', 'step-1-256k', 'step-2-16k', 'step-1-flash'],
    doubao: ['doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k'],
    minimax: ['abab6.5s', 'abab6.5g', 'abab6.5t', 'abab5.5s'],
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    openrouter: ['anthropic/claude-sonnet-4', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat-v3.1', 'qwen/qwen3-coder', 'openai/gpt-5'],
    grok: ['grok-code-fast-1', 'grok-4-0709', 'grok-3', 'grok-3-mini', 'grok-2-image-1212'],
};

const AWS_REGIONS = [
    'af-south-1', 'ap-east-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1', 'ap-south-2',
    'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4', 'ap-southeast-5', 'ap-southeast-7',
    'ca-central-1', 'ca-west-1', 'eu-central-1', 'eu-central-2', 'eu-north-1', 'eu-south-1', 'eu-south-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'il-central-1', 'me-central-1', 'me-south-1', 'mx-central-1',
    'sa-east-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
];

const VERTEX_REGIONS = [
    'global', 'africa-south1', 'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
    'asia-south1', 'asia-southeast1', 'asia-southeast2', 'australia-southeast1', 'australia-southeast2',
    'europe-central2', 'europe-north1', 'europe-southwest1', 'europe-west1', 'europe-west2', 'europe-west3',
    'europe-west4', 'europe-west6', 'europe-west8', 'europe-west9', 'europe-west12', 'me-central1', 'me-central2',
    'me-west1', 'northamerica-northeast1', 'northamerica-northeast2', 'southamerica-east1', 'southamerica-west1',
    'us-central1', 'us-east1', 'us-east4', 'us-east5', 'us-south1', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
];

const GEMINI_SAFETY_CATEGORIES = [
    'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
];
const GEMINI_SAFETY_THRESHOLDS = [
    'HARM_BLOCK_THRESHOLD_UNSPECIFIED', 'OFF', 'BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_ONLY_HIGH',
];
const DEFAULT_FAILOVER_CONFIG = {
    enabled: false,
    failureThreshold: 1,
    successThreshold: 1,
    healthCheckInterval: 5000,
    healthCheckTimeout: 10000,
    healthCheckModel: '',
};

const DEFAULT_ENDPOINTS = {
    openai: 'https://api.openai.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    moonshot: 'https://api.moonshot.cn',
    claude: 'https://api.anthropic.com',
    baichuan: 'https://api.baichuan-ai.com',
    yi: 'https://api.lingyiwanwu.com',
    zhipuai: 'https://open.bigmodel.cn',
    ai360: 'https://api.360.cn',
    baidu: 'https://qianfan.baidubce.com',
    stepfun: 'https://api.stepfun.com',
    doubao: 'https://ark.cn-beijing.volces.com',
    minimax: 'https://api.minimax.chat',
    gemini: 'https://generativelanguage.googleapis.com',
    cohere: 'https://api.cohere.com',
    coze: 'https://api.coze.cn',
    deepseek: 'https://api.deepseek.com',
    github: 'https://models.inference.ai.azure.com',
    groq: 'https://api.groq.com',
    mistral: 'https://api.mistral.ai',
    openrouter: 'https://openrouter.ai',
    grok: 'https://api.x.ai',
};

const DEFAULT_PROVIDER_ENDPOINTS = {
    moonshot: { domain: 'api.moonshot.cn', port: 443, protocol: 'https' },
    ai360: { domain: 'api.360.cn', port: 443, protocol: 'https' },
    github: { domain: 'models.inference.ai.azure.com', port: 443, protocol: 'https' },
    groq: { domain: 'api.groq.com', port: 443, protocol: 'https' },
    baichuan: { domain: 'api.baichuan-ai.com', port: 443, protocol: 'https' },
    yi: { domain: 'api.lingyiwanwu.com', port: 443, protocol: 'https' },
    deepseek: { domain: 'api.deepseek.com', port: 443, protocol: 'https' },
    baidu: { domain: 'qianfan.baidubce.com', port: 443, protocol: 'https' },
    stepfun: { domain: 'api.stepfun.com', port: 443, protocol: 'https' },
    minimax: { domain: 'api.minimax.chat', port: 443, protocol: 'https' },
    gemini: { domain: 'generativelanguage.googleapis.com', port: 443, protocol: 'https' },
    mistral: { domain: 'api.mistral.ai', port: 443, protocol: 'https' },
    cohere: { domain: 'api.cohere.com', port: 443, protocol: 'https' },
    doubao: { domain: 'ark.cn-beijing.volces.com', port: 443, protocol: 'https' },
    coze: { domain: 'api.coze.cn', port: 443, protocol: 'https' },
    openrouter: { domain: 'openrouter.ai', port: 443, protocol: 'https' },
    grok: { domain: 'api.x.ai', port: 443, protocol: 'https' },
};

function encode(value) {
    return btoa(unescape(encodeURIComponent(value || '')));
}

function decode(value) {
    if (!value) return '';
    try { return decodeURIComponent(escape(atob(value))); } catch { return ''; }
}

function clone(data) {
    return JSON.parse(JSON.stringify(data || {}));
}

function compact(arr) {
    return (arr || []).map(i=>String(i || '').trim()).filter(i=>i);
}

export default {
    data(){
        return {
            namespaceActive: '',
            permission: [],
            ingress: null,
            plugin: null,
            host: '',
            providers: [],
            consumers: [],
            keyAuthPluginInstalled: null,
            requestValidationPluginInstalled: null,
            aiProxyPluginName: PLUGIN_NAME,
            keyAuthPluginName: KEY_AUTH_PLUGIN_NAME,
            modelValidationPluginName: MODEL_VALIDATION_PLUGIN_NAME,
            consumerForm: {
                show: false,
                isEdit: false,
                index: -1,
                name: '',
                authType: 'key-auth',
                source: 'BEARER',
                tokenKey: '',
                values: [''],
            },
            consumerRules: {
                name: [{ required: true, message: '消费者名称不能为空' }],
                values: [{ validator: (value, cb) => {
                    const values = compact(this.consumerForm.values);
                    if(!values.length || values.length != this.consumerForm.values.length) cb('认证令牌不能为空');
                    else if(new Set(values).size != values.length) cb('认证令牌不能重复');
                    else cb();
                }}],
                source: [{ required: true, message: '请选择令牌来源' }],
                tokenKey: [{ validator: (value, cb) => {
                    if(['HEADER', 'QUERY'].includes(this.consumerForm.source) && !String(value || '').trim()) cb(this.consumerForm.source == 'HEADER' ? '请输入 Header 名称' : '请输入参数名称');
                    else cb();
                }}],
            },
            providerTypes: PROVIDER_TYPES,
            awsRegions: AWS_REGIONS,
            vertexRegions: VERTEX_REGIONS,
            geminiSafetyCategories: GEMINI_SAFETY_CATEGORIES,
            geminiSafetyThresholds: GEMINI_SAFETY_THRESHOLDS,
            providerServiceOptions: [],
            proxyServerOptions: [],
            routeForm: {
                models: [],
                authEnabled: false,
            },
            providerForm: {
                show: false,
                isEdit: false,
                rawConfigs: {},
                type: 'openai',
                name: '',
                protocol: 'openai/v1',
                tokens: [''],
                serverType: 'official',
                customServerType: 'url',
                failoverEnabled: false,
                failover: clone(DEFAULT_FAILOVER_CONFIG),
                safetySettings: [],
                proxyName: '',
                endpointUrl: DEFAULT_ENDPOINTS.openai,
                weight: 100,
                enabled: true,
            },
            providerRules: {
                type: [{ required: true, message: '供应商不能为空' }],
                name: [{ required: true, message: '名称不能为空' }],
            },
            routes: [
                {name:'root'},
                {name:'gateway', label:'网关管理'},
                {name:'gateway-aiproxy', label:'AI代理'},
                {name:'domain', label:'域名'},
            ],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.permission = getPermission() || [];
        this.getData();
        this.getProviderServices();
    },
    methods: {
        async getProviderServices(){
            const res = await k8sproxy.get('/api/v1/services', { noAlert: true }).catch(()=>null);
            const options = [];
            (res?.data?.items || []).forEach(service=>{
                const namespace = service?.metadata?.namespace || 'default';
                const name = service?.metadata?.name || '';
                (service?.spec?.ports || []).forEach(port=>{
                    if(!name || !port?.port) return;
                    const protocol = String(port.appProtocol || port.name || '').toLowerCase().includes('https') ? 'https' : 'http';
                    const value = namespace + '/' + name + ':' + port.port;
                    options.push({
                        label: namespace + '/' + name + ':' + (port.name || port.port),
                        value,
                        namespace,
                        name,
                        port: Number(port.port),
                        protocol,
                    });
                });
            });
            this.providerServiceOptions = options.sort((a,b)=>a.label.localeCompare(b.label));
        },
        async getData(){
            useLoadingStore().loading = true;
            try {
                const name = this.$route.query.name;
                const [ingRes, secretRes, mcpBridge, dependencies] = await Promise.all([
                    k8sproxy.get('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+name),
                    k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+name, { noAlert: true }),
                    this.getMcpBridge(),
                    loadInstalledPluginArtifacts(k8sproxy, [
                        { artifact: AI_PROXY_PLUGIN_ARTIFACT },
                        { artifact: KEY_AUTH_PLUGIN_ARTIFACT },
                        { artifact: REQUEST_VALIDATION_PLUGIN_ARTIFACT },
                    ]),
                ]);
                const [aiProxy, keyAuth, modelValidation] = dependencies;
                this.ingress = ingRes.data;
                this.host = this.ingress?.spec?.rules?.[0]?.host || '';
                this.plugin = aiProxy.plugin;
                this.aiProxyPluginName = aiProxy.plugin?.metadata?.name || PLUGIN_NAME;
                this.keyAuthPluginName = keyAuth.plugin?.metadata?.name || KEY_AUTH_PLUGIN_NAME;
                this.modelValidationPluginName = modelValidation.plugin?.metadata?.name || MODEL_VALIDATION_PLUGIN_NAME;
                this.keyAuthPluginInstalled = keyAuth.installed;
                this.requestValidationPluginInstalled = modelValidation.installed;
                const rule = this.currentRule();
                const annotations = this.ingress?.metadata?.annotations || {};
                this.routeForm.models = readStringArray(annotations[AI_MODELS_ANNOTATION] || rule?.config?.models);
                this.routeForm.authEnabled = annotations[AI_AUTH_ANNOTATION] === 'true' || !!rule?.config?.auth?.enabled;
                const secrets = secretRes?.data?.items || [];
                const legacyProviders = secrets.filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] != 'true').map(s=>this.secretToProvider(s));
                const storedProviders = readRouteProviders(annotations[AI_PROVIDERS_ANNOTATION]);
                const providerRefs = storedProviders.length ? storedProviders : (rule?.config?.providers || []);
                const routeProviders = this.routeProviders(providerRefs, this.plugin, mcpBridge);
                this.providers = routeProviders.length ? routeProviders : legacyProviders;
                this.proxyServerOptions = (mcpBridge?.spec?.proxies || []).map(item=>({
                    value: item.name,
                    label: item.name + (item.serverAddress ? ' (' + item.serverAddress + ':' + item.serverPort + ')' : ''),
                })).filter(item=>item.value);
                this.consumers = secrets
                    .filter(s=>s?.metadata?.labels?.[AI_CONSUMER_LABEL] == 'true')
                    .map(s=>this.secretToConsumer(s, keyAuth.plugin));
            } finally {
                useLoadingStore().loading = false;
            }
        },
        getPlugin(){
            return this.getManagedPlugin(this.aiProxyPluginName);
        },
        async savePlugin(plugin){
            const res = await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.aiProxyPluginName, plugin);
            this.plugin = res.data;
            return res.data;
        },
        requirePlugin(){
            if(!this.plugin) throw new Error('AI 代理插件未安装，请返回列表完成安装');
            return clone(this.plugin);
        },
        currentRule(){
            return (this.plugin?.spec?.matchRules || []).find(rule=>{
                return (rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name);
            }) || null;
        },
        globalProviderMap(plugin){
            const providers = plugin?.spec?.defaultConfig?.providers || [];
            const map = {};
            providers.forEach(item=>{
                if(item?.id) map[item.id] = item;
            });
            return map;
        },
        routeProviders(providerRefs, plugin, mcpBridge){
            const providerMap = this.globalProviderMap(plugin);
            const registryMap = {};
            (mcpBridge?.spec?.registries || []).forEach(item=>{
                if(item?.name) registryMap[item.name] = item;
            });
            return (providerRefs || []).map(item=>{
                const legacyId = item.id || item.provider || item.name;
                const name = item.name || legacyId;
                const id = providerResourceId(this.ingress?.metadata?.name || '', name);
                const config = providerMap[id] || providerMap[legacyId] || {};
                return {
                    ...this.providerConfigToForm(config, item),
                    id,
                    name,
                    proxyName: registryMap[providerServiceName(id)]?.proxyName || '',
                    weight: Number(item.weight) || 0,
                    enabled: item.enabled !== false,
                };
            }).filter(item=>item.id && item.name);
        },
        openProvider(row){
            if(!row){
                this.providerForm = {
                    show: true,
                    isEdit: false,
                    originalName: '',
                    originalId: '',
                    rawConfigs: this.defaultRawConfigs('openai'),
                    type: 'openai',
                    name: '',
                    protocol: 'openai/v1',
                    tokens: [],
                    serverType: 'official',
                    customServerType: 'url',
                    failoverEnabled: false,
                    failover: this.defaultFailoverConfig(),
                    safetySettings: [],
                    proxyName: '',
                    endpointUrl: DEFAULT_ENDPOINTS.openai,
                    weight: 100,
                    enabled: true,
                };
                return;
            }
            const rawConfigs = clone(row.rawConfigs);
            const failover = { ...this.defaultFailoverConfig(), ...clone(rawConfigs.failover) };
            const safetySettings = Object.entries(rawConfigs.geminiSafetySetting || rawConfigs.geminiSafetySettings || {}).map(([category, threshold])=>({ category, threshold }));
            let serverType = 'official';
            if(row.type == 'openai' && rawConfigs.openaiCustomUrl) serverType = 'custom';
            if(row.type == 'qwen' && rawConfigs.qwenDomain) serverType = 'custom';
            if(row.type == 'claude' && (rawConfigs.claudeCustomUrl || rawConfigs.providerDomain)) serverType = 'custom';
            if(row.type == 'openai') rawConfigs.openaiCustomUrls = compact([rawConfigs.openaiCustomUrl, ...(rawConfigs.openaiExtraCustomUrls || [])]);
            if(row.type == 'openai' && rawConfigs.openaiCustomServiceName){
                const serviceParts = String(rawConfigs.openaiCustomServiceName).split('.');
                const serviceName = serviceParts[0];
                const serviceNamespace = serviceParts[1] || this.namespaceActive;
                rawConfigs.openaiCustomService = serviceNamespace + '/' + serviceName + ':' + (rawConfigs.openaiCustomServicePort || 80);
                rawConfigs.openaiCustomServicePath = this.parseUrl(rawConfigs.openaiCustomUrl)?.pathname || '/';
            }
            if(row.type == 'vllm') rawConfigs.vllmCustomUrls = compact([rawConfigs.vllmCustomUrl, ...(rawConfigs.vllmExtraCustomUrls || [])]);
            if(row.type == 'openai' && !rawConfigs.openaiCustomUrls.length) rawConfigs.openaiCustomUrls = [''];
            if(row.type == 'vllm' && !rawConfigs.vllmCustomUrls.length) rawConfigs.vllmCustomUrls = [''];
            this.providerForm = {
                show: true,
                isEdit: true,
                originalName: row.name,
                originalId: row.id,
                rawConfigs,
                type: row.type || 'openai',
                name: row.name,
                protocol: row.protocol || 'openai/v1',
                tokens: row.tokens?.length ? [...row.tokens] : [''],
                oldTokens: [...(row.tokens || [])],
                serverType,
                customServerType: rawConfigs.openaiCustomServiceName ? 'service' : 'url',
                failoverEnabled: !!failover.enabled,
                failover,
                safetySettings,
                proxyName: row.proxyName || '',
                endpointUrl: row.endpointUrl || this.providerEndpointPlaceholder(row.type),
                weight: Number(row.weight) || 0,
                enabled: row.enabled,
            };
        },
        saveProvider(){
            this.$refs.providerForm.validate(async err=>{
                if(err) return;
                const name = this.domainToName(this.providerForm.name);
                if(!/^[a-z0-9](?:[a-z0-9.-]{0,61}[a-z0-9])?$/.test(name)){
                    this.$message.error('名称仅支持字母、数字、点和中划线，且不能以符号开头或结尾');
                    return;
                }
                const providerError = this.validateProviderConfig(this.providerForm);
                if(providerError){
                    this.$message.error(providerError);
                    return;
                }
                if(!this.providerForm.isEdit && this.providers.some(item=>item.name == name)){
                    this.$message.error('该域名下已存在同名服务提供者');
                    return;
                }
                this.providerForm.name = name;
                const candidate = this.providerFormToProvider(this.providerForm);
                const nextProviders = this.providers
                    .filter(item=>item.id != candidate.id && item.id != this.providerForm.originalId)
                    .concat([candidate]);
                const weightError = validateProviderWeights(nextProviders);
                if(weightError){
                    this.$message.error(weightError);
                    return;
                }
                useLoadingStore().loading = true;
                try {
                    await this.syncProviderResources(this.providerForm, nextProviders);
                    this.providerForm.show = false;
                    await this.getData();
                    this.$message.success('操作成功');
                } catch(error) {
                    this.$message.error(error?.message || '服务提供者保存失败');
                } finally {
                    useLoadingStore().loading = false;
                }
            })
        },
        secretToProvider(secret){
            const baseUrl = decode(secret?.data?.baseUrl);
            const apiKey = decode(secret?.data?.apiKey);
            return {
                secretName: secret.metadata.name,
                name: secret?.metadata?.annotations?.['w7.cc/provider-name'] || secret.metadata.name,
                type: 'openai',
                protocol: 'openai/v1',
                tokens: apiKey ? [apiKey] : [],
                rawConfigs: baseUrl ? { openaiCustomUrl: baseUrl } : {},
                endpointUrl: baseUrl,
                weight: Number(secret?.metadata?.annotations?.['w7.cc/weight'] || 0),
                enabled: secret?.metadata?.annotations?.['w7.cc/enabled'] !== 'false',
            };
        },
        secretToConsumer(secret, keyAuthPlugin){
            const name = secret?.metadata?.annotations?.['w7.cc/consumer-name'] || secret.metadata.name;
            const pluginName = consumerResourceId(this.ingress.metadata.name, name);
            const pluginConfig = (keyAuthPlugin?.spec?.defaultConfig?.consumers || []).find(item=>item?.name == pluginName) || {};
            const legacyValue = decode(secret?.data?.key);
            let values = [];
            try {
                const storedValues = JSON.parse(decode(secret?.data?.values) || '[]');
                if(Array.isArray(storedValues)) values = compact(storedValues);
            } catch {}
            if(!values.length) values = compact(pluginConfig.credentials || [pluginConfig.credential]);
            const pluginKeys = compact(pluginConfig.keys);
            const isBearer = pluginConfig.in_header === true
                && pluginKeys.some(item=>item.toLowerCase() == 'authorization')
                && values.length
                && values.every(item=>/^Bearer\s+/i.test(item));
            let source = decode(secret?.data?.source);
            if(!source){
                if(isBearer) source = 'BEARER';
                else if(pluginConfig.in_header === true) source = 'HEADER';
                else if(pluginConfig.in_query === true) source = 'QUERY';
                else source = 'HEADER';
            }
            if(source == 'BEARER') values = values.map(item=>item.replace(/^Bearer\s+/i, ''));
            if(!values.length && legacyValue) values = [legacyValue];
            const storedTokenKey = decode(secret?.data?.tokenKey);
            const tokenKey = source == 'BEARER' ? '' : (storedTokenKey || pluginKeys[0] || (source == 'QUERY' ? 'apikey' : 'x-api-key'));
            return {
                secretName: secret.metadata.name,
                name,
                authType: 'key-auth',
                source,
                tokenKey,
                values,
            };
        },
        async toggleProvider(row){
            const error = validateProviderWeights(this.providers);
            if(error){
                row.enabled = !row.enabled;
                this.$message.error(error);
                return;
            }
            await this.syncRuleProviders(this.providers);
            await this.getData();
        },
        async deleteProvider(row){
            useLoadingStore().loading = true;
            try {
                const nextProviders = this.providers.filter(item=>item.name != row.name);
                await this.removeProviderResources(row.name, nextProviders);
                await this.getData();
                this.$message.success('操作成功');
            } finally {
                useLoadingStore().loading = false;
            }
        },
        openConsumer(row, index){
            if(row){
                this.consumerForm = {
                    show: true,
                    isEdit: true,
                    index,
                    name: row.name,
                    authType: 'key-auth',
                    source: row.source || 'BEARER',
                    tokenKey: row.tokenKey || '',
                    values: row.values?.length ? [...row.values] : [''],
                };
                return;
            }
            this.consumerForm = {
                show: true,
                isEdit: false,
                index: -1,
                name: this.createConsumerName(),
                authType: 'key-auth',
                source: 'BEARER',
                tokenKey: '',
                values: [this.createToken()],
            };
        },
        removeConsumerToken(index){
            if(this.consumerForm.values.length <= 1) return;
            this.consumerForm.values.splice(index, 1);
        },
        changeConsumerTokenSource(source){
            this.consumerForm.tokenKey = source == 'HEADER' ? 'x-api-key' : (source == 'QUERY' ? 'apikey' : '');
        },
        saveConsumer(){
            this.$refs.consumerForm.validate(async err=>{
                if(err) return;
                const nextConsumer = {
                    ...(this.consumerForm.isEdit ? this.consumers[this.consumerForm.index] : {}),
                    name: this.consumerForm.name,
                    authType: 'key-auth',
                    source: this.consumerForm.source,
                    tokenKey: String(this.consumerForm.tokenKey || '').trim(),
                    values: compact(this.consumerForm.values),
                };
                const nextConsumers = [...this.consumers];
                if(this.consumerForm.isEdit) nextConsumers.splice(this.consumerForm.index, 1, nextConsumer);
                else nextConsumers.push(nextConsumer);
                useLoadingStore().loading = true;
                try {
                    const credentialError = await this.validateConsumerCredentials(nextConsumers);
                    if(credentialError){
                        this.$message.error(credentialError);
                        return;
                    }
                    this.consumers = nextConsumers;
                    await this.saveConsumers();
                    await this.syncKeyAuthPlugin();
                    await this.syncIngressAuthState();
                    this.consumerForm.show = false;
                    await this.getData();
                    this.$message.success('消费者配置已保存');
                } catch(error) {
                    await this.getData();
                    this.$message.error(error?.message || '消费者配置保存失败');
                } finally {
                    useLoadingStore().loading = false;
                }
            });
        },
        async deleteConsumer(index){
            const nextConsumers = this.consumers.filter((item, itemIndex)=>itemIndex != index);
            useLoadingStore().loading = true;
            try {
                this.consumers = nextConsumers;
                if(!nextConsumers.length) this.routeForm.authEnabled = false;
                await this.syncKeyAuthPlugin();
                await this.saveConsumers();
                await this.syncIngressAuthState();
                await this.getData();
                this.$message.success('消费者及关联插件配置已删除');
            } catch(error) {
                await this.getData();
                this.$message.error(error?.message || '消费者删除失败');
            } finally {
                useLoadingStore().loading = false;
            }
        },
        async validateConsumerCredentials(consumers){
            const credentials = consumers.flatMap(item=>compact(item.values));
            if(credentials.some(item=>!item)) return '认证令牌不能为空';
            if(new Set(credentials).size != credentials.length) return '同一域名下的消费者认证令牌不能重复';
            const plugin = await this.getManagedPlugin(this.keyAuthPluginName);
            const prefix = domainResourcePrefix(this.ingress.metadata.name);
            const otherCredentials = new Set((plugin?.spec?.defaultConfig?.consumers || [])
                .filter(item=>!String(item?.name || '').startsWith(prefix))
                .flatMap(item=>item?.credentials || [item?.credential])
                .map(item=>String(item || '').replace(/^Bearer\s+/i, ''))
                .filter(Boolean));
            return credentials.some(item=>otherCredentials.has(item)) ? '消费者认证令牌已被其他域名使用，请重新生成' : '';
        },
        async saveRoute(){
            const models = compact(this.routeForm.models);
            const consumerNames = this.consumers.map(i=>String(i.name || '').trim()).filter(Boolean);
            if(this.routeForm.authEnabled && !this.keyAuthPluginInstalled){
                this.$message.error('请先安装 Key Auth 认证插件');
                return;
            }
            if(models.length && !this.requestValidationPluginInstalled){
                this.$message.error('请先安装请求校验插件');
                return;
            }
            if(this.routeForm.authEnabled && !consumerNames.length){
                this.$message.error('启用认证时至少需要配置一个消费者');
                return;
            }
            if(new Set(consumerNames.map(resourceName)).size != consumerNames.length){
                this.$message.error('消费者名称不能重复');
                return;
            }
            const weightError = validateProviderWeights(this.providers);
            if(weightError){
                this.$message.error(weightError);
                return;
            }
            useLoadingStore().loading = true;
            try {
                this.routeForm.models = models;
                await this.saveConsumers();
                await this.syncKeyAuthPlugin();
                await this.syncModelValidationPlugin();
                await this.syncRuleProviders();
                await this.getData();
                this.$message.success('操作成功');
            } finally {
                useLoadingStore().loading = false;
            }
        },
        async saveConsumers(){
            const existing = this.consumers.filter(i=>i.name && i.secretName).map(i=>i.secretName);
            const secretRes = await k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/secrets?labelSelector='+AI_LABEL+'=true,'+AI_DOMAIN_LABEL+'='+this.ingress.metadata.name+','+AI_CONSUMER_LABEL+'=true', { noAlert: true });
            const oldSecrets = secretRes?.data?.items || [];
            for(const old of oldSecrets){
                if(!existing.includes(old.metadata.name)){
                    await k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+old.metadata.name, { noAlert: true });
                }
            }
            for(const consumer of this.consumers.filter(i=>i.name)){
                const values = compact(consumer.values);
                const name = consumer.secretName || consumerSecretName(this.ingress.metadata.name, consumer.name);
                const data = {
                    apiVersion: 'v1',
                    kind: 'Secret',
                    metadata: {
                        name,
                        namespace: this.namespaceActive,
                        labels: {
                            [AI_LABEL]: 'true',
                            [AI_DOMAIN_LABEL]: this.ingress.metadata.name,
                            [AI_CONSUMER_LABEL]: 'true',
                        },
                        annotations: {
                            'w7.cc/consumer-name': consumer.name,
                        },
                    },
                    type: 'Opaque',
                    data: {
                        key: encode(values[0] || ''),
                        values: encode(JSON.stringify(values)),
                        source: encode(consumer.source || 'BEARER'),
                        tokenKey: encode(consumer.tokenKey || ''),
                    },
                };
                if(consumer.secretName){
                    await k8sproxy.put('/api/v1/namespaces/'+this.namespaceActive+'/secrets/'+consumer.secretName, data);
                }else{
                    await k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/secrets', data);
                    consumer.secretName = name;
                }
            }
        },
        getManagedPlugin(name){
            return k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+name, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        installKeyAuthPlugin(){
            this.$router.push({
                path: '/app/store-install',
                query: { path: KEY_AUTH_PLUGIN_ARTIFACT.installUrl },
            });
        },
        installRequestValidationPlugin(){
            this.$router.push({
                path: '/app/store-install',
                query: { path: REQUEST_VALIDATION_PLUGIN_ARTIFACT.installUrl },
            });
        },
        async syncKeyAuthPlugin(){
            const currentConsumers = this.consumers.filter(i=>i.name).map(item=>this.consumerToKeyAuthConfig(item));
            let plugin = await this.getManagedPlugin(this.keyAuthPluginName);
            if(!plugin && !this.routeForm.authEnabled) return;
            if(!plugin) throw new Error('Key Auth 认证插件未安装，请先完成安装');
            plugin = clone(plugin);
            plugin.spec = plugin.spec || {};
            // AI 代理只管理当前域名的认证规则，不改写 Key Auth 的全局开关。
            plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
            const normalizedConsumers = this.normalizeKeyAuthConsumers(plugin.spec.defaultConfig);
            plugin.spec.defaultConfig.global_auth = false;
            plugin.spec.defaultConfig.keys = ['x-higress-dummy-key'];
            delete plugin.spec.defaultConfig.in_header;
            delete plugin.spec.defaultConfig.in_query;
            const prefix = domainResourcePrefix(this.ingress.metadata.name);
            const otherConsumers = normalizedConsumers.filter(item=>!String(item?.name || '').startsWith(prefix));
            const normalizeCredential = value=>String(value || '').replace(/^Bearer\s+/i, '');
            const otherCredentials = new Set(otherConsumers.flatMap(item=>item?.credentials || [item?.credential]).map(normalizeCredential).filter(Boolean));
            const currentCredentials = currentConsumers.flatMap(item=>item.credentials || []).map(normalizeCredential).filter(Boolean);
            if(currentCredentials.some(item=>otherCredentials.has(item))) throw new Error('消费者认证令牌已被其他域名使用，请重新生成');
            if(new Set(currentCredentials).size != currentCredentials.length) throw new Error('同一域名下的消费者认证令牌不能重复');
            plugin.spec.defaultConfig.consumers = otherConsumers.concat(currentConsumers);
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress.metadata.name)));
            if(this.routeForm.authEnabled){
                plugin.spec.matchRules.push({
                    domain: [this.host],
                    config: { allow: currentConsumers.map(item=>item.name) },
                    configDisable: false,
                });
            }
            await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.keyAuthPluginName, plugin);
        },
        consumerToKeyAuthConfig(consumer){
            const source = consumer.source || 'BEARER';
            const values = compact(consumer.values);
            const config = {
                name: consumerResourceId(this.ingress.metadata.name, consumer.name),
                credentials: source == 'BEARER' ? values.map(item=>'Bearer '+item) : values,
                keys: [source == 'BEARER' ? 'Authorization' : String(consumer.tokenKey || '').trim()],
                in_header: source == 'BEARER' || source == 'HEADER',
                in_query: source == 'QUERY',
            };
            return config;
        },
        normalizeKeyAuthConsumers(defaultConfig){
            const defaultKeys = compact(defaultConfig?.keys);
            const defaultInHeader = defaultConfig?.in_header;
            const defaultInQuery = defaultConfig?.in_query;
            return (defaultConfig?.consumers || []).map(item=>{
                const config = clone(item);
                config.credentials = compact(config.credentials || [config.credential]);
                if(!compact(config.keys).length) config.keys = defaultKeys.length ? defaultKeys : ['x-api-key'];
                if(config.in_header === undefined) config.in_header = defaultInHeader === undefined ? true : !!defaultInHeader;
                if(config.in_query === undefined) config.in_query = !!defaultInQuery;
                delete config.credential;
                return config;
            });
        },
        async syncModelValidationPlugin(){
            const models = compact(this.routeForm.models);
            let plugin = await this.getManagedPlugin(this.modelValidationPluginName);
            if(!plugin && !models.length) return;
            if(!plugin) throw new Error('请求校验插件未安装，无法保存模型限制');
            plugin = clone(plugin);
            plugin.spec = plugin.spec || {};
            // AI 代理只维护域名规则；已有插件的全局开关由网关插件页面独立管理。
            if(!plugin.spec.defaultConfig || !Object.keys(plugin.spec.defaultConfig).length){
                plugin.spec.defaultConfig = { body_schema: { type: 'object' } };
            }
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress.metadata.name)));
            if(models.length){
                plugin.spec.matchRules.push({
                    domain: [this.host],
                    config: {
                        body_schema: {
                            type: 'object',
                            required: ['model'],
                            properties: { model: { type: 'string', enum: models } },
                        },
                        rejected_code: 403,
                        rejected_msg: '请求使用的模型不在该域名允许列表中',
                    },
                    configDisable: false,
                });
            }
            await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/'+PLUGIN_NAMESPACE+'/wasmplugins/'+this.modelValidationPluginName, plugin);
        },
        async syncRuleProviders(providerList){
            const providers = (providerList || this.providers).map(item=>({
                ...item,
                id: providerResourceId(this.ingress.metadata.name, item.name),
            }));
            const weightError = validateProviderWeights(providers);
            if(weightError) throw new Error(weightError);
            const plugin = this.requirePlugin();
            const oldRules = plugin.spec.matchRules || [];
            const legacyRule = oldRules.find(rule=>(rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name));
            const legacyIds = (legacyRule?.config?.providers || []).map(item=>item?.provider || item?.name).filter(Boolean);
            const otherReferencedIds = new Set(oldRules.filter(rule=>rule !== legacyRule).flatMap(rule=>(rule?.config?.providers || []).map(item=>item?.provider || item?.name)).filter(Boolean));
            const currentIds = new Set(providers.map(item=>item.id));
            const staleLegacyIds = legacyIds.filter(id=>!currentIds.has(id) && !otherReferencedIds.has(id));
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>!((rule?.domain || []).includes(this.host) || (rule?.ingress || []).includes(this.ingress?.metadata?.name)));
            if(staleLegacyIds.length){
                const defaultConfig = this.ensureDefaultConfig(plugin);
                defaultConfig.providers = (defaultConfig.providers || []).filter(item=>!staleLegacyIds.includes(item?.id));
                plugin.spec.matchRules = plugin.spec.matchRules.filter(rule=>!staleLegacyIds.some(id=>(rule?.service || []).includes(this.providerServiceName(id)+'.dns') || (rule?.service || []).includes(this.providerServiceName(id)+'.static')));
                for(const id of staleLegacyIds){
                    await this.removeMcpBridgeRegistry(this.providerServiceName(id));
                }
            }
            providers.forEach(provider=>{
                this.upsertGlobalProvider(plugin, provider);
                this.upsertProviderServiceRule(plugin, provider);
            });
            const orphanProviderIds = this.pruneOrphanManagedProviderRules(plugin);
            for(const id of orphanProviderIds){
                await this.removeMcpBridgeRegistry(this.providerServiceName(id));
            }
            for(const provider of providers){
                await this.upsertMcpBridgeRegistry(provider);
            }
            await this.savePlugin(plugin);
            this.providers = providers;
            await this.syncIngressRouteState(providers);
        },
        async syncProviderResources(form, providerList){
            const nextProvider = this.providerFormToProvider(form);
            const nextProviders = providerList || this.providers.filter(item=>item.id != nextProvider.id && item.id != form.originalId).concat([nextProvider]);
            await this.syncRuleProviders(nextProviders);
        },
        async removeProviderResources(providerName, nextProviders){
            const plugin = this.requirePlugin();
            const defaultConfig = this.ensureDefaultConfig(plugin);
            const providerId = this.providers.find(item=>item.name == providerName)?.id || providerResourceId(this.ingress.metadata.name, providerName);
            defaultConfig.providers = (defaultConfig.providers || []).filter(item=>item?.id != providerId);
            const serviceName = this.providerServiceName(providerId);
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                return !((rule?.service || []).includes(serviceName + '.dns') || (rule?.service || []).includes(serviceName + '.static'));
            });
            await this.removeMcpBridgeRegistry(serviceName);
            await this.savePlugin(plugin);
            await this.syncRuleProviders(nextProviders);
        },
        ensureDefaultConfig(plugin){
            plugin.spec = plugin.spec || {};
            // Provider 定义按 Higress 协议集中存放，但域名配置不应改写插件全局开关。
            plugin.spec.defaultConfig = plugin.spec.defaultConfig || {};
            plugin.spec.defaultConfig.providers = plugin.spec.defaultConfig.providers || [];
            plugin.spec.matchRules = plugin.spec.matchRules || [];
            return plugin.spec.defaultConfig;
        },
        pruneOrphanManagedProviderRules(plugin){
            const providerIds = new Set((plugin?.spec?.defaultConfig?.providers || []).map(item=>item?.id).filter(Boolean));
            const orphanIds = new Set();
            plugin.spec.matchRules = (plugin.spec.matchRules || []).filter(rule=>{
                const activeProviderId = String(rule?.config?.activeProviderId || '');
                if(!activeProviderId.startsWith('ai-scope-') || providerIds.has(activeProviderId)) return true;
                orphanIds.add(activeProviderId);
                return false;
            });
            return [...orphanIds];
        },
        upsertGlobalProvider(plugin, provider){
            const defaultConfig = this.ensureDefaultConfig(plugin);
            const providers = defaultConfig.providers;
            const index = providers.findIndex(item=>item?.id == provider.id);
            const config = this.providerToPluginConfig(provider);
            if(index > -1) providers.splice(index, 1, config);
            else providers.push(config);
        },
        upsertProviderServiceRule(plugin, provider){
            plugin.spec.matchRules = plugin.spec.matchRules || [];
            const serviceName = this.providerUpstreamService(provider);
            const serviceBaseName = this.providerServiceName(provider.id);
            plugin.spec.matchRules = plugin.spec.matchRules.filter(rule=>{
                const services = rule?.service || [];
                return !services.includes(serviceBaseName + '.dns') && !services.includes(serviceBaseName + '.static');
            });
            const rule = {
                service: [serviceName],
                config: { activeProviderId: provider.id },
                configDisable: false,
            };
            plugin.spec.matchRules.push(rule);
        },
        providerFormToProvider(form){
            const rawConfigs = this.normalizeProviderRawConfigs(form.type, form.rawConfigs, form);
            return {
                id: providerResourceId(this.ingress.metadata.name, form.name),
                name: form.name,
                type: form.type || 'openai',
                protocol: form.protocol || 'openai/v1',
                tokens: compact(form.tokens).length ? compact(form.tokens) : compact(form.oldTokens),
                endpointUrl: this.configEndpointUrl({ ...rawConfigs, type: form.type }) || this.providerEndpointPlaceholder(form.type),
                rawConfigs,
                proxyName: form.proxyName || '',
                weight: Number(form.weight) || 0,
                enabled: form.enabled !== false,
            };
        },
        providerToPluginConfig(provider){
            const config = clone(provider.rawConfigs);
            config.id = provider.id;
            config.type = provider.type;
            config.protocol = this.pluginProtocol(provider.protocol);
            const tokens = compact(provider.tokens);
            if(tokens.length) config.apiTokens = tokens;
            else delete config.apiTokens;
            delete config.modelMapping;
            delete config.proxyName;
            this.applyEndpointConfig(config, provider);
            return config;
        },
        providerConfigToForm(config, routeItem){
            const protocol = config.protocol == 'original' ? 'original' : 'openai/v1';
            return {
                rawConfigs: { ...this.defaultRawConfigs(config.type || routeItem?.type || 'openai'), ...clone(config) },
                type: config.type || routeItem?.type || 'openai',
                protocol,
                tokens: config.apiTokens || [],
                endpointUrl: this.configEndpointUrl(config),
            };
        },
        pluginProtocol(protocol){
            return protocol == 'original' ? 'original' : 'openai';
        },
        applyEndpointConfig(config, provider){
            const endpoint = String(provider.endpointUrl || '').trim();
            if(provider.type == 'openai'){
                if(!config.openaiCustomUrl && endpoint && endpoint != DEFAULT_ENDPOINTS.openai) config.openaiCustomUrl = endpoint;
            }else if(provider.type == 'qwen'){
                const host = this.urlHost(config.qwenDomain);
                if(host) config.qwenDomain = host;
                else delete config.qwenDomain;
                config.qwenEnableCompatible = config.qwenEnableCompatible !== false;
                config.qwenEnableSearch = !!config.qwenEnableSearch;
                config.qwenFileIds = compact(config.qwenFileIds);
                if(!config.qwenFileIds.length) delete config.qwenFileIds;
            }else if(provider.type == 'azure'){
                config.azureServiceUrl = endpoint;
            }else if(provider.type == 'claude'){
                if(!config.claudeCustomUrl && endpoint && endpoint != DEFAULT_ENDPOINTS.claude) config.claudeCustomUrl = endpoint;
                if(!config.claudeVersion) config.claudeVersion = '2023-06-01';
                config.claudeCodeMode = !!config.claudeCodeMode;
            }else if(provider.type == 'ollama'){
                const url = this.parseUrl(endpoint);
                config.ollamaServerHost = String(config.ollamaServerHost || url?.hostname || endpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')).trim();
                config.ollamaServerPort = Number(config.ollamaServerPort || url?.port || 11434);
            }else if(provider.type == 'vllm'){
                config.vllmCustomUrl = String(config.vllmCustomUrl || endpoint || '').trim();
                config.vllmExtraCustomUrls = compact(config.vllmExtraCustomUrls);
                if(!config.vllmExtraCustomUrls.length) delete config.vllmExtraCustomUrls;
            }else if(provider.type == 'zhipuai'){
                const host = this.urlHost(config.zhipuDomain) || this.urlHost(endpoint || DEFAULT_ENDPOINTS.zhipuai);
                if(host && host != 'open.bigmodel.cn') config.zhipuDomain = host;
                else delete config.zhipuDomain;
                config.zhipuCodePlanMode = config.zhipuCodePlanMode !== false;
            }else if(provider.type == 'bedrock'){
                config.awsRegion = String(config.awsRegion || 'us-east-1').trim();
                config.awsAccessKey = String(config.awsAccessKey || '').trim();
                config.awsSecretKey = String(config.awsSecretKey || '').trim();
            }else if(provider.type == 'vertex'){
                config.vertexRegion = String(config.vertexRegion || 'global').trim().toLowerCase();
                config.vertexProjectId = String(config.vertexProjectId || '').trim();
                config.vertexAuthKey = String(config.vertexAuthKey || '').trim();
                config.vertexAuthServiceName = 'vertex-auth.internal';
            }
        },
        configEndpointUrl(config){
            if(config.openaiCustomUrl) return config.openaiCustomUrl;
            if(config.azureServiceUrl) return config.azureServiceUrl;
            if(config.claudeCustomUrl) return config.claudeCustomUrl;
            if(config.vllmCustomUrl) return config.vllmCustomUrl;
            if(config.ollamaServerHost) return 'http://' + config.ollamaServerHost + ':' + (config.ollamaServerPort || 11434);
            if(config.type == 'qwen' || config.qwenDomain) return 'https://' + (config.qwenDomain || 'dashscope.aliyuncs.com') + '/' + (config.qwenEnableCompatible === false ? 'api/v1/services/aigc' : 'compatible-mode/v1');
            if(config.zhipuDomain) return 'https://' + config.zhipuDomain;
            if(config.awsRegion) return 'https://bedrock-runtime.' + config.awsRegion + '.amazonaws.com';
            if(config.vertexRegion) return config.vertexRegion == 'global' ? 'https://aiplatform.googleapis.com' : 'https://' + config.vertexRegion + '-aiplatform.googleapis.com';
            return DEFAULT_ENDPOINTS[config.type] || '';
        },
        normalizeProviderRawConfigs(type, rawConfigs, form = {}){
            const config = clone(rawConfigs || {});
            delete config.id;
            delete config.type;
            delete config.protocol;
            delete config.apiTokens;
            if(type == 'openai'){
                if(form.serverType == 'custom'){
                    if(form.customServerType == 'service'){
                        const selected = this.providerServiceOptions.find(item=>item.value == config.openaiCustomService);
                        const match = String(config.openaiCustomService || '').match(/^([^/]+)\/([^:]+):(\d+)$/);
                        const namespace = selected?.namespace || match?.[1] || this.namespaceActive;
                        const name = selected?.name || match?.[2] || '';
                        const port = Number(selected?.port || match?.[3] || 80);
                        const protocol = selected?.protocol || 'http';
                        const serviceName = name + '.' + namespace + '.svc.cluster.local';
                        let path = String(config.openaiCustomServicePath || '/').trim();
                        if(!path.startsWith('/')) path = '/' + path;
                        const customHost = String(config.openaiCustomServiceHost || '').trim();
                        const host = customHost || serviceName;
                        const portSegment = (protocol == 'http' && port == 80) || (protocol == 'https' && port == 443) ? '' : ':' + port;
                        config.openaiCustomUrl = protocol + '://' + host + portSegment + path;
                        config.openaiCustomServiceName = serviceName;
                        config.openaiCustomServicePort = port;
                        delete config.openaiExtraCustomUrls;
                    }else{
                        const urls = compact(config.openaiCustomUrls);
                        config.openaiCustomUrl = urls.shift() || '';
                        config.openaiExtraCustomUrls = urls;
                        delete config.openaiCustomServiceName;
                        delete config.openaiCustomServicePort;
                    }
                }else{
                    delete config.openaiCustomUrl;
                    delete config.openaiExtraCustomUrls;
                    delete config.openaiCustomServiceName;
                    delete config.openaiCustomServicePort;
                }
                delete config.openaiCustomUrls;
                delete config.openaiCustomService;
                delete config.openaiCustomServiceHost;
                delete config.openaiCustomServicePath;
            }else if(type == 'qwen'){
                config.qwenDomain = this.urlHost(config.qwenDomain);
                if(form.serverType != 'custom' || !config.qwenDomain) delete config.qwenDomain;
                config.qwenEnableCompatible = config.qwenEnableCompatible !== false;
                config.qwenEnableSearch = !!config.qwenEnableSearch;
                config.qwenFileIds = compact(config.qwenFileIds);
                if(!config.qwenFileIds.length) delete config.qwenFileIds;
                if(!config.reasoningContentMode) delete config.reasoningContentMode;
            }else if(type == 'azure'){
                config.azureServiceUrl = String(config.azureServiceUrl || '').trim();
            }else if(type == 'zhipuai'){
                config.zhipuDomain = this.urlHost(config.zhipuDomain);
                if(!config.zhipuDomain) delete config.zhipuDomain;
                config.zhipuCodePlanMode = config.zhipuCodePlanMode !== false;
            }else if(type == 'claude'){
                if(form.serverType == 'custom') config.claudeCustomUrl = String(config.claudeCustomUrl || '').trim();
                else delete config.claudeCustomUrl;
                delete config.providerDomain;
                delete config.providerBasePath;
                config.claudeVersion = String(config.claudeVersion || '2023-06-01').trim();
                config.claudeCodeMode = !!config.claudeCodeMode;
            }else if(type == 'ollama'){
                config.ollamaServerHost = String(config.ollamaServerHost || '').trim();
                config.ollamaServerPort = Number(config.ollamaServerPort || 11434);
            }else if(type == 'vllm'){
                const urls = compact(config.vllmCustomUrls);
                config.vllmCustomUrl = urls.shift() || '';
                config.vllmExtraCustomUrls = urls;
                if(!config.vllmExtraCustomUrls.length) delete config.vllmExtraCustomUrls;
                delete config.vllmCustomUrls;
            }else if(type == 'vertex' && !config.vertexTokenRefreshAhead){
                delete config.vertexTokenRefreshAhead;
            }
            if(type == 'vertex'){
                delete config.geminiSafetySetting;
                delete config.geminiSafetySettings;
                (form.safetySettings || []).forEach(item=>{
                    if(!item.category || !item.threshold) return;
                    config.geminiSafetySetting = config.geminiSafetySetting || {};
                    config.geminiSafetySetting[item.category] = item.threshold;
                });
            }
            if(config.firstByteTimeout === undefined || config.firstByteTimeout === null || config.firstByteTimeout === '') delete config.firstByteTimeout;
            if(form.failoverEnabled){
                config.failover = { ...clone(form.failover), enabled: true };
                config.retryOnFailure = { enabled: true };
            }else{
                delete config.failover;
                delete config.retryOnFailure;
            }
            return config;
        },
        providerServiceName(providerName){
            return providerServiceName(providerName);
        },
        providerUpstreamService(provider){
            return this.providerServiceName(provider.id) + '.' + this.providerRegistryType(provider);
        },
        providerRegistryType(provider){
            const endpoint = this.providerEndpoint(provider);
            const host = endpoint?.hostname || '';
            return /^\d+\.\d+\.\d+\.\d+$/.test(host) ? 'static' : 'dns';
        },
        providerEndpoint(provider){
            return this.providerEndpoints(provider)[0] || null;
        },
        providerEndpoints(provider){
            const config = provider.rawConfigs || {};
            let values = [];
            if(provider.type == 'openai' && config.openaiCustomServiceName){
                const customUrl = this.parseUrl(config.openaiCustomUrl);
                const protocol = customUrl?.protocol || 'http:';
                const port = Number(config.openaiCustomServicePort || (protocol == 'https:' ? 443 : 80));
                const portSegment = (protocol == 'http:' && port == 80) || (protocol == 'https:' && port == 443) ? '' : ':' + port;
                values = [protocol + '//' + config.openaiCustomServiceName + portSegment + (customUrl?.pathname || '/')];
            }else if(provider.type == 'openai' && config.openaiCustomUrl){
                values = [config.openaiCustomUrl, ...(config.openaiExtraCustomUrls || [])];
            }else if(provider.type == 'vllm' && config.vllmCustomUrl){
                values = [config.vllmCustomUrl, ...(config.vllmExtraCustomUrls || [])];
            }else{
                values = [provider.endpointUrl || this.configEndpointUrl(this.providerToPluginConfig(provider)) || DEFAULT_ENDPOINTS[provider.type]];
            }
            return compact(values).map(value=>this.parseUrl(value)).filter(Boolean);
        },
        async getMcpBridge(){
            return k8sproxy.get('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, { noAlert: true }).then(res=>res.data).catch(()=>null);
        },
        async ensureMcpBridge(){
            const old = await this.getMcpBridge();
            if(old) return old;
            const data = {
                apiVersion: 'networking.higress.io/v1',
                kind: 'McpBridge',
                metadata: { name: MCPBRIDGE_NAME, namespace: PLUGIN_NAMESPACE },
                spec: { registries: [], proxies: [] },
            };
            return k8sproxy.post('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges', data).then(res=>res.data);
        },
        async upsertMcpBridgeRegistry(provider){
            const mcp = await this.ensureMcpBridge();
            mcp.spec = mcp.spec || {};
            mcp.spec.registries = mcp.spec.registries || [];
            mcp.spec.proxies = mcp.spec.proxies || [];
            const registries = this.providerRegistries(provider);
            registries.forEach(registry=>{
                const index = mcp.spec.registries.findIndex(item=>item?.name == registry.name);
                if(index > -1) mcp.spec.registries.splice(index, 1, registry);
                else mcp.spec.registries.push(registry);
            });
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        async removeMcpBridgeRegistry(serviceName){
            const mcp = await this.getMcpBridge();
            if(!mcp?.spec?.registries) return;
            mcp.spec.registries = mcp.spec.registries.filter(item=>item?.name != serviceName);
            await k8sproxy.put('/apis/networking.higress.io/v1/namespaces/'+PLUGIN_NAMESPACE+'/mcpbridges/'+MCPBRIDGE_NAME, mcp);
        },
        providerRegistry(provider){
            const defaultEndpoint = DEFAULT_PROVIDER_ENDPOINTS[provider.type];
            if(defaultEndpoint && !provider.endpointUrl){
                const registry = {
                    name: this.providerServiceName(provider.id),
                    type: 'dns',
                    protocol: defaultEndpoint.protocol,
                    domain: defaultEndpoint.domain,
                    port: defaultEndpoint.port,
                };
                if(provider.proxyName) registry.proxyName = provider.proxyName;
                return registry;
            }
            const endpoints = this.providerEndpoints(provider);
            const endpoint = endpoints[0];
            const protocol = endpoint?.protocol?.replace(':','') || 'https';
            const host = endpoint?.hostname || '';
            const port = Number(endpoint?.port || (protocol == 'http' ? 80 : 443));
            const type = this.providerRegistryType(provider);
            const staticDomains = endpoints.map(item=>{
                const itemProtocol = item.protocol.replace(':','');
                const itemPort = Number(item.port || (itemProtocol == 'http' ? 80 : 443));
                return item.hostname + ':' + itemPort;
            });
            const registry = {
                name: this.providerServiceName(provider.id),
                type,
                protocol,
                domain: type == 'static' ? staticDomains.join(',') : host,
                port: type == 'static' ? 80 : port,
            };
            if(provider.proxyName) registry.proxyName = provider.proxyName;
            return registry;
        },
        providerRegistries(provider){
            const registries = [this.providerRegistry(provider)];
            if(provider.type == 'vertex'){
                registries.push({
                    name: 'vertex-auth.internal',
                    type: 'dns',
                    protocol: 'https',
                    domain: 'oauth2.googleapis.com',
                    port: 443,
                });
            }
            return registries;
        },
        async syncIngressRouteState(providerList){
            if(!this.ingress) return;
            const ingress = clone(this.ingress);
            ingress.metadata = ingress.metadata || {};
            ingress.metadata.annotations = ingress.metadata.annotations || {};
            ingress.metadata.annotations[AI_MODELS_ANNOTATION] = JSON.stringify(compact(this.routeForm.models));
            ingress.metadata.annotations[AI_AUTH_ANNOTATION] = String(!!this.routeForm.authEnabled);
            ingress.metadata.annotations[AI_PROVIDERS_ANNOTATION] = JSON.stringify((providerList || []).map(item=>({
                id: item.id,
                name: item.name,
                weight: Number(item.weight) || 0,
                enabled: item.enabled !== false,
            })));
            const destination = this.providerDestination(providerList);
            if(destination) ingress.metadata.annotations['higress.io/destination'] = destination;
            else delete ingress.metadata.annotations['higress.io/destination'];
            await k8sproxy.put('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+ingress.metadata.name, ingress);
            this.ingress = ingress;
        },
        async syncIngressAuthState(){
            if(!this.ingress) return;
            const ingress = clone(this.ingress);
            ingress.metadata = ingress.metadata || {};
            ingress.metadata.annotations = ingress.metadata.annotations || {};
            ingress.metadata.annotations[AI_AUTH_ANNOTATION] = String(!!this.routeForm.authEnabled);
            await k8sproxy.put('/apis/networking.k8s.io/v1/namespaces/'+this.namespaceActive+'/ingresses/'+ingress.metadata.name, ingress);
            this.ingress = ingress;
        },
        providerDestination(providerList){
            const enabledProviders = (providerList || []).filter(item=>item.enabled !== false);
            if(!enabledProviders.length) return '';
            const lines = enabledProviders.map(item=>{
                const registry = this.providerRegistry(item);
                const service = this.providerUpstreamService(item) + ':' + registry.port;
                if(enabledProviders.length == 1) return service;
                return (Number(item.weight) || 0) + '% ' + service;
            });
            return lines.join('\n');
        },
        parseUrl(value){
            if(!value) return null;
            try { return new URL(value); } catch { return null; }
        },
        urlHost(value){
            const url = this.parseUrl(value);
            return url?.hostname || String(value || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
        },
        changeProviderType(value){
            this.providerForm.endpointUrl = this.providerEndpointPlaceholder(value);
            this.providerForm.tokens = [''];
            this.providerForm.rawConfigs = this.defaultRawConfigs(value);
            this.providerForm.serverType = 'official';
            this.providerForm.customServerType = 'url';
            this.providerForm.failoverEnabled = false;
            this.providerForm.failover = this.defaultFailoverConfig();
            this.providerForm.safetySettings = [];
        },
        changeProviderServerType(value){
            if(value != 'custom') return;
            if(this.providerForm.type == 'openai' && !this.providerForm.rawConfigs.openaiCustomUrls?.length){
                this.providerForm.rawConfigs.openaiCustomUrls = [''];
            }
            if(this.providerForm.type == 'claude' && !this.providerForm.rawConfigs.claudeCustomUrl){
                this.providerForm.rawConfigs.claudeCustomUrl = '';
            }
        },
        removeProviderToken(index){
            if(this.providerForm.tokens.length <= 1) return;
            this.providerForm.tokens.splice(index, 1);
        },
        defaultFailoverConfig(){
            return clone(DEFAULT_FAILOVER_CONFIG);
        },
        defaultRawConfigs(type){
            if(type == 'bedrock') return { awsRegion: 'us-east-1', awsAccessKey: '', awsSecretKey: '' };
            if(type == 'vertex') return { vertexRegion: 'global', vertexProjectId: '', vertexAuthKey: '', vertexTokenRefreshAhead: undefined, firstByteTimeout: undefined };
            if(type == 'zhipuai') return { zhipuDomain: '', zhipuCodePlanMode: true };
            if(type == 'qwen') return { qwenDomain: '', qwenEnableCompatible: true, qwenEnableSearch: false, qwenFileIds: [], reasoningContentMode: undefined };
            if(type == 'claude') return { claudeCustomUrl: '', claudeVersion: '2023-06-01', claudeCodeMode: false };
            if(type == 'ollama') return { ollamaServerHost: '127.0.0.1', ollamaServerPort: 11434 };
            if(type == 'vllm') return { vllmCustomUrls: ['http://127.0.0.1:8000/v1'] };
            if(type == 'openai') return { openaiCustomUrls: [''] };
            if(type == 'azure') return { azureServiceUrl: '' };
            return { firstByteTimeout: undefined };
        },
        validateProviderConfig(form){
            const rawConfigs = form.rawConfigs || {};
            const tokens = compact(form.tokens).length ? compact(form.tokens) : compact(form.oldTokens);
            if(this.providerTokenRequired(form) && !tokens.length) return 'API Token 不能为空';
            if(form.type == 'openai' && form.serverType == 'custom'){
                if(form.customServerType == 'service'){
                    if(!rawConfigs.openaiCustomService) return '请选择 Kubernetes 服务';
                    if(!String(rawConfigs.openaiCustomServicePath || '').trim()) return 'Kubernetes 服务请求路径不能为空';
                }else{
                    const urlError = this.validateProviderUrls(rawConfigs.openaiCustomUrls, 'OpenAI 自定义服务 URL');
                    if(urlError) return urlError;
                }
            }
            if(form.type == 'qwen' && form.serverType == 'custom' && !String(rawConfigs.qwenDomain || '').trim()) return 'Qwen 自定义域名不能为空';
            if(form.type == 'qwen' && String(rawConfigs.qwenDomain || '').trim()){
                const rawDomain = String(rawConfigs.qwenDomain).trim();
                try {
                    const url = new URL(rawDomain.includes('://') ? rawDomain : 'https://' + rawDomain);
                    if(!url.hostname) return 'Qwen 自定义域名格式不正确';
                } catch {
                    return 'Qwen 自定义域名格式不正确';
                }
            }
            if(form.type == 'azure'){
                const endpoint = String(rawConfigs.azureServiceUrl || '').trim();
                if(!endpoint) return 'Azure 服务 URL 不能为空';
                try {
                    const url = new URL(endpoint);
                    if(!url.searchParams.get('api-version')) return 'Azure 服务 URL 必须包含 api-version 查询参数';
                } catch {
                    return 'Azure 服务 URL 格式不正确';
                }
            }
            if(form.type == 'claude' && form.serverType == 'custom'){
                const endpoint = String(rawConfigs.claudeCustomUrl || '').trim();
                if(!endpoint || !this.parseUrl(endpoint)) return 'Claude 自定义服务 URL 格式不正确';
            }
            if(form.type == 'ollama'){
                if(!rawConfigs.ollamaServerHost) return 'Ollama 服务主机名不能为空';
                if(!rawConfigs.ollamaServerPort) return 'Ollama 服务端口不能为空';
            }
            if(form.type == 'vllm'){
                const urlError = this.validateProviderUrls(rawConfigs.vllmCustomUrls, 'vLLM 服务 URL');
                if(urlError) return urlError;
            }
            if(form.type == 'bedrock'){
                if(!rawConfigs.awsRegion) return 'AWS 区域不能为空';
                if(!rawConfigs.awsAccessKey) return 'Access Key 不能为空';
                if(!rawConfigs.awsSecretKey) return 'Secret Key 不能为空';
            }
            if(form.type == 'vertex'){
                if(!rawConfigs.vertexRegion) return 'Vertex 区域不能为空';
                if(!rawConfigs.vertexProjectId) return '项目 ID 不能为空';
                if(!rawConfigs.vertexAuthKey) return '认证 JSON 不能为空';
                try {
                    const auth = JSON.parse(rawConfigs.vertexAuthKey);
                    if(!auth.client_email || !auth.private_key_id || !auth.private_key || !auth.token_uri){
                        return '认证 JSON 缺少 client_email/private_key_id/private_key/token_uri';
                    }
                } catch {
                    return '认证 JSON 格式不正确';
                }
                const categories = (form.safetySettings || []).map(item=>item.category).filter(Boolean);
                if((form.safetySettings || []).some(item=>!item.category || !item.threshold)) return 'Gemini 安全设置的类别和阈值不能为空';
                if(new Set(categories).size != categories.length) return 'Gemini 安全类别不能重复';
            }
            if(form.failoverEnabled){
                const failover = form.failover || {};
                if(!failover.failureThreshold || !failover.successThreshold || !failover.healthCheckInterval || !failover.healthCheckTimeout){
                    return 'Token 故障转移阈值和健康检查时间必须大于 0';
                }
                if(!String(failover.healthCheckModel || '').trim()) return '健康检查模型不能为空';
            }
            return '';
        },
        validateProviderUrls(values, label){
            const urls = compact(values);
            if(!urls.length || urls.length != (values || []).length) return label + '不能为空';
            let protocol = '';
            let path = '';
            for(const value of urls){
                const url = this.parseUrl(value);
                if(!url) return label + '格式不正确：' + value;
                if(urls.length > 1 && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return label + '配置多个地址时仅支持 IP 地址';
                if(protocol && protocol != url.protocol) return label + '的协议必须一致';
                if(path && path != url.pathname) return label + '的路径必须一致';
                protocol = url.protocol;
                path = url.pathname;
            }
            return '';
        },
        providerUsesCustomCredentials(type){
            return ['bedrock', 'vertex'].includes(type);
        },
        providerTokenRequired(form){
            if(['ollama', 'vllm', 'bedrock', 'vertex'].includes(form.type)) return false;
            if(form.type == 'openai' && form.serverType == 'custom') return false;
            if(form.type == 'claude' && form.serverType == 'custom') return false;
            return true;
        },
        providerModelOptions(type){
            return PROVIDER_MODEL_OPTIONS[type] || [];
        },
        providerEndpointPlaceholder(type){
            return PROVIDER_TYPES.find(i=>i.value == type)?.endpoint || '';
        },
        providerTypeLabel(type){
            return PROVIDER_TYPES.find(i=>i.value == type)?.label || type || '-';
        },
        domainToName(str){
            return String(str || '').replace(/\*/g,'x').replace(/(\.|\/|_|:|\s+)/g,'-').toLowerCase();
        },
        createConsumerName(){
            let name = '';
            do {
                name = 'consumer-' + Array.from(crypto.getRandomValues(new Uint8Array(6))).map(i=>('0'+i.toString(16)).slice(-2)).join('');
            } while(this.consumers.some(item=>item.name == name));
            return name;
        },
        createToken(){
            return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(i=>('0'+i.toString(16)).slice(-2)).join('');
        },
    },
}
</script>

<style scoped>
.consumer-config {
    width: 100%;
    max-width: 900px;
}

.consumer-table {
    width: 100%;
}

.consumer-token-list {
    width: 100%;
}

.provider-list-input,
.provider-safety-settings {
    width: 100%;
}

.provider-safety-settings .com-table {
    width: 100%;
}
</style>
