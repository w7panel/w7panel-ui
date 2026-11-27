<template>
    <div class="micro-cookie-guide">
        <a-button type="outline" size="small" @click="visible = true">第三方 Cookie 设置提示</a-button>
        <a-modal v-model:visible="visible" title="允许第三方 Cookie" width="760px" :footer="false">
            <img class="micro-cookie-guide__image" :src="guideImage" alt="Chrome 地址栏右侧的小眼睛图标及第三方 Cookie 开关位置" />
            <p>如果当前浏览器屏蔽了第三方 Cookie，请点击地址栏右侧的 <icon-eye /> 小眼睛图标，开启“第三方 Cookie”开关，然后刷新页面进入。</p>
        </a-modal>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import guideImage from '@/assets/images/third-party-cookie-guide.png';

const visible = ref(false);
</script>

<style scoped>
.micro-cookie-guide{position:absolute;top:12px;right:12px;z-index:11;}
.micro-cookie-guide__image{display:block;width:100%;height:auto;max-height:40vh;object-fit:contain;}
.micro-cookie-guide p{margin:16px 0 0;line-height:1.6;}
</style>
