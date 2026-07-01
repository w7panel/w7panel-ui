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
    data() {
        return {
            remoteUrl: PRODUCT_MARKET_URL,
        };
    },
    mounted() {
        this.initMarket();
    },
    beforeUnmount() {
        this.destroyMarket();
    },
    methods: {
        async initMarket() {
            if (!this.remoteUrl) { return; }
            const data = await panelApi.get('/microapp/global-frontprops', { noAlert: true })
            const props = {
                frontend_props: {
                    ...(data?.data || {})
                }
            }
            startApp({
                name: PRODUCT_MARKET_APP_NAME,
                url: this.remoteUrl,
                el: '#product-market-wujie',
                exec: true,
                sync: true,
                props: appendWujieModalHandles(props, () => this.$refs.wujieModals)
            });
        },
        destroyMarket() {
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
