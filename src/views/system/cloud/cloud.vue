<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <div v-if="step==0" class="df df-c ai-c" style="margin-top:100px;">
                <img v-if="userInfo.avatar" :src="userInfo.avatar" alt="" @error="userInfo.avatar='';" class="img" />
                <div v-else class="img imgempty df df-c ai-c jc-c c-ff" style="font-size:60px;">
                    <icon-user />
                </div>
                <div class="df df-c mt-40">
                    <a-button type="primary" @click="oauth()">登录云端</a-button>
                    <div class="mt-10 c-99">绑定微擎云端账号</div>
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
                    </descriptions-item>
                    <descriptions-item v-if="userMode!=='cluster'&&license_type!='free'" label="到期时间">
                        <span>{{license_end_time}}</span>
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
        <a-modal width="600px" :visible="inputLicense.show" @ok="submitInputLicense" @cancel="inputLicense.show=false;" :popup-container="$popupContainer">
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

        
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { clearToken, getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            require_oauth: true,
            userInfo: {},
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

            
        }
    },
    created(){
        this.userMode = getUserInfo()?.['w7.cc/user-mode'];
        this.getData();
        this.getToken();
        
        if(this.$route.query.code){
            let code = this.$route.query.code;
            this.$router.push({query:{}});
            panelApi.get('/auth/console/bind?code='+code).then(res=>{
                this.getData();
            })
        }
    },
    methods:{
        
        getToken(){
            return panelApi.get("/auth/console/info").then(res=>{
                let thirdparty_cd_token = res?.data?.thirdparty_cd_token;
                this.token = thirdparty_cd_token;
            });
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
                this.require_oauth = data?.require_oauth;

                this.license_type = data.license_type;
                this.license_end_time = data.license_end_time;
                this.license_type_text = {'team':"团队版",'company':"企业版",'free':"免费版"}[data?.license_type] || data?.license_type || '';
                
                this.userInfo = data?.userinfo || {};
                if(data?.require_oauth === false && data?.userinfo){
                    this.step = 2;
                    panelApi.get('/app-info').then(res=>{
                        this.version = res?.data?.helmVersion;
                    })
                }else{
                    this.step = 0;
                }
            }).then(()=>{
                // if(this.$route.query.forcebind=='true'){
                //     this.oauth();
                // }
            })
        },
        changeUser(){
            window.location.href = '/panel-api/v1/auth/console/oauth?redirect_uri='+(window.location.origin + '/system/cloud-register');
        },
        oauth(){
            // || this.$route.query.forcebind=='true'
            if(this.require_oauth){
                window.location.href = '/panel-api/v1/auth/console/oauth?redirect_uri='+(window.location.href.replace('forcebind=true','forcebind=false'));
                return;
            }
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
