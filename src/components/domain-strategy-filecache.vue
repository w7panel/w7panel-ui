<template>
    <div>
        <div v-show="fileCache.exist" id="filecachemicroapp"></div>
        
        <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:300px;">
            <div style="height:100%;" class="bg-white"></div>
        </a-spin>

        <div v-show="!fileCache.exist" class="mt-40 df df-c ai-c">
            <div>文件缓存应用未安装</div>
            <div class="mt-20">
                <a-button type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_cdncache')">去安装</a-button>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { setupApp, startApp, destroyApp } from "wujie";
import { getToken, getK8sinfo } from '@/utils/auth';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default {
    props: ['data', 'activeName'],
    data() {
        return {
            namespaceActive: '',
            inRvproxy: false,
            fileCache: {
                open: false,
                exist: false,
                backendUrl: '',
                ingressHost: '',
                token: '',
                destination: '',
            },
            fileCacheApp: null,
            allAgent: [],
            microappInfo: {
                frontendUrl: '',
                backendUrl: '',
                username: '',
                password: '',
                appImage: '',
            },
            roleProps: {},
            appData: {},
            extra: {},
            downOk: true,
        }
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.inRvproxy = this.$route.name === 'app-rvproxy-domain';
        registerWujieEvent("submit", this.submitFileCache);
        registerWujieEvent("close", this.close);
    },
    mounted() {
        this.init();
    },
    watch: {
        data: 'init',
        activeName() {
            if (this.activeName === 'fileCache') {
                this.wujieInit();
            } else {
                this.destroyMicroApp();
            }
        },
    },
    beforeUnmount() {
        this.destroyMicroApp();
        clearAllWujieEvents();
    },
    methods: {
        init() {
            this.getData();
            this.testFileCache();
        },
        destroyMicroApp() {
            try { destroyApp('filecachemicroapp'); } catch (e) { /* ignore */ }
        },
        getData() {
            if (!this.data) { return }
            this.appData = JSON.parse(JSON.stringify(this.data?.metadata?.annotations || {}));
        },
        testFileCache() {
            if (!this.data || !Object.keys(this.data).length) { return }
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/' + this.namespaceActive + '/microapps?labelSelector=w7.cc/identifie=w7-cdncache', { loading: true }).then(res => {
                if (!res?.data) { return Promise.reject(); }
                const app = res?.data?.items?.[0];
                if (!app || !app.spec) { return }
                this.fileCacheApp = app;

                this.getAllAgent();
                this.fileCache = {
                    ...this.fileCache,
                    open: this.data.metadata?.annotations?.['w7.cc/filecache'] === 'true',
                    ingressHost: this.data?.spec?.rules?.[0]?.host,
                    backendUrl: app.spec.backendUrl,
                    exist: true,
                    token: app?.spec?.config?.props?.OAUTH_TOKEN,
                    destination: this.data?.metadata?.annotations?.['higress.io/destination'] || '',
                };
                this.extra = {
                    identifie: app.metadata?.labels?.['w7.cc/identifie'] || '',
                    version: app.metadata?.labels?.['w7.cc/version'] || '',
                    name: app.metadata.name,
                    namespace: app.metadata.namespace,
                }

                let userRole = getK8sinfo()['w7.cc/role'];
                let roleConfig = app?.spec?.['config-v2']?.props?.roleConfig || {};
                let roleProps = roleConfig?.[userRole] || {};
                if(roleConfig.founder && !roleConfig?.[userRole]){
                    roleProps = roleConfig.founder;
                }
                if (roleProps.frontend_props) {
                    roleProps = { ...roleProps, ...roleProps.frontend_props };
                }
                this.roleProps = { ...app?.spec?.config?.props, ...roleProps };

                this.microappInfo = {
                    frontendUrl: app?.spec?.frontendUrl + '#/cache/' + this.fileCache.ingressHost,
                    backendUrl: app?.spec?.backendUrl,
                    username: app?.spec?.config?.props?.username,
                    password: app?.spec?.config?.props?.password,
                    appImage: app?.spec?.config?.props?.image,
                };
            }).catch(() => {});
        },
        async wujieInit() {
            if (!this.fileCache.exist) { return }

            let endpoint = '';
            let rewrite_path = '';
            let rewrite_host = '';
            let path_match_type = '';

            await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.name,
            }}).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
            })
            if(!this.downOk){
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.name}`)
                this.extra.setTimeout = setTimeout(()=>{
                    this.wujieInit();
                    clearTimeout(this.extra.setTimeout);
                }, 5000)
                return;
            }

            if (this.data?.metadata?.annotations?.['higress.io/enable-rewrite'] === 'true') {
                rewrite_host = this.data?.metadata?.annotations?.['higress.io/upstream-vhost'];
                rewrite_path = this.data?.metadata?.annotations?.['higress.io/rewrite-target'];
            }

            if (this.inRvproxy) {
                const find = this.allAgent.find(i => i.name === this.data?.metadata?.labels?.['destination']);
                if (find) {
                    const protocol = find?.protocol ? (find?.protocol?.toLowerCase() + '://') : '';
                    const port = (find?.port === 80 || !find?.port) ? '' : (':' + find.port);
                    endpoint = (find?.host || []).map(domain => `${protocol}${domain}${port}`).join(',');
                }
            } else {
                let backend = null;
                if (this.appData['w7.cc/origin-config']) {
                    backend = JSON.parse(this.appData['w7.cc/origin-config']);
                } else {
                    backend = this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.backend;
                }
                endpoint = 'http://' + backend?.service?.name + '.' + this.namespaceActive + '.svc:' + backend?.service?.port?.number;
            }

            path_match_type = this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.pathType;
            path_match_type = path_match_type === 'Prefix'
                ? (this.data?.metadata?.annotations?.['higress.io/use-regex'] === 'true' ? 'ImplementationSpecific' : 'Prefix')
                : path_match_type;
            path_match_type = { Prefix: 'prefix', Exact: 'exact', ImplementationSpecific: 'regex' }[path_match_type];

            setupApp({
                name: "filecachemicroapp",
// 测试
// url: 'http://172.16.1.162:9090' + this.microappInfo.frontendUrl
                url: this.microappInfo.frontendUrl
                    + '?path_prefix=' + encodeURIComponent(this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path)
                    + '&endpoint=' + encodeURIComponent(endpoint)
                    + '&rewrite_host=' + encodeURIComponent(rewrite_host)
                    + '&rewrite_path=' + encodeURIComponent(rewrite_path)
                    + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name)
                    + '&path_match_type=' + encodeURIComponent(path_match_type),
                exec: true,
                el: '#filecachemicroapp',
                sync: true,
                props: {
                    url: (/^\//.test(this.microappInfo.backendUrl) ? window.location.origin : '') + this.microappInfo.backendUrl,
                    Authorization: 'Basic ' + btoa(this.microappInfo.username + ':' + this.microappInfo.password),
                    appImage: this.microappInfo.appImage,
                    OAUTH_TOKEN: this.fileCache.token,
                    fileCacheOpen: this.fileCache.open,
                    paneltoken: getToken(),
                    ...this.roleProps,
                },
            });
            
            startApp({ name: 'filecachemicroapp' });
        },
        getAllAgent() {
            if (!this.inRvproxy) { return }
            k8sproxy.get('/apis/networking.higress.io/v1/namespaces/' + this.namespaceActive + '/mcpbridges').then(res => {
                const data = res?.data?.items || [];
                const list = [];
                data.filter(i => i.metadata.name !== 'default').forEach(item => {
                    const sr = item.spec?.registries || [];
                    const host = [];
                    sr.forEach(i => {
                        const h = i.domain.split(',').map(d => d?.trim()).filter(d => d);
                        host.push(...h);
                        list.push({
                            domain: i.domain,
                            host: host,
                            port: i.port,
                            protocol: i.protocol,
                            name: i.name,
                            type: i.type,
                        });
                    });
                });
                this.allAgent = list;
            });
        },
        submitFileCache(open) {
            if (open?.from && open.from !== 'file-cache') { return }
            this.fileCache.open = typeof open === 'boolean' ? open : open.open;

            const operations = [];
            if (!this.fileCache.open) {
                this.buildCloseOperations(operations);
            } else {
                this.buildOpenOperations(operations);
            }
            this.$emit('submit', operations);
        },
        buildCloseOperations(operations) {
            if (this.appData['w7.cc/origin-config']) {
                operations.push(
                    { op: 'replace', path: '/spec/rules/0/http/paths/0/backend', value: JSON.parse(this.appData['w7.cc/origin-config']) },
                    { op: 'remove', path: '/metadata/annotations/w7.cc~1origin-config' }
                );
            }
            if (this.appData['w7.cc/rewrite-config']) {
                const json = JSON.parse(this.appData['w7.cc/rewrite-config']);
                operations.push(
                    { op: 'remove', path: '/metadata/annotations/w7.cc~1rewrite-config' },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1enable-rewrite', value: json?.['higress.io/enable-rewrite'] || 'false' },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1rewrite-target', value: json?.['higress.io/rewrite-target'] || '' },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1upstream-vhost', value: json?.['higress.io/upstream-vhost'] || '' }
                );
            }
            operations.push({ op: 'replace', path: '/metadata/annotations/w7.cc~1filecache', value: 'false' });
        },
        buildOpenOperations(operations) {
            if (!this.appData['w7.cc/origin-config']) {
                operations.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1origin-config',
                    value: JSON.stringify(this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.backend),
                });
            }
            if (this.appData['higress.io/enable-rewrite'] === 'true') {
                operations.push(
                    {
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1rewrite-config',
                        value: JSON.stringify({
                            'higress.io/enable-rewrite': this.appData['higress.io/enable-rewrite'],
                            'higress.io/rewrite-target': this.appData['higress.io/rewrite-target'],
                            'higress.io/upstream-vhost': this.appData['higress.io/upstream-vhost'],
                        }),
                    },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1enable-rewrite', value: 'false' },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1rewrite-target', value: '' },
                    { op: 'replace', path: '/metadata/annotations/higress.io~1upstream-vhost', value: '' }
                );
            }
            operations.push(
                {
                    op: 'replace',
                    path: '/spec/rules/0/http/paths/0/backend',
                    value: {
                        service: {
                            name: this.fileCacheApp?.spec?.config?.props?.serviceName,
                            port: { number: Number(this.fileCacheApp?.spec?.config?.props?.servicePort) },
                        },
                    },
                },
                { op: 'replace', path: '/metadata/annotations/w7.cc~1filecache', value: 'true' }
            );
        },
        close() {
            this.$emit('cancel');
        },
    }
}
</script>

<style scoped>
</style>
