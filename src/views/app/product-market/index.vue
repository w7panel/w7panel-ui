<template>
    <div class="product-market-page">
        <route-breadcrumb class="df-s0" />
        <div class="product-market-body">
            <div id="product-market-wujie" class="product-market-wujie"></div>
        </div>
        <wujie-modals ref="wujieModals" :exclude-wujie-events="modalExcludeWujieEvents" />
    </div>
</template>

<script>
import { startApp, destroyApp } from 'wujie';
import { panelApi } from '@/utils/api';
import wujieModals from '@/components/wujie-modals.vue';
import { appendWujieModalHandles } from '@/utils/wujie-modal-handles';

const PRODUCT_MARKET_URL = 'https://zm.w7.com/#/panel-store-list';
const PRODUCT_MARKET_APP_NAME = 'product-market';

export default {
    data(){
        return {
            marketMounted: false,
            marketLoadId: 0,
        };
    },
    components: {
        wujieModals
    },
    computed: {
        remoteUrl(){
            const marketTag = String(this.$route.meta.marketTag || '').trim();
            if(!marketTag){return PRODUCT_MARKET_URL}
            const query = new URLSearchParams({
                tag: marketTag,
                hidetags: '1',
            });
            return `${PRODUCT_MARKET_URL}?${query.toString()}`;
        },
        modalExcludeWujieEvents(){
            return [];
        },
    },
    watch: {
        remoteUrl(){
            this.reloadMarket();
        },
    },
    mounted() {
        this.marketMounted = true;
        this.initMarket();
    },
    beforeUnmount() {
        this.marketMounted = false;
        this.destroyMarket();
    },
    methods: {
        async reloadMarket(){
            this.destroyMarket();
            await this.$nextTick();
            this.initMarket();
        },
        async initMarket() {
            if (!this.marketMounted || !this.remoteUrl) { return; }
            const loadId = ++this.marketLoadId;
            const remoteUrl = this.remoteUrl;
            const data = await panelApi.get('/microapp/global-frontprops', { noAlert: true })
            if (!this.marketMounted || loadId !== this.marketLoadId) { return; }
            const props = {
                frontend_props: {
                    ...(data?.data || {})
                },
                isSubCluster: data?.data?.isSubCluster === true,
            }
            appendWujieModalHandles(props, () => this.$refs.wujieModals)
            startApp({
                name: PRODUCT_MARKET_APP_NAME,
                url: remoteUrl,
                el: '#product-market-wujie',
                exec: true,
                sync: true,
                props
            });
        },
        destroyMarket() {
            this.marketLoadId += 1;
            try {
                destroyApp(PRODUCT_MARKET_APP_NAME);
            } catch {}
        },
    },
};
</script>

<style scoped>
.product-market-page{
    height:100%;
    padding:20px;
    box-sizing:border-box;
    display:flex;
    flex-direction:column;
}
.product-market-body{
    flex:1;
    min-height:0;
    background:var(--color-bg-1);
    display:flex;
    align-items:center;
    justify-content:center;
}
.product-market-wujie{
    width:100%;
    height:100%;
}
</style>
