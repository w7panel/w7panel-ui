<template>
    <div>
        <a-drawer :width="700" :visible="visible" @cancel="closeDrawer()" unmountOnClose>
            <template #title>GPU管理</template>
            <div>
                <a-form :model="data" auto-label-width class="padding-10">
                    <a-form-item label="启用GPU" style="margin-bottom:20px;">
                        <!--  :disabled="!data.canEnabledGpu" -->
                        <a-switch v-model="data.gpu" @change="gpuSwitch"></a-switch>
                        <template #help>启用GPU功能需要预先在集群上安装GPU及对应驱动插件。</template>
                    </a-form-item>
                    <a-form-item label="启用类型">
                        <a-space direction="vertical" fill :size="0" style="flex:1;">
                            <a-button @click="addGpu" :disabled="data.list.length>=data.typeList.length">
                                <template #icon><a-icon-plus /></template>
                                <span>添加GPU驱动</span>
                            </a-button>
                            <div v-for="(item,index) in data.list" :key="index">
                                <div v-if="item.step==1" class="df ai-c mt-10">
                                    <a-select v-model="item.type" style="width:360px;">
                                        <a-option v-for="(item,index) in data.typeList" :disabled="data.list.find(i=>i.type==item.value)" :value="item.value" :label="item.label" :key="index" />
                                    </a-select>
                                    <a-button type="primary" class="ml-10" @click="toInstall(item)">确定</a-button>
                                </div>
                                <div v-if="item.step==2" class="mt-10">
                                    <div class="df ai-c">
                                        <a-input v-model="item.typeTxt" :class="(item.gpuOperatorMode!='2'||item.hamiMode!='2')?'gpu-focus-input':''" readonly style="width:360px;" @focus="item.showDetail=true;" @blur="item.showDetail=false;">
                                            <template v-if="item.gpuOperatorMode!='2'||item.hamiMode!='2'" #suffix><icon-loading class="c-blue" /></template>
                                            <template v-else #suffix><icon-check class="c-green" /></template>
                                        </a-input>
                                        <!-- <a-button type="primary" class="ml-10" @click="item.showDetail=!item.showDetail;">查看详情</a-button> -->
                                        <a-button type="primary" v-if="item.hamiMode=='2'&&item.gpuOperatorMode=='2'" class="ml-10" @click="openBindNode(item)">绑定节点</a-button>
                                    </div>
                                    <div v-if="item.gpuOperatorMode!='2'||item.hamiMode!='2'||item.showDetail" class="mt-10 padding-10 gpudetail" >
                                        <a-timeline :reverse="false" >
                                            <a-timeline-item>
                                                <template #dot>
                                                    <icon-loading v-if="item.gpuOperatorMode!='2'" class="c-blue" />
                                                    <icon-check-circle-fill v-else />
                                                </template>
                                                <div class="df df-c">
                                                    <span>{{item.typeTxt+'驱动'}}</span>
                                                    <a-typography-text type="secondary" class="fs-12 mt-4">{{item.gpuOperatorMode=='2'?'安装完成':'正在初始化安装'}}</a-typography-text>
                                                </div>
                                            </a-timeline-item>
                                            <a-timeline-item>
                                                <template #dot>
                                                    <icon-loading v-if="item.hamiMode!='2'" />
                                                    <icon-check-circle-fill v-else />
                                                </template>
                                                <div class="df df-c">
                                                    <span>vGPU驱动</span>
                                                    <a-typography-text type="secondary" class="fs-12 mt-4">{{item.hamiMode=='2'?'安装完成':'正在初始化安装'}}</a-typography-text>
                                                </div>
                                            </a-timeline-item>
                                            <a-timeline-item :dotColor="(item.gpuOperatorMode!='2'||item.hamiMode!='2')?'#C9CDD4':''">
                                                <template v-if="item.gpuOperatorMode=='2'&&item.hamiMode=='2'" #dot>
                                                    <icon-check-circle-fill />
                                                </template>
                                                <div class="df df-c">
                                                    <span>检测GPU开启条件</span>
                                                    <a-typography-text type="secondary" class="fs-12 mt-4">{{(item.hamiMode=='2'&&item.gpuOperatorMode=='2')?'安装完成，可开启GPU支持':'等待检测'}}</a-typography-text>
                                                </div>
                                            </a-timeline-item>
                                        </a-timeline>
                                    </div>
                                </div>
                            </div>
                        </a-space>
                    </a-form-item>
                </a-form>
            </div>
            <template #footer>
                <div>
                    <a-button @click="closeDrawer()">取消</a-button>
                </div>
            </template>
        </a-drawer>
        <!-- <a-modal v-model:visible="insGpuOprt.show" title="GPU Operator" width="700px" @ok="checkItem" @cancel="insGpuOprt.show=false;">
            <a-form :model="insGpuOprt" auto-label-width >
                <a-form-item label="部署驱动">
                    <a-switch v-model="insGpuOprt.driverEnabled"></a-switch>
                    <template #help>配置是否在节点上部署NVIDIA驱动，默认开启，如果您在使用GPU Operator部署前，已经在节点上部署了NVIDIA驱动程序，请关闭。</template>
                </a-form-item>
                <a-form-item label="版本" class="mt-10">
                    <a-input v-model="insGpuOprt.driverVersion" placeholder="GPU驱动镜像版本" type="text" />
                    <template #help>
                        <span>GPU驱动镜像的版本，离线部署请使用默认参数，仅在线安装时需配置。不同类型操作系统的 Driver 镜像的版本存在如下差异， 详情可参考：<a href="https://catalog.ngc.nvidia.com/orgs/nvidia/containers/driver/tags" target="_blank" class="c-blue cursor">Nvidia GPU Driver 版本</a></span>
                    </template>
                </a-form-item>
            </a-form>
        </a-modal> -->
        <a-modal :visible="bindNode.show" title="绑定节点" width="560px" @ok="bindNodeSubmit" @cancel="bindNode.show=false;">
            <div class=" df ai-c jc-c">
                <a-transfer
                    v-model="bindNode.nodes"
                    :data="bindNode.nodeList"
                    :title="['选择节点','已绑定节点']"
                    show-search
                    :source-input-search-props="{placeholder:'请输入搜索内容'}"
                    :target-input-search-props="{placeholder:'请输入搜索内容'}"
                    class="gpubind-transfer"
                >
                    <template #to-target-icon>
                        <div class="df ai-c">
                            <icon-right />
                            <span class="ml-4">绑定</span>
                        </div>
                    </template>
                    <template #to-source-icon>
                        <div class="df ai-c">
                            <icon-left />
                            <span class="ml-4">取消</span>
                        </div>
                    </template>
                </a-transfer>
            </div>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store'

