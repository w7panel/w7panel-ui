<template>
    <a-drawer :visible="visible" :width="800" @ok="submit" @cancel="closeDrawer()" :popup-container="$popupContainer">
        <template #title>新建</template>
        <a-form :model="form" ref="zoneform" class="padding-20" auto-label-width>
            <a-form-item label="" style="margin-bottom:10px;">
                <a-radio-group v-model="form.type">
                    <a-radio value="normal">存储设备</a-radio>
                    <a-radio value="nfs">nfs</a-radio>
                </a-radio-group>
            </a-form-item>
            <div v-if="form.type=='nfs'">
                <a-form-item label="path" field="path" :rules="[{required:true,message:'请输入path'}]">
                    <a-input v-model="form.path" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="server" field="server" :rules="[{required:true,message:'请输入server'}]">
                    <a-input v-model="form.server" placeholder="请输入"></a-input>
                </a-form-item>
            </div>
            <a-form-item v-if="form.type=='normal'" label="存储设备" field="disk" :rules="[{required:true,message:'请输入名称'}]">
                <a-select v-model="form.disk" @change="diskCont[form.disk]?(form.replicas=diskCont[form.disk]):''" placeholder="请选择" >
                    <a-option v-for="item in diskTags" :key="item" :value="item">{{item}}</a-option>
                </a-select>
            </a-form-item>
            <a-form-item label="名称" field="name" :rules="[{required:true,message:'请输入名称'}]">
                <a-input v-model="form.name" placeholder="请输入名称" />
            </a-form-item>
            <a-form-item label="大小">
                <a-input-number v-model="form.size" placeholder="请输入大小">
                    <template #append>Gi</template>
                </a-input-number>
            </a-form-item>
            <a-form-item label="访问模式">
                <a-select v-model="form.accessMode" placeholder="请选择访问模式">
                    <a-option value="ReadWriteOnce">ReadWriteOnce</a-option>
                    <a-option value="ReadWriteMany">ReadWriteMany</a-option>
                </a-select>
            </a-form-item>
        </a-form>
        <template #footer>
            <!-- <div v-if="availableResource && availableResource.storage && userMode=='cluster'" class="df df-c ai-e">
                <div class="c-red">存储剩余：{{availableResource.storage.value + availableResource.storage.unit}} / {{availableResource.hard}}</div>
                <div class="mt-10">
                    <a-alert v-if="availableResourcePassed" type="success">检测通过，可正常创建！</a-alert>
                    <a-alert v-else type="error">检测失败，剩余存储不足，无法创建！</a-alert>
                </div>
            </div> -->

            <div class="mt-16">
                <a-button @click="closeDrawer">取消</a-button>
                <a-button class="ml-20" type="primary" @click="submit">确定</a-button>
            </div>
        </template>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from "axios";
import { useNamespaceStore } from '@/store';
import { getUserInfo } from '@/utils/auth';

