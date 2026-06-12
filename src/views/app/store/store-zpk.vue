<template>
    <div class="padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="df df-c bg-white" style="height: calc(100% - 46px);">
            <iframe src="https://zm.idc.w7.com/#/zpk-store-list" width="100%" height="100%" style="border:0;"></iframe>
        </div>
    </div>
</template>
<script>
export default{
    data(){
        return {

        }
    },
    created(){

    },
    mounted(){
        window.addEventListener('message', this.iframeMessage)
    },
    beforeUnmount() {
        window.removeEventListener('message', this.iframeMessage)
    },
    methods: {
        // ========== 应用商店安装 ==========
        toStoreInstall(path) {
            this.$router.push('/app/store-install?path=' + path);
        },
        iframeMessage(e){
            if(e?.data?.type=='zpk-store:open-install'){
                console.log('e.data',e.data);
                let path = e.data.payload?.path + '?order_sn=' + e.data.payload?.orderSn;
                path = encodeURIComponent(path);
                this.toStoreInstall(path)
            }
        },
        
    }
}
</script>
<style scoped>
</style>
