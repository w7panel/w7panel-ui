<template>
    <div>
        <div class="bg-white box df df-c ai-c">
            <icon-check-circle-fill class="icon c-blue" />
            <h2 class="b c-33">注册成功！</h2>
            <span class="mt-10 c-99">您的账号已创建完成，可立即登录</span>
            <div class="mt-40">
                <a-button type="primary" shape="round" size="large">去登录</a-button>
            </div>
            <div class="mt-20 c-99">{{time}} 秒后自动跳转登录</div>
        </div>
    </div>
</template>

<script>
import { isLogin,setToken } from '@/utils/auth';

export default {
    data(){
        return {
            interval: null,
            time: 3,
        }
    },
    beforeUnmount(){
        try{
            clearInterval(this.interval);
        }catch{}
    },
    created(){
        this.startCount();
    },
    methods:{
        startCount(){
            this.interval = setInterval(()=>{
                this.time = this.time - 1;
                if(this.time<=0){
                    this.time = 0;
                    clearInterval(this.interval);
                    this.toLogin();
                }
            },1000);
        },
        toLogin(){
            if (isLogin()) {
                setToken('');
            }
            this.$router.push('/login');
        },
    }
}
</script>

<style scoped>
.box{width:600px; margin:40px auto 0; border-radius:20px; padding:40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);}
.box .icon{font-size:80px; }
.box>h2{font-size:24px; }
</style>