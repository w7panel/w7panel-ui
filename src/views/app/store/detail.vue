<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <div class="df">
                <div class="logo-box">
                    <img v-if="info.icon" :src="'http://zpk.w7.cc'+info.icon" alt="" class="logo" />
                </div>
                <div class="ml-20">
                    <div class="fs-18 b">{{ info.title }}</div>
                    <div class="mt-10 fs-14 c-66">{{ info.description }}</div>
                    <div class="mt-20 df ai-c">
                        <span class="fs-14 c-66 lh-1 df-s0">版本</span>
                        <a-select v-model="version" class="ml-10">
                            <a-option v-for="item in versionlist" :key="item.id" :value="item.name" :label="item.name"></a-option>
                        </a-select>
                    </div>
                    <div class="mt-20">
                        <a-button type="primary" @click="toInstall">安装</a-button>
                    </div>
                </div>
            </div>
            <div v-if="mdtxt" class="topline mt-20">
                <markdown-preview :text="mdtxt"></markdown-preview>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import MarkdownPreview from '@/components/markdown-preview.vue';

export default {
    components: { MarkdownPreview },
    data(){
        return {
            identifie: '',
            info: {},
            version: '',
            mdtxt: '',
            versionlist: [],
            iniframe: false,
            url: '',
        }
    },
    created(){
        this.iniframe = window.top != window;
        this.identifie = this.$route.params.identifie;
        this.getData();
    },
    methods:{
        getData(){
            axios.get('https://zpk.w7.cc/zpk/respo/detail/'+this.identifie).then(res=>{
                this.info = res.data?.data || {};
                
                this.mdtxt = res.data?.data?.content;
                
                this.versionlist = res.data?.data?.version_list || [];
                if(this.versionlist.length){
                    this.version = this.versionlist[0].name;
                }
            })
        },
        toInstall(){
            // let path = encodeURIComponent('https://zpk.w7.cc/zpk/respo/info/'+this.identifie);
            this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/'+this.identifie)
        },
    }
}

</script>

<style scoped>
.content{padding:20px;}
.top{padding:20px;}
.logo-box{width:168px; height:168px; padding:5px; border:1px solid #eaeaea; border-radius:8px;}
.logo-box .logo{border-radius:4px; width:100%; height:100%;}
.topline{border-top:1px solid #f2f2f2; }
</style>
