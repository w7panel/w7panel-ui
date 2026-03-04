<template>
    <div class="contactus-box">
        <template v-for="(item,index) in list" :key="index">
            <a v-if="item.type=='link'" :href="item.link" target="_blank" class="icon mt-8 df ai-c jc-c cursor" :class="`style${item.style}`">
                <img v-if="item.customIcon" :src="item.icon" alt="" style="width:28px;height:28px;" />
                <component v-else :is="item.icon" style="font-size:28px;"></component>
            </a>
            <a-popover v-else position="lb" trigger="hover" content-style="max-width:600px;">
                <div class="icon mt-8 df ai-c jc-c cursor" :class="`style${item.style}`">
                    <img v-if="item.customIcon" :src="item.icon" alt="" style="width:28px;height:28px;" />
                    <component v-else :is="item.icon" style="font-size:28px;"></component>
                </div>
                <template #content>
                    <img v-if="item.type=='qrcode'" :src="item.qrcode" alt="" style="width:200px;height:200px;" />
                    <div v-if="item.type=='text'">{{ item.text }}</div>
                </template>
            </a-popover>
        </template>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';

export default{
    data(){
        return {
            list: [],
        }
    },
    created(){
        this.getList();
    },
    methods: {
        getList(){
            panelApi.get('/noauth/site/lianxi',{noAlert:true}).then(res=>{
                
                let list = res?.data?.items || [];
                this.list = list.map(i=>{
                    return {
                        type: i.data.type,
                        name: i.data.name,
                        configmapName: i.metadata.name,
                        text: i.data.text,
                        link: i.data.link,
                        customIcon: Boolean(i.binaryData.icon),
                        icon: i.binaryData.icon? i.data.iconHeader + i.binaryData.icon : i.data.selicon,
                        qrcode: i.data.qrcodeHeader + i.binaryData.qrcode,
                        style: i.data.style,
                    }
                })
                console.log(this.list)
            })
        },
    }
}
</script>
<style scoped>
.contactus-box{position:fixed; right:8px; bottom:40px;}
.icon{
    width:52px;
    height:52px;
    border:2px solid var(--color-bg-2);
    border-radius: 50%;
}

.style0{
    background: linear-gradient(0deg, #ffffff 0%, #f3f5f8 100%);
    color: rgb(var(--primary-6));
}
.style1{
    background: linear-gradient(180deg, #0E42D2 0%, #4080FF 100%);
    color: #FFF;
}
.style2{
    background: linear-gradient(180deg, #5A4BFF 0%, #BC8CF2 100%);
    color: #FFF;
}
.style3{
    background: linear-gradient(180deg, #2D3748 0%, #64748B 100%);
    color: #FFF;
}
.style4{
    background: linear-gradient(180deg, #ff3b3b 0%, #ffa45a 100%);
    color: #FFF;
}
.style5{
    background: linear-gradient(180deg, #2F5233 0%, #8BC34A 100%);
    color: #FFF;
}
.style6{
    background: linear-gradient(180deg, #0E7490 0%, #5EEAD4 100%);
    color: #FFF;
}
</style>