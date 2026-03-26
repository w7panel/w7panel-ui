<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <a-tabs v-model:active-key="tabAct">
                <a-tab-pane key="1" title="已购买云端应用">
                    <div>
                        <a-input-search v-model="searchTitle" placeholder="请输入应用名称" class="mb-10" style="width:300px" @search="getAppList" @press-enter="e=>{getAppList();e.stopPropagation()}" search-button />
                        <span class="ml-20 c-blue cursor" @click="findSite">站点找回</span>
                    </div>
                    <div class="df df-ww mt-20 list">
                        <store-item
                            v-for="item in list"
                            :key="item"
                            @showDeployItems="showDeployItems"
                            @install="testItem"
                            :data="item"
                            class="item"
                        />
                        <a-empty v-if="!list || !list.length" class="mt-40" />
                    </div>
                </a-tab-pane>
                <a-tab-pane key="2" title="云端免费应用">
                    <div>
                        <a-input-search v-model="searchTitle" placeholder="请输入应用名称" class="mb-10" style="width:300px" @search="getAppList" @press-enter="e=>{getAppList();e.stopPropagation()}" search-button />
                    </div>
                    <div class="df df-ww mt-20 list">
                        <store-item
                            v-for="item in freeList"
                            :key="item"
                            @showDeployItems="showDeployItems"
                            @install="testItem"
                            :data="item"
                            class="item"
                        />
                        <a-empty v-if="!freeList || !freeList.length" class="mt-40" />
                    </div>
                </a-tab-pane>
                <!-- <a-tab-pane key="3" title="云端测试应用">
                    <div class="df df-ww mt-0">
                        <store-item v-for="item in testList" :key="item" @install="testItem" :data="item" class="item" />
                        <a-empty v-if="!testList || !testList.length" class="mt-40" />
                    </div>
                </a-tab-pane> -->
            </a-tabs>
        </div>
        
        <a-modal :visible="adminItem.dialog" width="640px">
            <template #title>选择版本</template>
            <a-form ref="selectverson" :model="adminData" auto-label-width>
                <a-form-item label="item" field="item_id" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-select v-model="adminData.item_id" placeholder="请选择" style="width:500px;">
                        <el-option v-for="item in adminItem.list" :key="item.id" :label="item.outer_order_id" :value="item.id"></el-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="版本号" field="version" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-input v-model="adminData.version" placeholder="请输入版本号" style="width:500px;"></a-input>
                </a-form-item>
                <a-form-item label="版本类型" field="is_test" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-select v-model="adminData.is_test" placeholder="请选择" style="width:500px;">
                        <a-option label="在线版本" :value="1"></a-option>
                        <a-option label="测试版本" :value="2"></a-option>
                        <a-option label="未审核版本" :value="3"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
            <template #footer>
                <a-button @click="adminItem.dialog=false;nextStep(adminItem);">跳过</a-button>
                <a-button type="primary" @click="selectVerson">确定</a-button>
            </template>
        </a-modal>

        <a-modal v-model:visible="w7site.show" title="站点找回" width="960px" :footer="false">
            <div style="max-height: 450px; overflow-y: auto;">
                
            </div>
            <template #footer>
                <a-button @click="adminItem.dialog=false;nextStep(adminItem);">跳过</a-button>
                <a-button type="primary" @click="selectVerson">确定</a-button>
            </template>
        </a-modal>

        
        <a-modal :visible="deployItems.show" title="订单信息" width="960px" :footer="false" @cancel="deployItems.show = false">
            <table class="com-table"><tbody>
                <tr>
                    <td>订单号</td>
                    <td>服务费到期时间</td>
                    <td>操作</td>
                </tr>
                <tr v-for="(item,index) in deployItems.list" :key="index">
                    <td>{{ item.order_sn }}</td>
                    <td>{{ item.expire_time_format }}</td>
                    <td>
                        <span v-if="item.need_buy_service" class="c-blue cursor" @click="toRenew(item)">续费</span>
                    </td>
                </tr>
            </tbody></table>
        </a-modal>

        <a-modal :visible="renew.show" title="续费" width="960px" @ok="renewSubmit" @cancel="renew.show = false">
            <div class="df df-ww service">
                <div>
                    <a-radio-group v-model="renew.activeIndex">
                        <a-radio :value="index" v-for="(item,index) in renew.list" :key="index">
                            <template #radio="{ checked }">
                                <div class="item" :class="{active:index==renew.activeIndex}">
                                    <span class="fs-16 b">{{item.month%12==0?item.month/12+'年':item.month+'月'}} / </span>
                                    <span class="" style="color:var(--color-text-2);">{{'￥'+item.price}}</span>
                                </div>
                            </template>
                        </a-radio>
                    </a-radio-group>
                </div>
            </div>
        </a-modal>
        
        <a-modal :width="1000" title="支付" @cancel="payDrawer.show=false;" @close="getAppList" :visible="payDrawer.show" :footer="false" :mask-closable="false" class="pay-modal">
            <iframe :src="payDrawer.url" frameborder="0" style="width:100%;height:660px;"></iframe>
        </a-modal>

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import storeItem from './store-item.vue'
import { getUserInfo } from '@/utils/auth';
import dayjs from 'dayjs';

