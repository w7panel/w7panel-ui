<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="padding-20 bg-white">
            <div>
                <a-input-search v-model="search.keyword" :style="{width:'256px'}" placeholder="输入应用名称搜索" @search="toSearch" @press-enter="toSearch" />
                <div v-if="!hidetags" class="mt-20 labelbox df">
                    <div :class="allTag?'w-100 df df-ww':'one-hide f1'">
                        <span class="label" :class="{active:search.tag==''}" @click="search.tag='';toSearch();">全部</span>
                        <span v-for="(item,index) in tags" :key="index" class="label" :class="{active:search.tag==item.name}" @click="search.tag=item.name;toSearch()">{{item.name}}</span>
                        <div class="shouqi">
                            <span v-if="allTag" class="cursor alltag c-99 df ai-c ml-10" @click="allTag=!allTag">
                                <span class="va-middle">收起</span>
                                <icon-up class="ml-4 va-middle" />
                            </span>
                        </div>
                    </div>
                    <span v-if="!allTag" class="cursor fa-14 alltag c-99 df ai-c ml-10" @click="allTag=!allTag">
                        <span class="va-middle">查看全部</span>
                        <icon-down class="ml-4 va-middle" />
                    </span>
                </div>
            </div>
            <a-row class="mt-24" :gutter="24">
                <a-col :span="8" v-for="(item,index) in list" :key="item.identifie" style="margin-bottom:24px;">
                    <respo-item :data="item" @delete="list.splice(index,1)" :thirdparty_cd_token="thirdparty_cd_token" :webUrl="webUrl" @refresh="getData" @tagClick="tagClick" @toPay="toPay"></respo-item>
                </a-col>
            </a-row>
            <div v-if="list && list.length" class="df jc-c" style="padding-bottom:20px;">
                <a-pagination
                    v-model:current="page"
                    @change="getData"
                    default-page-size="10"
                    :page-size="limit"
                    :total="total"
                />
            </div>
        </div>
        
        <a-modal :width="1000" title="支付" @cancel="payDrawer.show=false;" @close="getZpk" :visible="payDrawer.show" :footer="false" :mask-closable="false" class="pay-modal">
            <iframe :src="payDrawer.url" frameborder="0" style="width:100%;height:660px;"></iframe>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
// import axios from './_respoaxios'
import axios from 'axios'
import respoItem from '@/components/respo-item.vue'
import { useNamespaceStore } from '@/store';

export default {
    name: "store",
    data() {
        return {
            namespaceActive: '',
            search: {
                keyword: "",
                tag: "",
            },
            list: [],
            total: 1,
            page: 1,
            limit: 9,
            tags: [],
            allTag: true,
            hidetags: false,
            webUrl: '',

            payDrawer: {
                show: false,
                url: '',
            },

            thirdparty_cd_token: '',
        }
    },
    components: {
        respoItem,
    },
    async created() {
        this.namespaceActive = useNamespaceStore().namespace;
        if(this.$route.query.tag){ this.search.tag = this.$route.query.tag; }
        if(this.$route.query.keyword){ this.search.keyword = this.$route.query.keyword; }
        if(this.$route.query.hidetags){ this.hidetags = true; }
        
        await panelApi.get("/auth/console/info").then(res=>{
            this.thirdparty_cd_token = res.data?.thirdparty_cd_token;
        });
        this.getZpk();
    },
    beforeUnmount(){
        window.removeEventListener('message', this.paySuccess);
    },
    mounted(){
        window.addEventListener('message', this.paySuccess);
    },
    watch: {
        'search.tag'(v){
            this.$router.push({query:{
                ...this.$route.query,
                tag: v
            }})
        },
    },
    methods: {
        paySuccess(e){
            if(e?.data?.type!='paysuccess'){return}
            this.payDrawer.show = false;
        },
        toPay(ticket){
            let url = `https://ip.w7.cc/pay/${ticket}?header=false&footer=false&paid_callback=https%3A%2F%2Fuser.w7.cc%2Forder`;
            this.payDrawer = {
                show: true,
                url: url,
            }
        },
        getZpk(){
            // k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/microapps?labelSelector=w7.cc/identifie='+this.$route.params.name).then(res=>{
            //     let webUrl = res?.data?.items?.[0]?.spec?.config?.props?.webUrl;
            //     if(!webUrl){return}
            //     this.webUrl = webUrl;
            // })

            
            panelApi.get('/zpk/local-url').then(res=>{
                this.webUrl = (res?.data?.isHttps? 'https://' : 'http://') + res?.data?.host + '/zpk';
                this.getData();
                this.getTags();
            })
        },
        getData(){
            axios.get(this.webUrl + '/respo/list?status=2&status=99',{
// axios.get('http://172.16.1.161:8000/zpk/respo/list?status=2&status=99',{
                params: {
                    page: this.page,
                    limit: this.limit,
                    tag: this.search.tag,
                    keyword: this.search.keyword,
                },
                headers: {
                    'X-W7Panel-Token': this.thirdparty_cd_token,
                },
            }).then(res=>{
                this.list = res.data?.data?.list || [];
                this.total = res.data?.data?.total || 1;
            });
        },
        tagClick(item){
            this.search.tag = item.name;
            this.toSearch();
        },
        getTags(){
            axios.post(this.webUrl + '/respo/tag/list',{limit:999}).then(res=>{
                this.tags = res.data?.data?.list || [];
            });
        },
        toSearch(){
            this.page = 1;
            this.getData();
        },
    }
}
</script>

<style scoped>
.labelbox{border: 1px solid #E7E7E7; border-radius:8px; padding:15px 15px 5px;}
.labelbox .label{display:inline-flex; cursor:pointer; height:30px; line-height:30px; padding:0 10px; margin:0 16px 10px 0; border-radius:2px; white-space:nowrap;}
.labelbox .label:hover{background:#DCDCDC;}
.labelbox .label.active{background:#2D62FF; color:#ffffff;}
.alltag{display:inline-block; height:30px; line-height:30px; white-space:nowrap;}
</style>
<style>
.pay-modal .arco-modal-body{padding:0;}
</style>