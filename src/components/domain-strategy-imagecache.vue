<template>
    <div>
        <div v-show="imageCache.exist" id="imagecachemicroapp"></div>
        <div v-show="!imageCache.exist" class="mt-40 df df-c ai-c">
            <div>镜像缓存应用未安装</div>
            <div class="mt-20">
                <a-button type="primary" @click="$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_registrycache')">去安装</a-button>
            </div>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { setupApp, startApp, destroyApp } from "wujie";
import { getToken, getK8sinfo } from '@/utils/auth';
import { registerWujieEvent, clearAllWujieEvents } from '@/hooks/use-wujie-events';

export default {
    props: ['data', 'activeName'],
    data() {
        return {
            namespaceActive: '',
            imageCache: {
                exist: false,
                frontendUrl: '',
                backendUrl: '',
                username: '',
                password: '',
            },
            roleProps: {},
        }
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        registerWujieEvent("submit", this.submit);
        registerWujieEvent("close", this.close);
    },
    mounted() {
        this.init();
    },
    watch: {
        data: 'init',
        activeName() {
            if (this.activeName === 'imageCache') {
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
            this.testImageCache();
        },
        destroyMicroApp() {
            try { destroyApp('imagecachemicroapp'); } catch (e) { /* ignore */ }
        },
        testImageCache() {
            if (!this.data || !Object.keys(this.data).length) { return }
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/' + this.namespaceActive + '/microapps?labelSelector=w7.cc/identifie=w7-registrycache', { loading: true }).then(res => {
                if (!res?.data) { return Promise.reject(); }
                const app = res?.data?.items?.[0];
                if (!app || !app.spec) { return }

                let userRole = getK8sinfo()['w7.cc/role'];
                let roleConfig = app?.spec?.['config-v2']?.props?.roleConfig;
                let roleProps = roleConfig?.[userRole] || {};
                if(roleConfig.founder && !roleConfig?.[userRole]){
                    roleProps = roleConfig.founder;
                }
                if (roleProps.frontend_props) {
                    roleProps = { ...roleProps, ...roleProps.frontend_props };
                }
                this.roleProps = roleProps;

                this.imageCache = {
                    exist: true,
                    frontendUrl: app?.spec?.frontendUrl + '#/setting'
                        + '?group=' + this.data?.spec?.rules?.[0]?.host + this.data?.spec?.rules?.[0]?.http?.paths?.[0]?.path
                        + '&ingress_name=' + encodeURIComponent(this.data?.metadata?.name),
                    backendUrl: app?.spec?.backendUrl,
                    username: app?.spec?.config?.props?.username,
                    password: app?.spec?.config?.props?.password,
                    appImage: app?.spec?.config?.props?.image,
                    ...app?.spec?.config?.props,
                    ...roleProps,
                };
            }).catch(() => {});
        },
        wujieInit() {
            if (!this.imageCache.exist) { return }

            setupApp({
                name: "imagecachemicroapp",
                url: this.imageCache.frontendUrl,
                exec: true,
                el: '#imagecachemicroapp',
                sync: true,
                props: {
                    url: /^\//.test(this.imageCache.backendUrl)
                        ? window.location.origin + this.imageCache.backendUrl
                        : this.imageCache.backendUrl,
                    Authorization: 'Basic ' + btoa(this.imageCache.username + ':' + this.imageCache.password),
                    is_component: true,
                    paneltoken: getToken(),
                    ...this.imageCache,
                },
            });
            console.log('imagecache',this.imageCache)
            startApp({ name: 'imagecachemicroapp' });
        },
        submit(data) {
            if (data?.from !== 'image-cache') { return }
            this.$emit('submit');
        },
        close() {
            this.$emit('cancel');
        },
    }
}
</script>

<style scoped>
</style>
