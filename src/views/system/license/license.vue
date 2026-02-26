<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            
            <div class="df jc-b">
                <a-form layout="inline">
                    <a-form-item label="订单号">
                        <a-input v-model="search.sn" placeholder="请输入订单号" />
                    </a-form-item>
                    <a-form-item label="">
                        <a-select v-model="search.expire">
                            <a-option label="全部" value="0"></a-option>
                            <a-option label="有效期" value="2"></a-option>
                            <a-option label="已过期" value="1"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item>
                        <a-button type="primary" @click="page=1;getList();">确定</a-button>
                    </a-form-item>
                </a-form>
                <a-button type="primary" @click="openBuyLicense">购买授权</a-button>
            </div>
            <a-table class="cptable mt-20" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="订单号" data-index="order_sn"></a-table-column>
                    <a-table-column title="到期时间" data-index="expire"></a-table-column>
                    <a-table-column title="购买时长" data-index="month_text"></a-table-column>
                    <a-table-column title="授权类型" data-index="license_type_text"></a-table-column>
                    <!-- <a-table-column title="授权码">
                        <template #cell="{ record }">
                            <span v-if="record.tls_crt" class="cursor c-blue" @click="showTlsCrt(record)">查看授权码</span>
                        </template>
                    </a-table-column> -->
                    <a-table-column title="授权单位">
                        <template #cell="{record}">
                            <!-- <a v-if="record.url" :href="record.url" target="_blank" class="cursor c-blue">{{  }}</a> -->
                            <span>{{ record.url || '-' }}</span>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="260">
                        <template #cell="{ record }">
                            <!-- <span v-if="!record.tls_crt" class="cursor c-blue mr-10" @click="createLicense(record)">生成授权码</span> -->
                            <span v-if="record.can_renew" class="cursor c-blue mr-10" @click="openBuyLicense()">续费</span>
                            
                            <a-popconfirm v-if="record.can_auth" content="确定授权吗" @ok="inputLicense(record)">
                                <span class="cursor c-blue mr-10">授权</span>
                            </a-popconfirm>
                            
                            <a-popconfirm v-if="record.can_cancel" content="确定取消授权吗" @ok="cancel(record)">
                                <span class="cursor c-blue mr-10">取消授权</span>
                            </a-popconfirm>

                            <!-- <span v-if="record.tls_crt" class="cursor c-blue mr-10" @click="showTlsCrt(record)">查看授权码</span> -->
                        </template>
                    </a-table-column>
                </template>
            </a-table>
            <div class="mt-20 df jc-e">
                <a-pagination v-model:current="page" :total="total" :page-size="per_page" @change="getList"/>
            </div>
        </div>
        
        <a-modal width="800px" v-model:visible="tlsCrt.show" :footer="false">
            <template #title>查看授权码</template>
            <div>
                <a-textarea v-model="tlsCrt.text" style="height:360px;" />
            </div>
        </a-modal>

        <a-modal :width="1000" title="支付" @cancel="payDrawer.show=false;" :visible="payDrawer.show" :footer="false" :mask-closable="false" class="pay-modal">
            <iframe :src="payDrawer.url" frameborder="0" style="width:100%;height:660px;"></iframe>
        </a-modal>
        
        <a-modal :visible="buyLicense.show" @ok="submitBuyLicense" @cancel="buyLicense.show = false" width="600px">
            <template #title>购买授权</template>
            <a-form ref="buylicense" :model="buyLicense" :rules="rules" auto-label-width="">
                <a-form-item label="授权类型"  field="lt">
                    <a-select v-model="buyLicense.lt" placeholder="请选择" @change="changeLt" size="large">
                        <a-option v-for="(item,index) in buyLicense.license" :key="index" :label="item.license_text" :value="index"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="授权时间" field="pid">
                    <a-select v-model="buyLicense.pid" placeholder="请选择" size="large">
                        <template v-if="buyLicense.lt>-1">
                            <a-option v-for="(item,index) in buyLicense.license[buyLicense.lt].children" :key="index" :label="item.month_text" :value="item.product_id"></a-option>
                        </template>
                    </a-select>
                </a-form-item>
                <a-form-item label="价格">{{ buyLicensePrice }}</a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios';
import dayjs from 'dayjs';
import { clearToken } from '@/utils/auth';

