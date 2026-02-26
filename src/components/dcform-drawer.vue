<template>
    <a-drawer :width="1000" :visible="visible" @cancel="closeDrawer()" class="dcform-drawer" unmountOnClose :footer="false" :popup-container="false?'#allmodalbox':'body'">
        <template #title>DockerCompose创建</template>
        <div style="height:100%;">
            <!-- step 1 -->
            <div v-if="step==1" class="df df-c drawerbox padding-20">
                <!-- <div class="df-s0 fs-14 c-99">请输入Docker Compose</div> -->
                <div class="fc ">
                    <yaml-input :value="dc" class="yamlinput" domid="dockercompose" @submit="v=>{dcSave=v}"></yaml-input>
                </div>
                <div class="mt-16 df-s0">
                    <a-button type="primary" @click="nextStep" style="width:100px;">下一步</a-button>
                </div>
            </div>
            <!-- step 2 -->
            <div v-if="step==2" class="df df-c drawerbox">
                <a-tabs v-model:active-key="activeName" class="app-detailmenu df-s0" hide-content>
                    <a-tab-pane v-for="item in list" :key="item.key" :title="item.key"></a-tab-pane>
                </a-tabs>
                <div class="fc padding-20" style="overflow:auto;">
                    <template v-for="(item,index) in list" :key="item.key">
                        <app-form v-show="item.key==activeName" :ref="item.key" :parent="index==0?'':list[0].name" :defaultData="item.data" @getInfo="v=>createCallback(v,index)"></app-form>
                    </template>
                </div>
                <div class="df jc-b df-s0 footer">
                    <a-button size="small" @click="step=1">上一步</a-button>
                    <a-button :loading="loadingsubmit" @click="submit" type="primary" size="small" class="ml-20">创建</a-button>
                </div>
            </div>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';

import axios from "axios";
import jsyaml from "js-yaml";
import yamlInput from '@/components/yaml-input.vue'
import appForm from '@/components/app-form.vue'
import { useLoadingStore, useNamespaceStore } from '@/store';

export default {
    props: ['show'],
    data(){
        return {
            step: 1,
            visible: false,
            dc: '',
            dcSave: '',
            list: [],
            createList: [],
            activeName: '',
            loadingsubmit: false,
            storages: [],
            namespaceActive: 'default',
        }
    },
    components: {
        yamlInput,
        appForm,
    },
    watch:{
        show(){
            this.visible = this.show;
            this.init();
        },
    },
    created(){
        const { namespace } = useNamespaceStore();
        this.namespaceActive = namespace;
        this.getStorage();
    },
    methods: {
        init(){
            this.step = 1;
            this.dc = '';
            this.dcSave = '';
            this.list = [];
            this.activeName = '';
        },
        nextStep(){
            this.dc = this.dcSave;
            panelApi.post('/kcompose', this.dc, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.loading = false;
                let arr = [];
                let list = res.data || {};

                for(let i in list){
                    if(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(list[i])){
                        list[i] = atob(list[i]);
                    }
                    list[i] = jsyaml.load(list[i]);
                    if(list[i]?.kind!=='Deployment'){
                        delete list[i];
                        continue;
                    }
                    // 检测默认存储存在
                    if(list[i]?.spec?.template?.spec?.containers?.[0]?.volumeMounts?.length){
                        let v = list[i]?.spec?.template?.spec?.containers?.[0]?.volumeMounts;
                        let volumes = list[i]?.spec?.template?.spec?.volumes;
                        for(let j=0; j<v.length; j++){
                            if(v[j]?.name && this.storages.indexOf(v[j].name)==-1){
                                v[j].name = this.storages[0];
                                if(!volumes){list[i].spec.template.spec.volumes = [];}
                                if(!volumes.find(item => item.name==v[j].name)){
                                    volumes.push({
                                        name: v[j].name,
                                        persistentVolumeClaim: {
                                            claimName: v[j].name,
                                        }
                                    })
                                }
                            }
                        }
                    }
                    arr.push({
                        key: i,
                        name: list[i]?.metadata?.name,
                        data: list[i],
                    })
                }
                this.step = 2;
                this.$nextTick(()=>{
                    this.activeName = arr[0].key;
                    this.list = arr;
                    this.createList = [];
                });
            });
        },
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        },
        createCallback(v,index){
            if(!v.isSubmit){
                this.list[index].name = v.name;
                return
            }
            if(!v.submitStatus){
                this.activeName = this.list[index].key;
                return;
            }
            this.createList.push(v);
            if(this.list.length==this.createList.length){
                this.$message.success('创建成功');
                setTimeout(()=>{
                    this.closeDrawer(true);
                }, 600);
            }
        },
        async submit(){
            this.createList = [];
            
            useLoadingStore().loading = true;
            this.loadingsubmit = true;
            for(let i=0; i<this.list.length; i++){
                try{
                    await this.$refs[this.list[i].key]?.[0]?.validate();
                }catch(e){
                    this.activeName = this.list[i].key;
                    this.loadingsubmit = false;
                    useLoadingStore().loading = false;
                    return;
                }
            }
            for(let i=0; i<this.list.length; i++){
                try{
                    await this.$refs[this.list[i].key]?.[0]?.submit(true);
                }catch(e){
                    this.activeName = this.list[i].key;
                    this.loadingsubmit = false;
                    useLoadingStore().loading = false;
                    return;
                }
            }
            this.loadingsubmit = false;
            useLoadingStore().loading = false;
        },
        getStorage(){
            // k8sproxy.get(`/k8s-proxy/v1/namespaces/${'longhorn-system'}/services/${'longhorn-backend:9500'}/proxy/v1/volumes`,{
            //     headers: {Accept: 'application/json',},
            // }).then(res => {
            //     let data = res?.data?.data || [];
            //     this.storages = data.map(item => item.name);
            // });

            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.filter(i=>!i.metadata.deletionTimestamp).map(item=>{
                    item.created_at = window.formatDate(item.metadata.creationTimestamp);
                    return {
                        title: item?.metadata?.annotations?.title,
                        name: item?.metadata?.name,
                        size: item?.spec?.resources?.requests?.storage,
                        storage_class: item?.spec?.storageClassName,
                        created_at: item.created_at,
                        creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                    };
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.storages = list.map(i=>i.name);
            })
        },
    },

}
</script>

<style>
.app-detailmenu{width:100%;}
.app-detailmenu .arco-tabs-nav{width:100%; }
.dcform-drawer .arco-drawer-body{padding:0;}
.dcform-drawer .arco-drawer-body .drawerbox{height:100%; height:max(400px, 100%); box-sizing:border-box;}
.dcform-drawer .arco-drawer-body .footer{padding:16px; border-top:1px solid var(--color-neutral-3);}
</style>
<style scoped>
.yamlinput{border:1px solid #e4e7ed; box-sizing:border-box; height:100%;}
</style>