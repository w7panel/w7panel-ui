<template>
    <div class="padding-20" style="box-sizing:border-box;height:100%;">
        <div v-if="step==1" class="df df-c" style="height:100%; height:max(400px, 100%)">
            <div class="df-s0 fs-16">请输入Docker Compose</div>
            <div class="fc mt-10">
                <yaml-input :value="dc" class="yamlinput" domid="dockercompose" @submit="v=>{dcSave=v}"></yaml-input>
            </div>
            <div class="mt-16 df-s0">
                <a-button type="primary" @click="getData" style="width:100px;">下一步</a-button>
            </div>
        </div>
        <div v-else-if="step==2" id="yamleditordom" class="df df-c" style="height:100%; height:max(400px, 100%)">
            <div style="height:32px;">
                <a-tabs v-model="activeName" @change="updatevalue" type="card-gutter" class="k8s-tabs">
                    <a-tab-pane v-for="(item, key) in list" :key="key" :title="key">
                        <template #title>
                            <span v-if="statusList[key]==='success'" class="success va-middle"></span>
                            <span v-if="statusList[key]==='fail'" class="fail va-middle"></span>
                            <span class="ml-8 va-middle">{{key}}</span>
                        </template>
                    </a-tab-pane>
                </a-tabs>
            </div>
            <!-- <el-tabs
                v-model="activeName"
                type="card"
                class="k8s-tabs df-s0"
                @tab-change="updatevalue"
            >
                <el-tab-pane v-for="(item,key) in list" :key="key" :label="key" :name="key">
                    <template #label>
                        <span v-if="statusList[key]==='success'" class="success va-middle"></span>
                        <span v-if="statusList[key]==='fail'" class="fail va-middle"></span>
                        <span class="ml-8 va-middle">{{key}}</span>
                    </template>
                </el-tab-pane>
            </el-tabs> -->
            <div class="fc">
                <yaml-input :value="list[activeName]" class="yamlinput" domid="k8sinput" @submit="v=>{savelist[activeName]=v}"></yaml-input>
            </div>
            <div class="mt-16 df-s0">
                <a-button @click="step=1" type="outline" style="width:100px;">上一步</a-button>
                <a-button type="primary" @click="submit" style="width:100px;margin-left:10px;">创建</a-button>
            </div>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from "axios";
import yamlInput from "@/components/yaml-input.vue"
import { useNamespaceStore } from "@/store";

let template = `version: "3.8"

services:
  langflow:
    image: langflowai/langflow:1.0-alpha
    ports:
      - "7860:7860"
    depends_on:
      - postgres
    environment:
      - LANGFLOW_DATABASE_URL=postgresql://langflow:langflow@postgres:5432/langflow
      # This variable defines where the logs, file storage, monitor data and secret keys are stored.
      - LANGFLOW_CONFIG_DIR=app/langflow
    volumes:
      - langflow-data:/app/langflow

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: langflow
      POSTGRES_PASSWORD: langflow
      POSTGRES_DB: langflow
    ports:
      - "5432:5432"
    volumes:
      - langflow-postgres:/var/lib/postgresql/data

volumes:
  langflow-postgres:
  langflow-data:`

export default {
    data(){
        return {
            namespaceActive: '',
            step: 0,
            dc: '',
            dcSave: '',
            loading: false,
            list: {},
            savelist: {},
            statusList: {},
            activeName: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    mounted(){
        this.step = 1;
    },
    components: {yamlInput},
    methods: {
        updatevalue(v){
            this.activeName = v;
            for(let i in this.savelist){
                this.list[i] = this.savelist[i]
            }
        },
        getData(){
            this.dc = this.dcSave;
            this.loading = true;
            panelApi.post('/kcompose', this.dc).then(res=>{
                if(!res?.data){return}
                this.loading = false;
                this.list = res.data || {};
                for(let i in list){
                    if(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(list[i])){
                        list[i] = atob(list[i]);
                    }
                }
                this.activeName = Object.keys(this.list)?.[0] || '';
                this.step = 2;
            }).catch(()=>{
                this.loading = false;
            });
        },
        async submit(){
            this.updatevalue();
            this.loading = true;
            let status = [];
            let keys = Object.keys(this.list);
            for(let i=0; i<keys.length; i++){
                let key = keys[i];
                await panelApi.post('/yaml?namespace='+this.namespaceActive, this.list[key]).then(res=>{
                    status.push({key:key, result:res?.data?'success':'fail'});
                }).catch(()=>{
                    status.push({key:key, result:'fail'});
                })
            }
            status.map(i=>this.statusList[i.key] = i.result);
            let success = status.filter(i=>i.result==='success');
            let fail = status.filter(i=>i.result==='fail');
            this.$message[success.length==keys.length?'success':'warning'](`${success.length}条成功 ${fail.length}条失败`);
            this.loading = false;
        },
    }
}
</script>

<style>
/* .k8s-tabs .el-tabs__header{margin-bottom:0;}
.k8s-tabs .el-tabs__item .success{display:inline-block; height:5px; width:5px; border-radius:50%;background:#00A870;}
.k8s-tabs .el-tabs__item .fail{display:inline-block; height:5px; width:5px; border-radius:50%;background:#D00805;}
.k8s-tabs .el-tabs__item{background-color:#fff;}
.k8s-tabs .el-tabs__nav-prev,
.k8s-tabs .el-tabs__nav-next{width:20px; height:40px; margin:0; border:1px solid #e4e7ed; background:#fff; border-bottom:0; box-sizing:border-box; text-align:center;} */

.k8s-tabs .arco-tabs-content{padding:0; border:0!important;}
</style>
<style scoped>
.yamlinput{border:1px solid #e4e7ed; box-sizing:border-box; height:100%;}
</style>