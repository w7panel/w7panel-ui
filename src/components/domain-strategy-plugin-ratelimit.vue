<template>
    <a-drawer :width="1200" title="限流管理" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose>
        <cluster-key-rate-limit
            ref="ratelimit"
            :name="name"
            @submit="closeDrawer()"
        ></cluster-key-rate-limit>
    </a-drawer>
</template>
<script>
import clusterKeyRateLimit from '@/views/app/plugin/cluster-key-rate-limit.vue';

export default{
    props: ['show','name'],
    data(){
        return {
            visible: false,
        }
    },
    watch:{
        show(v){
            this.visible = v;
            if(!v){return}
            this.init();
        },
    },
    components:{
        clusterKeyRateLimit,
    },
    created(){

    },
    methods: {
        init(){},
        submit(){
            this.$refs.ratelimit.submit();
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    }
}
</script>
<style scoped>
</style>
