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
        class="job-log-modal"
        @open="onOpen"
        @close="onClose"
    >
        <template #title>
            <div class="df ai-c jc-c fc job-log-modal-title">
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
        
        <div class="job-log-content">
            <!-- 左侧执行记录 Tab -->
            <div v-if="showTabs && list.length > 0" class="job-log-tabs">
                <a-tabs v-model:active-key="activeIndex" position="left" class="logtabs" @change="onTabChange">
                    <a-tab-pane v-for="(item, index) in list" :key="index">
                        <template #title>
                            <span>{{ item.startTime }}</span>
                            <span class="ml-10">{{ item.duration }}</span>
                        </template>
                    </a-tab-pane>
                </a-tabs>
            </div>
            
            <!-- 右侧日志区域 -->
            <div class="job-log-main">
                <div v-if="loading || !hasJobRecords" class="job-log-state">
                    <a-spin v-if="loading" />
                    <span>{{ loading ? '加载中...' : '无数据' }}</span>
                </div>
                <template v-else>
                <div class="log-toolbar">
                    <div class="df ai-c">
                        <div class="df ai-c">
                            <div>是否跟踪：</div>
                            <div class="ml-10">
                                <a-switch v-model="follow" :checked-value="true" :unchecked-value="false" @change="fetchLog" />
                            </div>
                        </div>
                        
                        <!-- 始终显示容器选择器 -->
                        <div class="df ai-c">
                            <div class="ml-20">容器：</div>
                            <div class="ml-10">
                                <a-select v-model="currentContainer" @change="fetchLog" style="min-width:150px;" placeholder="">
                                    <a-option v-for="i in containerList" :key="i" :value="i">{{ i }}</a-option>
                                </a-select>
                            </div>
                        </div>

                        <div class="df ai-c">
                            <div class="ml-20">条数：</div>
                            <div class="ml-10">
                                <a-select v-model="currentTailLines" @change="fetchLog" style="min-width:100px;">
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
                
                <div class="log-terminal" ref="termbox"></div>
                </template>
            </div>
        </div>
    </a-modal>

    <!-- 页面嵌入模式 -->
    <div v-else class="job-log-inline" :style="{ height: height + 'px' }">
        <div class="job-log-content" style="height: 100%;">
            <!-- 左侧执行记录 Tab -->
            <div v-if="showTabs && list.length > 0" class="job-log-tabs">
                <a-tabs v-model:active-key="activeIndex" position="left" class="logtabs" @change="onTabChange">
                    <a-tab-pane v-for="(item, index) in list" :key="index">
                        <template #title>
                            <span>{{ item.startTime }}</span>
                            <span class="ml-10">{{ item.duration }}</span>
                        </template>
                    </a-tab-pane>
                </a-tabs>
            </div>
            
            <!-- 右侧日志区域 -->
            <div class="job-log-main">
                <div v-if="loading || !hasJobRecords" class="job-log-state">
                    <a-spin v-if="loading" />
                    <span>{{ loading ? '加载中...' : '无数据' }}</span>
                </div>
                <template v-else>
                <div class="log-toolbar">
                    <div class="df ai-c">
                        <div class="df ai-c">
                            <div>是否跟踪：</div>
                            <div class="ml-10">
                                <a-switch v-model="follow" :checked-value="true" :unchecked-value="false" @change="fetchLog" />
                            </div>
                        </div>
                        
                        <!-- 始终显示容器选择器 -->
                        <div class="df ai-c">
                            <div class="ml-20">容器：</div>
                            <div class="ml-10">
                                <a-select v-model="currentContainer" @change="fetchLog" style="min-width:150px;" placeholder="">
                                    <a-option v-for="i in containerList" :key="i" :value="i">{{ i }}</a-option>
                                </a-select>
                            </div>
                        </div>

                        <div class="df ai-c">
                            <div class="ml-20">条数：</div>
                            <div class="ml-10">
                                <a-select v-model="currentTailLines" @change="fetchLog" style="min-width:100px;">
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
                
                <div class="log-terminal" ref="termbox" style="flex: 1;"></div>
                </template>
            </div>
        </div>
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
    name: 'JobLog',
    props: {
        show: {
            type: Boolean,
            required: true,
        },
        // Job 名称（兼容原有 name prop）
        jobName: {
            type: String,
            default: '',
        },
        jobList: {
            type: Array,
            default: () => [],
        },
        // 兼容原有 name prop
        name: {
            type: String,
            default: '',
        },
        // 命名空间
        namespace: {
            type: String,
            default: '',
        },
        // Pod Label 选择器
        labelSelector: {
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
            default: '执行记录',
        },
        // 弹窗宽度
        width: {
            type: Number,
            default: 1100,
        },
        // 终端高度
        height: {
            type: Number,
            default: 400,
        },
        // 是否显示左侧 Tab
        showTabs: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['close'],
    data() {
        return {
            visible: false,
            follow: true,
            fullscreen: false,
            tailLinesOption: 100,
            currentTailLines: 100,
            term: null,
            fitAddon: null,
            controller: null,
            containerList: [],
            container: '',
            currentContainer: '',
            list: [],
            activeIndex: 0,
            currentPodName: '',
            podcont: '',
            currentJobName: '',
            loading: false,
        };
    },
    computed: {
        currentNamespace() {
            return this.namespace || useNamespaceStore().namespace;
        },
        hasJobRecords() {
            return this.list.length > 0;
        },
        // currentJobName() {
        //     return this.jobName || this.name;
        // },
    },
    watch: {
        name(){
            this.currentJobName = this.jobName || this.name;
        },
        jobName(){
            this.currentJobName = this.jobName || this.name;
        },
        show: {
            immediate: true,
            handler(val) {
                this.visible = val;
                if (val) {
                    this.init();
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
        this.currentJobName = this.jobName || this.name;
        this.tailLinesOption = this.tailLines;
    },
    beforeUnmount() {
        this.cleanup();
    },
    methods: {
        init() {
            this.currentJobName = this.jobName || this.name;
            this.currentJobName = this.jobName || this.name;
            // 重置状态
            this.containerList = [];
            this.container = '';
            this.currentContainer = '';
            this.list = [];
            this.activeIndex = 0;
            this.currentPodName = '';
            this.podcont = '';
            this.loading = true;
            // 初始化 currentContainer（优先使用 prop）
            if (this.container && !this.currentContainer) {
                this.currentContainer = this.container;
            }
            // 初始化 currentTailLines（优先使用 prop）
            if (this.tailLines && this.currentTailLines === 100) {
                this.currentTailLines = this.tailLines;
            }

            this.fetchJobList();
        },
        onOpen() {
            // 等待动画完成后重新 fit 终端
            this.$nextTick(() => {
                setTimeout(() => {
                    this.fitAddon?.fit();
                }, 300);
            });
        },
        onClose() {
            this.cleanup();
        },
        initTerm() {
            if (this.term) return;

            this.$nextTick(() => {
                const dom = this.$refs.termbox;
                if (!dom) return;

                dom.innerHTML = '';
                this.term = new Terminal({
                    cursorBlink: false,
                });
                this.term.open(dom);

                this.fitAddon = new FitAddon();
                this.term.loadAddon(this.fitAddon);

                // 延迟 fit 确保 DOM 完全渲染
                this.$nextTick(() => {
                    this.fitAddon.fit();
                });
            });
        },
        cleanup() {
            this.stopStream();
            this.disposeTerm();
            // 重置状态
            this.containerList = [];
            this.container = '';
            this.list = [];
            this.activeIndex = 0;
            this.currentPodName = '';
            this.podcont = '';
            this.follow = true;
            this.loading = false;
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
                this.fitAddon?.fit();
            });
        },
        onTabChange() {
            this.currentJobName = this.list[this.activeIndex].name;
            this.fetchPodInfo();
            // this.stopStream();
            // this.fetchLog();
        },
        fetchJobList() {
            if(this.jobList.length>0){
                this.list = this.jobList;
                this.activeIndex = 0;
                this.currentJobName = this.list[0].name;
                this.loading = false;
                this.fetchPodInfo();
                return;
            }
            if (!this.currentJobName) {
                this.loading = false;
                return;
            }

            const params = { local: this.local ? 1 : undefined };
            k8sproxy.get(`/apis/batch/v1/namespaces/${this.currentNamespace}/jobs/${this.currentJobName}`, {
                params,
                noAlert: true,
            }).then(res => {
                const job = res?.data;
                if (!job) {
                    this.loading = false;
                    return;
                }

                // 解析 Job 信息
                const durationInSeconds = '';
                let finalDuration = durationInSeconds;
                if (job.status?.completionTime && job.status?.startTime) {
                    const st = new Date(job.status.startTime);
                    const ct = new Date(job.status.completionTime);
                    finalDuration = Math.floor((ct - st) / 1000) + '秒';
                }

                const statusClass = job.spec?.suspend ? 'c-99' : (job.status?.succeeded ? 'c-green' : 'c-red');
                const statusText = job.spec?.suspend ? '挂起' : (job.status?.succeeded ? '成功' : '失败');

                const item = {
                    title: job.metadata?.annotations?.title || job.metadata?.name,
                    name: job.metadata?.name,
                    startTime: job.status?.startTime ? window.formatDate(job.status.startTime) : '-',
                    stimes: job.status?.startTime ? new Date(job.status.startTime).getTime() : 0,
                    completionTime: job.status?.completionTime ? window.formatDate(job.status.completionTime) : '-',
                    duration: finalDuration,
                    suspend: job.spec?.suspend,
                    statusText,
                    statusClass,
                    dataItem: job,
                };

                this.list = [item];
                this.activeIndex = 0;
                this.loading = false;
                this.fetchPodInfo();
            }).catch(err => {
                console.error('Failed to get job:', err);
                this.loading = false;
            });
        },
        fetchPodInfo() {
            // 如果有外部传入的容器列表，直接使用
            if (this.containers && this.containers.length > 0) {
                this.containerList = this.containers.map(c => typeof c === 'string' ? c : c.name);
                if (this.containerList.length > 0) {
                    this.currentContainer = this.containerList[0];
                }
                this.fetchLog();
                return;
            }

            // 如果有 labelSelector，直接获取 Pod
            if (this.labelSelector) {
                this.fetchPodByLabel();
                return;
            }

            // 从 Job 的 selector 获取
            const job = this.list[this.activeIndex]?.dataItem;
            if (!job) return;

            const selector = job.spec?.selector?.matchLabels;
            if (!selector) {
                this.containerList = [];
                this.fetchLog();
                return;
            }

            const label = Object.keys(selector).map(key => `${key}=${selector[key]}`).join(',');
            this.fetchPodByLabel(label);
        },
        fetchPodByLabel(label = this.labelSelector) {
            if (!label) {
                this.containerList = [];
                this.fetchLog();
                return;
            }

            const params = {
                labelSelector: label,
                ...(this.local ? { local: 1 } : {}),
            };

            k8sproxy.get(`/api/v1/namespaces/${this.currentNamespace}/pods`, {
                params,
                noAlert: true,
            }).then(res => {
                const items = res?.data?.items || [];
                const first = items[0];
                if (!first) {
                    this.containerList = [];
                    this.fetchLog();
                    return;
                }

                this.currentPodName = first.metadata?.name;

                // 获取容器列表
                const containers = [
                    ...(first.spec?.initContainers || []),
                    ...(first.spec?.containers || []),
                ];
                this.containerList = containers.map(c => c.name);

                if (this.containerList.length > 0 && !this.currentContainer) {
                    this.currentContainer = this.containerList[0];
                }

                this.fetchLog();
            }).catch(err => {
                console.error('Failed to get pod:', err);
                this.containerList = [];
                this.fetchLog();
            });
        },
        fetchLog() {
            if (!this.currentPodName && !this.labelSelector) {
                // 无 Pod 时显示空
                this.displayLog('');
                return;
            }

            this.stopStream();
            this.podcont = '';
            this.term?.reset();
            
            // 确保终端已初始化
            this.initTerm();

            // 构建查询参数
            const params = {
                follow: this.follow,
                tailLines: this.currentTailLines,
                ...(this.currentContainer ? { container: this.currentContainer } : {}),
                ...(this.local ? { local: 1 } : {}),
            };

            if (!this.follow) {
                // 非跟踪模式：一次性获取
                k8sproxy.get(`/api/v1/namespaces/${this.currentNamespace}/pods/${this.currentPodName}/log`, {
                    params,
                    noAlert: true,
                }).then(res => {
                    this.podcont = res?.data || '';
                    this.displayLog(this.podcont);
                }).catch(err => {
                    console.error('Failed to get log:', err);
                });
            } else {
                // 跟踪模式：流式获取
                this.streamLog(this.currentPodName, params);
            }
        },
        streamLog(podName, params) {
            const queryString = new URLSearchParams(
                Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
            ).toString();

            const url = `/k8s-proxy/api/v1/namespaces/${this.currentNamespace}/pods/${podName}/log?${queryString}`;

            this.controller = new AbortController();
            const authToken = getToken();

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
            
            try {
                let text = chunk.replace(/\x20+/g, ' ');
                text = text.replace(/(?<!\r)\n/g, '\r\n');
                this.term.write(text);
            } catch (e) {
                // terminal 可能已被销毁，忽略
            }
        },
        displayLog(text) {
            this.initTerm();
            
            // initTerm 可能失败，检查 term 是否有效
            if (!this.term) return;
            
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
.job-log-content {
    display: flex;
    gap: 20px;
    height: 100%;
}

.job-log-tabs {
    width: 200px;
    min-height: 0;
    overflow: auto;
}

.job-log-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
}

.job-log-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--color-text-3);
}

.log-toolbar {
    margin-bottom: 10px;
    flex-shrink: 0;
}

.log-terminal {
    width: 100%;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--color-neutral-3);
}

.job-log-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.job-log-inline .job-log-content {
    flex: 1;
    display: flex;
}

.job-log-inline .job-log-tabs {
    flex-shrink: 0;
}

.job-log-inline .job-log-main {
    flex: 1;
}
</style>
<style>
.job-log-modal .arco-modal-body {
    padding: 20px;
    height: 450px;
}

.job-log-modal .arco-modal-body > div {
    height: 100%;
}

.job-log-modal .arco-modal-fullscreen .arco-modal-body {
    height: calc(100vh - 114px);
}

.job-log-modal .arco-modal-fullscreen .arco-modal-body > div {
    height: 100%;
}

.job-log-modal .arco-modal-fullscreen .log-terminal {
    height: 100%;
}

.job-log-modal .job-log-modal-title {
    position: relative;
    height: 44px;
}

.job-log-modal .job-log-modal-title .btns {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
}

.logtabs.arco-tabs-left.arco-tabs-vertical .arco-tabs-content {
    padding-left: 0;
}

.logtabs .arco-tabs-nav-vertical.arco-tabs-nav-type-line .arco-tabs-tab {
    padding: 0 10px 0 0;
}
</style>
