<template>
    <div class="list-item df">
        <div class="left">
            <div class="app-icon">
                <img v-if="logoimg" :src="'http://zpk.w7.cc'+logoimg" class="img df-s0" alt="" />
            </div>
        </div>
        <div class="fc">
            <div class="df" style="height:64px;">
                <div class="fc lh-15">
                    <div class="df jc-b">
                        <div class="df fs-16 b c-00-9 mt-4">
                            <span class="one-hide" style="vertical-align:middle;">{{ data.name }}</span>
                        </div>
                        <div class="df">
                            <a-button class="ml-10 df-s0">更新</a-button>
                            
                            <a-popconfirm :content="'确认要卸载吗'" @ok="uninstall" position="bottom" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-button class="ml-10 df-s0">卸载</a-button>
                            </a-popconfirm>
                        </div>
                    </div>
                    <div class="one-hide c-00-6 fs-14 mt-8">
                        <span v-if="data.app_version" >当前版本：{{data.app_version}}</span>
                    </div>
                </div>
            </div>
            <div class="tags one-hide">
                <!-- <span v-for="tag in data.tag" :key="tag.id" class="tag fs-12 cursor">{{ tag.name }}</span> -->
            </div>
            <div class="c-00-6 two-hide fs-14" style="line-height:20px;">{{ data.description }}</div>
            
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios';

export default {
    props: ['data'],
    data(){
        return {
            logoimg: '',
        }
    },
    created(){
    },
    methods: {
        uninstall(){
            panelApi.delete('/helm/releases/'+this.data.name).then(res=>{
                if(!res?.data){return}
                this.$message.success('卸载成功');
                this.$emit('refresh');
            })
        },

    },
}
</script>

<style scoped>
.list-item{width:100%; height:188px; box-sizing:border-box; border:1px solid #e7e7e7; border-radius:8px; padding:20px; }
.list-item:hover{box-shadow: 0px 3px 14px 2px rgba(0, 0, 0, 0.05),0px 8px 10px 1px rgba(0, 0, 0, 0.06),0px 5px 5px -3px rgba(0, 0, 0, 0.1);}
/* .list-item .left{padding:10px;} */
.list-item .left .app-icon{width:64px; height:64px; margin-right:23px; box-sizing:border-box; border-radius:8px; position:relative; overflow:hidden;}
.list-item .left .app-icon .img{width:100%; height:100%; display:block; border-radius:8px;}
.list-item .left .app-icon input[type='file']{position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; min-width:0; opacity:0; cursor:pointer;}
.list-item .left .app-icon input[type='file']::-webkit-file-upload-button{display:none;}

.tags{padding:7px 0 12px;}
.tags .tag{display:inline-block; white-space:nowrap; height:20px; line-height:20px; background:#E8F1FF; color:#0256FF; margin-right:10px; padding:0 8px; border-radius:3px;}

.iconbox{width:52px; height:52px; margin-right:10px; border-radius:4px; overflow:hidden; box-sizing:border-box; position:relative; border:1px solid #f1f1f1;}
.iconbox .icon{width:100%; height:100%; position:absolute; top:0; left:0; z-index:1;}
.iconbox input[type='file']{position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; min-width:0; opacity:0; cursor:pointer;}

.menus{padding:10px 0;}
.menus .item{height:36px; line-height:36px; text-align:center; cursor:pointer;}
.menus .item:hover{background:rgba(240, 243, 250, 1);}
.list .li{margin-bottom:6px; height:30px; padding:0 10px; background:rgba(240, 243, 250, 1)}
.list .li .status{margin-right:6px; }
</style>