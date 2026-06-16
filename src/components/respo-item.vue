<template>
    <div class="list-item df">
        <div class="left">
            <div class="app-icon">
                <img v-if="logoimg" :src="(fullWebUrl||'http://zpk.w7.cc')+logoimg" class="img df-s0" alt="" />
            </div>
        </div>
        <div class="fc">
            <div class="df" style="height:64px;">
                <div class="fc lh-15">
                    <div class="df jc-b">
                        <div class="df fs-16 b c-00-9 mt-4">
                            <span class="one-hide" style="vertical-align:middle;">{{ data.name }}</span>
                            <a-tooltip effect="dark" content="复制信息" placement="bottom">
                                <a-icon @click="copyInfo" :size="20" class="ml-20 c-99 cursor" style="vertical-align:middle;"><icon-share-alt /></a-icon>
                            </a-tooltip>
                        </div>
                        <div class="ml-20 df-s0">
                            <a-button v-if="data.need_base_fee" @click="toBuy()" >购买</a-button>
                            
                            <a-dropdown v-else-if="data.need_service_fee" @select="v=>toBuy('service_package_id',v)">
                                <a-button>购买周期</a-button>
                                <template #content>
                                    <a-doption v-for="(item,index) in service_packages" :value="item.id" :key="index">{{item.month}}月</a-doption>
                                </template>
                            </a-dropdown>

                            <a-dropdown v-else-if="data.need_upgrade_fee" @select="v=>toBuy('version_upgrade_id',v)">
                                <a-button>升级</a-button>
                                <template #content>
                                    <a-doption v-for="(item,index) in version_prices" :value="item.version" :key="index">{{item.version}}</a-doption>
                                </template>
                            </a-dropdown>
                            
                            <a-button v-else-if="data.product_type==2" @click="handleInstall()" >安装</a-button>
                            <!-- <a-dropdown v-else-if="data.product_type==2" @select="v=>v==1?handleInstall():toBuy()">
                                <a-button>安装</a-button>
                                <template #content>
                                    <a-doption :value="1">安装</a-doption>
                                    <a-doption :value="2">购买</a-doption>
                                </template>
                            </a-dropdown> -->

                            <a-button v-else @click="handleInstall">安装</a-button>
                        </div>
                    </div>
                    <div class="one-hide c-00-6 fs-14 mt-8">
                        <span v-if="data.version && data.version.name" >最新版本：{{ data.version.name }}</span>
                        <span class="ml-20">标识：{{ data.identifie }}</span>
                    </div>
                </div>
            </div>
            <div class="tags one-hide">
                <span v-for="tag in data.tag" :key="tag.id" class="tag fs-12 cursor" @click="tagClick(tag)">{{ tag.name }}</span>
            </div>
            <div class="c-00-6 two-hide fs-14" style="line-height:20px;">{{ data.description }}</div>
            
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import dfimg from '@/assets/zpk/dfimg.png';
import axios from 'axios';
import { useNamespaceStore } from '@/store';