export default {
    props: ['show'],
    data(){
        return {
            namespaceActive: '',
            visible: false,
            data: {
                typeList: [{
                    label: 'Nvidia GPU',
                    value: 'nvidia-gpu',
                }],
                list: [],
                gpu: false,
                canEnabledGpu: false,
            },
            insGpuOprt: {
                show: false,
                item: null,
                driverEnabled: false,
                driverVersion: '',
            },
            bindNode: {
                show: false,
                bind: ()=>{},
                nodes: [],
                nodeList: [],
                datas: [],
            },

            statusInterval: null,
        } 
    },
    watch:{
        show(v){
            this.visible = v;
            if(!v && this.statusInterval){
                clearInterval(this.statusInterval);
            }
            v && this.init();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    beforeUnmount(){
        if(this.statusInterval){
            clearInterval(this.statusInterval);
        }
    },
    methods: {
        init(){
            panelApi.get('/gpu/config').then(res=>{
                let r = res.data;
                this.data.gpu = r.gpuEnabled;
                this.data.canEnabledGpu = r.canEnabledGpu;
            });
            
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/gpuclasses?limit=500').then(async res=>{
                let items = res.data?.items || [];
                // this.data.typeList = items.map(i=>({
                //     label: i.metadata?.annotations?.title || i.metadata.name,
                //     value: i.metadata.name,
                // }));
                this.data.list = [];
                for(var i in items){
                    let d = items[i];
                    let name = d.metadata.name;
                    let title = d.metadata?.annotations?.title || name;
                    await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/gpuclasses/'+name, {noAlert:true}).then(res=>{
                        let r = res.data;
                        this.data.list.push({
                            type: name,
                            typeTxt: title,
                            step: (r?.spec?.hamiMode=='0' && r?.spec?.gpuOperatorMode=='0')? 1 : 2,
                            showDetail: false,
                            hamiMode: r?.spec?.hamiMode || '0',
                            gpuOperatorMode: r?.spec?.gpuOperatorMode || '0',
                        });
                    });
                }
                if(this.statusInterval){
                    clearInterval(this.statusInterval);
                }
                this.statusInterval = setInterval(this.getStatus,5000);
            });
        },
        async getStatus(){
            let complete = true;
            for(let i in this.data.list){
                let item = this.data.list[i];
                if(item.step==1 || (item.hamiMode=='2'&&item.gpuOperatorMode=='2')){continue;}
                await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/gpuclasses/'+item.type, {noAlert:true}).then(res=>{
                    item.hamiMode = res.data?.spec?.hamiMode || '0';
                    item.gpuOperatorMode = res.data?.spec?.gpuOperatorMode || '0';
                    if(item.hamiMode!='2'||item.gpuOperatorMode!='2'){ complete = false; }
                }).catch(()=>{
                    complete = false;
                });
            }
            if(complete){ clearInterval(this.statusInterval); }
        },
        toInstall(item){
            // console.log(item);return;
            let data = {
                apiVersion: 'w7panel.w7.com/v1alpha1',
                kind: 'GpuClass',
                metadata: {
                    name: item.type,
                    namespace: this.namespaceActive,
                    annotations: {
                        title: item.typeTxt,
                    },
                },
                spec: {
                    hamiMode: '0',
                    gpuOperatorMode: '0',
                }
            };
            k8sproxy.post('/apis/w7panel.w7.com/v1alpha1/namespaces/default/gpuclasses',data,{loading:true}).then(res=>{
                this.closeDrawer();
                this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/nvidia_gpuoperator');
            });
        },
        // 绑定节点
        async bindNodeSubmit(){
            for(let i in this.bindNode.datas){
                let name = this.bindNode.datas[i]?.metadata?.name;
                let iv = this.bindNode.datas[i]?.metadata?.labels?.gpu;
                if(iv=='on' && this.bindNode.nodes.includes(name)){continue;}
                if(iv=='off' && !this.bindNode.nodes.includes(name)){continue;}
                
                await k8sproxy.patch('/api/v1/nodes/'+name,{
                    metadata: {
                        labels: {'gpu': this.bindNode.nodes.includes(name)?'on':'off'}
                    }
                },{headers: {'Content-Type': 'application/strategic-merge-patch+json'}});
            }
            this.$message.success('操作成功');
            this.bindNode.show = false;
        },
        // 打开绑定节点
        openBindNode(){
            k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                this.bindNode.datas = data;
                let list = data.map(item=>({
                    label: item.metadata.name,
                    value: item.metadata.name,
                }));
                let values = data.filter(item=>item?.metadata?.labels?.gpu=='on').map(i=>i.metadata.name);
                this.bindNode.nodeList = list;
                this.bindNode.nodes = values;
                this.bindNode.show = true;
            });
        },
        // switch @change
        gpuSwitch(v){
            panelApi.post('/gpu/enabled-gpu?enabled='+v).then(res=>{
                this.$message.success('操作成功');
                this.init();
            })
        },
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        }, 
        // 添加GPU驱动
        addGpu(){
            let type = '';
            for(let i=0;i<this.data.typeList.length;i++){
                if(!this.data.list.find(d=>d.type==this.data.typeList[i].value)){
                    type = this.data.typeList[i].value;
                    break;
                }
            }
            this.data.list.push({
                type: type,
                typeTxt: this.data.typeList.find(d=>d.value==type).label,
                step: 1,
                showDetail: false,
            });
        },
        // async checkItem(){
        //     await panelApi.post('/gpu/install-hami')
        //     await panelApi.post('/gpu/install-gpu-operator',{
        //         driverEnabled: this.insGpuOprt.driverEnabled,
        //         driverVersion: this.insGpuOprt.driverVersion,
        //     });
        //     this.insGpuOprt.show = false;
        //     this.$message.success('操作成功')
        //     this.init();
        // },
    }
}
</script>

<style>
.gpudetail{width:360px;background:var(--color-neutral-1);}
.gpudetail .arco-timeline-item{min-height:40px;}
.gpubind-transfer .arco-transfer-operations .arco-btn{width:auto; padding:0 8px;}
.gpubind-transfer .arco-transfer-view-search{padding:0;}
.gpubind-transfer .arco-transfer-view{height:300px;}
.gpubind-transfer .arco-transfer-list-item{padding:0;}

.gpu-focus-input.arco-input-wrapper{
    z-index: 1;
    background-color: var(--color-bg-2);
    box-shadow: 0 0 0 0 var(--color-primary-light-2);
    border-color: rgb(var(--primary-6));
}
</style>
