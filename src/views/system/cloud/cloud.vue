<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <!-- <div class="steps mt-60">
                <a-steps :current="step" label-placement="vertical">
                    <a-step>登录云端</a-step>
                    <a-step>云端注册</a-step>
                </a-steps>
            </div> -->
            <div v-if="step==0||step==1" class="df df-c ai-c" style="margin-top:100px;">
                <img v-if="userInfo.avatar" :src="userInfo.avatar" alt="" @error="userInfo.avatar='';" class="img" />
                <div v-else class="img imgempty df df-c ai-c jc-c c-ff" style="font-size:60px;">
                    <icon-user />
                </div>
                <div class="df df-c mt-40">
                    <a-button v-if="step==0" type="primary" @click="oauth()">登录云端</a-button>
                    <a-button v-else :disabled="true" type="primary">正在注册中</a-button>
                    <div class="mt-10 c-99">登录微擎云端账号并注册集群</div>
                </div>
            </div>
            <div v-if="step==2">
                <a-descriptions layout="horizontal" column="1" bordered class="cloud-description">
                    <descriptions-item label="系统版本">
                        <span>微擎面板</span>
                        <span class="ml-10 c-99">{{version}}</span>
                    </descriptions-item>
                    <descriptions-item label="系统类型">
                        <span>{{license_type_text}}</span>
                        <!-- <span v-if="userMode!=='cluster'" class="ml-20 c-blue cursor" @click="openInputLicense">导入授权码</span> -->
                        <span v-if="userMode!=='cluster'&&license_type=='free'" class="ml-20 c-blue cursor" @click="openBuyLicense">购买授权</span>
                    </descriptions-item>
                    <descriptions-item v-if="userMode!=='cluster'&&license_type!='free'" label="到期时间">
                        <span>{{license_end_time}}</span>
                        <span v-if="userMode!=='cluster'" class="ml-20 c-blue cursor" @click="openBuyLicense">续费</span>
                    </descriptions-item>
                    <descriptions-item label="绑定账号">
                        <div class="df">
                            <div class="df df-c ai-c changeuser cursor" @click="changeUser()">
                                <div class="imgbox">
                                    <img v-if="userInfo.avatar" :src="userInfo.avatar" alt="" />
                                    <div class="btn df df-c ai-c jc-c c-ff">
                                        <icon-sync class="fs-20" />
                                        <span class="mt-4 fs-12">切换账号</span>
                                    </div>
                                </div>
                                <div v-if="userInfo.nickname" class="mt-10 txt-c">
                                    <span>{{userInfo.nickname}}</span>
                                </div>
                            </div>
                        </div>
                    </descriptions-item>
                    <descriptions-item label="注册地址">{{offline_url}}</descriptions-item>
                    <descriptions-item v-if="userMode!=='cluster'" label="云端集群管理">
                        <a href="https://c.w7.com/api/deploy/thirdparty_cd/redirect" target="_blank" class="c-blue cursor">点击批量管理集群<icon-launch class="ml-4" /></a>
                    </descriptions-item>
                    <descriptions-item v-if="userMode!=='cluster'" label="云端应用商店">
                        <a href="javascript:;" class="c-blue cursor" @click="$router.push('/app/cloudstore')">进入云端应用商店<icon-launch class="ml-4" /></a>
                    </descriptions-item>
                </a-descriptions>
                
                <a-descriptions class="cloud-description mt-50" layout="horizontal" column="1" bordered>
                    <descriptions-item label="版权所有">Copyright © 2018-2025 宿州市微擎云计算有限公司 All Rights Reserved</descriptions-item>
                    <descriptions-item label="项目地址">
                        <a href="https://github.com/w7corp/w7panel" target="_blank" class="c-blue cursor">https://github.com/w7corp/w7panel<icon-launch class="ml-4" /></a>
                    </descriptions-item>
                    <descriptions-item label="交流反馈">
                        <img src="@/assets/images/qrcode.png" alt="" style="width:100px;height:100px;" />
                    </descriptions-item >
                </a-descriptions>
            </div>
        </div>
        <a-modal width="600px" :visible="inputLicense.show" @ok="submitInputLicense" @cancel="inputLicense.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>导入授权码</template>
            <a-textarea
                v-model="inputLicense.license"
                class="mt-10"
                style="height:160px;"
                :spellcheck="false"
                placeholder="请输入授权码"
                :rows="12"
                :input-style="{lineHeight:'24px'}"
            />
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
import axios from 'axios'
import { setPermission, getPermission,clearToken, getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            is_register: false,
            require_oauth: true,
            access_token: '',
            userInfo: {},
            offline_url: '',
            step: 0,
            version: '',
            descriptions: [{
                label: '系统版本',
                value: '',
            },{
                label: '系统类型',
                value: '免费版',
            },{
                label: '绑定账号',
                value: '',
            },],

            inputLicense: {
                show: false,
                license: '',
            },

            
            license_type: '',
            license_type_text: '',
            license_end_time: '',

            userMode: '',

            
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
            
            rules:{
                lt: [{required:true, trigger:'blur', message:"请选择授权类型"}],
                pid: [{required:true, trigger:'blur', message:"请选择授权时间"}],
                cluster: [{required:true, trigger:'blur', message:"请选择集群"}],
            },
        }
    },
    created(){
        this.userMode = getUserInfo()?.['w7.cc/user-mode'];
        this.getData();
        this.getToken();
        
        if(this.$route.query.code){
            let code = this.$route.query.code;
            this.$router.push({query:{}});
            panelApi.get('/console/bind?code='+code).then(res=>{
                this.getData();
            })
        }
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
    methods:{
        
        getToken(){
            return panelApi.get("/auth/console/info").then(res=>{
                let thirdparty_cd_token = res?.data?.thirdparty_cd_token;
                this.token = thirdparty_cd_token;
            });
        },
        openBuyLicense(){
            axios.get('https://console.w7.cc/api/thirdparty-cd/k8s-offline/license/config',{
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
                            license_text: {'team':"团队版",'company':"企业版",'free':"免费版"}[item.license_type] || item.license_type,
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
            this.getData();
        },



        openInputLicense(){
            this.inputLicense = {
                show: true,
                license: '',
            };
        },
        submitInputLicense(){
            let value = this.inputLicense.license;
            if(!value){
                this.$message.error("请输入授权码");
                return;
            }
            panelApi.post("/auth/console/import-cert",{
                cert: value,
            }).then(res=>{
                if(res?.data){
                    this.inputLicense.show = false;
                    this.$message.success("导入成功，3秒后退出重新登录");
                    setTimeout(()=>{
                        clearToken();
                        this.$router.push('/login');
                    },3000)

                }
            })
        },
        getData(){
            panelApi.get("/auth/console/info?code=test").then(res=>{
                let data = res.data;
                this.offline_url = data?.offline_url;
                this.is_register = data?.is_register;
                this.require_oauth = data?.require_oauth;

                this.license_type = data.license_type;
                this.license_end_time = data.license_end_time;
                this.license_type_text = {'team':"团队版",'company':"企业版",'free':"免费版"}[data?.license_type] || data?.license_type || '';
                
                this.userInfo = data?.userinfo || {};
                this.access_token = data?.access_token || '';
                if(this.is_register){
                    this.step = 2;
                    panelApi.get('/app-info').then(res=>{
                        this.version = res?.data?.helmVersion;
                    })
                    this.testPermission();
                }else if(this.require_oauth){
                    this.step = 0;
                }else{
                    this.register();
                    this.step = 1;
                }
            }).then(()=>{
                // if(this.$route.query.forcebind=='true'){
                //     this.oauth();
                // }
            })
        },
        async testPermission(){
            let permission = getPermission();
            // if(permission.includes('system-order-center')||permission.includes('system-cost-center')){return}
            
            let userInfo = getUserInfo();
            if(userInfo?.['w7.cc/user-mode']=='cluster'){
                let arr = JSON.parse(userInfo?.['w7.cc/menu'])
                arr = arr.filter(i=>i=='system-order-center'||i=='system-cost-center');
                if(arr.length){
                    setPermission([
                        ...permission,
                        ...arr
                    ]);
                }
            }else{
                setPermission([
                    ...permission,
                    'system-order-center',
                    'system-cost-center',
                ]);
            }
        },
        changeUser(){
            window.location.href = '/panel-api/v1/console/oauth?redirect_uri='+(window.location.origin + '/system/cloud-register');
        },
        oauth(){
            // || this.$route.query.forcebind=='true'
            if(this.require_oauth){
                window.location.href = '/panel-api/v1/console/oauth?redirect_uri='+(window.location.href.replace('forcebind=true','forcebind=false'));
                return;
            }
        },
        register(){
            panelApi.post('/console/register-to-console?offline_url='+window.location.origin).then(res=>{
                this.$message.success('注册集群成功');
                this.getData();
            })
        },
    },

}
</script>

<style scoped>
.img{width:100px; height:100px; border-radius:50%;}
.imgempty{background:var(--color-fill-4);}

.steps{width:400px; margin-left:auto; margin-right:auto;}

.changeuser .imgbox{position:relative; width:70px; height:70px; border-radius:50%; overflow:hidden;}
.changeuser .imgbox .btn{position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:none;}
.changeuser:hover .imgbox .btn{display:flex;}
.changeuser .imgbox img{display:block; width:100%; height:100%;}
</style>
<style>
.cloud-description .arco-descriptions-row td{padding:10px 20px!important; vertical-align:top;}
.cloud-description .arco-descriptions-item-label{text-align:right!important; min-width:160px;}
</style>