<template>
    <main ref="root" class="site-panel-embed">
        <a-alert v-if="error" type="error">
            {{ error }}<a-button type="text" @click="load">重试</a-button>
        </a-alert>
        <a-spin v-if="loading" class="site-panel-loading" tip="加载中..." />
        <template v-else-if="hasLoaded">
            <div v-if="view === 'files'" class="site-panel-files">
                <app-files ref="files" :is_component="true" :componentData="fileData" :compact="true" />
            </div>
            <template v-else>
                <div class="site-panel-toolbar">
                    <label for="site-panel-pod">容器实例</label>
                    <a-select id="site-panel-pod" v-model="podName" style="width:300px;max-width:100%" aria-label="容器实例" placeholder="请选择容器实例">
                        <a-option v-for="pod in pods" :key="pod.metadata.uid || pod.metadata.name" :value="pod.metadata.name">{{ pod.metadata.name }} · {{ pod.status?.phase }}</a-option>
                    </a-select>
                    <template v-if="view === 'terminal' && selectedPod">
                        <label for="site-panel-container">容器</label>
                        <a-select id="site-panel-container" v-model="container" style="width:160px" aria-label="容器">
                            <a-option v-for="name in terminalContainers" :key="name" :value="name">{{ name }}</a-option>
                        </a-select>
                        <a-select v-model="shell" style="width:120px" aria-label="Shell">
                            <a-option value="bin/sh">/bin/sh</a-option>
                            <a-option value="bin/bash">/bin/bash</a-option>
                        </a-select>
                    </template>
                    <a-button :loading="refreshing" @click="load">刷新实例</a-button>
                </div>
                <a-empty v-if="!selectedPod" :description="view === 'terminal' ? '暂无运行中的应用容器' : '暂无可查看日志的容器实例'" />
                <div v-else-if="view === 'terminal' && container" class="site-panel-terminal">
                    <web-shell :key="terminalKey" :show="true" :pod="podName" :namespace="namespace" :containerName="container" :type="shell" />
                </div>
                <pod-log v-else-if="view === 'logs'" ref="log" :key="podKey" :show="logReady" mode="inline" :podName="podName" :namespace="namespace" :containers="logContainers" :container="logContainers[0] || ''" :height="logHeight" />
            </template>
        </template>
    </main>
</template>
<script>
import AppFiles from './files.vue';
import WebShell from '@/components/web-shell.vue';
import PodLog from '@/components/pod-log.vue';
import { k8sproxy } from '@/utils/api';
import { resolveSiteFileTarget } from '@/utils/site-file-menu';
import { SITE_PANEL_VIEWS, sitePodSelector, sitePanelPods, siteTerminalContainers } from '@/utils/site-panel';

