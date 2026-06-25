<template>
    <div class="product-market-page">
        <route-breadcrumb class="df-s0" />
        <div class="product-market-body">
            <div v-if="remoteUrl" id="product-market-wujie" class="product-market-wujie"></div>
            <a-empty v-else description="制品市场地址未配置" />
        </div>
    </div>
</template>

<script>
import { startApp, destroyApp } from 'wujie';
import { getToken } from '@/utils/auth';

const PRODUCT_MARKET_URL = '';
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
        initMarket() {
            if (!this.remoteUrl) { return; }
            startApp({
                name: PRODUCT_MARKET_APP_NAME,
                url: this.remoteUrl,
                el: '#product-market-wujie',
                exec: true,
                sync: true,
                props: {
                    paneltoken: getToken(),
                },
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
