<template>
    <!-- 弹窗模式 -->
    <a-modal 
        v-if="mode === 'modal'"
        v-model:visible="visible"
        :title="title"
        :width="width + 'px'"
        :fullscreen="fullscreen"
        :closable="false"
        :show-close="false"
        class="log-modal"
        @open="onOpen"
        @close="onClose"
    >
        <template #title>
            <div class="df ai-c jc-c fc log-modal-title">
                <span class="fs-18">{{ title }}</span>
                <div class="df ai-c btns">
                    <div class="btn ml-20 cursor" @click="toggleFullscreen">
                        <icon-fullscreen v-if="!fullscreen" class="fs-20 c-66" />
                        <icon-fullscreen-exit v-else class="fs-20 c-66" />
                    </div>
                    <div class="btn ml-20 cursor" @click="closeModal">
                        <icon-close class="fs-20 c-66" />
                    </div>
                </div>
            </div>
        </template>
        
        <div class="log-toolbar">
            <div class="df ai-c">
                <div class="df ai-c">
                    <div>是否跟踪：</div>
                    <div class="ml-10">
                        <a-switch v-model="follow" :checked-value="true" :unchecked-value="false" @change="fetchLog" />
                    </div>
                </div>
                
                <div v-if="containerList.length > 1" class="df ai-c">
                    <div class="ml-20">容器：</div>
                    <div class="ml-10">
                        <a-select v-model="container" @change="fetchLog" style="min-width:150px;">
                            <a-option v-for="i in containerList" :key="i" :value="i">{{ i }}</a-option>
                        </a-select>
                    </div>
                </div>

                <div class="df ai-c">
                    <div class="ml-20">条数：</div>
                    <div class="ml-10">
                        <a-select v-model="tailLines" @change="fetchLog" style="min-width:100px;">
                            <a-option :value="50">50条</a-option>
                            <a-option :value="100">100条</a-option>
                            <a-option :value="200">200条</a-option>
                            <a-option :value="500">500条</a-option>
                            <a-option :value="1000">1000条</a-option>
                            <a-option :value="2000">2000条</a-option>
                        </a-select>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="log-terminal" :id="termId" :style="{ height: (fullscreen ? 'calc(100vh - 114px)' : height + 'px') }"></div>
    </a-modal>

    <!-- 页面嵌入模式 -->
    <div v-else class="pod-log-inline" :style="{ height: height + 'px' }">
        <div class="log-toolbar">
            <div class="df ai-c">
                <div class="df ai-c">
                    <div>是否跟踪：</div>
                    <div class="ml-10">
                        <a-switch v-model="follow" :checked-value="true" :unchecked-value="false" @change="fetchLog" />
                    </div>
                </div>
                
                <div v-if="containerList.length > 1" class="df ai-c">
                    <div class="ml-20">容器：</div>
                    <div class="ml-10">
                        <a-select v-model="container" @change="fetchLog" style="min-width:150px;">
                            <a-option v-for="i in containerList" :key="i" :value="i">{{ i }}</a-option>
                        </a-select>
                    </div>
                </div>

                <div class="df ai-c">
                    <div class="ml-20">条数：</div>
                    <div class="ml-10">
                        <a-select v-model="tailLines" @change="fetchLog" style="min-width:100px;">
                            <a-option :value="50">50条</a-option>
                            <a-option :value="100">100条</a-option>
                            <a-option :value="200">200条</a-option>
                            <a-option :value="500">500条</a-option>
                            <a-option :value="1000">1000条</a-option>
                            <a-option :value="2000">2000条</a-option>
                        </a-select>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="log-terminal" :id="termId"></div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken } from '@/utils/auth';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';

