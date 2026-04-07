<template>
    <div class="padding-20" style="height:calc(100vh - 60px); overflow:auto;">
        <div class="bg-white padding-20">
            <div class="df ai-c ">
                <div class="df ai-c">
                    <span class="df-s0">选择节点：</span>
                    <a-select v-model="node" @change="getPid" placeholder="请选择节点" style="width:300px;">
                        <a-option v-for="item in nodeList" :key="item.name" :value="item.name">{{item.name}}</a-option>
                    </a-select>
                </div>

                <a-button type="primary" class="ml-20" @click="openImport">导入镜像</a-button>
            </div>
            
            <a-table :data="list" :pagination="false" class="mt-20 nodeimagelisttable" :bordered="false">
                <template #columns>
                         
                    <a-table-column title="名称" :width="420">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <span>{{record.Name}}</span>
                                <a-tooltip content="修改名称">
                                    <icon-edit class="c-blue fs-16 ml-6 cursor df-s0" @click="openChangeName(record)"></icon-edit>
                                </a-tooltip>
                                <a-tooltip :content="record.isDefault?'取消默认':'设置为默认'">
                                    <icon-bookmark class="fs-16 ml-6 df-s0 cursor" @click="setDefault(record)" :class="{'c-orange':record.isDefault,'c-99':!record.isDefault}" />
                                </a-tooltip>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="标签">
                        <template #cell="{ record }">
                            <div>
                                <div v-for="(value,key) in record.Labels">{{ key + ':' + value }}</div>
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

        <a-modal :visible="importDialog.show" title="导入镜像" @ok="toImport" @cancel="importDialog.show=false" >
            <a-form ref="importForm" :rules="rules" :model="importDialog" auto-label-width >
                <a-form-item label="镜像名称" field="imageName">
                    <a-input v-model="importDialog.imageName" placeholder="请输入镜像名称" />
                </a-form-item>
                <a-form-item label="选择文件" field="filename">
                    <div class="upload">
                        <span v-if="importDialog.filename" class="c-blue">{{importDialog.filename}}</span>
                        <a-button v-else type="primary">导入镜像</a-button>
                        <input ref="importDialogFileInput" type="file" accept=".tar" @change="selectFile" />
                    </div>
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
    </div>
</template>

<script>
import { useLoadingStore, useNamespaceStore } from '@/store';
import { k8sproxy, panelApi } from '@/utils/api';
import axios from 'axios';
import dayjs from 'dayjs';

export default {
    data(){
        return {
            namespaceActive: 'default',
            nodeList: [],
            node: '',
            list: [],
            
            // 上传
            outEditorInfo: {},
            upload: {},
            partPath: '/tmp/',
            form: {},
            importDialog: {
                show: false,
                imageName: '',
                filename: '',
            },
            rules: {
                imageName: [{required:true, message:'请输入镜像名称'}],
                filename: [{required:true, message:'请选择文件'}],
                newName: [{required:true, message:'请输入名称'}],
            },

            changeName: {
                show: false,
                row: null,
                newName: '',
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getNodes();
    },
    mounted(){
    },
    methods: {
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
            panelApi.get('/pid',{
                params:{
                    namespace: this.namespaceActive,
                    HostIp: ip,
                },
                loading: true,
            }).then(res=>{
                this.form.pid = res.data.pid;
                this.form.subPid = res.data.subPid;
                this.outEditorInfo = {agentUrl: res.data.agentUrl};
                this.getList();
            })
        },
        getList(){
            axios.get(this.outEditorInfo.agentUrl+'/panel-api/v1/registry/patch/images/list',{
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
            this.importDialog.imageName = 'ccr.ccs.tencentyun.com/afan-public/nginx:latest';
            this.importDialog.filename = '';
            this.upload.file = null;
            this.upload.filename = '';
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
                        name: this.importDialog.imageName,
                        path: this.partPath + this.upload.filename,
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
