<template>
    <a-layout v-if="micro.show" class="layout">
        <a-layout-header>
            <NavBar />
        </a-layout-header>
        <a-layout-content class="layout-content " >
            <micro-app
                :group="micro.group"
                :show-menu="micro.showMenu"
                :do="micro.do"
            ></micro-app>
        </a-layout-content>
    </a-layout>
    <a-layout v-else style="height:100vh;">
        <a-layout-header>
            <div class="df ai-c jc-b navbar">
                <div>
                    <img alt="logo" :src="logoimg" style="height:30px;" class="nav-logo" />
                </div>
                <div class="df ai-c">
                    <a-button v-if="isLogin" type="outline" style="margin-right:20px;" size="small" @click="$router.push('/cluster')">控制台</a-button>
                    <div class="df ai-c" @click="toLogin">
                        <a-dropdown trigger="click" position="br">
                            <a-avatar :size="32" :style="{ marginRight: '8px', cursor: 'pointer' }">
                                <icon-user style="font-size:24; stroke-width: 5;" class="df ai-c jc-c"/>
                            </a-avatar>
                            
                            <template v-if="isLogin" #content>
                                <a-doption>
                                    <a-space @click="handleLogout">
                                        <icon-export />
                                        <span>退出登录</span>
                                    </a-space>
                                </a-doption>
                            </template>
                        </a-dropdown>
                        <span v-if="!isLogin" class="cursor">登录</span>
                        <span v-else>{{userInfo&&userInfo['w7.cc/username']}}</span>
                    </div>
                </div>
            </div>
        </a-layout-header>
        <a-layout-content style="overflow: auto;">
            <div class="df df-c" style="min-height:calc(100vh - 210px);">
                <div class="fs-28 txt-c mt-20" style="font-weight:500;">云主机</div>
                <div class="box df df-c ai-c padding-20">
                    <template v-for="(item,index) in list" :key="index">
                        <div class="item df">
                            <div class="item-left df df-c jc-c padding-20">
                                <div class="fs-20">{{ `${item.title} ${item.cpu}核` }}</div>
                                <div class="mt-10 fs-14" style="color:var(--color-neutral-8)">{{ item.city }}</div>
                            </div>
                            <div class="item-center fc padding-20">
                                <div class="df" style="gap:20px;">
                                    <div class="fc df df-c">
                                        <div class="tt">CPU&内存</div>
                                        <div class="rect">{{item.cpu}}核 {{ item.memory }}G</div>
                                    </div>
                                    <div class="fc df df-c">
                                        <div class="tt">系统盘</div>
                                        <div class="rect">{{ item.storage }}G</div>
                                    </div>
                                    <div class="fc df df-c">
                                        <div class="tt">带宽</div>
                                        <div class="rect">{{ item.bandwidth }}Mbps</div>
                                    </div>
                                </div>
                                <div class="mt-10 df df-ww">
                                    <div v-for="(d,did) in item.description" :key="did" class="mt-10 mr-20 df ai-c">
                                        <icon-check class="fs-16 c-blue" />
                                        <span class="fs-14 ml-8" style="color:var(--color-neutral-8)">{{ d }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="item-right padding-20">
                                <div class="df ai-c jc-b" style="height:100%;">
                                    <div class="df df-c ai-e fc">
                                        <span v-if="item.buymode=='give'" style="color:rgb(var(--red-6));">
                                            <span style="font-size:22px;">免费</span>
                                            <span>/{{ item.quantity }}{{timeUnits[item.unit] }}</span>
                                        </span>
                                        <span v-else style="color:rgb(var(--red-6));">
                                            <span style="font-size:22px;">{{ item.discountprice }}</span>
                                            <span>元/{{ item.quantity }}{{timeUnits[item.unit] }}</span>
                                        </span>
                                        <span v-if="item.discount<100 || item.buymode=='give'" class="fs-12 c-99 mt-10 txt-line-t">
                                            <span>{{ item.price }}</span>
                                            <span>元/{{ item.quantity }}{{timeUnits[item.unit] }}</span>
                                        </span>
                                    </div>
    
                                    <a-button @click="toIndex({policyName:item?.groupname||''})" type="primary" style="margin-left:60px;">
                                        <span>立即购买</span>
                                        <span v-if="item.buymode=='give'" class="badge">赠送</span>
                                        <span v-else-if="item.discountTxt" class="badge">{{ item.discountTxt }}</span>
                                    </a-button>
                                </div>
                                <div v-if="item.label" class="tag-box">
                                    <div class="tag">{{ item.label }}</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
            <div style="margin-top:10px; padding:50px 0; color:#495770; background:#f5f7fa;">
                <div class="txt-c">© 微擎面板 提供技术支持</div>
                <div class="df jc-c df-ww fs-12 mt-10" style="gap:15px;">
                    <a v-if="site.icpnumber" href="https://beian.miit.gov.cn/" style="color:#495770;" target="_blank">ICP备案：{{ site.icpnumber }}</a>
                    <a v-if="site.number" :href="'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode='+site.number" style="color:#495770;" target="_blank">{{site.location}}</a>
                    <a v-if="site.license" :href="site.license" style="color:#495770;" target="_blank">电子执照</a>
                    <span v-if="site.tbol" style="color:#495770;">增值电信业务经营许可证：{{ site.tbol }}</span>
                </div>
            </div>
        </a-layout-content>
        <contact-us></contact-us>
    </a-layout>
</template>
<script>
import { panelApi } from '@/utils/api';
import axios from 'axios';
import { isLogin } from '@/utils/auth';
import { getUserInfo,getK8sinfo } from '@/utils/auth';
import { clearToken } from '@/utils/auth';
import contactUs from '@/components/contact-us.vue';
import microApp from '@/views/topapp/micro.vue';
import NavBar from '@/components/navbar/index.vue';

export default{
    data(){
        return {
            timeUnits: {
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            
            list: [],
            site: {},
            userInfo: {},
            logoimg: window.origin + '/assets/logo.png',

            micro: {},
        }
    },
    components: {
        contactUs,
        microApp,
        NavBar,
    },
    created(){
        this.isLogin = isLogin();
        this.userInfo = getUserInfo();
        sessionStorage.setItem('passResourcePage','true')
        this.getData();
    },
    methods: {
        handleLogout(){
            clearToken();
            this.$message.success('登出成功');
            this.$router.push('/login');
        },
        intoMicro(){
            if(!this.isLogin || !window?.w7_microapp?.name){return}
            this.micro = {
                show: true,
                group: window.w7_microapp.name,
                showMenu: window.w7_microapp.leftmenu !== false,
                do: window.w7_microapp.do,
            }
        },
        getData(){
            // 测试
            // window.w7_microapp = {
            //     name: 'w7-zpkv2',
            //     leftmenu: false,
            //     do: '#/zpk-store-list',
            //     breadcrumb: false,
            //     needlogin: false,
            // };
            if(this.isLogin && window?.w7_microapp?.name){
                this.intoMicro();
                return;
            }
            panelApi.get('/idc-list',{
                loading: true,
                noTokenRequired: true,
            }).then(res=>{
                let list = res?.data || [];
                list = list.map(i=>{
                    i.discountprice = Number(i.discountprice).toFixed(2);
                    i.price = Number(i.price).toFixed(2);
                    i.description = i.description? i.description.split('|') : [];
                    i.discount = Number(i.discountnew);
                    i.discountTxt = this.discountTxt(i.discount);
                    return i;
                })
                this.list = list;
                if(!list.length){
                    this.toIndex(this.$route.query);
                }
            }).catch(()=>{
                    this.toIndex(this.$route.query);
            })
            panelApi.get('/noauth/site/beian',{noAlert:true}).then(res=>{
                let site = res.data || {};
                this.site = site;
            })
        },
        toLogin(){
            if(!isLogin()){
                this.$router.push('/login')
            }
        },
        toIndex(o){
            if(!isLogin()){
                this.$router.push('/login?policyName='+(o?.policyName||'')+'&couponCode='+(o?.couponCode || ''))
            }else{
                let role = getK8sinfo()['w7.cc/role'];
                if(role=='normal'||role=='tech'){
                    this.$router.push('/appgroup/w7panel-ckm-root/micro')
                }else{
                    this.$router.push('/cluster/panel');
                }
            }
        },
        discountTxt(discount){
            discount = Number(discount);
            if(discount>=100){return ''}
            return Number((discount/10).toFixed(2)) + '折';
        },
    }
}
</script>
<style scoped>

.layout {
    width: 100%;
    height: 100vh;
}
.layout-content {
    height: 100%;
    overflow-y: hidden;
    background-color: var(--color-fill-2);
    transition: padding 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);
}

.navbar{
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border);
    height:60px;
    padding:0 20px;
}
.badge{
    display: inline-block;
    padding: 0 6px;
    position: absolute;
    top: -12px;
    right: -10px;
    height: 20px;
    line-height:20px;
    font-size:12px;
    border-radius:10px;
    background: rgb(var(--danger-6));
    color: var(--color-white);
    z-index:9;
}
.box .item{
    width: 1200px;
    min-height: 172px;
    background-image: linear-gradient(0deg, var(--color-bg-1), var(--color-neutral-2));
    border: 2px solid var(--color-bg-1);
    box-shadow: 8px 8px 20px 0 rgba(55, 99, 170, .1), -8px -8px 20px 0 var(--color-bg-1);
}
.item-left{ width: 240px; background-image: linear-gradient(0deg, var(--color-neutral-2), var(--color-neutral-3)); }
.item-center .tt{height:36px; line-height:36px;}
.item-center .rect{
    height:36px;
    min-width:120px;
    padding:10px;
    margin-top:10px;
    background:var(--color-bg-1);
    box-shadow: 8px 8px 20px 0 rgba(55, 99, 170, .1), -8px -8px 20px 0 var(--color-bg-1), inset 0 4px 20px 0 hsla(0, 0%, 100%, .5);
}
.item-right::before{content:" "; width:1px; position:absolute; left:0; top:20px; bottom:20px; background:var(--color-neutral-4);}
.item-right{ position:relative; width: 360px;}
.tag-box{
    width: 74px;
    height: 74px;
    position: absolute;
    right: -5px;
    top: -5px;
    overflow: hidden;
    -webkit-font-smoothing: auto;
}
.tag-box .tag{
    width: 104px;
    height: 20px;
    color: var(--color-bg-1);
    right: -22px;
    top: 20px;
    font-size: 12px;
    line-height: 20px;
    text-align: center;
    background-color: rgb(var(--warning-6));
    position: absolute;
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
}
.tag-box .tag:before {
    content: " ";
    position: absolute;
    left: 0;
    top: 17px;
    width: 5px;
    height: 6px;
    background-color: rgb(var(--warning-6));
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
}
.tag-box .tag::after {
    content: " ";
    position: absolute;
    background-color: rgb(var(--warning-6));
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
    width: 6px;
    height: 5px;
    bottom: -2px;
    right: 0;
}
</style>