export default {
    props: ['show','availableResource'],
    data(){
        return {
            namespaceActive: "",
            visible: false,
            form: {
                type: 'normal',
            },
            pvpvc: {},
            disks: [],
            diskTags: [],
            diskCont: {},

            lvc: null,

            userInfo: {},
            clusterMode: '',
            userMode: '',
        }
    },
    watch: {
        show(val){
            this.visible = val;
            val && this.init();
        },
    },
    created(){
        this.userInfo = getUserInfo(); 
        this.clusterMode = this.userInfo?.['k3k.io/cluster-mode'];
        this.userMode = this.userInfo?.['w7.cc/user-mode'];
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    computed:{
        // availableResourcePassed(){
        //     let size = (this.form.size || '0') + 'Gi';
        //     let available = (this.availableResource?.storage?.value || '0') + (this.availableResource?.storage?.unit || '');
        //     return this.minusMemory(available, size)?.value >= 0;
        // }
    },
    methods: {
        closeDrawer(v){
            this.visible = false;
            this.$emit('close',v);
        },
        init(){
            this.form = {
                type: 'normal',
                show: true,
                name: this.createName(),
                size: 1,
                replicas: 1,
                frontend: 'blockdev',
                dataEngine: 'v1', // 数据引擎
                dataLocality: 'disabled', // 'best-effort', // 数据本地化
                accessMode: 'ReadWriteOnce', //访问模式
                backingImage: '', // 备份镜像
                encrypted: false, // 加密
                disk: '',
            }
            if(!this.disks?.length){
                this.getDisks();
            }
        },
        getDisks(){
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.map(item=>{
                    return item.metadata.name;
                })
                list = list.filter(i=>i!='longhorn'&&i!='longhorn-static')
                this.diskTags = list;
            });
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
        
        async pushConfigmap(newName){
            try{
                let {data} = await k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{noAlert:true,loading:true});
                this.lvc = data;
            }catch{}
            if(this.lvc){
                let arr = this.lvc.data?.customs?.split(',') || [];
                arr.push(newName);
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{
                    data:{customs:arr.join(',')}
                },{
                    headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                });
            }else{
                k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{
                    kind: 'ConfigMap',
                    apiVersion: 'v1',
                    metadata: {
                        name: 'longhorn-volumes-config',
                        namespace: this.namespaceActive,
                    },
                    data: {
                        customs: newName,
                    }
                })
            }
        },
        submit(){
            let data = {
                name: this.form.name,
                size: String(parseInt(this.form.size * 1024 * 1024 * 1024)),
            }
            
            this.$refs.zoneform.validate((err) => {
                if (err) {
                    this.$refs.zoneform.scrollToField(Object.keys(err)[0])
                    return;
                }
                // if(this.userMode=='cluster'){
                //     let availableSize = '';
                //     if(this.availableResource?.storage){
                //         availableSize = this.availableResource.storage.value + this.availableResource.storage.unit;
                //     }
                //     if(availableSize){
                //         let size = this.form.size + 'Gi';
                //         let minus = this.minusMemory(availableSize, size);
                //         if(minus.value<0){
                //             this.$message.error("剩余存储不足");
                //             return;
                //         }
                //     }
                // }
                
                let template = {
                    "kind": "PersistentVolumeClaim",
                    "apiVersion": "v1",
                    "metadata": {
                        "name": data.name,
                        // "namespace": this.namespaceActive,
                        "labels": {
                            "w7.cc/pvc-type": this.form.type,
                        },
                        "annotations":{
                            ...(this.form.type=='nfs'?{
                                path: this.form.path,
                                server: this.form.server,
                            }:{})
                        }
                    },
                    "spec": {
                        "accessModes": [
                            this.form.accessMode,
                        ],
                        "resources": {
                            "requests": {
                                "storage": data.size,
                            }
                        },
                        "storageClassName":  this.form.type=='nfs'? 'manual' : this.form.disk,
                    }
                }
                
                let persistentvolumes = {};
                if(this.form.type=='nfs'){
                    persistentvolumes = {
                        apiVersion: 'v1',
                        kind: 'PersistentVolume',
                        metadata: {
                            name: data.name,
                            namespace: this.namespaceActive,
                        },
                        spec: {
                            storageClassName: 'manual',
                            "accessModes": [
                                this.form.accessMode,
                            ],
                            capacity:{
                                storage: data.size
                            },
                            persistentVolumeReclaimPolicy: 'Retain',
                            nfs: {
                                path: this.form.path,
                                server: this.form.server,
                            }
                        }
                    }
                }
                
                k8sproxy.post('/api/v1/namespaces/'+this.namespaceActive+'/persistentvolumeclaims', template).then(res=>{
                    if(this.form.type=='nfs'){
                        return k8sproxy.post('/api/v1/persistentvolumes', persistentvolumes)
                    }else{
                        return Promise.resolve();
                    }
                }).then(res=>{
                    this.pushConfigmap(data.name);
                    this.$message.success('创建成功');
                    this.pvpvc.show = false;
                    this.closeDrawer(true);
                })

            });
        },
        minusMemory(a,b){
            if(!a){a = '0'}
            if(!b){b = '0'}
            if(/Ti$/.test(a)){ a = parseInt(a.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(a)){ a = parseInt(a.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(a)){ a = Number(a.replace(/Mi$/,'')) }
            if(/Ti$/.test(b)){ b = parseInt(b.replace(/Ti$/,'') * 1024 * 1024); }
            if(/Gi$/.test(b)){ b = parseInt(b.replace(/Gi$/,'') * 1024); }
            if(/Mi$/.test(b)){ b = Number(b.replace(/Mi$/,'')) }
            let value = Number(a) - Number(b);
            let unit = 'Mi';
            if(value > 0 && value % 1024 == 0){
                value = value / 1024;
                unit = 'Gi';
            }
            return {value, unit}
        },
    }

}
</script>

<style>

</style>