export default {
    name: 'SitePanelEmbed',
    components: { AppFiles, WebShell, PodLog },
    data: () => ({ loading: false, refreshing: false, loadedScope: '', error: '', fileData: null, application: null, pods: [], podName: '', container: '', shell: 'bin/sh', logReady: false, logHeight: 520, requestId: 0 }),
    computed: {
        view() { return this.$route.params.view; },
        group() { return this.$route.params.group; },
        namespace() { return typeof this.$route.query.namespace === 'string' ? this.$route.query.namespace : 'default'; },
        scopeKey() { return JSON.stringify([this.view, this.group, this.namespace]); },
        hasLoaded() { return this.loadedScope === this.scopeKey; },
        selectedPod() { return this.pods.find(pod => pod.metadata.name === this.podName); },
        podKey() { return JSON.stringify([this.namespace, this.selectedPod?.metadata.uid || this.podName]); },
        terminalKey() {
            const status = this.selectedPod?.status?.containerStatuses?.find(item => item.name === this.container);
            return JSON.stringify([this.podKey, this.container, status?.containerID || '', this.shell]);
        },
        terminalContainers() {
            return siteTerminalContainers(this.application, this.selectedPod);
        },
        logContainers() { return [...(this.selectedPod?.spec?.containers || []), ...(this.selectedPod?.spec?.initContainers || [])].map(item => item.name); }
    },
    watch: {
        '$route.fullPath': { immediate: true, handler() { this.load(); } },
        podName() {
            this.container = this.terminalContainers[0] || '';
        },
        podKey(key) {
            this.logReady = false;
            // PodLog initializes its stream immediately; mount only after the frame has a layout.
            this.$nextTick(() => { if (key === this.podKey) this.logReady = true; });
        }
    },
    mounted() {
        this.frameBridge = { canLeave: () => this.canLeave() };
        window.__W7_SITE_PANEL__ = this.frameBridge;
        this.beforeUnload = event => {
            if (!this.hasFileDraft()) return;
            event.preventDefault(); event.returnValue = '';
        };
        window.addEventListener('beforeunload', this.beforeUnload);
        this.resizeObserver = new ResizeObserver(() => {
            this.logHeight = Math.max(240, this.$refs.root.clientHeight - 68);
            window.dispatchEvent(new Event('resize'));
        });
        this.resizeObserver.observe(this.$refs.root);
    },
    beforeUnmount() {
        this.requestId++;
        this.resizeObserver?.disconnect();
        window.removeEventListener('beforeunload', this.beforeUnload);
        if (window.__W7_SITE_PANEL__ === this.frameBridge) delete window.__W7_SITE_PANEL__;
    },
    methods: {
        logTargetKey(log) {
            if (!log?.currentContainer || !this.selectedPod) return '';
            const statuses = [...(this.selectedPod.status?.containerStatuses || []), ...(this.selectedPod.status?.initContainerStatuses || [])];
            const status = statuses.find(item => item.name === log.currentContainer);
            return JSON.stringify([this.podKey, log.currentContainer, status?.containerID || '', status?.restartCount || 0]);
        },
        hasFileDraft() {
            const files = this.$refs.files;
            return !!(files?.file?.openTabs?.some(tab => tab.modified) || files?.fileCatch?.length || files?.mfEdit);
        },
        async canLeave() {
            if (!this.hasFileDraft()) return true;
            return new Promise(resolve => this.$modal.confirm({
                title: '未保存的文件', content: '文件有未保存的修改，确定离开吗？',
                okText: '放弃并离开', cancelText: '继续编辑',
                onOk: () => resolve(true), onCancel: () => resolve(false),
                hideCancel: false, maskClosable: false, closable: false,
            }));
        },
        async load() {
            const requestId = ++this.requestId;
            const scope = this.scopeKey, view = this.view, namespace = this.namespace, groupName = this.group;
            // Refresh the list without disposing a usable terminal or resetting log controls.
            this.refreshing = this.hasLoaded;
            this.loading = !this.hasLoaded;
            this.error = '';
            if (this.loading) this.logReady = false;
            try {
                if (!SITE_PANEL_VIEWS.includes(view)) throw new Error('不支持的站点工具');
                if (!groupName || !namespace) throw new Error('缺少站点或命名空间');
                if (view === 'files') {
                    const target = resolveSiteFileTarget(groupName);
                    this.fileData = { kind: target.kind, id: target.appname, namespace, path: decodeURIComponent(target.path) };
                    this.loadedScope = scope;
                    return;
                }
                const ns = encodeURIComponent(namespace), group = encodeURIComponent(groupName);
                const appGroup = (await k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${ns}/appgroups/${group}`, { noAlert: true })).data;
                const main = (appGroup.status?.items || []).filter(item => item.kind === 'Deployment' && item.name === groupName);
                if (main.length !== 1) throw new Error('未找到唯一的站点主应用');
                const application = (await k8sproxy.get(`/apis/apps/v1/namespaces/${ns}/deployments/${encodeURIComponent(main[0].name)}`, { noAlert: true })).data;
                const { data } = await k8sproxy.get(`/api/v1/namespaces/${ns}/pods`, { params: { labelSelector: sitePodSelector(application) }, noAlert: true });
                if (requestId !== this.requestId) return;
                const log = view === 'logs' ? this.$refs.log : null;
                const previousLogTarget = this.logTargetKey(log);
                this.application = application;
                this.pods = sitePanelPods(data?.items || [], view)
                    .filter(pod => view !== 'terminal' || siteTerminalContainers(application, pod).length > 0);
                if (!this.pods.some(pod => pod.metadata.name === this.podName)) this.podName = this.pods[0]?.metadata.name || '';
                if (!this.terminalContainers.includes(this.container)) this.container = this.terminalContainers[0] || '';
                this.loadedScope = scope;
                const nextLogTarget = this.logTargetKey(log);
                if (log && previousLogTarget !== nextLogTarget) {
                    await this.$nextTick();
                    // Reconnect a restarted container without resetting the selected log controls.
                    if (requestId === this.requestId && this.$refs.log === log && this.logTargetKey(log) === nextLogTarget) log.fetchLog();
                }
            } catch (error) {
                if (requestId === this.requestId) this.error = error.response?.data?.message || error.message || '站点工具加载失败';
            } finally {
                if (requestId === this.requestId) {
                    this.loading = false;
                    this.refreshing = false;
                    await this.$nextTick();
                    if (requestId === this.requestId && this.loadedScope === scope) this.logReady = true;
                }
            }
        }
    }
};
</script>
<style scoped>
.site-panel-embed{box-sizing:border-box;height:100vh;min-height:0;display:flex;flex-direction:column;gap:16px;padding:16px;background:var(--color-bg-1);overflow:hidden}.site-panel-loading{margin:auto}.site-panel-files{flex:1;min-height:0;overflow:auto}.site-panel-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0}.site-panel-terminal{flex:1;min-height:240px;background:#1f1d45;padding:20px;box-sizing: border-box;}.site-panel-embed :deep(.pod-log-inline){min-height:0;max-height:100%}.site-panel-embed :deep(.pod-log-inline .log-terminal){box-sizing:border-box;padding:20px;background:#000}
</style>
