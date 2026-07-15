<template>
    <a-modal
        v-model:visible="dialogVisible"
        :title="dialogTitle"
        :width="690"
        :mask-closable="false"
        :footer="false"
        :popup-container="$popupContainer"
        modal-class="buy-service-dialog"
        @close="handleClose"
    >
        <a-spin :loading="loading" class="buy-service-dialog__spin">
            <div v-if="!isServiceFeeMode" class="buy-service-dialog__vip-banner">
                <span>开通VIP：可享免费服务＋延迟续费特权！</span>
                <a href="https://vip.w7.com/member" target="_blank" rel="noopener noreferrer">查看更多权益</a>
            </div>
            <div class="buy-service-dialog__content">
                <a-form
                    :label-col-props="{ span: 4 }"
                    :wrapper-col-props="{ span: 20 }"
                    label-align="left"
                    size="small"
                >
                    <a-form-item :label="isServiceFeeMode ? '云端应用' : '应用名称'">
                        <div class="buy-service-dialog__module">
                            <img
                                v-if="moduleLogo"
                                :src="moduleLogo"
                                alt=""
                                class="buy-service-dialog__icon"
                            />
                            <a
                                v-if="moduleAid"
                                :href="`https://s.w7.cc/module-${moduleAid}.html`"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="buy-service-dialog__title"
                            >{{ moduleTitle }}</a>
                            <span v-else>{{ moduleTitle }}</span>
                        </div>
                    </a-form-item>

                    <a-form-item v-if="purchaseType === 'module_plugin'" label="当前价格">
                        <div class="buy-service-dialog__price">￥{{ appPrice }}</div>
                    </a-form-item>

                    <a-form-item label="服务周期">
                        <div class="buy-service-dialog__packages">
                            <button
                                v-for="(item, index) in packages"
                                :key="item.id || index"
                                type="button"
                                class="buy-service-dialog__package"
                                :class="{ active: active === index }"
                                @click="active = index"
                            >
                                <span v-if="item.title">{{ item.title }} </span>
                                <span>{{ formatMonths(item.months) }} / ￥{{ item.price }}</span>
                                <span v-if="item.oldPrice" class="buy-service-dialog__old-price">
                                    ￥{{ item.oldPrice }}
                                </span>
                                <icon-check v-if="active === index" class="buy-service-dialog__check" />
                            </button>
                        </div>
                    </a-form-item>

                    <a-form-item v-if="!isServiceFeeMode" label="数量">
                        <a-input-number
                            v-model="quantity"
                            :disabled="!isLaunch"
                            :step="1"
                            :min="1"
                            :max="5"
                            mode="button"
                        />
                    </a-form-item>

                    <a-form-item v-if="!isServiceFeeMode" label="VIP特权">
                        <div class="buy-service-dialog__vip">
                            <a-switch v-model="useVip" :disabled="!isVip" />
                            <a-alert v-if="!isVip" show-icon class="buy-service-dialog__info">
                                未获得VIP特权，
                                <a href="https://vip.w7.com/member" target="_blank" rel="noopener noreferrer">点击购买</a>
                            </a-alert>
                            <a-alert
                                v-if="!isLaunch"
                                type="warning"
                                show-icon
                                class="buy-service-dialog__info"
                            >
                                已下架且无商家维护的应用，购买服务仅为延续当前版本使用，不提供其他售后服务；VIP特权可享免费延续服务。
                                <a href="https://vip.w7.com/member" target="_blank" rel="noopener noreferrer">点击购买</a>
                            </a-alert>
                        </div>
                    </a-form-item>
                </a-form>
            </div>

            <div class="buy-service-dialog__footer">
                <a-button size="small" @click="closeDialog">取消</a-button>
                <template v-if="isServiceFeeMode">
                    <a-button
                        size="small"
                        type="primary"
                        :disabled="!selectedPackage"
                        @click="submit()"
                    >确定</a-button>
                </template>
                <template v-else>
                    <a-button
                        size="small"
                        type="primary"
                        :disabled="!selectedPackage || !isLaunch"
                        @click="submit()"
                    >购买</a-button>
                    <a-button
                        v-if="useVip"
                        size="small"
                        type="primary"
                        :disabled="isLaunch && (!isFreeService || vipUpdateNum === 0)"
                        @click="submit('free')"
                    >免费获取{{ isLaunch && vipUpdateNum !== -1 ? `（剩余${vipUpdateNum}次）` : '' }}</a-button>
                    <a-button
                        v-if="useVip"
                        size="small"
                        type="outline"
                        :disabled="!vip"
                        @click="submit('vip')"
                    >延迟续费{{ isLaunch ? `（剩余${vip}次）` : '' }}</a-button>
                    <a-button
                        v-if="developVip && useVip"
                        size="small"
                        type="outline"
                        @click="submit('develop_vip')"
                    >超级延迟续费{{ isLaunch ? `（剩余${developVip}次）` : '' }}</a-button>
                </template>
            </div>
        </a-spin>
    </a-modal>

    <a-modal
        v-model:visible="payment.visible"
        title="确认支付"
        :width="860"
        :footer="false"
        :mask-closable="false"
        :popup-container="$popupContainer"
        modal-class="buy-service-payment-dialog"
        @close="handlePaymentClose"
    >
        <a-spin :loading="payment.loading" class="buy-service-payment-dialog__spin">
            <iframe
                v-if="payment.visible && payment.url"
                ref="paymentIframe"
                :src="payment.url"
                frameborder="0"
                class="buy-service-payment-dialog__iframe"
                @load="payment.loading = false"
                @error="handlePaymentError"
            />
        </a-spin>
    </a-modal>
