<template>
    <div class="subaccount-panel">
        <a-spin
            v-if="loading"
            class="subaccount-panel__loading"
            :loading="loading"
            :size="32"
            tip="加载面板中..."
        />
        <div :id="containerId" class="subaccount-panel__container"></div>
    </div>
</template>

<script>
import { startApp, destroyApp } from 'wujie';
import { clearIframeToken, setIframeRefreshToken, setIframeToken } from '@/utils/auth';

export default {
    name: 'SubaccountPanel',
    emits: ['close'],
    props: {
        token: {
            type: String,
            default: '',
        },
        refreshToken: {
            type: String,
            default: '',
        },
        path: {
            type: String,
            default: '/cluster/panel',
        },
        name: {
            type: String,
            default: 'w7panel-subaccount-panel',
        },
    },
    data() {
        return {
            containerId: `subaccount-panel-${Math.random().toString(36).slice(2)}`,
            loading: false,
        };
    },
    computed: {
        panelUrl() {
            const path = this.path || '/cluster/panel';
            return path.startsWith('/') ? path : `/${path}`;
        },
        panelProps() {
            return {
                token: this.token,
                refreshToken: this.refreshToken,
                paneltoken: this.token,
                subaccountPanel: true,
                closeSubaccountPanel: () => this.$emit('close'),
            };
        },
    },
    mounted() {
        this.startPanel();
    },
    watch: {
        token() {
            this.startPanel();
        },
        refreshToken() {
            this.startPanel();
        },
    },
    beforeUnmount() {
        this.destroyPanel();
        clearIframeToken();
    },
    methods: {
        destroyPanel() {
            try {
                destroyApp(this.name);
            } catch {}
        },
        startPanel() {
            this.destroyPanel();
            this.loading = true;
            if (this.token) {
                setIframeToken(this.token);
            }
            if (this.refreshToken) {
                setIframeRefreshToken(this.refreshToken);
            }
            this.$nextTick(() => {
                try {
                    Promise.resolve(startApp({
                        name: this.name,
                        url: this.panelUrl,
                        el: `#${this.containerId}`,
                        sync: false,
                        exec: true,
                        props: this.panelProps,
                    })).finally(() => {
                        this.loading = false;
                    });
                } catch (e) {
                    this.loading = false;
                    throw e;
                }
            });
        },
    },
};
</script>

<style scoped>
.subaccount-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}
.subaccount-panel__container {
    flex: 1;
    min-height: 0;
    overflow: auto;
    transform: translate(0, 0);
}
.subaccount-panel__loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
}

.subaccount-panel__container :deep(iframe),
.subaccount-panel__container :deep(wujie-app) {
    width: 100%;
    min-height: 100%;
}
</style>