export default {
    data(){
        return {
            
            per_page: 15,
            page: 1,
            last_page: 1,
            total: 0,

            search: {
                sn: '',
                expire: '2',
            },

            list: [],
            tlsCrt: {
                show: false,
                text: '',
            },

            buyLicense: {
                show: false,
                license: [],
                lt: -1,
                pid: '',
            },

            rules:{
                lt: [{required:true, trigger:'blur', message:"请选择授权类型"}],
                pid: [{required:true, trigger:'blur', message:"请选择授权时间"}],
                cluster: [{required:true, trigger:'blur', message:"请选择集群"}],
            },

            selectCluster: {
                show: false,
                list: [],
                cluster: '',
                license: '',
            },
            payDrawer: {
                show: false,
                ticket: '',
                url: '',
            },
            buyLicense: {
                show: false,
                license: [],
                lt: -1,
                pid: '',
            },
        }
    },
    async created(){
        await this.testRegister();
        await this.getToken();
        this.getList();
    },
    mounted(){
        window.addEventListener('message', this.paySuccess);
    },
    beforeUnmount(){
        window.removeEventListener('message', this.paySuccess);
    },
    computed: {
        buyLicensePrice(){
            if(!this.buyLicense.pid){ return ''; }
            let find = this.buyLicense?.license[this.buyLicense?.lt]?.children?.find(i=>i.product_id == this.buyLicense.pid)
            return find?.price || '';
        }
    },
    methods: {
        testRegister(){
            return panelApi.get("/auth/console/info?code=test").then(res=>{
                let data = res.data;
                let is_register = data?.is_register;
                if(!is_register){
                    this.$message.error('请先完成注册')
                    this.$router.push('/system/cloud')
                    return Promise.reject();
                }
            });
        },
        cancel(row){
            axios.post('https://console.w7.cc/api/thirdparty-cd/k8s-offline/license/'+row.id+'/cancel',{},{
                customToken: this.token,
            }).then(res=>{
                panelApi.post('/auth/console/verify-cert',{noAlert:true});
                this.$message.success('操作成功');
                this.getList();
            }).catch(()=>{})
        },
        showTlsCrt(row){
            this.tlsCrt.show = true;
            this.tlsCrt.text = row.tls_crt;
        },
        getToken(){
            return panelApi.get("/auth/console/info").then(res=>{
                let thirdparty_cd_token = res?.data?.thirdparty_cd_token;
                this.token = thirdparty_cd_token;
            }).catch(()=>{});
        },
        getList(){
            axios.get('https://console.w7.cc/api/thirdparty-cd/k8s-offline/license',{
                params: {
                    page: this.page,
                    sn: this.search.sn,
                    expire: this.search.expire,
                    per_page: this.per_page,
                },
                customToken: this.token,
            }).then(res=>{
                let data = res.data;
                let list = data?.data?.map(i=>{
                    let expire = dayjs(new Date(i.expire_at_date)).format('YYYY-MM-DD hh:mm:ss');
                    i.expire = expire;
                    i.month_text = i.month>=1200? '永久' : (i.month + '个月');
                    i.can_renew = Date.now() > new Date(i.expire_at_date).getTime();
                    
                    return i;
                })
                this.list = list;
                this.last_page = data.last_page;
                this.total = data.total;
            })
        },
        inputLicense(row){
            panelApi.post('/auth/console/import-cert-console',{
                licenseId: String(row.id),
            },{loading:true}).then(res=>{
                if(res?.data){
                    this.$message.success("导入成功，3秒后退出重新登录");
                    setTimeout(()=>{
                        clearToken();
                        this.$router.push('/login');
                    },3000)
                }
            })
        },
        
        openBuyLicense(){
            axios.get('http://console.w7.cc/api/thirdparty-cd/k8s-offline/license/config',{
                customToken: this.token,
            }).then(res=>{
                let data = res.data;
                let license = [];
                for(let i in data){
                    let item = data[i];
                    let o = {
                        "product_id": item.product_id,
                        "month": item.month,
                        "month_text": item.month>=1200? '永久' : (item.month + '个月'),
                        "price": item.price,
                    }
                    let find = license.find(li=>li.license_type==item.license_type);
                    if(find){
                        find.children.push(o);
                    }else{
                        license.push({
                            license_type: item.license_type,
                            license_text: {'team':"团队版",'company':"企业版"}[item.license_type] || item.license_type,
                            children: [o],
                        })
                    }
                }
                this.buyLicense.license = license;
                this.buyLicense.show = true;
                if(license.length){
                    this.buyLicense.lt = 0;
                    this.changeLt();
                }
            })
        },
        changeLt(){
            this.buyLicense.pid = this.buyLicense?.license?.[this.buyLicense?.lt]?.children?.[0]?.product_id || '';
        },
        submitBuyLicense(){
            this.$refs.buylicense.validate((err) => {
                if (err) { return; }
                this.buyLicense.show = false;
                panelApi.post('/k3k/order/license',{
                    productId: this.buyLicense.pid,
                },{loading: true}).then(res=>{
                    let ticket = res?.data?.payinfo?.ticket;
                    this.payDrawer = {
                        show: true,
                        ticket: ticket,
                        url: `https://ip.w7.cc/pay/${ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`
                    }
                })
            })
        },
        paySuccess(e){
            if(e?.data?.type!='paysuccess'){return}
            this.$message.success('操作成功');
            this.payDrawer.show = false;
            this.getList();
        },
        createLicense(row){
            axios.post("http://console.w7.cc/api/thirdparty-cd/k8s-offline/license/"+ row.id +"/tls",{},{
                loading: true,
                customToken: this.token,
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
        },
    },
}
</script>

<style>
.pay-modal .arco-modal-body{padding:0;}
</style>
