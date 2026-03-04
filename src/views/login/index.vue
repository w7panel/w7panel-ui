<template>
    <div class="container">
        <div class="logo">
            <!-- <img alt="logo" src="//p3-armor.byteimg.com/tos-cn-i-49unhts6dw/dfdba5317c0c20ce20e64fac803d52bc.svg~tplv-49unhts6dw-image.image" /> -->
            <!-- <div class="logo-text">Arco Design Pro</div> -->
            <!-- <img alt="logo" src="@/assets/images/logo.png" style="height:30px;" /> -->
        </div>
        <!-- <LoginBanner /> -->
        <div class="content">
            <div class="content-inner">
                <LoginForm />
            </div>
            <!-- <div class="footer">
            <Footer />
            </div> -->
        </div>
        
        <div class="df ai-c jc-c df-ww padding-20 c-99 fs-12 mt-10" style="gap:15px;">
            <a v-if="site.icpnumber" href="https://beian.miit.gov.cn/" class="c-99" target="_blank">ICP备案：{{ site.icpnumber }}</a>
            <a v-if="site.number" :href="'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode='+site.number" class="c-99" target="_blank">{{site.location}}</a>
            <a v-if="site.license" :href="site.license" class="c-99" target="_blank">电子执照</a>
            <span v-if="site.tbol" class="c-99">增值电信业务经营许可证：{{ site.tbol }}</span>
            <span>© 微擎面板 提供技术支持</span>
        </div>
        <contact-us></contact-us>
    </div>
</template>

<script lang="ts" setup>
import { panelApi } from '@/utils/api';
//   import Footer from '@/components/footer/index.vue';
//   import LoginBanner from './components/banner.vue';
import { ref } from 'vue';
  import LoginForm from './components/login-form.vue';
import axios from 'axios';
import contactUs from '@/components/contact-us.vue';

const site = ref({});

panelApi.get('/noauth/site/beian',{noAlert:true}).then(res=>{
    let o = res.data?.data || {};
    site.value = o;
})

</script>

<style lang="less" scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: url(@/assets/image/loginbg.png) no-repeat center;
    background-size: 100% 100%;

    .banner {
      width: 550px;
      background: linear-gradient(163.85deg, #1d2129 0%, #00308f 100%);
    }

    .content {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
    }

    .footer {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 100%;
    }
  }

  .logo {
    position: fixed;
    top: 24px;
    left: 22px;
    z-index: 1;
    display: inline-flex;
    align-items: center;

    &-text {
      margin-right: 4px;
      margin-left: 4px;
      color: var(--color-fill-1);
      font-size: 20px;
    }
  }
</style>

<style lang="less" scoped>
  // responsive
  @media (max-width: @screen-lg) {
    .container {
      .banner {
        width: 25%;
      }
    }
  }
</style>
