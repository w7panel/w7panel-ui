<template>
    <div class="df df-c" :class="{'padding-20':$route.name=='app-store-install'}" style="height:100%;">
        <route-breadcrumb v-if="$route.name=='app-store-install'" class="df-s0" />
        <div class="padding-20 bg-white fc">
            <store-install ref="si" :version="version" @needInstall="needInstall" />
            
            <div v-if="mdtxt&&mdtxt.trim()!='请添加 readme.md 文件'" class="topline mt-40">
                <v-md-preview :text="mdtxt"></v-md-preview>
            </div>
            <div v-else>
                <!-- <a-empty /> -->
            </div>
        </div>
        <template v-for="(value,key) in idObj" :key="key">
            <install-drawer :show="value.show" :module_name="key" @needInstall="needInstall" @installed="value.callback" @close="value.show=false;"></install-drawer>
        </template>
    </div>
</template>

<script>
import storeInstall from "@/components/store-install.vue"
import installDrawer from './install-drawer.vue'
import axios from 'axios'

export default {
    data(){
        return {
            identifie: this.$route.query.identifie,
            path: this.$route.query.path,
            idObj: {},
            info: {},
            versionlist: [],
            version: '',
        }
    },
    components: {
        storeInstall,
        installDrawer,
    },
    created(){
        this.getInfo();
    },
    methods: {
        getInfo(){
            if(!this.identifie){
                if(!/^https:\/\/zpk(\.test)?\.w7\.cc\/(zpk\/)?respo\/info\//.test(this.path)){return}
                this.identifie = this.path.replace(/^https:\/\/zpk(\.test)?\.w7\.cc\/(zpk\/)?respo\/info\//,'');
            }
            axios.get('https://zpk.w7.cc/zpk/respo/detail/'+this.identifie).then(res=>{
                this.info = res.data?.data || {};
                
                this.mdtxt = res.data?.data?.content;
                
                this.versionlist = res.data?.data?.version_list || [];
                if(this.versionlist.length){
                    this.version = this.versionlist[0].name;
                }
            })
        },
        needInstall(module_name, callback){
            this.idObj[module_name] = {
                show: false,
                callback: callback,
            }
            this.$nextTick(()=>{
                this.idObj[module_name].show = true;
            });
        },
    },

}
</script>

<style scoped>
.content{padding:20px;}
.top{padding:20px;}
.logo-box{width:168px; height:168px; padding:5px; border:1px solid #eaeaea; border-radius:8px;}
.logo-box .logo{border-radius:4px; width:100%; height:100%;}
.topline{border-top:1px solid #f2f2f2; }
</style>