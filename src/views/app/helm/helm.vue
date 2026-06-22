<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <a-row class="mt-24" :gutter="24">
                <a-col :span="8" v-for="(item,index) in list" :key="item.identifie" style="margin-bottom:24px;">
                    <helm-item :data="item" @delete="list.splice(index,1)" @refresh="getData"></helm-item>
                </a-col>
            </a-row>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';

import helmItem from '@/components/helm-item.vue';

export default {
    data(){
        return {
            list: [],
        }
    },
    created(){
        this.getData();
    },
    components:{ helmItem, },
    methods:{
        getData(){
            panelApi.get('/helm/releases').then(res=>{
                this.list = res.data;
            })
        },
    },
}
</script>

<style>

</style>