export default {
    props: ['data','webUrl','thirdparty_cd_token'],
    data(){
        return {
            namespaceActive: '',
            logofile: null,
            logoimg: '',
            service_packages: [],
            version_prices: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        // this.logoimg = '/zip/icon/' + this.data.identifie;
        let base = window.microApp?.getData()?.baseURL || '';
        let icon = /^(https?:)?\/\//.test(this.data.icon)? this.data.icon : (this.data.icon?base+this.data.icon:dfimg);
        this.logoimg = icon;
        
        if(this.data.need_service_fee || this.data.need_upgrade_fee){
            this.getPackages();
        }
    },
    watch: {
        'data.need_service_fee': 'getPackages',
        'data.need_upgrade_fee': 'getPackages',
    },
    computed: {
        fullWebUrl(){
            return this.webUrl; //? (window.location.protocol + '//' + this.webUrl) : '';
        },
    },
    methods: {
        getPackages(){
            axios.get(this.fullWebUrl + '/respo/v2/info/'+this.data.identifie + '/1.0.0').then(res=>{
// axios.get('http://172.16.1.161:8000/zpk/respo/v2/info/'+this.data.identifie + '/1.0.0').then(res=>{
                this.service_packages = res?.data?.data?.service_packages || [];
                this.version_prices = res?.data?.data?.version_prices || [];
            })
        },
        handleInstall(){
            let path = (this.fullWebUrl||'https://zpk.w7.cc/zpk') + '/respo/info/' + this.data.identifie;
            let cdtoken = this.thirdparty_cd_token?'&thirdpartyCDToken='+ this.thirdparty_cd_token : '';
            this.$router.push('/app/store-install?path='+ path + cdtoken);
        },
        async toBuy(type,value){
            let o = {
                identifie: this.data.identifie,
            }
            if(type=='service_package_id'){o.service_package_id = value}
            if(type=='version_upgrade_id'){o.version_upgrade_id = value}
            
            let token = '';
            
            // await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/microapps/'+this.$route.params.name,{noAlert:true,loading:true}).then(res=>{
            //     token = res.data?.spec?.config?.props?.OAUTH_TOKEN;
            // })
            
            await panelApi.get('/zpk/local-url',{noAlert:true,loading:true}).then(res=>{
                token = res.data?.oauthToken;
            })
            
            axios.post(this.fullWebUrl + '/respo/order/pay',o,{
                customToken: token,
                loading: true,
                headers:{
                    'X-W7Panel-Token': this.thirdparty_cd_token,
                },
            }).then(res=>{
                let ticket = res?.data?.data?.ticket;
                this.$emit('toPay',ticket);
            })
        },
        copyInfo(){
            
            let host = window?.microApp?.getData()?.baseURL || window.location.origin;
            let url = host + '/respo/info/' + this.data.identifie;
            url = 'https://console.w7.cc/api/deploy/thirdparty_cd/redirect?route=/zpk-install?path=' + encodeURIComponent(url);

            this.onekeyCopy(`【${this.data.name}】${this.data.description}    \r\n安装地址：${url}   \r\n说明：安装地址为一键部署方案，服务器环境基于k3s，微擎交付系统是管理k3s的控制面板，可视化一键管理基于k3s部署的应用`,()=>{
                this.$message.success('复制成功');
            })
        },
        tagClick(item){
            this.$emit('tagClick',item);
        },
        toinstall(){
            let host = window?.microApp?.getData()?.baseURL || window.location.origin;
            let url = host + '/respo/info/' + this.data.identifie;
            this.onekeyCopy(url,()=>{
                this.$message.success({message:'复制成功，访问此链接或是转发他人完成安装操作。',duration:3000});
            });
        },
        onekeyCopy(text,callback){
            if (0 && navigator.clipboard) {
                navigator.clipboard.writeText(text);
            } else {
                var createInput = document.createElement('textarea');
                createInput.value = text;
                document.body.appendChild(createInput);
                createInput.select(); // 选择对象
                document.execCommand("Copy"); // 执行浏览器复制命令
                createInput.className = 'createInput';
                createInput.style.display='none';
            }
            callback && callback();
        },
    },
}
</script>

<style scoped>
.list-item{width:100%; height:188px; box-sizing:border-box; border:1px solid #e7e7e7; border-radius:8px; padding:20px; }
.list-item:hover{box-shadow: 0px 3px 14px 2px rgba(0, 0, 0, 0.05),0px 8px 10px 1px rgba(0, 0, 0, 0.06),0px 5px 5px -3px rgba(0, 0, 0, 0.1);}
/* .list-item .left{padding:10px;} */
.list-item .left .app-icon{width:64px; height:64px; margin-right:23px; box-sizing:border-box; border-radius:8px; position:relative; overflow:hidden;}
.list-item .left .app-icon .img{width:100%; height:100%; display:block; border-radius:8px;}
.list-item .left .app-icon input[type='file']{position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; min-width:0; opacity:0; cursor:pointer;}
.list-item .left .app-icon input[type='file']::-webkit-file-upload-button{display:none;}

.tags{padding:7px 0 12px;}
.tags .tag{display:inline-block; white-space:nowrap; height:20px; line-height:20px; background:#E8F1FF; color:#0256FF; margin-right:10px; padding:0 8px; border-radius:3px;}

.iconbox{width:52px; height:52px; margin-right:10px; border-radius:4px; overflow:hidden; box-sizing:border-box; position:relative; border:1px solid #f1f1f1;}
.iconbox .icon{width:100%; height:100%; position:absolute; top:0; left:0; z-index:1;}
.iconbox input[type='file']{position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; min-width:0; opacity:0; cursor:pointer;}

.menus{padding:10px 0;}
.menus .item{height:36px; line-height:36px; text-align:center; cursor:pointer;}
.menus .item:hover{background:rgba(240, 243, 250, 1);}
.list .li{margin-bottom:6px; height:30px; padding:0 10px; background:rgba(240, 243, 250, 1)}
.list .li .status{margin-right:6px; }
</style>
