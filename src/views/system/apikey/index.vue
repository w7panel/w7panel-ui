<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white padding-20 fc">
            <a-descriptions layout="horizontal" column="1" bordered class="cloud-description">
                <descriptions-item label="appId">
                    <div class="df ai-c">
                        <span>{{ info.showAppId? info.appId : '******' }}</span>
                        <icon-eye-invisible @click="info.showAppId=false;" v-if="info.showAppId" class="cursor c-99 ml-10 fs-16"/>
                        <icon-eye v-else @click="info.showAppId=true;" class="cursor c-99 ml-10 fs-16"/>
                    </div>
                </descriptions-item>
                <descriptions-item label="appSecret">
                    <div class="df ai-c">
                        <span>{{ info.showAppSecret? info.appSecret : '******' }}</span>
                        <icon-eye-invisible @click="info.showAppSecret=false;" v-if="info.showAppSecret" class="cursor c-99 ml-10 fs-16"/>
                        <icon-eye v-else @click="info.showAppSecret=true;" class="cursor c-99 ml-10 fs-16"/>
                    </div>
                </descriptions-item>
            </a-descriptions>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';


export default{
    data(){
        return {
            info: {
                appId: '',
                appSecret: '',
            }
        }
    },
    created(){
        this.getList();
    },
    methods: {
        getList(){
            k8sproxy.get('/api/v1/namespaces/kube-system/secrets/license').then(res=>{
                this.info = {
                    appId: (res.data?.data?.appId),
                    appSecret: (res.data?.data?.appSecret),
                }
            })
        },
    }
}
</script>
<style scoped>
</style>