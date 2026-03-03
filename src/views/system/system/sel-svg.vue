<template>
    <div class="df df-ww iconbox">
        <div v-for="(item,index) in iconMap" :key="index" class="icon df df-c ai-c jc-c cursor" @click="selectIcon(item)">
            <component :is="item"/>
        </div>
    </div>
</template>
<script>
    
export default{
    data(){
        return {
            iconMap: [
                'icon-customer-service',
                'icon-user',
                'icon-user-group',
                'icon-user-add',
                'icon-phone',
                'icon-link',
                'icon-qq-circle-fill',
                'icon-weibo-circle-fill',
                'icon-tiktok-color',
                'icon-alipay-circle',
                'icon-github',
                'icon-gitlab',
                'icon-qq',
                'icon-wechat',
                'icon-location',
                'icon-at',
                'icon-message',
                'icon-share-alt',
            ],
            selectedKey: ''
        }
    },
    created(){
    },
    methods: {
        selectIcon(item){
            this.$emit('submit',item);
        },
    }
}
</script>
<style scoped>

.iconbox{width:390px; height:200px; overflow:auto;}
.iconbox::-webkit-scrollbar {width:10px;}
.iconbox::-webkit-scrollbar-track {background: transparent;}
.iconbox::-webkit-scrollbar-thumb {background: #eee; border-radius: 6px;}
.iconbox>>>svg{width:24px;height:24px;}

.icon{border:1px solid #f0f0f0; box-sizing:border-box; width:64px; height:64px;}
.icon:hover i{color:#2d5fff;}
.icon:hover{border-color:#2d5fff;}
</style>