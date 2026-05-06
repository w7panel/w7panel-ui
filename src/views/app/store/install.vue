<template>
    <div class="df df-c" :class="{'padding-20':$route.name=='app-store-install'}" style="height:100%;">
        <route-breadcrumb v-if="$route.name=='app-store-install'" class="df-s0" />
        <div class="padding-20 bg-white fc">
            <store-install ref="si" :version="version" @needInstall="needInstall" />
            
            <md-description v-if="Object.keys(mds||{}).length" :files="mds" class="topline mt-40"></md-description>
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
import mdDescription from './md-description.vue'

// 测试
// let t = {
//     'docs/.order': "docs/sdf.md,docs/asdf.md",
//     'docs/asdf.md': "aaaaa",
//     'docs/sdf.md': "ssss",
//     'readme.md': "<h1 align=\"center\">\n<img src=\"https://cdn.w7.cc/dpanel/dpanel-logo.png\" alt=\"DPanel\" width=\"500\" />\n</h1>\n<h4 align=\"center\"> 轻量化容器管理面板；优雅的管理 Docker、Podman 容器。 </h4>"
// }
export default {
    data(){
        return {
            host: '',
            identifie: this.$route.query.identifie,
            path: this.$route.query.path,
            idObj: {},
            info: {},
            versionlist: [],
            version: '',

            mds: {},
        }
    },
    components: {
        storeInstall,
        installDrawer,
        mdDescription,
    },
    created(){
        this.getInfo();
    },
    methods: {
        getInfo(){
            if(!this.identifie){
                if(!/^https:\/\/[^\/]+\/(zpk\/)?respo\/info\//.test(this.path)){return}
                this.identifie = this.path.replace(/^https:\/\/[^\/]+\/(zpk\/)?respo\/info\//,'');
                this.host = this.path.match(/^https:\/\/([^\/]+\/(zpk\/)?)respo\/info\//)[1];
            }
            axios.get('https://'+this.host+'respo/detail/'+this.identifie).then(res=>{
                this.info = res.data?.data || {};
                
                // this.mdtxt = res.data?.data?.content;
                this.mds = res.data?.data?.mds || {};
                
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