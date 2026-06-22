<template>
    <div ref="gsbox">
        <gocaptcha-slide
            class="gocaptcha-slide"
            :data="data"
            :events="{
                close: closeEvent,
                refresh: getData,
                confirm: confirmEvent,
            }"
        />
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { Slide as GocaptchaSlide } from 'go-captcha-vue';
import 'go-captcha-vue/dist/style.css';

export default {
    components: { GocaptchaSlide },
    data(){
        return {
            data: {}
        }
    },
    created(){
        this.getData();
    },
    mounted(){
        let gsbox = this.$refs.gsbox;
        let errDom = document.createElement('div');
        errDom.id = 'errmsg';
        errDom.innerHTML = '验证失败';
        errDom.setAttribute('class','');
        gsbox.querySelector('.gc-body').appendChild(errDom);
    },
    methods: {
        getData(){
            panelApi.get('/captcha',{
                noAlert: true,
                noTokenRequired: true,
            }).then(res=>{
                let data = res?.data;
                if(!data){return}
                this.data.image = data['image_base64'] || '';
                this.data.thumb = data['tile_base64'] || '';
                this.data.captKey = data['captcha_key'] || '';
                this.data.thumbX = data['tile_x'] || 0;
                this.data.thumbY = data['tile_y'] || 0;
                this.data.thumbWidth = data['tile_width'] || 0;
                this.data.thumbHeight =data['tile_height'] || 0;
            })
        },
        confirmEvent(point,clear){
            this.$emit('confirm', {
                point: [point.x, point.y].join(','),
                key: this.data.captKey || ''
            });
            setTimeout(() => {
                clear()
                this.getData()
            }, 1000)
        },
        wrong(){
            let gsbox = this.$refs.gsbox;
            gsbox.setAttribute('class','dc-ani-shake');
            let errDom = gsbox.querySelector('#errmsg');
            errDom?.setAttribute('class','show');
            setTimeout(()=>{
                gsbox.setAttribute('class','');
                errDom?.setAttribute('class','');
            },1000)
        },
        closeEvent(){
            this.$emit('close');
        },

    }

}
</script>

<style>
.gocaptcha-slide #errmsg{position:absolute; bottom:-30px; left:0; right:0; line-height:24px; text-align:center; transition:bottom 0.2s; z-index:9; line-height:30px; color:#fff; background:#ff0000;}
.gocaptcha-slide #errmsg.show{bottom:0; transition:bottom 0.6s;}
</style>
<style scoped>
.dc-ani-shake {
    -webkit-animation: aniShakeX .5s;
    animation: aniShakeX .5s;
}
@keyframes aniShakeX {
    0%,to {
        -webkit-transform: translateZ(0);
        transform: translateZ(0)
    }

    10%,40%,70% {
        -webkit-transform: translate3d(-.3rem,0,0);
        transform: translate3d(-.3rem,0,0)
    }

    20%,60%,90% {
        -webkit-transform: translate3d(.3rem,0,0);
        transform: translate3d(.3rem,0,0)
    }
}
</style>
