<template>
    <div class="df df-c padding-20" style="height:100%;">
        <Breadcrumb :routes="topbc" />
        <div class="bg-white padding-20 fc">
            <a-form :model="Order" auto-label-width>
                <a-form-item label="下单时间" class="mb-0">{{Order.created_at}}</a-form-item>
                <a-form-item v-if="Order.paid_at" label="付款时间" class="mb-0">{{Order.paid_at}}</a-form-item>
                <a-form-item v-if="Order.pay_type && payText[Order.pay_type]" label="支付方式" class="mb-0">{{payText[Order.pay_type]}}</a-form-item>
                <a-form-item label="买家" class="mb-0">{{Order.buyer_username}}</a-form-item>
            </a-form>
            
            <a-table class="cptable mt-20" :data="tData" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="商品名称">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <img :src="record.goods_logo" style="width: 60px; height: 60px; border-radius: 4px;" />
                                <span class="ml-10">{{record.product_title}}</span>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="订单编号">
                        <template #cell="{ record }">{{record.unit_price}}</template>
                    </a-table-column>
                    <a-table-column title="价格">
                        <template #cell="{ record }">￥{{record.unit_price}}</template>
                    </a-table-column>
                    <a-table-column title="小计">
                        <template #cell="{ record }">￥{{record.amount}}</template>
                    </a-table-column>
                </template>
            </a-table>
            
            <div class="df df-c ai-e padding-20">
                <!-- <div class="overflow-hidden" v-for="(item,index) in adjustmentList" :key="index">
                    <span>{{item.label}}：</span>
                    <span style="color: #e63d2e">{{item.amount.replace('-', '-￥')}}</span>
                </div> -->
                <div >
                    <span>实付款：</span>
                    <span>￥{{Order.payment}}</span>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'

export default {
    data(){
        return {
            clusterInfo: {},
            payText: {
                credit4: '用户交易币',
                credit6: '开发者交易币',
                alipay: '支付宝',
                wxpay: '微信',
                complex_pay: '聚合支付'
            },
            Order: {},
            tData: [],
            adjustmentList: [],
            topbc: [
                {name: 'root'},
                {name: 'person', label: '个人中心'},
                {name: "person-order-center", label: "订单中心"},
                {name: "person-order-detail", label: "详情"},
            ]
        }
    },
    async created(){
        await panelApi.get("/auth/console/info").then(res=>{
            this.clusterInfo.exist = res?.data?.is_register;
            this.clusterInfo.token = res?.data?.thirdparty_cd_token;
            if(this.clusterInfo.exist){
                this.getData()
            }
        })
    },
    methods: {
        getData(){
            axios.get('//ip.w7.cc/ddd-order/jwt/order/'+this.$route.params.id,{
                params: { },
                customToken: this.clusterInfo.token,
            }).then(res => {
                let d = res.data;
                if(d.count_down_buyer) {
                    let time = String(d.count_down_buyer).replace(/-/g, '/')
                    d.count_down_buyer = new Date(time).getTime()
                }
                this.Order = d;
                this.tData = [{
                    goods_logo: d.goods_logo,
                    product_title: d.product_title,
                    sn: d.sn,
                    unit_price: d.unit_price,
                    amount: d.amount,
                }]
            })
        },
        // getAdjustment() {
        //     axios.get('/ddd-order/order/confirm/adjustment',{params:{
        //         order_id: this.$route.params.id,
        //     }}).then(res => {
        //         this.adjustmentList = res.data || []
        //     })
        // },
    },
}
</script>

<style scoped>
.mb-0{margin-bottom:0;}
</style>
