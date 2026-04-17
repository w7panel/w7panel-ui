<template>
    <div class="padding-20" style="height:calc(100vh - 60px); overflow:auto;">
        
        <route-breadcrumb />

        <div class="bg-white padding-20">
            <div class="df ai-c ">
                <div class="df ai-c">
                    <span class="df-s0">选择节点：</span>
                    <a-select v-model="node" @change="getPid" placeholder="请选择节点" style="width:300px;">
                        <a-option v-for="item in nodeList" :key="item.name" :value="item.name">{{item.name}}</a-option>
                    </a-select>
                </div>

                <a-button type="primary" class="ml-20" @click="openImport">导入镜像</a-button>

                <build-image
                    class="ml-20"
                    :hideList="true"
                    :showCreateBtn="true"
                    :nodeName="node"
                    :nodeIp="nodeIp"
                ></build-image>

                <a-button type="primary" class="ml-20" @click="openBuildContainer">打包容器镜像</a-button>
            </div>
            
            <a-table :data="list" :pagination="false" class="mt-20 nodeimagelisttable" :bordered="false">
                <template #columns>
                         
                    <a-table-column title="名称" :width="420">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <span>{{record.Name}}</span>
                                <a-tooltip content="修改名称">
                                    <icon-edit class="c-blue fs-16 ml-6 cursor df-s0 default-text" @click="openChangeName(record)"></icon-edit>
                                </a-tooltip>
                                <a-tooltip :content="'设置为PINNED后，镜像文件不会受到GC影响被自动删除'">
                                    <icon-lock class="fs-16 ml-6 df-s0 cursor default-text" @click="setDefault(record)" :class="{'c-orange':record.isDefault,'c-99':!record.isDefault}" />
                                </a-tooltip>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="标签">
                        <template #cell="{ record }">
                            <div>
                                <div v-for="(value,key) in record.Labels" :key="key">{{ key + ':' + value }}</div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="镜像id" :width="360">
                        <template #cell="{ record }">{{record.Target.digest}}</template>
                    </a-table-column>
                    <a-table-column title="创建时间">
                        <template #cell="{ record }">{{record.created}}</template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-popconfirm content="确定要删除吗" @ok="deleteImage(record)" position="lt">
                                <span class="df-s0 ml-10 c-blue cursor" @click.stop>删除</span>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>

        <a-modal :visible="importDialog.show" title="导入镜像" @ok="toImport" @cancel="importDialog.show=false" width="600px" >
            <a-form ref="importForm" :rules="rules" :model="importDialog" auto-label-width >
                <a-form-item label="镜像地址" field="imageName">
                    <a-input v-model="importDialog.namespace" placeholder="namespace">
                        <template #prepend>{{preAddress}}</template>
                        <template #suffix>/</template>
                    </a-input>
                    <a-input v-model="importDialog.imageName" style="width:180px;flex-shrink:0;" placeholder="镜像名称 : 版本" />
                </a-form-item>
                <a-form-item label="选择文件" field="filename">
                    <div class="upload">
                        <span v-if="importDialog.filename" class="c-blue">{{importDialog.filename}}</span>
                        <a-button v-else type="primary">导入镜像</a-button>
                        <input ref="importDialogFileInput" type="file" accept=".tar" @change="selectFile" />
                    </div>
                </a-form-item>
                <a-form-item label="PINNED">
                    <a-tooltip :content="'设置为PINNED后，镜像文件不会受到GC影响被自动删除'">
                        <a-checkbox v-model="importDialog.pinned">设置为PINNED</a-checkbox>
                    </a-tooltip>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="changeName.show" title="修改名称" @ok="toChangeName" @cancel="changeName.show=false" >
            <a-form ref="changeNameForm" :rules="rules" :model="changeName" auto-label-width >
                <a-form-item label="名称" field="newName">
                    <a-input v-model="changeName.newName" placeholder="请输入名称" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-drawer :width="800" :visible="buildContainer.show" title="打包容器镜像" @ok="toBuildContainer" @cancel="buildContainer.show=false" >
            <a-form ref="bcForm" :rules="bcRules" :model="buildContainer" auto-label-width style="padding:10px;">
                <a-form-item label="容器" field="containerName" :validate-trigger="[]">
                    <select-container v-if="buildContainer.show" @change="handleSelectContainer"></select-container>
                </a-form-item>
                <a-form-item label="自定义命令" field="cmd">
                    <a-textarea v-model="buildContainer.cmd" placeholder="请输入" style="width:620px;height:80px;" :spellcheck="false"/>
                </a-form-item>
                <a-form-item v-if="buildContainer.imageName" label="镜像地址">
                    <div class="df" style="width:620px;">
                        <a-input v-model="buildContainer.namespace" placeholder="namespace">
                            <template #prepend>{{preAddress}}</template>
                            <template #suffix>/</template>
                        </a-input>
                        <a-input v-model="buildContainer.imageName" style="width:300px;flex-shrink:0;" placeholder="镜像名称 : 版本" />
                    </div>
                </a-form-item>
                <a-form-item label="PINNED">
                    <a-tooltip :content="'设置为PINNED后，镜像文件不会受到GC影响被自动删除'">
                        <a-checkbox v-model="buildContainer.pinned">设置为PINNED</a-checkbox>
                    </a-tooltip>
                </a-form-item>
            </a-form>
        </a-drawer>
        
        <build-image-status
            :show="buildImageStatus.show"
            :data="buildImageStatus.data"
            :serverInfo="bisServerInfo"
            @close="buildImageStatus.show=false;buildContainer.show=false;getList()"
        ></build-image-status>

    </div>