export default {
    name: 'PodLog',
    props: {
        show: {
            type: Boolean,
            required: true,
        },
        // Pod 信息
        podName: {
            type: String,
            default: '',
        },
        // 兼容原有 data 格式
        data: {
            type: Object,
            default: null,
        },
        // 命名空间
        namespace: {
            type: String,
            default: '',
        },
        // 默认容器
        container: {
            type: String,
            default: '',
        },
        // 容器列表（外部有时直接传入）
        containers: {
            type: Array,
            default: null,
        },
        // 默认日志行数
        tailLines: {
            type: Number,
            default: 100,
        },
        // 自定义 Token
        token: {
            type: String,
            default: '',
        },
        // 是否 local 模式
        local: {
            type: Boolean,
            default: false,
        },
        // 显示模式
        mode: {
            type: String,
            default: 'modal', // 'modal' | 'inline'
        },
        // 弹窗标题
        title: {
            type: String,
            default: '查看日志',
        },
        // 弹窗宽度
        width: {
            type: Number,
            default: 1000,
        },
        // 终端高度
        height: {
            type: Number,
            default: 400,
        },
    },
    emits: ['close'],
    data() {
        return {
            visible: false,
            follow: true,
            fullscreen: false,
            term: null,
            fitAddon: null,
            controller: null,
            termId: 'pod-log-' + Math.random().toString(36).substring(2, 10),
            containerList: [],
            podcont: '',
        };
    },
    computed: {
        currentNamespace() {
            return this.namespace || useNamespaceStore().namespace;
        },
        currentContainer() {
            return this.container || '';
        },
    },
    watch: {
        show: {
            immediate: true,
            handler(val) {
                this.visible = val;
                if (val) {
                    this.initData();
                } else {
                    this.cleanup();
                }
            },
        },
        visible(val) {
            if (!val) {
                this.$emit('close');
            }
        },
    },
    created() {
    },
    beforeUnmount() {
        this.cleanup();
    },
    methods: {
        initData() {
            // 解析 data 或使用 props
            let podName = this.podName;
            let containerList = this.containers;
            
            if (this.data) {
                podName = this.data.name || this.podName;
                containerList = this.data.containerList || this.containers;
            }

            if (!podName) return;

            // 如果有容器列表，直接使用
            if (containerList && containerList.length > 0) {
                this.containerList = containerList.map(c => typeof c === 'string' ? c : c.name);
                this.$nextTick(() => {
                    this.fetchContainerInfo(podName);
                });
            } else {
                // 自动获取容器列表
                this.fetchContainerInfo(podName);
            }
        },
        fetchContainerInfo(podName) {
            const params = { local: this.local ? 1 : undefined };
            k8sproxy.get(`/api/v1/namespaces/${this.currentNamespace}/pods/${podName}`, {
                params,
                noAlert: true,
            }).then(res => {
                const pod = res?.data;
                if (!pod) return;

                // 获取所有容器
                const containers = [
                    ...(pod.spec?.initContainers || []),
                    ...(pod.spec?.containers || []),
                ];
                
                this.containerList = containers.map(c => c.name);
                
                // 设置默认容器
                if (!this.container && this.containerList.length > 0) {
                    this.container = this.containerList[0];
                }
                
                this.fetchLog();
            }).catch(err => {
                console.error('Failed to get pod info:', err);
            });
        },
        onOpen() {
            // 不在这里初始化，watch(show) 已处理
        },
        onClose() {
            this.cleanup();
        },
        initTerm() {
            if (this.term) return;
            
            const dom = document.getElementById(this.termId);
            if (!dom) return;
            
            dom.innerHTML = '';
            this.term = new Terminal({
                cursorBlink: false,
            });
            this.term.open(dom);

            this.fitAddon = new FitAddon();
            this.term.loadAddon(this.fitAddon);
            this.fitAddon.fit();
        },
        cleanup() {
            this.stopStream();
            this.disposeTerm();
        },
        stopStream() {
            if (this.controller) {
                this.controller.abort();
                this.controller = null;
            }
        },
        disposeTerm() {
            try {
                if (this.term) {
                    this.term.dispose();
                    this.term = null;
                }
                this.fitAddon = null;
            } catch (e) {
                this.term = null;
                this.fitAddon = null;
            }
        },
        closeModal() {
            this.visible = false;
        },
        toggleFullscreen() {
            this.fullscreen = !this.fullscreen;
            this.$nextTick(() => {
                this.term = null;
                this.initTerm();
            });
        },
        fetchLog() {
            let podName = this.podName;
            if (this.data) {
                podName = this.data.name || this.podName;
            }
            
            if (!podName) return;

            this.stopStream();
            this.podcont = '';
            this.term?.reset();
            
            // 确保终端已初始化（streamLog 不会自动初始化）
            this.initTerm();

            // 构建查询参数
            const params = {
                follow: this.follow,
                tailLines: this.tailLines,
                ...(this.currentContainer ? { container: this.currentContainer } : {}),
                ...(this.local ? { local: 1 } : {}),
            };

            if (!this.follow) {
                // 非跟踪模式：一次性获取
                k8sproxy.get(`/api/v1/namespaces/${this.currentNamespace}/pods/${podName}/log`, {
                    params,
                    customToken: this.token || undefined,
                    noAlert: true,
                }).then(res => {
                    this.podcont = res?.data || '';
                    this.displayLog(this.podcont);
                }).catch(err => {
                    console.error('Failed to get log:', err);
                });
            } else {
                // 跟踪模式：流式获取
                this.streamLog(podName, params);
            }
        },
        streamLog(podName, params) {
            const queryString = new URLSearchParams(
                Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
            ).toString();

            const url = `/k8s-proxy/api/v1/namespaces/${this.currentNamespace}/pods/${podName}/log?${queryString}`;

            this.controller = new AbortController();
            const authToken = this.token || getToken();

            fetch(url, {
                signal: this.controller.signal,
                headers: {
                    accept: 'application/json, text/plain, */*',
                    ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
                },
            }).then(response => {
                if (!response?.ok || !response.body) {
                    console.error('Stream response error:', response?.status);
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');

                const readStream = () => {
                    return reader.read().then(({ done, value }) => {
                        if (done) return;
                        if (!this.follow || !this.visible) {
                            this.controller.abort();
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        this.writeChunk(chunk);
                        return readStream();
                    });
                };
                return readStream();
            }).catch(error => {
                if (error.name === 'AbortError' || error.code === 20) return;
                console.error('Log stream error:', error);
            });
        },
        writeChunk(chunk) {
            if (!this.term) return;
            
            let text = chunk.replace(/\x20+/g, ' ');
            text = text.replace(/(?<!\r)\n/g, '\r\n');
            this.term.write(text);
        },
        displayLog(text) {
            if (!this.term) return;
            
            this.initTerm();
            
            let displayText = text.replace(/\x20+/g, ' ');
            displayText = displayText.replace(/(?<!\r)\n/g, '\r\n');
            
            this.term.reset();
            this.term.write(displayText);
            
            this.$nextTick(() => {
                this.fitAddon?.fit();
            });
        },
    },
};
</script>

<style scoped>
.log-toolbar {
    margin-bottom: 10px;
}

.log-terminal {
    width: 100%;
}

.pod-log-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.pod-log-inline .log-terminal {
    flex: 1;
}

.log-modal .arco-modal-body {
    padding: 10px;
}

.log-modal .log-modal-title {
    position: relative;
    height: 44px;
}

.log-modal .log-modal-title .btns {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
}

.log-modal .arco-modal-fullscreen .arco-modal-body {
    height: calc(100vh - 114px);
}

.log-modal .arco-modal-fullscreen .arco-modal-body > .df {
    height: 100%;
}

.log-modal .arco-modal-fullscreen .log-terminal {
    height: 100%;
}
</style>