</template>

<script>
import axios from 'axios';
import { panelApi } from '@/utils/api';
import { legacyConsoleRequestConfig } from '@/utils/legacy-console-request';
import { getThirdpartyPayIframeUrl } from '@/utils/thirdparty-pay';

const THIRDPARTY_CD_API_PREFIX = '//console.w7.cc/api/deploy/thirdparty-cd';

function initialState() {
    return {
        dialogVisible: false,
        loading: false,
        purchaseType: 'module_service',
        siteKey: '',
        moduleName: '',
        moduleAid: '',
        moduleTitle: '',
        moduleLogo: '',
        appPrice: '',
        packages: [],
        active: 0,
        quantity: 1,
        isLaunch: true,
        isVip: false,
        useVip: false,
        vip: 0,
        developVip: 0,
        vipUpdateNum: 0,
        isFreeService: false,
        consoleInfo: {},
        tpcdtoken: '',
    };
}

function initialPaymentState() {
    return {
        visible: false,
        loading: false,
        url: '',
        resolve: null,
        reject: null,
        settled: false,
    };
}

export default {
    name: 'BuyServiceDialog',
    props: {
        show: {
            type: Boolean,
            default: false,
        },
        data: {
            type: Object,
            default: () => ({}),
        },
    },
    emits: ['update:show', 'success', 'close'],
    data() {
        return {
            ...initialState(),
            initVersion: 0,
            payment: initialPaymentState(),
        };
    },
    computed: {
        isServiceFeeMode() {
            return this.data.mode === 'service_fee';
        },
        dialogTitle() {
            return this.purchaseType === 'module_plugin' ? '购买应用组件' : '购买服务周期';
        },
        selectedPackage() {
            return this.packages[this.active];
        },
    },
    watch: {
        show: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.init();
                } else {
                    this.dialogVisible = false;
                }
            },
        },
    },
    mounted() {
        window.addEventListener('message', this.handlePaymentMessage);
    },
    beforeUnmount() {
        window.removeEventListener('message', this.handlePaymentMessage);
        this.rejectPayment(new Error('购买服务弹窗已关闭'));
    },
    methods: {
        async init() {
            const version = ++this.initVersion;
            const state = initialState();
            Object.keys(state).forEach((key) => {
                if (key !== 'dialogVisible') {
                    this[key] = state[key];
                }
            });
            this.dialogVisible = true;
            this.loading = true;
            this.purchaseType = this.data.type || 'module_service';
            this.siteKey = this.data.site_key || this.$route.params.siteKey || '';
            this.moduleName = this.data.module_name || '';
            this.consoleInfo = this.data.console_info || this.data.consoleInfo || {};
            this.tpcdtoken = this.data.thirdparty_cd_token
                || this.data.thirdpartyCDToken
                || this.consoleInfo.thirdparty_cd_token
                || '';

            try {
                await this.initConsoleAuth();
                if (this.isServiceFeeMode) {
                    await this.initServiceFee();
                } else {
                    await this.initBranchPackage();
                }
            } catch (error) {
                if (version === this.initVersion) {
                    this.closeDialog();
                }
            } finally {
                if (version === this.initVersion) {
                    this.loading = false;
                }
            }
        },
        async initConsoleAuth() {
            const consoleRes = await panelApi.get('/auth/console/info');
            const consoleInfo = consoleRes?.data || {};
            this.consoleInfo = {
                ...consoleInfo,
                ...this.consoleInfo,
            };
            this.tpcdtoken = consoleInfo.thirdparty_cd_token || this.tpcdtoken;

            if (!this.tpcdtoken) {
                this.$message.error('未获取到第三方应用商店凭证');
                throw new Error('Missing thirdparty_cd_token');
            }
        },
        async initServiceFee() {
            this.moduleTitle = this.data.module_title || '';
            this.moduleLogo = this.data.module_logo || '';
            const res = await axios.get(
                `${THIRDPARTY_CD_API_PREFIX}/module-service-fee/info`,
                this.thirdpartyCDRequestConfig({
                    params: { module_name: this.moduleName },
                })
            );
            const list = res?.data?.data || [];
            this.packages = list.filter((item) => item.enabled != 1).map((item) => ({
                id: item.id,
                title: '套餐名称',
                months: item.month,
                price: item.price,
                raw: item,
            }));
        },
        async initBranchPackage() {
            const moduleRes = await axios.get(
                `${THIRDPARTY_CD_API_PREFIX}/module-info-by-module-name`,
                this.thirdpartyCDRequestConfig({
                    params: { module_name: this.moduleName },
                })
            );
            const moduleInfo = moduleRes.data || {};
            this.moduleAid = moduleInfo.id;
            this.moduleTitle = moduleInfo.title;
            this.moduleLogo = moduleInfo.logo_full;
            this.isLaunch = moduleInfo.status == 1;

            const packageRes = await axios.get(
                `${THIRDPARTY_CD_API_PREFIX}/branch-service-package/detail`,
                this.thirdpartyCDRequestConfig({
                    params: {
                        aid: this.moduleAid,
                        site_key: this.siteKey,
                    },
                })
            );
            let branches = packageRes.data?.branches || [];
            if (this.purchaseType === 'module_plugin') {
                branches = branches.filter((item) => item.can_buy);
            } else {
                branches = branches.filter((item) => item.can_buy_service);
            }
            if (!branches.length) {
                this.$message.warning('暂无可购买的服务套餐');
                this.closeDialog();
                return;
            }

            const branch = branches[0];
            const priceFields = {
                x: 'package_business_price',
                s: 'package_license_price',
                v: 'package_version_price',
                z: 'package_version_price',
            };
            const appPriceFields = {
                x: 'front_business_total',
                s: 'front_license_total',
                v: 'front_version_total',
                z: 'front_version_total',
            };
            // W7Panel 当前商店默认使用版本版价格；外部可传 family 覆盖。
            const family = this.data.family || this.consoleInfo.family || 'v';
            const samplePackage = branch.service_packages?.[0] || {};
            const priceField = priceFields[family]
                || Object.values(priceFields).find((field) => samplePackage[field] != null);
            const appPriceField = appPriceFields[family]
                || Object.values(appPriceFields).find((field) => branch[field] != null);

            if (this.purchaseType === 'module_plugin') {
                this.appPrice = appPriceField ? branch[appPriceField] : '';
                await axios.post('/api/deploy/branch-ip-order/sync-module-product', {
                    module_name: this.moduleName,
                    enable: 1,
                    ignore_error: 1,
                }, legacyConsoleRequestConfig());
            } else {
                await axios.post(
                    `${THIRDPARTY_CD_API_PREFIX}/module-service-config/shop`,
                    {
                        module_name: this.moduleName,
                        ignore_error: 1,
                    },
                    this.thirdpartyCDRequestConfig()
                );
            }

            this.packages = (branch.service_packages || []).map((item) => ({
                id: item.package_id,
                title: item.package_title,
                months: item.package_month,
                price: priceField ? item[priceField] : '',
                raw: item,
            }));

            const giftIndex = this.packages.findIndex((item) => item.raw.package_is_give);
            if (giftIndex !== -1) {
                this.active = giftIndex;
                await this.createBranchOrder('buy');
                return;
            }

            const results = await Promise.all([
                axios.get(
                    `${THIRDPARTY_CD_API_PREFIX}/vip-info`,
                    this.thirdpartyCDRequestConfig()
                ),
                axios.post(`${THIRDPARTY_CD_API_PREFIX}/module-service/check`, {
                    site_key: this.siteKey,
                    module_name: this.moduleName,
                    ignore_error: 1,
                }, this.thirdpartyCDRequestConfig()),
                axios.post(`${THIRDPARTY_CD_API_PREFIX}/branch-service-package-ip-order/check`, {
                    site_key: this.siteKey,
                    module_name: this.moduleName,
                }, this.thirdpartyCDRequestConfig()),
            ]);
            const vipInfo = results[0].data || {};
            const serviceInfo = results[1].data || {};
            const freeInfo = results[2].data || {};
            this.isVip = Boolean(vipInfo.is_vip);
            this.vip = serviceInfo.vip || 0;
            this.developVip = serviceInfo.develop_vip || 0;
            this.vipUpdateNum = serviceInfo.vip_update_num == null ? 0 : serviceInfo.vip_update_num;
            this.isFreeService = freeInfo.is_free_service == 1;

            const discount = serviceInfo.app_discount || 1;
            if (discount < 1) {
                this.packages = this.packages.map((item) => ({
                    ...item,
                    oldPrice: item.price,
                    price: Number((item.price * discount).toFixed(0)),
                }));
            }
        },
        submit(action) {
            if (!this.selectedPackage || this.loading) {
                return;
            }
            if (this.isServiceFeeMode) {
                this.createServiceFeeOrder().catch(() => {});
                return;
            }
            if (action === 'vip' || action === 'develop_vip') {
                this.deliverVipService(action).catch(() => {});
                return;
            }
            this.createBranchOrder(action === 'free' ? 'free' : 'buy').catch(() => {});
        },
        async createServiceFeeOrder() {
            this.loading = true;
            try {
                const res = await axios.post(
                    `${THIRDPARTY_CD_API_PREFIX}/module-service-fee-order/create`,
                    {
                        site_key: this.siteKey,
                        module_name: this.moduleName,
                        from_order_id: this.data.from_order_id || this.data.order_sn || undefined,
                        service_fee_id: this.selectedPackage.id,
                    },
                    this.thirdpartyCDRequestConfig()
                );
                const ticket = res.data?.payinfo?.ticket || '';
                if (!ticket) {
                    this.finishSuccess({ mode: 'service_fee', response: res.data });
                    return;
                }
                const result = await this.openPayment(ticket);
                this.finishSuccess({ mode: 'service_fee', response: result });
            } finally {
                this.loading = false;
            }
        },
        async createBranchOrder(action) {
            this.loading = true;
            try {
                const urls = {
                    module_service: `${THIRDPARTY_CD_API_PREFIX}/branch-service-package-ip-order/create`,
                    module_plugin: '/api/deploy/branch-ip-order/create',
                };
                const res = await axios.post(urls[this.purchaseType], {
                    site_key: this.siteKey,
                    module_name: this.moduleName,
                    branch_service_package_id: this.selectedPackage.id,
                    branch_service_package_quantity: this.quantity,
                    type: action,
                }, this.purchaseType === 'module_service'
                    ? this.thirdpartyCDRequestConfig()
                    : legacyConsoleRequestConfig());
                const ticket = res.data?.payinfo?.ticket || '';
                if (ticket) {
                    const result = await this.openPayment(ticket);
                    this.$message.success('支付成功');
                    this.finishSuccess({ mode: 'branch_package', action, response: result });
                } else {
                    this.$message.success('购买成功');
                    this.finishSuccess({ mode: 'branch_package', action, response: res.data });
                }
            } finally {
                this.loading = false;
            }
        },
        async deliverVipService(action) {
            this.loading = true;
            try {
                const res = await axios.post(`${THIRDPARTY_CD_API_PREFIX}/module-service/free-deliver`, {
                    site_key: this.siteKey,
                    module_name: this.moduleName,
                    type: action === 'vip' ? 1 : 2,
                    days: action === 'vip' ? 15 : 30,
                }, this.thirdpartyCDRequestConfig());
                this.$message.success('操作成功');
                this.finishSuccess({ mode: 'branch_package', action, response: res.data });
            } finally {
                this.loading = false;
            }
        },
        openPayment(ticket) {
            this.rejectPayment(new Error('支付窗口已被新的支付请求替换'));
            this.payment = {
                ...initialPaymentState(),
                visible: true,
                loading: true,
                url: getThirdpartyPayIframeUrl(ticket),
            };
            return new Promise((resolve, reject) => {
                this.payment.resolve = resolve;
                this.payment.reject = reject;
            });
        },
        handlePaymentMessage(event) {
            if (
                event?.data?.type === 'payCallback'
                && this.payment.visible
                && event.source === this.$refs.paymentIframe?.contentWindow
            ) {
                this.resolvePayment(event.data);
            }
        },
        handlePaymentError() {
            this.rejectPayment(new Error('支付页面加载失败'));
        },
        handlePaymentClose() {
            if (!this.payment.settled) {
                this.rejectPayment(new Error('支付窗口已关闭'));
            }
        },
        resolvePayment(result) {
            if (this.payment.settled) {
                return;
            }
            this.payment.settled = true;
            const resolve = this.payment.resolve;
            this.payment.visible = false;
            resolve?.(result);
        },
        rejectPayment(error) {
            if (!this.payment.reject || this.payment.settled) {
                return;
            }
            this.payment.settled = true;
            const reject = this.payment.reject;
            this.payment.visible = false;
            reject(error);
        },
        thirdpartyCDRequestConfig(config = {}) {
            return {
                ...config,
                customToken: this.tpcdtoken,
            };
        },
        finishSuccess(payload) {
            this.$emit('success', payload);
            this.closeDialog();
        },
        closeDialog() {
            this.dialogVisible = false;
        },
        handleClose() {
            if (this.show) {
                this.$emit('update:show', false);
            }
            this.$emit('close');
        },
        formatMonths(months) {
            const value = Number(months) || 0;
            return value % 12 === 0 ? `${value / 12}年` : `${value}月`;
        },
    },
};
</script>

