<template>
    <div class="contactus-box">
        <template v-for="(item,index) in list" :key="index">
            <a v-if="item.type=='link'" :href="item.link" target="_blank" class="icon df df-c ai-c mt-8 cursor" :class="`style${item.style}`">
                <div class="logo df ai-c jc-c">
                    <img v-if="item.customIcon" :src="item.icon" alt="" style="width:100%;height:100%;display:block;" />
                    <component v-else :is="item.icon" style="font-size:28px;"></component>
                </div>
                <div v-if="item.showName" class="name">{{ item.name }}</div>
            </a>
            <a-popover v-else position="lb" trigger="hover" content-style="max-width:600px;">
                <div class="icon mt-8 df df-c ai-c cursor" :class="`style${item.style}`">
                    <div class="logo df ai-c jc-c">
                        <img v-if="item.customIcon" :src="item.icon" alt="" style="width:100%;height:100%;" />
                        <component v-else :is="item.icon" style="font-size:28px;"></component>
                    </div>
                    <div v-if="item.showName" class="name">{{ item.name }}</div>
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
                        showName: i.data.showName == 'true',
                        configmapName: i.metadata.name,
                        text: i.data.text,
                        link: i.data.link,
                        customIcon: Boolean(i.binaryData.icon),
                        icon: i.binaryData.icon? i.data.iconHeader + i.binaryData.icon : i.data.selicon,
                        qrcode: i.data.qrcodeHeader + i.binaryData.qrcode,
                        style: i.data.style,
                        index: Number(i.data.index) || 1,
                    }
                })
                // 根据 index 字段排序
                this.list.sort((a, b) => a.index - b.index)
                console.log(this.list)
            })
        },
    }
}
</script>
<style scoped>
.contactus-box{position:fixed; z-index:999; right:8px; bottom:80px;}
.icon{
    box-sizing: border-box;
    width: 52px;
    border:2px solid var(--color-bg-2);
    border-radius: 28px;
    padding: 2px;
    text-decoration: none;
}
.icon .logo{
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
}
.icon .name{
    writing-mode: vertical-rl;
    margin:8px 0 10px;
    text-decoration: none;
    font-size: 16px;
    letter-spacing: 4px;
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