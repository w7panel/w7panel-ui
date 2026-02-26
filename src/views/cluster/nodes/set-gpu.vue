<template>
    <div>
        <!-- <a-drawer :width="700" :visible="visible" @cancel="closeDrawer()" unmountOnClose>
            <template #title>GPU管理</template>
            <template #footer>
                <div>
                    <a-button @click="closeDrawer()">取消</a-button>
                </div>
            </template>
        </a-drawer> -->
            
        <div>
            <a-form :model="data" auto-label-width class="padding-10">
                <a-form-item label="启用GPU" style="margin-bottom:20px;">
                     <!-- :disabled="!data.canEnabledGpu" -->
                    <a-switch v-model="data.gpu" @change="gpuSwitch"></a-switch>
                    <template #help>启用GPU功能需要预先在集群上安装GPU及对应驱动插件。</template>
                </a-form-item>
                <a-form-item label="启用类型">
                    <template #help>GPU安装完成后，可使用绑定节点功能开启GPU支持，请选择与GPU类型对应的节点服务器。</template>
                    <a-space direction="vertical" fill size="0" style="flex:1;">
                        <!-- <a-button @click="addGpu" :disabled="data.list.length>=1">
                            <template #icon><a-icon-plus /></template>
                            <span>添加GPU驱动</span>
                        </a-button> -->
                        <div v-for="item in data.list" :key="item.type">
                            <div v-if="item.step==1" class="df ai-c">
                                <a-input v-model="item.typeTxt" readonly style="width:360px;" ></a-input>
                                <a-button v-if="item && item.step==1" type="primary" class="ml-10" @click="toInstall(item)">启用</a-button>
                            </div>
                            
                            <div v-if="item.step==2" class="mt-10">
                                <div class="df ai-c">
                                    <a-input v-model="item.typeTxt" :class="(item.gpuOperatorMode!='2'||item.hamiMode!='2')?'gpu-focus-input':''" readonly style="width:360px;cursor:pointer;" @focus="data.showDetail=item.type;">
                                        <template v-if="item.gpuOperatorMode!='2'||item.hamiMode!='2'" #suffix><icon-loading class="c-blue" /></template>
                                        <template v-else #suffix><icon-check class="c-green" /></template>
                                    </a-input>
                                    <!-- <a-button type="primary" class="ml-10" @click="item.showDetail=!item.showDetail;">查看详情</a-button> -->
                                    <a-button type="primary" v-if="item.hamiMode=='2'&&item.gpuOperatorMode=='2'" class="ml-10" @click="openBindNode(item)">绑定节点</a-button>
                                </div>
                                <div v-if="item.gpuOperatorMode!='2'||item.hamiMode!='2'||data.showDetail==item.type" class="mt-10 padding-20 gpudetail" :style="{backgroundColor:(item.gpuOperatorMode!='2'||item.hamiMode!='2')?'rgb(var(--orange-1))':''}">
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
                                                <a-typography-text type="secondary" class="fs-12 mt-4">{{(item.hamiMode=='2'&&item.gpuOperatorMode=='2')?'安装完成后，将在应用配置中自动支持':'等待检测'}}</a-typography-text>
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

        <store-install-drawer :show="installCpn.show" :path="installCpn.path" @close="installCpn.show=false;" @installed="getStatus();"></store-install-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store'
import storeInstallDrawer from '@/components/store-install-drawer.vue';

export default {
    props: ['show'],
    data(){
        return {
            namespaceActive: '',
            visible: false,
            data: {
                typeList: [],
                list: [],
                gpu: false,
                canEnabledGpu: false,
                showDetail: '',
            },
            bindNode: {
                show: false,
                bind: ()=>{},
                nodes: [],
                nodeList: [],
                datas: [],
            },

            statusInterval: null,

            installCpn: {
                show: false,
                path: ''
            },
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
        this.init();
    },
    beforeUnmount(){
        if(this.statusInterval){
            clearInterval(this.statusInterval);
        }
    },
    components: {
        storeInstallDrawer,
    },
    methods: {
        async init(){
            let hamiMode = '0';
            let gpuOperatorMode = '0';
            await panelApi.get('/gpu/config').then(res=>{
                let r = res.data;
                this.data.gpu = r.gpuEnabled;
                this.data.canEnabledGpu = r.canEnabledGpu;
                hamiMode = r.hamiMode || '0';
                gpuOperatorMode = r.gpuOperatorMode || '0';
            });
            
            k8sproxy.get('/apis/gpuclass.k8s.io/v1alpha1/namespaces/'+this.namespaceActive+'/gpuclasses?limit=500').then(async res=>{
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
                    
                    this.data.list.push({
                        type: name,
                        typeTxt: title,
                        step: (gpuOperatorMode=='0')? 1 : 2,
                        showDetail: false,
                        hamiMode: hamiMode,
                        gpuOperatorMode: gpuOperatorMode,
                    });
                }
                this.item = this.data.list?.[0] || null;
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
                if(item.hamiMode!='2'||item.gpuOperatorMode!='2'){
                    await panelApi.get('/gpu/config').then(res=>{
                        let r = res.data;
                        item.hamiMode = r.hamiMode || '0';
                        item.gpuOperatorMode = r.gpuOperatorMode || '0';
                        if(item.gpuOperatorMode!='0'){item.step = 2;}
                        if(item.hamiMode!='2'||item.gpuOperatorMode!='2'){ complete = false; }
                    });
                }
            }
            if(complete){ clearInterval(this.statusInterval); }
        },
        toInstall(){
            this.installCpn = {
                show: true,
                path: 'https://zpk.w7.cc/zpk/respo/info/nvidia_gpuoperator',
            }
        },
        // 绑定节点
        async bindNodeSubmit(){
            for(let i in this.bindNode.datas){
                let name = this.bindNode.datas[i]?.metadata?.name;
                let iv = this.bindNode.datas[i]?.metadata?.labels?.gpu;
                if(iv=='on' && this.bindNode.nodes.includes(name)){continue;}
                if(iv=='off' && !this.bindNode.nodes.includes(name)){continue;}
                
                await k8sproxy.patch('//api/v1/nodes/'+name,{
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
        // addGpu(){
        //     if(this.data.list.length){return}
        //     let data = {
        //         apiVersion: 'gpuclass.k8s.io/v1alpha1',
        //         kind: 'GpuClass',
        //         metadata: {
        //             name: 'nvidia-gpu',
        //             namespace: this.namespaceActive,
        //             annotations: {
        //                 title: 'Nvidia GPU',
        //             },
        //         },
        //         spec: {
        //             hamiMode: '0',
        //             gpuOperatorMode: '0',
        //             zpkUrl: 'https://zpk.w7.cc/zpk/respo/info/nvidia_gpuoperator'
        //         }
        //     };
        //     k8sproxy.post('//apis/gpuclass.k8s.io/v1alpha1/namespaces/default/gpuclasses',data,{loading:true}).then(res=>{
        //         this.init();
        //     })
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