<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <a-table class="cptable" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="应用">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <img :src="record.goods_logo" style="width:40px;height:40px;border-radius:4px;" />
                                <div class="ml-10">{{ record.product_title }}</div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="购买内容">
                        <template #cell="{ record }">
                            <span>{{record.category_text ? record.category_text : record.category_id === 1 ? '应用授权' : '合同模板'}}</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="店铺" data-index="seller_username"></a-table-column>
                    <a-table-column title="价格">
                        <template #cell="{ record }">
                            <span>￥{{ record.amount }}</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="价格">
                        <template #cell="{ record }">
                            <span>￥{{ record.payment }}</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="订单编号" data-index="sn"></a-table-column>
                    <a-table-column title="下单时间" data-index="created_at"></a-table-column>
                    <a-table-column title="订单状态" data-index="status_text"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <span class="c-blue cursor" @click="goDetail(record.order_id)">查看详情</span>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
            <div class="df jc-e mt-10">
                <a-pagination v-model:current="pagination.current" :total="pagination.total" @change="getList"/>
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
// import res from './list.json'

export default {
    data() {
        return {
            list: [],
            lastpage: 1,
            pagination: {
                current: 1,
                total: 0,
            },
            clusterInfo: {
                exist: true,
                token: '',
            },
        }
    },
    async created() {
        await panelApi.get("/auth/console/info").then(res=>{
            this.clusterInfo.exist = res?.data?.is_register;
            this.clusterInfo.token = res?.data?.thirdparty_cd_token;
            if(this.clusterInfo.exist){
                this.getList()
            }
        })
    },
    methods: {
        goDetail(id){
            this.$router.push('/system/cost-detail/'+id);
        },
        getList(value) {
            // console.log(this.pagination.current);
            //     let data = res.data;
            //     data.forEach(item => {
            //         let time
            //         if (item.count_down_buyer) {
            //             time = String(item.count_down_buyer).replace(/-/g, '/')
            //             item.count_down_buyer = new Date(time).getTime()
            //         }
            //     })
            //     this.list = data
            //     this.pagination.total = res.total;
            // return;

            axios.get('//ip.w7.cc/ddd-order/jwt/order',{
                params: {
                    page: this.pagination.current,
                    from: 'merchant',
                },
                customToken: this.clusterInfo.token,
            }).then(res => {
                let data = res.data.data
                data.forEach(item => {
                    let time
                    if (item.count_down_buyer) {
                        time = String(item.count_down_buyer).replace(/-/g, '/')
                        item.count_down_buyer = new Date(time).getTime()
                    }
                })
                this.list = data
                this.pagination.total = res.data.total;
            })
        },
    }
}
</script>

<style scoped>
</style>
