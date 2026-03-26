<template>
    <div class="item df df-c jc-b" :class="{disabeld:!info.can_install}">
        <div class="df">
            <a v-if="info.url_detail" :href="info.url_detail" target="_blank" @click="(e)=>{e.stopPropagation(); return false;}">
                <img :src="info.logo" class="img" alt="" />
            </a>
            <img v-else :src="info.logo" class="img" alt="" />
            <div class="fc">
                <div class="one-hide fs-14">{{info.title}}</div>
                <div class="mt-4 fs-12 c-99">v {{info.version}}</div>
            </div>
            <div class="df-s0 df df-c ai-e ml-10">
                <a-button type="primary" :disabled="!info.can_install" size="small" style="padding:0 10px;" @click="install">安装{{num}}</a-button>
                <span class="mt-8 fs-12 c-red cursor" @click="showDeployItems">{{info.has_expire? '有过期订单' : '订单信息'}}</span>
            </div>
        </div>
        <div class="fs-12 c-99 one-hide">应用介绍：{{info.description}}</div>
    </div>
</template>

<script>
export default {
    props: ['data','tpcdtoken'],
    data(){
        return {
            info: {}
        }
    },
    created(){
        this.init();
    },
    watch: {
        data(){
            this.init();
        }
    },
    computed:{
        num(){
            let num = Number(this.data?.buy_num);// - Number(this.data?.installed_num);
            return num>1? '*'+num : '';
        }
    },
    methods: {
        init(){
            this.info = this.data;
        },
        install(){
            if(!this.data.can_install){return}
            this.$emit('install', this.data);
        },
        showDeployItems(){
            this.$emit('showDeployItems',this.info);
            // axios.get(`https://console.w7.cc/api/deploy/thirdparty-cd/${this.info.id}/items`,{customToken: this.tpcdtoken})
        },
    },
}
</script>

<style scoped>
.item{width:300px; height:110px; box-sizing:border-box; background:var(--color-primary-light-1);; padding:16px 16px; border-radius:4px;}
.item.disabeld{background-color:var(--color-fill-2);}
.item:hover{box-shadow:0 4px 20px 0 rgba(0,0,0,.1);}
.img{width:40px; height:40px; border-radius:4px; margin-right:10px;}
</style>