<style>
.buy-service-dialog .arco-modal-body{padding:0;}
.buy-service-dialog .arco-modal-header{height:55px;padding:0 20px;border-bottom:1px solid var(--color-border-2);}
.buy-service-dialog .arco-modal-title{justify-content:flex-start;text-align:left;font-size:16px;font-weight:400;}
.buy-service-dialog__spin{display:block;width:100%;}
.buy-service-dialog__vip-banner{box-sizing:border-box;height:39px;padding:0 24px;background:#fff8ed;color:#f59a23;font-size:13px;line-height:39px;}
.buy-service-dialog__vip-banner a{margin-left:8px;color:#f59a23;text-decoration:underline;}
.buy-service-dialog__content{padding:20px 20px 0;}
.buy-service-dialog__content .arco-form-item{margin-bottom:20px;}
.buy-service-dialog__content .arco-form-item-label-col{flex:0 0 120px!important;width:120px!important;max-width:120px!important;padding-right:0;}
.buy-service-dialog__content .arco-form-item-wrapper-col{flex:1 1 auto!important;width:auto!important;max-width:calc(100% - 120px)!important;}
.buy-service-dialog__module{display:flex;align-items:center;min-height:36px;}
.buy-service-dialog__icon{width:36px;height:36px;border-radius:4px;margin-right:10px;object-fit:cover;}
.buy-service-dialog__title{color:var(--color-text-1);text-decoration:none;}
.buy-service-dialog__title:hover{color:rgb(var(--primary-6));}
.buy-service-dialog__price{font-size:16px;color:rgb(var(--red-6));}
.buy-service-dialog__packages{display:flex;flex-wrap:wrap;align-content:flex-start;gap:8px 10px;}
.buy-service-dialog__package{position:relative;box-sizing:border-box;min-height:34px;padding:0 16px;border:1px solid var(--color-border-2);overflow:hidden;background:var(--color-bg-2);color:var(--color-text-2);border-radius:0;line-height:32px;cursor:pointer;transition:all .15s ease;}
.buy-service-dialog__package:hover{border-color:rgb(var(--primary-5));color:rgb(var(--primary-6));}
.buy-service-dialog__package.active{border-color:#ff4040;color:#ff4040;}
.buy-service-dialog__package.active::after{content:" ";position:absolute;right:0;bottom:0;width:0;height:0;border-bottom:17px solid #ff4040;border-left:17px solid transparent;}
.buy-service-dialog__check{position:absolute;right:0;bottom:0;z-index:1;width:11px;height:11px;color:#fff;font-size:10px;stroke-width:4;}
.buy-service-dialog__old-price{color:var(--color-text-3);text-decoration:line-through;margin-left:6px;}
.buy-service-dialog__content .arco-input-number{width:130px;}
.buy-service-dialog__vip{display:flex;flex-direction:column;align-items:flex-start;margin-top:4px;width:100%;}
.buy-service-dialog__info{width:100%;margin-top:10px;box-sizing:border-box;}
.buy-service-dialog__info a{color:inherit;text-decoration:underline;}
.buy-service-dialog__footer{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:16px 24px;border-top:1px solid var(--color-border-1);}
.buy-service-payment-dialog .arco-modal-body{padding:0;}
.buy-service-payment-dialog__spin{display:block;width:100%;height:700px;}
.buy-service-payment-dialog__spin > .arco-spin-children{height:100%;}
.buy-service-payment-dialog__iframe{display:block;width:100%;height:700px;overflow:auto;}
</style>
