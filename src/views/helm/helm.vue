<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <div class="list">
                <div class="item df" v-for="item in list" :key="item.name">
                    <img :src="item.icon" alt="" class="df-s0 img">
                    <div class="df df-c jc-b fc">
                        <div>
                            <div class="df jc-b">
                                <div class="fs-20 one-hide">{{item.title}}</div>
                                <span class="c-66 df-s0">Version {{item.app_version}}</span>
                            </div>
                            <div class="mt-10" style="height:64px;">
                                <div class="fs-14 lh-14 c-99 three-hide">{{item.description}}</div>
                            </div>
                        </div>
                        <div class="mt-10 df jc-e">
                            <a-button @click="$router.push('/helm/'+item.name)">详情</a-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios';
export default {
    data() {
        return {
            list: [],
        }
    },
    created() {
        this.getList();
    },
    methods: {
        getList(){
            panelApi.get('/helm/releases').then(res=>{
                this.list = res.data;
            })
        },
    }
}
</script>

<style scoped>
.list{display:grid; grid-template-columns:1fr 1fr 1fr; grid-gap: 16px 16px;}
.list .item{border:1px solid #e7e7e7; border-radius:8px; padding:16px;}
.list .item:hover{box-shadow: 0px 3px 14px 2px rgba(0, 0, 0, 0.05),0px 8px 10px 1px rgba(0, 0, 0, 0.06),0px 5px 5px -3px rgba(0, 0, 0, 0.1);}
.list .item .img{width:60px;height:60px;margin-right:16px;}
</style>