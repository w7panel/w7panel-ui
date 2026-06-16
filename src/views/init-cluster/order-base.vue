<template>
    <div style="height:100%; overflow:auto;">
        <div class="df df-c ai-c" style="margin-bottom:20px;">
            
            <div v-if="!isRenew&&!isExpand" class="steps mt-60">
                <a-steps v-model:current="step" class="order-base-step" label-placement="vertical">
                    <a-step >注册云端</a-step>
                    <a-step>费用清单</a-step>
                    <a-step>配置任务</a-step>
                </a-steps>
            </div>

            <div class="mt-40 bg-white" style="width:1000px;padding:40px;">
                
                <div v-if="isOuttime" style="margin-bottom:20px;">
                    <a-alert type="warning">当前资源已过期，为了不影响您正常使用，请及时续费！超过一定时限未续费，资源会被自动回收。过期时间：{{ expiretime }}</a-alert>
                </div>
                <div v-if="step==1" class="df df-c ai-c">
                    
                    <icon-empty class="c-99" style="font-size:50px;" />
                    <span class="c-99 mt-20">
                        <span>您尚未注册云端，必须注册云端后才能配置确认操作。点击</span>
                        <span class="c-blue cursor" @click="toRegister()">注册云端</span>
                    </span>
                    <!-- <a-button type="primary" @click="toRegister()">注册云端</a-button> -->
                </div>
                <div v-if="step==2">
                    <div v-if="isNew" class="mb-20 df ai-c">
                        <span>快速选择配置：</span>
                        <a-select v-model="quickQuota" :disabled="showPrice.promoDisct" placeholder="请选择" style="width:360px;" @change="changeQuickQuota">
                            <a-option v-for="(item,index) in quickQuotaList" :value="index" :key="index">
                                <span>{{ item.label }}</span>
                                <span v-if="item.give && !isRenew" class="select-badge">赠送</span>
                                <span v-else-if="item.discountTxt" class="select-badge">{{ item.discountTxt }}</span>
                            </a-option>

                            <template #label>
                                <span>{{quickQuotaList[quickQuota].label}}</span>
                                <span v-if="quickQuotaList[quickQuota].give && !isRenew" class="select-badge">赠送</span>
                                <span v-else-if="quickQuotaList[quickQuota].discountTxt" class="select-badge">{{ quickQuotaList[quickQuota].discountTxt }}</span>
                            </template>
                        </a-select>
                    </div>
                    <table class="com-table"><tbody>
                        <tr class="thead" >
                            <td style="width:120px;">名称</td>
                            <td>配置</td>
                            <!-- <td>单价</td> -->
                            <td style="width:200px;">价格</td>
                        </tr>
                        <tr>
                            <td>CPU</td>
                            <td>
                                <span v-if="isRenew">{{info.cpu?info.cpu+' 核':'-'}}</span>
                                <div v-else class="df ai-c">
                                    <a-slider
                                        v-model="info.cpu"
                                        :min="0"
                                        :max="16"
                                        :step="2"
                                        :disabled="showPrice.promoDisct"
                                        style="flex:1;margin-bottom:0;padding-top:10px;"
                                        :marks="createMarks({start:0, end:16, step:2})"
                                        @change="v=>changeSilder('cpu',v)"
                                    />
                                    <a-input-number
                                        v-model="info.cpu"
                                        style="margin-left:20px;width:160px;"
                                        :min="2"
                                        :max="maxs.cpu"
                                        :step="1"
                                        :precision="0"
                                        :disabled="showPrice.promoDisct"
                                        placeholder="请输入"
                                        @change="v=>changeInput('cpu',v)"
                                    >
                                        <template #append>核</template>
                                    </a-input-number>
                                </div>
                            </td>
                            <td data-style="color:rgb(var(--orange-6));">
                                <span v-if="!isExpand">{{ '￥' + showPrice.cpu + '/' + showPrice.unit }}</span>
                                <span v-if="isExpand">{{ '￥' + expandPrice.cpu + '/' + expandPrice.unit }}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>内存</td>
                            <td>
                                <span v-if="isRenew">{{info.memory?info.memory+' Gi':'-'}}</span>
                                <div v-else class="df ai-c">
                                    <a-slider
                                        v-model="info.memory"
                                        :min="0"
                                        :max="64"
                                        :step="2"
                                        :disabled="showPrice.promoDisct"
                                        style="flex:1;margin-bottom:0;padding-top:10px;"
                                        :marks="createMarks({start:0, end:64, step: 8})"
                                        @change="v=>changeSilder('memory',v)"
                                    />
                                    <a-input-number
                                        v-model="info.memory"
                                        style="margin-left:20px;width:160px;"
                                        :min="4"
                                        :max="maxs.memory"
                                        :step="1"
                                        :precision="0"
                                        :disabled="showPrice.promoDisct"
                                        placeholder="请输入"
                                        @change="v=>changeInput('memory',v)"
                                    >
                                        <template #append>Gi</template>
                                    </a-input-number>
                                </div>
                            </td>
                            <td data-style="color:rgb(var(--orange-6));">
                                <span v-if="!isExpand">{{ '￥' + showPrice.memory + '/' + showPrice.unit }}</span>
                                <span v-if="isExpand">{{ '￥' + expandPrice.memory + '/' + expandPrice.unit }}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>存储</td>
                            <td>
                                <span v-if="isRenew">{{info.storage?info.storage+' Gi':'-'}}</span>
                                <div v-else class="df ai-c">
                                    <a-slider
                                        v-model="info.storage"
                                        :min="0"
                                        :max="2048"
                                        :step="5"
                                        :disabled="showPrice.promoDisct"
                                        style="flex:1;margin-bottom:0;padding-top:10px;"
                                        :marks="createMarks({start:0, end:2048, step: 512})"
                                        @change="v=>changeSilder('storage',v)"
                                    />
                                    <a-input-number
                                        v-model="info.storage"
                                        style="margin-left:20px;width:160px;"
                                        :min="10"
                                        :max="maxs.storage"
                                        :step="1"
                                        :precision="0"
                                        :disabled="showPrice.promoDisct"
                                        placeholder="请输入"
                                        @change="v=>changeInput('storage',v)"
                                    >
                                        <template #append>Gi</template>
                                    </a-input-number>
                                </div>
                            </td>
                            <td data-style="color:rgb(var(--orange-6));">
                                <span v-if="!isExpand">{{ '￥' + showPrice.storage + '/' + showPrice.unit }}</span>
                                <span v-if="isExpand">{{ '￥' + expandPrice.storage + '/' + expandPrice.unit }}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>带宽</td>
                            <td>
                                <span v-if="isRenew">{{info.bandwidth?info.bandwidth+' Mbps':'-'}}</span>
                                <div v-else class="df ai-c">
                                    <a-slider
                                        v-model="info.bandwidth"
                                        :min="0"
                                        :max="2000"
                                        :step="5"
                                        :disabled="showPrice.promoDisct"
                                        style="flex:1;margin-bottom:0;padding-top:10px;"
                                        :marks="createMarks({start:0, end:2000, step: 400})"
                                        @change="v=>changeSilder('bandwidth',v)"
                                    />
                                    <a-input-number
                                        v-model="info.bandwidth"
                                        style="margin-left:20px;width:160px;"
                                        :min="1"
                                        :max="maxs.bandwidth"
                                        :step="1"
                                        :precision="0"
                                        :disabled="showPrice.promoDisct"
                                        placeholder="请输入"
                                        @change="v=>changeInput('bandwidth',v)"
                                    >
                                        <template #append>Mbps</template>
                                    </a-input-number>
                                </div>
                            </td>
                            <td data-style="color:rgb(var(--orange-6));">
                                <span v-if="!isExpand">{{ '￥' + showPrice.bandwidth + '/' + showPrice.unit }}</span>
                                <span v-if="isExpand">{{ '￥' + expandPrice.bandwidth + '/' + expandPrice.unit }}</span>
                            </td>
                        </tr>
                    </tbody></table>

                    <div v-if="isNew || isRenew" class="mt-20" style="padding:10px 0; background-color: var(--color-neutral-1);">
                        <table class="com-table xiaoji-table"><tbody>
                            <tr>
                                <td style="width:120px;"><span class="b">价格小计</span></td>
                                <td></td>
                                <td style="width:200px;color:rgb(var(--orange-6));">{{ '￥' + showPrice.oTotal }}</td>
                            </tr>
                            <tr>
                                <td>优惠码</td>
                                <td>
                                    <a-input v-model="promo.code" placeholder="请输入优惠码" @input="testPromoCode" @clear="testPromoCode" allow-clear style="width:300px;"></a-input>
                                    <span v-if="promo.format" class="ml-20">
                                        <span v-if="!promo.canuse" class="c-red"><icon-close-circle /><span class="ml-4">优惠券不可用</span></span>
                                        <span v-else-if="!promo.equal" class="c-red"><icon-close-circle /><span class="ml-4">优惠券不可用</span></span>
                                        <span v-if="promo.canuse && promo.equal" class="c-green"><icon-check-circle /><span class="ml-4">优惠券可用</span></span>
                                    </span>
                                </td>
                                <td style="color:rgb(var(--orange-6));">-￥{{ showPrice.promoDisct? showPrice.dcVal : 0  }}</td>
                            </tr>
                        </tbody></table>
                    </div>

                    <a-form :model="info" auto-label-width class="mt-20" style="padding:10px;">
    
                        <a-form-item v-if="!isExpand" label="时长" style="margin-bottom:20px;">
                            <div class="df ai-c" style="flex:1;">
                                <div class="df df-s0">
                                    <a-button-group type="outline" style="margin-right:20px;">
                                        <template
                                            v-for="(item,index) in timeoptions.slice(0, 8)"
                                            :key="index"
                                        >
                                            <a-button
                                                :disabled="showPrice.promoDisct"
                                                :type="(info.quantity==item.quantity&&info.unit==item.unit)?'primary':'outline'"
                                                @click="selectTime(item)"
                                            >
                                                <span>{{ item.quantity + units[item.unit] }}</span>
                                                <span v-if="item.discountTxt" class="badge">{{ item.discountTxt }}</span>
                                            </a-button>
                                        </template>
                                    </a-button-group>

                                    <a-dropdown v-if="timeoptions.length>8" @select="v=>selectTime(v,v.txt)">
                                        <a-button :type="selectMoreTime?'primary':'secondary'">{{selectMoreTime||'更多时长'}} <icon-down/></a-button>
                                        <template #content>
                                            <template
                                                v-for="(item,index) in timeoptions.slice(8)"
                                                :key="index"
                                            >
                                                <a-doption
                                                    :disabled="showPrice.promoDisct"
                                                    :value="{...item,txt: item.quantity + units[item.unit] }"
                                                >
                                                    <span>{{ item.quantity + units[item.unit] }}</span>
                                                    <a-badge v-if="isRenew && Number(item.discount_renew)>=0 && Number(item.discount_renew)<100" :text="discountTxt(item.discount_renew)" class="ml-10"></a-badge>
                                                    <a-badge v-else-if="isNew && Number(item.discount_new)>=0 && Number(item.discount_new)<100" :text="discountTxt(item.discount_new)" class="ml-10"></a-badge>
                                                </a-doption>
                                            </template>
                                        </template>
                                    </a-dropdown>
                                    
                                    <span v-if="info.quantity&&info.unit" class="ml-20" style="line-height:32px;">（{{addDate(info.quantity,info.unit,expiretime,isRenew)}}到期）</span>
                                </div>
                            </div>
                        </a-form-item>
                        
                        <a-form-item v-if="isExpand" label="时长" style="margin-bottom:20px;">
                            <span>{{ expandTimeNum }}{{ expandTimeUnitTxt }}</span>
                            <span class="ml-20">（{{expiretime}}到期）</span>
                        </a-form-item>

                        <a-form-item v-if="!isExpand" label="总价">
                            <span v-if="showPrice.isGive">
                                <span class="fs-20" style="color:rgb(var(--orange-6));">赠送</span>
                                <span class="fs-16 c-99 ml-10 txt-line-t">￥{{ showPrice.oTotal }}</span>
                            </span>
                            <span v-else-if="showPrice.isDiscount">
                                <span class="fs-20" style="color:rgb(var(--orange-6));">{{ showPrice.total }}</span>
                                <span class="fs-16 c-99 ml-10 txt-line-t">￥{{ showPrice.oTotal }}</span>
                            </span>
                            <span v-else class="fs-20" style="color:rgb(var(--orange-6));">￥{{ showPrice.total }}</span>
                        </a-form-item>
                        
                        <a-form-item v-if="isExpand" label="总价">
                            <span class="fs-20" style="color:rgb(var(--orange-6));">￥{{allExpandPrice}}</span>
                        </a-form-item>
    
                    </a-form>
                    <div class="df ai-c jc-c mt-40">
                        <!-- 续费 -->
                        <a-button v-if="isRenew" type="primary" size="large" style="width:160px;" @click="toRenew">支付</a-button>
                        <a-button v-else-if="isExpand" type="primary" size="large" style="width:160px;" @click="toExpand">扩容</a-button>
                        <a-button v-else type="primary" size="large" style="width:160px;" @click="toBuy">购买</a-button>
                    </div>
                </div>
            </div>
            
            <a-modal :width="1000" title="支付" @cancel="payDrawer.show=false;checkInfo();" @close="checkInfo" :visible="payDrawer.show" :footer="false" :mask-closable="false" class="pay-modal">
                <iframe :src="payDrawer.url" frameborder="0" style="width:100%;height:660px;"></iframe>
            </a-modal>
        </div>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import dayjs from 'dayjs'