</template>

<script>
import { useLoadingStore, useNamespaceStore } from '@/store';
import { k8sproxy, panelApi } from '@/utils/api';
import axios from 'axios';
import dayjs from 'dayjs';
import buildImage from '@/views/cluster/nodes/build-image.vue';
import selectContainer from '@/components/select-container.vue';
import buildImageStatus from '@/views/cluster/nodes/build-image-status.vue';

export default {
    data(){
        return {
            namespaceActive: 'default',
            nodeList: [],
            node: '',
            list: [],
            
            // 上传
            outEditorInfo: {
                agentUrl: '',
            },
            bisServerInfo:{
                agentUrl: '',
            },
            upload: {},
            partPath: '/tmp/',
            form: {},
            importDialog: {
                show: false,
                namespace: '',
                imageName: '',
                filename: '',
                pinned: false,
            },
            rules: {
                imageName: [{required:true, message:'请输入镜像地址'}],
                filename: [{required:true, message:'请选择文件'}],
                newName: [{required:true, message:'请输入名称'}],
            },

            changeName: {
                show: false,
                row: null,
                newName: '',
            },

            buildContainer: {
                show: false,
                appName: '',
                containerName: '',
                cmd: '',
                pinned: false,
                namespace: '',
                imageName: '',
                podName: '',
                containerID: '',
            },
            bcRules: {
                containerName: [{required:true, message:'请选择容器'}],
                // cmd: [{required:true, message:'请输入命令'}],
            },

            buildImageStatus: {
                show: false,
            },
            preAddress: 'registry.local.w7.cc/',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getNodes();
    },
    components: {
        buildImage,
        selectContainer,
        buildImageStatus,
    },
    computed: {
        nodeIp(){
            return this.nodeList?.find?.(i=>i.name==this.node)?.internalIP || '';
        }
    },
    mounted(){
    },
    methods: {
        
        async exec(data){
            return panelApi.post(`/exec2`,{
                podName: data?.podName,
                containerName: data?.containerName,
                tty: false,
                namespace: this.namespaceActive,
                command: ['sh', '-c', data.command],
            },{responseType: 'text', loading:true, noAlert:true})
        },

        openBuildContainer(){
            this.buildContainer = {
                show: true,
                appName: '',
                containerName: '',
                cmd: '',
                pinned: false,
                namespace: '',
                imageName: '',
                podName: '',
                containerID: '',
            }
        },
        async handleSelectContainer(v){

            this.buildContainer.appName = v?.app || '';
            this.buildContainer.containerName = v?.container || '';
            this.buildContainer.imageName = '';
            this.buildContainer.namespace = '';
            this.buildContainer.podName = '';
            this.buildContainer.containerID = '';
            if(!v.app || !v.container){return;}

            let labelSelector = v.labels;
            // 获取pod名称
            try{
                let {podName,imageName,containerID,ip} = await k8sproxy.get("/k8s-proxy/api/v1/namespaces/" + this.namespaceActive + "/pods?labelSelector=" + labelSelector,{
                    loading: true,
                }).then(res=>{
                    let imageName = res?.data?.items?.[0]?.spec?.containers?.[0]?.image;
                    imageName = imageName.replace(/-\d{10}$/,'');
                    return {
                        podName: res?.data?.items?.[0]?.metadata?.name,
                        imageName: imageName,
                        containerID: res?.data?.items?.[0]?.status?.containerStatuses?.[0]?.containerID,
                        ip: res?.data?.items?.[0]?.status?.hostIP,
                    };
                }).catch(()=>{});
                
                await panelApi.get('/registry/server-info',{
                    params:{hostIp: ip},
                    loading: true,
                }).then(res=>{
                    this.bisServerInfo = {
                        agentUrl: res.data?.requestUrl || '',
                        registryDomain: res.data?.requestHost || '',
                    };
                })
                
                let image = imageName?.replace?.(/^([a-zA-Z0-9.-]+)(:\d+)?\//, '') || '';
                this.buildContainer.namespace = /^.+\/.+$/.test(image)? image.replace?.(/\/[^\/]*$/, '') : this.namespaceActive;
                this.buildContainer.imageName = image.replace?.(/^[^\/]*\//, '') + '-' + dayjs().unix();
                
                this.buildContainer.podName = podName;
                this.buildContainer.containerID = containerID;
                
                // console.table({podName,imageName,containerID})
            }catch{
                this.$message.error('未找到应用对应的pod');
                return;
            }
        },
        toBuildContainer(){
            this.$refs.bcForm.validate(async (err)=>{
                if(err){return;}

                if(!this.buildContainer.podName){
                    this.$message.error('未找到应用对应的pod');
                    return;
                }

                
                this.buildImageStatus = {
                    show: true,
                    data: this.buildContainer
                }

            });
        },

        openBuildImage(){
            k8sproxy.get(`/apis/buildimage.w7.cc/v1alpha1/namespaces/${this.namespaceActive}/buildimages?labelSelector=w7.cc/build-finish=true`).then(res=>{
                let list = res.data?.items || [];
            })
        },
        getNodes(){
            k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                let list = data.map(item=>{
                    return {
                        name: item.metadata.name,
                        internalIP: item.status?.addresses?.[0]?.address,
                    }
                })
                this.nodeList = list;
                if(this.nodeList.length){
                    this.node = this.nodeList[0].name;
                    this.getPid();
                }
            })
        },
        getPid(){
            let node = this.nodeList.find(i=>i.name==this.node);
            if(!node){return}
            let ip = node.internalIP;
            
            panelApi.get('/registry/server-info',{
                params:{hostIp: ip},
                loading: true,
            }).then(res=>{
                let url = res.data?.requestUrl || '';
                
                this.outEditorInfo = {
                    agentUrl: url,
                    registryDomain: res.data?.requestHost || '',
                };
                this.getList();
            })
        },
        getList(){
            axios.get(this.outEditorInfo.agentUrl.replace(/\/$/,'')+'/panel-api/v1/registry/patch/images/list',{
                loading: true,
            }).then(res=>{
                this.list = res.data.map(i=>{
                    i.created = dayjs(i.CreatedAt).format('YYYY-MM-DD HH:mm:ss');
                    i.isDefault = Boolean(i.Labels?.["io.cri.containerd.pinned"] && i.Labels?.["io.cattle.k3s.pinned"]);
                    return i;
                });
            })
        },
        deleteImage(row){
            axios.post(this.outEditorInfo.agentUrl+'/panel-api/v1/registry/patch/images/delete',{
                target: row.Name,
            },{
                loading: true,
            }).then(res=>{
                this.$message.success('删除成功');
                this.getList();
            })
        },
        setDefault(row){
            axios.post(this.outEditorInfo.agentUrl+'/panel-api/v1/registry/patch/images/label',{
                "name": row.Name,
                "labels": {"io.cri.containerd.pinned":row.isDefault?"":"pinned", "io.cattle.k3s.pinned": row.isDefault?"":"pinned"},
                "replace": true,
            },{
                loading: true,
            }).then(res=>{
                this.$message.success('设置成功');
                this.getList();
            })
        },
        openImport(){
            this.importDialog.show = true;
            this.importDialog.namespace = this.namespaceActive;
            this.importDialog.imageName = `build:${this.createName()}`;
            this.importDialog.filename = '';
            this.importDialog.pinned = false;
            this.upload.file = null;
            this.upload.filename = '';
            this.upload.noAlert = true;
            // 清空input
            this.$nextTick(()=>{
                this.$refs.importDialogFileInput.value = '';
            })
        },
        selectFile(event){
            let files = event.target.files;
            if(!files.length){return}
            this.upload.file = files[0];
            this.upload.filename = files[0].name.replace(/\s/g,'');
            this.importDialog.filename = files[0].name.replace(/\s/g,'');
        },
        async toImport(){
            this.$refs.importForm.validate(async (err)=>{
                if(err){return}
                
                useLoadingStore().loading = true;
                try{
                    const { handleFileUpload } = await import('@/views/app/pages/files.upload.js');
                    await handleFileUpload(this);

                    axios.post(this.outEditorInfo.agentUrl + '/panel-api/v1/registry/patch/images/import',{
                        name: this.preAddress + this.importDialog.namespace + '/' + this.importDialog.imageName,
                        path: this.partPath + this.upload.filename,
                    }).then(res=>{
                        let name = res.data.name;
                        if(this.importDialog.pinned){
                            return axios.post(this.outEditorInfo.agentUrl+'/panel-api/v1/registry/patch/images/label',{
                                "name": name,
                                "labels": {"io.cri.containerd.pinned":"pinned", "io.cattle.k3s.pinned":"pinned"},
                                "replace": true,
                            })
                        }else{
                            return Promise.resolve();
                        }
                    }).then(res=>{
                        useLoadingStore().loading = false;
                        this.$message.success('导入成功');
                        this.importDialog.show = false;
                        this.getList();
                    }).catch(()=>{
                        useLoadingStore().loading = false;
                    })
                }catch(err){
                    useLoadingStore().loading = false;
                    this.$message.error('导入失败');
                    console.log(err);
                }
            })
        },
        openChangeName(row){
            this.changeName.show = true;
            this.changeName.row = row;
            this.changeName.newName = row.Name;
        },
        toChangeName(){
            this.$refs.changeNameForm.validate(async (err)=>{
                if(err){return}
                axios.put(this.outEditorInfo.agentUrl + '/panel-api/v1/registry/patch/images/tag',{
                    source: this.changeName.row.Name,
                    target: this.changeName.newName,
                }).then(res=>{
                    this.$message.success('修改成功');
                    this.changeName.show = false;
                    this.getList();
                })
            })
        },
        createName(length){
            let len = length || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
    },
}
</script>

<style scoped>

.upload{position:relative;}
.upload input[type='file']{min-width:0; position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; opacity:0; cursor:pointer;}

.default-text{opacity:0;}
/* 悬停显示文字 */
.nodeimagelisttable :deep(tr:hover) .default-text,
.nodeimagelisttable :deep(.arco-table-tr:hover) .default-text {
    opacity:1;
}
</style>
