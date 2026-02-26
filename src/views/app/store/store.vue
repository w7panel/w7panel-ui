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
                    <respo-item :data="item" @delete="list.splice(index,1)" @refresh="getData" @tagClick="tagClick"></respo-item>
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
    </div>
</template>

<script>
// import axios from './_respoaxios'
import axios from 'axios'
import respoItem from '@/components/respo-item.vue'

export default {
    name: "store",
    data() {
        return {
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
        }
    },
    components: {
        respoItem,
    },
    created() {
        if(this.$route.query.tag){ this.search.tag = this.$route.query.tag; }
        if(this.$route.query.keyword){ this.search.keyword = this.$route.query.keyword; }
        if(this.$route.query.hidetags){ this.hidetags = true; }
        this.getData();
        this.getTags();
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
        tagClick(item){
            this.search.tag = item.name;
            this.toSearch();
        },
        getTags(){
            axios.post('https://zpk.w7.cc/zpk/respo/tag/list',{limit:999}).then(res=>{
                this.tags = res.data?.data?.list || [];
            });
        },
        getData(){
            axios.get('https://zpk.w7.cc/zpk/respo/list?status=2&status=99',{
                params: {
                    page: this.page,
                    limit: this.limit,
                    tag: this.search.tag,
                    keyword: this.search.keyword,
                },
            }).then(res=>{
                this.list = res.data?.data?.list || [];
                this.total = res.data?.data?.total || 1;
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