export default {
    data() {
        return {
            searchTitle: '',
            tabAct: '1',
            list: [],
            freeList: [],
            testList: [],

            adminItem: {
                dialog: false,
                list: [],
                item: null,
                ok: false,
            },
            adminData: {
                ok: false,
                item_id: '',
                version: '',
                is_test: '',
            },
            activeApp: {},
            clusterId: '',
            tpcdtoken: '',

            w7site: {},
            deployItems: {
                show: false,
                item: null,
                list: [],
            },
            renew: {
                show: false,
                list: [],
                item: null,
                activeIndex: 0,
            },
            payDrawer: {
                show: false,
                url: '',
            },
        }
    },
    components: { storeItem },
    async created() {
        await panelApi.get("/auth/console/info").then(res=>{
            this.clusterId = res?.data?.cluster_id;
            this.tpcdtoken = res?.data?.thirdparty_cd_token;
        });
        if(!this.tpcdtoken){return;}
        this.getAppList()
    },
    watch: {
        tabAct(v){
            this.getAppList()
        }
    },
    methods: {
        // 续费
        toRenew(row){
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/module-service-fee/info',{
                customToken: this.tpcdtoken,
                loading: true,
                params: {
                    module_name: this.deployItems.item.module_name,
                }
            }).then(res=>{
                let list = res.data?.data || [];
                list = list.filter(i=>i.enabled==2);
                this.renew.list = list;
                this.renew.show = true;
                this.renew.item = row;
                this.renew.activeIndex = 0;
            })
        },
        // 续费提交
        renewSubmit(){
            axios.post('https://console.w7.cc/api/deploy/thirdparty-cd/module-service-fee-order/create',{
                module_name: this.deployItems.item.module_name,
                from_order_id: this.renew.item.order_sn,
                service_fee_id: this.renew.list[this.renew.activeIndex].id,
            },{
                customToken: this.tpcdtoken,
                loading: true,
            }).then(res=>{
                this.renew.show = false;
                this.deployItems.show = false;
                let ticket = res.data?.payinfo?.ticket;
                this.toPay(ticket)
            })
        },
        toPay(ticket){
            let url = `https://ip.w7.cc/pay/${ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`;
            this.payDrawer = {
                show: true,
                url: url,
            }
        },
        // 订单信息
        showDeployItems(row){
            axios.get(`https://console.w7.cc/api/deploy/thirdparty-cd/${row.id}/items`,{
                customToken: this.tpcdtoken,
                loading: true
            }).then(res=>{
                this.deployItems.show = true;
                this.deployItems.list = res.data?.items || [];
                this.deployItems.list.forEach(item=>{
                    item.expire_time_format = dayjs(item.expire_time*1000).format('YYYY-MM-DD HH:mm:ss');
                })
                this.deployItems.item = row;
            })
        },
        findSite(){
            axios.get("https://console.w7.cc/api/thirdparty-cd/k8s-offline/w7sites/list",{
                customToken: this.tpcdtoken,
                loading: true,
            }).then(res=>{
                this.w7site = {
                    show: true,
                    list: res?.data || []
                }
            })
        },
        rebuildSite(row){
            console.log(row);
            axios.post(`https://console.w7.cc/api/thirdparty-cd/k8s-offline/w7sites/${row.key}/re-install`,{},{
                customToken: this.tpcdtoken,
            }).then(res=>{
                this.$router.push(`/app/store-install?path=${encodeURIComponent(res.data.deployUrl)}&insClusterId=${row.key}&thirdpartyCDToken=${this.tpcdtoken}`)
                
            })
        },
        testItem(item){
            // console.log(item);return;
            this.adminData.ok = false;
            this.adminItem.item = item;
            if(!item.admin_item_list?.length){
                this.nextStep(item);
                return;
            }
            this.adminItem.list = item.admin_item_list;
            this.adminItem.dialog = true;
        },
        // 选择版本
        selectVerson(){
            this.$refs.selectverson.validate((err) => {
                if(err) {return}
                axios.post("https://console.w7.cc/api/deploy/thirdparty-cd/choose-version",{...this.adminData},{customToken: this.tpcdtoken}).then(res=>{
                    if(!res?.data){return}
                    this.adminData.ok = true;
                    this.adminItem.ialog = false;
                    this.nextStep(this.adminItem);
                })
            });
        },
        async nextStep(item) {
            if(item.is_need_create_deploy) {
                if(this.tabAct == '2') {
                    await axios.post('https://console.w7.cc/api/deploy/thirdparty-cd/create-free', {
                        module_name: item.module_name
                    },{
                        customToken: this.tpcdtoken,
                        loading: true,
                    }).then(res => {
                        item.id = res.data.deploy_id;
                        item.item_id = res.data.item_id;
                    })
                } else if (this.tabAct == '3') {
                    // this.is_test_default = 2;
                    // await this.createdTest(item)
                    
                    await axios.post('https://console.w7.cc/api/deploy/thirdparty-cd/create-test', {
                        module_name: item.module_name,
                        module_version: item.version
                    }, {
                        customToken: this.tpcdtoken,
                        loading: true,
                    }).then(res => {
                        item.id = res.data.deploy_id
                        item.item_id = res.data.item_id;
                        return item
                    })
                }
            }

            axios.get(`https://console.w7.cc/api/deploy/thirdparty-cd/${item.id}/config`, {
                params: {
                    item_id: item.item_id || (this.adminData.ok? this.adminData.item_id : '')
                },
                customToken: this.tpcdtoken,
                loading: true,
            }).then(res => {
                this.activeApp = Object.assign({}, item, res.data)

                if(this.activeApp.has_backend){
                    let deployid = this.activeApp.id;
                    // let item_id = item.item_id || (this.adminData.ok? this.adminData.item_id : (this.$route.query.item_id? this.$route.query.item_id : ''));
                    let path = 'deploy://console/'+deployid //+'/'+item_id;
                    this.$router.push('/app/store-install?path=' + encodeURIComponent(path) +'&insClusterId='+ this.clusterId + '&thirdpartyCDToken=' + this.tpcdtoken);
                    return;
                }else{
                    this.$message.warning('暂不支持轻应用安装');
                }
            })
        },
        
        getAppList(){
            if(!this.tpcdtoken){return;}
            if(this.tabAct=='1'){
                this.getList();
            }else if(this.tabAct=='2'){
                this.getFreeList();
            }else if(this.tabAct=='3'){
                this.getTestList();
            }
        },
        getTestList(){
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/test-list',{customToken: this.tpcdtoken}).then(res=>{
                this.testList = res.data;
            })
        },
        getFreeList(){
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/free-list?has_backend=2&key_words='+this.searchTitle,{customToken: this.tpcdtoken}).then(res=>{
                this.freeList = res.data;
            })
        },
        getList(){
            let userInfo = getUserInfo();
            let is_demo = userInfo?.['w7.cc/demo-user'] === 'true';
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/list?not_app=1&page=1&per_page=999&is_demo='+is_demo+'&title='+this.searchTitle,{loading:true,customToken: this.tpcdtoken}).then(res=>{
                this.list = res.data.data; //.filter(i=>i.can_install)
            })
        }
    },
}
</script>

<style scoped>
.list .item{margin-right:20px; margin-bottom:20px;}
.service .item{
    padding: 10px 16px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    width: 150px;
    box-sizing: border-box;
    color: var(--color-text-1);
}

.service .item.active{
    background-color: var(--color-primary-light-1);
    border-color: rgb(var(--primary-6));
    color: rgb(var(--primary-6));
}
</style>
<style>
.pay-modal .arco-modal-body{padding:0;}
</style>