import { useLoadingStore } from '@/store';

export default {
    data(){
        return {
            units: {
                '':'月',
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            // 价格单位 xx元/月
            priceTimes: {
                '': 1,
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            },
            dayUnite: {
                hour: 1 / 24,
                day: 1,
                month: 30,
                year: 12 * 30,
            },
            expandOriginData: {},
            info: {
                cpu: '',
                memory: '',
                storage: '',
                bandwidth: '',
                time: '',
                price: '',
                unitPrice: 0,
                unit: 'hour',
                quantity: '',
                quota: {},
            },
            payDrawer: {
                show: false,
                ticket: '',
                url: '',
            },
            
            step: 1,
            isRenew: false,     // 续费
            isExpand: false,    // 扩容
            isOuttime: false,

            interval: null,

            timeoptions: [
                {quantity:1,unit:'month'},
                {quantity:2,unit:'month'},
                {quantity:3,unit:'month'},
                {quantity:1,unit:'year'},
                {quantity:2,unit:'year'},
                {quantity:3,unit:'year'},
                {quantity:4,unit:'year'},
                {quantity:5,unit:'year'},
                {quantity:6,unit:'year'},
                {quantity:7,unit:'year'},
                {quantity:8,unit:'year'},
                {quantity:9,unit:'year'},
                {quantity:10,unit:'year'},
            ],

            expiretime: '',
            
            expandTimeNum: 0,
            expandTimeUnit: 'day',
            expandTimeUnitTxt: '天',

            quickQuotaList: [],
            quickQuota: '',

            maxs: {},

            promo: {
                code: '',
                discount: 100,
            },

            orderData: {},
        }
    },
    created(){
        this.getData();
        this.getMaxs();
    },
    components: {
        
    },
    watch: {
        'info.cpu'(){
            this.testPromoEqual()
            this.testQq()
        },
        'info.memory'(){
            this.testPromoEqual()
            this.testQq()
        },
        'info.storage'(){
            this.testPromoEqual()
            this.testQq()
        },
        'info.bandwidth'(){
            this.testPromoEqual()
            this.testQq()
        },
        'info.quantity'(){
            this.testPromoEqual()
            this.testQq()
        },
        'info.unit'(){
            this.testPromoEqual()
            this.testQq()
        },
    },
    computed:{
        selectMoreTime(){
            let findIndex = this.timeoptions.findIndex(i=>i.quantity==this.info.quantity&&i.unit==this.info.unit)
            if(findIndex==-1 || findIndex<8){return ''}
            return this.timeoptions[findIndex].quantity + this.units[this.timeoptions[findIndex].unit]
        },
        isNew(){
            return !this.isRenew && !this.isExpand;
        },
        renewPrice(){
            let unitPrice = this.info.unitPrice || 0;
            let days = this.timeToDay();
            return Number((unitPrice * days).toFixed(2));
        },
        showPrice(){
            let cost = {
                cpu: this.info?.cost?.cpu || 0,
                memory: this.info?.cost?.memory || 0,
                bandwidth: this.info?.cost?.bandwidth || 0,
                storage: this.info?.cost?.storage || 0,
            }
            let nums = {
                cpu: this.info?.cpu || 0,
                memory: this.info?.memory || 0,
                storage: this.info?.storage || 0,
                bandwidth: this.info?.bandwidth || 0,
            }
            let time = this.priceTimes;
            let unit = this.units;
            let quotaQuantity = this.info?.quantity || 1;
            let quotaUnit = this.info?.unit || '';

            let discount = 100;
            let timeItem = this.timeoptions.find(i=>i.quantity==this.info.quantity&&i.unit==this.info.unit);
            let isGive = false;
            if(timeItem){
                if(this.isRenew && Number(timeItem.discount_renew)>=0 && Number(timeItem.discount_renew)<100){ discount = Number(timeItem.discount_renew); }
                else if(this.isNew && Number(timeItem.discount_new)>=0 && Number(timeItem.discount_new)<100){ discount = Number(timeItem.discount_new); }
                
                if(this.quickQuota!==''){
                    let configItem = this.quickQuotaList?.[this.quickQuota];
                    if(this.isRenew &&  Number(configItem.dc_renew)>=0 && Number(configItem.dc_renew)<100){
                        discount = Number(configItem.dc_renew)
                    }
                    if(this.isNew && configItem.dc_new && Number(configItem.dc_new)<100){
                        discount = Number(configItem.dc_new)
                    }
                    if(configItem.give){
                        isGive = true;
                    }
                }
            }
            // 优惠券
            let promoDisct = false;
            if(this.promo.format && this.promo.canuse && this.promo.equal){
                if(Number(this.promo?.discount)>=0&&Number(this.promo?.discount)<100){
                    promoDisct = true;
                    discount = Number(this.promo.discount);
                }
            }
            
            let data = {
                cpu: Number((cost.cpu * quotaQuantity * time[quotaUnit] * Number(nums.cpu)).toFixed(2)),
                memory: Number((cost.memory * quotaQuantity * time[quotaUnit] * Number(nums.memory)).toFixed(2)),
                storage: Number((cost.storage * quotaQuantity * time[quotaUnit] * Number(nums.storage)).toFixed(2)),
                bandwidth: Number((cost.bandwidth * quotaQuantity * time[quotaUnit] * Number(nums.bandwidth)).toFixed(2)),
                unit: (quotaQuantity==1?'':quotaQuantity) + unit[quotaUnit],
                isGive: isGive && !this.isRenew,
                promoDisct: promoDisct,
            }
            data.isDiscount = discount < 100;

            data.oTotal = data.cpu + data.memory + data.storage + data.bandwidth;
            data.total = data.oTotal * discount / 100;
            data.oTotal = Number(data.oTotal.toFixed(2));
            data.total = Number(data.total.toFixed(2));
            data.dcVal = Number((data.oTotal - data.total).toFixed(2));
            return data;
        },
        expandPrice(){
            
            let cost = {
                cpu: this.info?.cost?.cpu || 0,
                memory: this.info?.cost?.memory || 0,
                bandwidth: this.info?.cost?.bandwidth || 0,
                storage: this.info?.cost?.storage || 0,
            }
            let nums = {
                cpu: Number(this.info?.cpu - this.expandOriginData?.cpu) || 0,
                memory: Number(this.info?.memory - this.expandOriginData?.memory) || 0,
                storage: Number(this.info?.storage - this.expandOriginData?.storage) || 0,
                bandwidth: Number(this.info?.bandwidth - this.expandOriginData?.bandwidth) || 0,
            }
            
            let time = this.priceTimes;

            let unit = {
                '':'天',
                hour: '小时',
                day: '天',
                month: '月',
                year: '年'
            }
            let expandTimeNum = this.expandTimeNum;
            let expandTimeUnit = this.expandTimeUnit;
            let data = {
                cpu: Number((cost.cpu * expandTimeNum * time[expandTimeUnit] * Number(nums.cpu)).toFixed(2)),
                memory: Number((cost.memory * expandTimeNum * time[expandTimeUnit] * Number(nums.memory)).toFixed(2)),
                storage: Number((cost.storage * expandTimeNum * time[expandTimeUnit] * Number(nums.storage)).toFixed(2)),
                bandwidth: Number((cost.bandwidth * expandTimeNum * time[expandTimeUnit] * Number(nums.bandwidth)).toFixed(2)),
                unit: (expandTimeNum==1?'':expandTimeNum) + unit[expandTimeUnit],
            }
            // console.log(cost,expandTimeNum,expandTimeUnit,nums)
            return data;
        },
        allExpandPrice(){
            let cpu = this.expandPrice.cpu || 0;
            let memory = this.expandPrice.memory || 0;
            let storage = this.expandPrice.storage || 0;
            let bandwidth = this.expandPrice.bandwidth || 0;
            return Number((cpu + memory + storage + bandwidth).toFixed(2));
        },
    },
    beforeUnmount(){
        window.removeEventListener('message', this.paySuccess);
        try{
            clearInterval(this.interval);
        }catch{}
    },
    mounted(){
        window.addEventListener('message', this.paySuccess);
    },
    methods: {
        testPromoCode(){
            this.promo.format = this.promo.code.trim().length==23;
            if(!this.promo.format){return}
            // /k8s/console/code/xxxxxx
            // /k8s/console/proxy/api/thirdparty-cd/k8s-offline/sdk/coupon/xxxx
            panelApi.get(`/auth/console/code/${this.promo.code.trim()}`).then(res=>{
                let d = res.data;
//测试 20251215145138-XNBMAY2O
// d = {
//     ...d,
//     canuse: true,
//     cpu: 2,
//     memory: 4,
//     storage: 20,
//     bandwidth: 200,
//     timequantity: 1,
//     timeunit: 'month',
// }
                this.promo = {
                    ...this.promo,
                    canuse: d.canuse,
                    cpu: d.cpu,
                    memory: d.memory,
                    storage: d.storage,
                    bandwidth: d.bandwidth,
                    discount: d.discount,
                    expireAt: d.expireAt,
                    status: d.status,
                    timequantity: d.timequantity,
                    timeunit: d.timeunit,
                }
                if(this.isNew && this.promo.canuse){
                    let find = this.timeoptions.find(i=>i.quantity==d.timequantity&&i.unit==d.timeunit);
                    if(find){
                        this.info = {
                            ...this.info,
                            cpu: d.cpu,
                            memory: d.memory,
                            storage: d.storage,
                            bandwidth: d.bandwidth,
                            quantity: d.timequantity,
                            unit: d.timeunit,
                        }
                        this.setTimeoptions();
                    }
                }
                this.testPromoEqual();
            })
        },
        // 判断优惠券配置==当前配置
        testPromoEqual(){
            let d = this.promo;
            let i = this.info;
            this.promo.equal = (d.cpu==i.cpu) && (d.memory==i.memory) && (d.storage==i.storage) && (d.bandwidth==i.bandwidth) && (d.timequantity==i.quantity) && (d.timeunit==i.unit);
        },
        getMaxs(){
            panelApi.get('/k3k/overselling/current-resource').then(res=>{
                this.maxs = res?.data;
            }).catch(()=>{})
        },
        discountTxt(discount){
            discount = Number(discount);
            if(discount>=100){return ''}
            return Number((discount/10).toFixed(2)) + '折';
        },
        // 选择时长
        selectTime(item){
            this.info.quantity = item.quantity;
            this.info.unit = item.unit;
        },
        // 刷新配置列表
        getQuickQuota(){
            let arr = [];
            this.info.cost.packageConfig.map(i=>{
                let config = i?.config || [];
                config.map(c=>{
                    let discountTxt = '';
                    if(this.isNew && Number(c.dc_new)>=0 && Number(c.dc_new)<100){
                        discountTxt = this.discountTxt(c.dc_new);
                    }
                    if(!discountTxt && !c.give){return}
                    arr.push({
                        ...c,
                        quantity: i.time,
                        unit: i.timeUnit,
                        label: `${i.time}${this.units[i.timeUnit]}/${c.c}核/${c.m}G/${c.bw}Mbps/${c.s}G`,
                        discountTxt: discountTxt,
                    })
                })
            })
            arr.sort((a, b) => b.give - a.give);
            this.quickQuotaList = arr;
            this.testQq();
        },
        changeQuickQuota(){
            if(this.quickQuota===''){return}
            let data = this.quickQuotaList?.[this.quickQuota];
            if(!data){return}
            this.info = {
                ...this.info,
                quantity: data.quantity,
                unit: data.unit,

                cpu: data.c,
                memory: data.m,
                storage: data.s,
                bandwidth: data.bw,
            }
            this.setTimeoptions();
        },
        // 自动快速选择配置
        testQq(){
            this.quickQuota = '';
            let findIndex = this.quickQuotaList.findIndex(i=>{
                let q = this.info;
                return i.quantity==q.quantity && i.unit==q.unit && i.c==Number(q.cpu) && i.s==Number(q.storage) && i.m==Number(q.memory) && i.bw==Number(q.bandwidth);
            })
            if(findIndex>-1){ this.quickQuota = findIndex };
        },
        addDate(quantity,unit,expiretime,isRenew){
            
            let time = this.dayUnite;

            let length = Number(quantity||0) * time[unit];
            if(expiretime && isRenew){
                let exp = dayjs(expiretime);
                let now = dayjs();
                return ((exp.unix() > now.unix())? exp : now).add( length , 'day').format('YYYY-MM-DD');
            }
            return dayjs().add(length , 'day').format('YYYY-MM-DD')
        },
        toExpand(){
            panelApi.post('/k3k/order/expand',{
                cpu: Number(this.info.cpu),
                memory: Number(this.info.memory),
                bandwidth: Number(this.info.bandwidth),
                storage: Number(this.info.storage),
                cvmName: this.$route.query.cvmName,
            },{loading:true}).then(res=>{
                let data = res.data;
                this.orderData = data;
                if(data?.needPay && data?.ticket){
                    this.payDrawer = {
                        show: true,
                        ticket: data?.ticket,
                        url: `https://ip.w7.cc/pay/${res?.data?.ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`
                    }
                }else{
                    this.checkInfo();
                }
            })
        },
        toRegister(){
            const url = new URL(window.location.href);
            url.searchParams.set('register', 'true');
            
            window.location.href = '/panel-api/v1/auth/console/oauth?redirect_uri='+(url.toString());
        },
        register(){
            let code = this.$route.query.code;
            panelApi.get('/auth/console/bind?code='+code).then(res=>{
                this.$message.success('操作成功');
                this.$router.push({
                    ...this.$route,
                    query: {
                        ...this.$route.query,
                        register: 'false',
                        code: null,
                    }
                }).then(res=>{
                    this.getData();
                });
                // panelApi.post('/auth/console/register-to-console?offline_url='+window.location.origin,{
                //     offline_url: window.location.origin,
                //     offlineUrl: window.location.origin,
                // },{loading:true})
            })
        },
        expand(){
            this.step = 2;
            this.isExpand = true;
            
            panelApi.get('/k3k/info').then(async res=>{
                let data = res?.data;
                this.expiretime = this.$route.query?.expireTime || data?.['w7.cc/expiretime'];
                let cost = JSON.parse(data?.['w7.cc/cost'] || '{"buymode":"buy","cpu":0,"memory":0,"storage":0,"bandwidth":0}')
                cost.cpu = Number(Number(cost.cpu).toFixed(2));
                cost.memory = Number(Number(cost.memory).toFixed(2));
                cost.storage = Number(Number(cost.storage).toFixed(2));
                cost.bandwidth = Number(Number(cost.bandwidth).toFixed(2));
                this.info.cost = cost;

                this.expandData(data);

            })
        },
        async expandData(data){
            if(this.$route.query.cvmName){
                await panelApi.get(`/k3k/cvm/v1/${this.$route.query.cvmNamespace}/info/${this.$route.query.cvmName}`).then(res=>{
                    let status = res.data?.status || {};
                    let effectiveResource = status?.effectiveResource || {};
                    this.expandOriginData = {
                        ...effectiveResource,
                    }
                    this.info = {
                        ...this.info,
                        ...effectiveResource,
                    }
                    if(status?.diffDay){
                        this.expandTimeNum = status?.diffDay; //dayjs(this.expiretime).diff(new Date(), 'day')
                        this.expandTimeUnit = 'day';
                    }else if(status?.diffMonth){
                        this.expandTimeNum = status?.diffMonth;
                        this.expandTimeUnit = 'month';
                    }else if(status?.diffYear){
                        this.expandTimeNum = status?.diffYear;
                        this.expandTimeUnit = 'year';
                    }
                })
            }else{
                let quotalimit = data?.['w7.cc/quota-limit'] || '{}';
                quotalimit = JSON.parse(quotalimit);
                let initVal = {
                    cpu: String(quotalimit?.hard?.cpu).replace(/[a-zA-Z]+$/,'') || '',
                    memory: String(quotalimit?.hard?.memory).replace(/[a-zA-Z]+$/,'') || '',
                    bandwidth: String(quotalimit?.hard?.bandwidth).replace(/[a-zA-Z]+$/,'') || '',
                    storage: String(quotalimit?.hard?.['requests.storage']).replace(/[a-zA-Z]+$/,'') || '',
                }
                initVal = {
                    cpu: Number(initVal.cpu),
                    memory: Number(initVal.memory),
                    bandwidth: Number(initVal.bandwidth),
                    storage: Number(initVal.storage),
                }
                
                this.expandOriginData = {
                    ...initVal,
                }
                this.info = {
                    ...this.info,
                    ...initVal,
                }
                
                if(data?.['w7.cc/diff-day']){
                    this.expandTimeNum = data?.['w7.cc/diff-day']; //dayjs(this.expiretime).diff(new Date(), 'day')
                    this.expandTimeUnit = 'day';
                }else if(data?.['w7.cc/diff-month']){
                    this.expandTimeNum = data?.['w7.cc/diff-month'];
                    this.expandTimeUnit = 'month';
                }else if(data?.['w7.cc/diff-year']){
                    this.expandTimeNum = data?.['w7.cc/diff-year'];
                    this.expandTimeUnit = 'year';
                }
            }
            if(this.expiretime){
                this.expandTimeNum = Number(Number(this.expandTimeNum).toFixed(2))
                this.expandTimeUnitTxt = {
                    '':'天',
                    hour: '小时',
                    day: '天',
                    month: '月',
                    year: '年'
                }[this.expandTimeUnit]
            }
        },
        createOrder(message){
            panelApi.get('/k3k/info').then(async res=>{
                let data = res?.data;

                this.expiretime = data?.['w7.cc/expiretime'];
                this.isOuttime = this.expiretime && dayjs(this.expiretime).isBefore(dayjs());

                if(data?.['w7.cc/support-cvm']=="true"){
                    
                    let { data } = await panelApi.get("/auth/console/info?code=test")
                    
                    let require_oauth = data?.require_oauth;

                    if(require_oauth){
                        this.step = 1;
                        return;
                    }
                }
                
                this.step = 2;
//测试
                if(this.$route.query.renew!='true' && this.$route.query.isNew!='true' && data?.['w7.cc/need-create-order']!='true' && data?.['w7.cc/need-renew']!='true'){
                    if(message){
                        this.$message.success('操作成功');
                    }
                    if(res?.data?.['w7.cc/k3k-job-status']=='complete'){
                        this.$router.push('/');
                    }else{
                        this.$router.push('/init-cluster?from=orderbase');
                    }
                    return;
                }

                this.isRenew = false;
                if(data?.['w7.cc/need-create-order']!='true' && data?.['w7.cc/need-renew']=='true'){ this.isRenew = true; }
                if(this.$route.query.renew=='true'){ this.isRenew = true; }

                if(message){return}

                let cost = JSON.parse(data?.['w7.cc/cost'] || '{"buymode":"buy","cpu":0,"memory":0,"storage":0,"bandwidth":0,"packageConfig":"[]"}')
                if(typeof cost?.packageConfig=='string'){
                    cost.packageConfig = JSON.parse(cost.packageConfig);
                }
                
                cost?.packageConfig && cost?.packageConfig?.map(i=>{
                    let findIndex = this.timeoptions.findIndex(t=>t.quantity==i.time&&t.unit==i.timeUnit)
                    let o = {
                        ...i,
                        quantity: Number(i.time),
                        unit: i.timeUnit,
                    }
                    delete o.time;
                    delete o.timeUnit;
                    if(findIndex < 0){
                        this.timeoptions.push(o);
                    }else{
                        this.timeoptions[findIndex] = o;
                    }
                })
                
                this.info.quantity = this.timeoptions[0].quantity;
                this.info.unit = this.timeoptions[0].unit;
                
                await this.initValData(data);

                this.info = {
                    ...this.info,

                    price: data?.['w7.cc/base-price-total'] || '',
                    unitPrice: data?.['w7.cc/unit-price-total'] || '',

                    buymode: cost?.buymode,
                    cost: cost,
                }
                
                this.setTimeoptions();
                this.getQuickQuota();
                if(this.isNew && this.quickQuotaList?.length){
                    this.quickQuota = 0;
                    this.changeQuickQuota();
                }
            }).finally(()=>{
                let couponCode = this.$route.query.couponCode;
                if(couponCode){
                    this.promo.code = couponCode;
                    this.testPromoCode();
                }
            })
        },
        initValData(data){
            if(this.$route.query.cvmName){
                panelApi.get(`/k3k/cvm/v1/${this.$route.query.cvmNamespace}/info/${this.$route.query.cvmName}`).then(res=>{
                    let effectiveResource = res.data?.status?.effectiveResource || {};
                    this.info = {
                        ...this.info,
                        ...effectiveResource,
                    }
                })
            }else{
                let quota = JSON.parse(data?.['w7.cc/quota-limit'] || '{}')
                let initVal = {
                    cpu: String(quota?.hard?.cpu).replace(/[a-zA-Z]+$/,'') || '',
                    memory: String(quota?.hard?.memory).replace(/[a-zA-Z]+$/,'') || '',
                    bandwidth: String(quota?.hard?.bandwidth).replace(/[a-zA-Z]+$/,'') || '',
                    storage: String(quota?.hard?.['requests.storage']).replace(/[a-zA-Z]+$/,'') || '',
                }
                initVal = {
                    cpu: Number(initVal.cpu),
                    memory: Number(initVal.memory),
                    bandwidth: Number(initVal.bandwidth),
                    storage: Number(initVal.storage),
                }
                this.info = {
                    ...this.info,
                    ...initVal,
                }
            }
        },
        getData(message){
            if(this.$route.query.register=='true'){
                this.step = 1;
                this.register();
                return;
            }
            if(this.$route.query.expand=='true'){
                this.expand();
                return;
            }
            this.createOrder(message);
        },
        // 购买时长 排序 去重
        setTimeoptions(){
            if(this.isExpand){return}
            let arr = this.timeoptions.map(i=>({...i, value: i.quantity * this.dayUnite[i.unit]}));
            arr.sort((a,b)=>a.value-b.value);
            arr.map((item,index)=>{
                arr[index].discountTxt = '';
                if(this.isNew && Number(item.discount_new)>=0 && Number(item.discount_new)<100){ arr[index].discountTxt = this.discountTxt(item.discount_new); }
                if(this.isRenew && Number(item.discount_renew)>=0 && Number(item.discount_renew)<100){ arr[index].discountTxt = this.discountTxt(item.discount_renew); }
                let n = this.info;
                item?.config?.map?.(i=>{
                    let match = i.c==n.cpu && i.m==n.memory && i.s==n.storage && i.bw==n.bandwidth;
                    if(!match){return}
                    if(this.isNew && Number(i.dc_new)>=0 && Number(i.dc_new)<100){ arr[index].discountTxt = this.discountTxt(i.dc_new); }
                    if(this.isRenew && Number(i.dc_renew)>=0 && Number(i.dc_renew)<100){ arr[index].discountTxt = this.discountTxt(i.dc_renew); }
                    if(i.give && !this.isRenew){arr[index].discountTxt = '赠送';}
                })
            })
            this.timeoptions = arr;
        },
        deleteQuery(){
            if(this.isExpand){
                this.$router.push('/');
                return;
            }
            const newQuery = Object.assign({}, this.$route.query)
            delete newQuery.renew;
            this.$router.push({
                ...this.$route,
                query: newQuery
            })
        },
        toRenew(){
            let days = this.timeToDay();
            panelApi.post('/k3k/order/renew',{
                day: days,
                quantity: Number(this.info.quantity),
                unit: this.info.unit,
                ...((this.promo.format && this.promo.canuse && this.promo.equal)?{
                    couponCode: this.promo.code,
                }:{}),
                cvmName: this.$route.query.cvmName,
            },{loading:true}).then(res=>{
                let data = res.data;
                this.orderData = data;
                if(data?.needPay && data?.ticket){
                    this.payDrawer = {
                        show: true,
                        ticket: data?.ticket,
                        url: `https://ip.w7.cc/pay/${res?.data?.ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`
                    }
                }else{
                    this.deleteQuery();
                    this.checkInfo();
                }
            })
        },
        toBuy(){
            panelApi.post('/k3k/order/base',{
                quantity: Number(this.info.quantity),
                unit: this.info.unit,
                cpu: Number(this.info.cpu),
                memory: Number(this.info.memory),
                bandwidth: Number(this.info.bandwidth),
                storage: Number(this.info.storage),
                ...((this.promo.format && this.promo.canuse && this.promo.equal)?{
                    couponCode: this.promo.code,
                }:null)
            },{loading:true}).then(res=>{
                let data = res.data;
                this.orderData = data;
                if(data?.needPay && data?.ticket){
                    this.payDrawer = {
                        show: true,
                        ticket: data?.ticket,
                        url: `https://ip.w7.cc/pay/${res?.data?.ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`
                    }
                }else{
                    useLoadingStore().loading = true;
                    setTimeout(()=>{
                        useLoadingStore().loading = false;
                        this.deleteQuery();
                        this.checkInfo();
                    },5000)
                }
            })
        },
            
        paySuccess(e){
            if(e?.data?.type!='paysuccess'){return}
            this.payDrawer.show = false;
            if(this.isExpand || this.isRenew){
                if(this.$route.query.cvmName || this.$route.query.isCvm){
                    this.$router.push('/fp/usermanage-resource');
                    return;
                }
            }
            this.deleteQuery();
        },
        checkInfo(){
            try{
                clearInterval(this.interval);
            }catch{}
            this.checkStatus();
            this.interval = setInterval(() => {
                this.checkStatus();
            }, 2000);
        },
        checkStatus(){
            if(this.$route.query.isCvm || this.$route.query.cvmName){
                this.checkCvmStatus();
                return;
            }
            if(this.isExpand){return}
            panelApi.get('/k3k/info').then(async res=>{
                let data = res?.data;

                this.expiretime = data?.['w7.cc/expiretime'];
                this.isOuttime = this.expiretime && dayjs(this.expiretime).isBefore(dayjs());

                if(data?.['w7.cc/user-mode']=='cluster'){
                    
                    let { data } = await panelApi.get("/auth/console/info?code=test")
                    
                    let require_oauth = data?.require_oauth;

                    if(require_oauth){
                        this.step = 1;
                        return;
                    }
                }
                
                this.step = 2;
                if(this.$route.query.renew!='true' && data?.['w7.cc/need-create-order']!='true' && data?.['w7.cc/need-renew']!='true'){
                    this.$message.success('操作成功');
                    if(this.$route.query.cvmName || this.$route.query.isCvm){
                        this.$router.push('/fp/usermanage-resource');
                        return;
                    }
                    if(res?.data?.['w7.cc/k3k-job-status']=='complete'){
                        this.$router.push('/');
                    }else{
                        this.$router.push('/init-cluster?from=orderbase');
                    }
                    return;
                }
            })
        },
        checkCvmStatus(){
            let order = this.orderData?.ipOrderSn || '';
            let name = this.orderData?.cvmName;
            let namespace = this.orderData?.cvmNamespace;
            k8sproxy.get(`/apis/cvm.w7.cc/v1alpha1/namespaces/${namespace}/cvmconsoleorders/${order.toLowerCase()}?local=1`).then(res=>{
                let paid = res?.data?.spec?.order?.status == 'paid';
                if(paid){
                    clearInterval(this.interval)
                    this.$message.success('购买成功');
                    this.$router.push(`/init-cluster?cvmName=${name}&cvmNamespace=${namespace}`);
                }
            })
        },
        timeToDay(){
            let quantity = this.info.quantity || 0;
            let unit = this.info.unit;
            let factor = this.dayUnite[unit];

            return Number((quantity * factor).toFixed(2));
        },
        
        changeSilder(type,value){
            let minval = {
                cpu: 2,
                memory: 4,
                storage: 10,
                bandwidth: 1,
            }
            if(this.isExpand){
                minval = {
                    ...minval,
                    ...this.expandOriginData,
                }
            }
            let maxval = {
                cpu: this.maxs.cpu? Math.min(16,this.maxs.cpu) : 16,
                memory: this.maxs.memory? Math.min(64,this.maxs.memory) : 64,
                storage: this.maxs.storage? Math.min(2048,this.maxs.storage) : 2048,
                bandwidth: this.maxs.bandwidth? Math.min(2000,this.maxs.bandwidth) : 2000,
            }
            this.info[type] = value < minval[type] ? minval[type] : value;
            if(this.info[type] > maxval[type]){ this.info[type] = maxval[type] }
            this.setTimeoptions();
        },
        changeInput(type,value){
            this.$nextTick(()=>{
                this.changeSilder(type,value)
            })
        },
        createMarks({start,end,step}){
            const ticks = {};
            let current = start;
            
            while (current <= end) {
                ticks[current] = current;
                current += step;
            }
            return ticks;
        },
    }
}
</script>

<style scoped>
.m-lr6{margin-left:6px; margin-right:6px;}
.badge{
    display: inline-block;
    padding: 0 6px;
    position: absolute;
    top: -12px;
    right: -6px;
    height: 20px;
    line-height:20px;
    font-size:12px;
    border-radius:10px;
    background: rgb(var(--danger-6));
    color: var(--color-white);
    z-index:9;
}
.com-table.xiaoji-table td{border:none;}
.com-table.xiaoji-table tr:first-child td{background:transparent; border-top:0; color:rgb(var(--gray-10));}

</style>
<style>
.pay-modal .arco-modal-body{padding:0;}
.order-base-step .arco-steps-item-wait .arco-steps-icon{background-color:var(--color-fill-3);}

.select-badge{
    color: var(--color-white);
    background: rgb(var(--danger-6));
    padding:2px 5px;
    line-height:14px;
    border-radius: 8px;
    font-size: 12px;
    margin-left: 4px;
}
</style>
