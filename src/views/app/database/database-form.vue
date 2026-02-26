<template>
    <a-drawer :width="900" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose :popup-container="false?'#allmodalbox':'body'">
        <template #title>数据库应用</template>
        <div class="padding-10">
            <a-form ref="form" :model="form" :rules="rules" validate-trigger="blur" auto-label-width>
                <a-form-item label="类型" style="margin-bottom:12px;" field="type">
                    <a-radio-group v-model="form.type" @change="form.version=''">
                        <a-space wrap v-for="item in dbTypes" :key="item">
                            <a-radio :value="item">
                                <template #radio="{ checked }">
                                    <div class="custom-radio-card" :class="{ 'custom-radio-card-checked': checked }">
                                        <div className="custom-radio-card-title">{{ item }}</div>
                                    </div>
                                </template>
                            </a-radio>
                        </a-space>
                    </a-radio-group>
                </a-form-item>
                <a-form-item label="版本" field="version">
                    <a-select v-model="form.version" placeholder="请选择版本" style="width:500px;" size="large">
                        <a-option v-for="item in versions[form.type]" :key="item" :label="item" :value="item"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" size="large" placeholder="请输入名称" style="width:500px;"></a-input>
                </a-form-item>
                <a-form-item label="CPU" field="cpu">
                    <a-input v-model="form.cpu" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>核</template>
                    </a-input>
                </a-form-item>
                <a-form-item label="内存" field="memory">
                    <a-input v-model="form.memory" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>G</template>
                    </a-input>
                </a-form-item>
                <a-form-item label="实例数" field="replicas">
                    <a-input v-model="form.replicas" type="number" size="large" placeholder="请输入" style="width:500px;"></a-input>
                </a-form-item>
                <a-form-item label="磁盘" field="storage">
                    <a-input v-model="form.storage" type="number" size="large" placeholder="请输入" style="width:300px;">
                        <template #append>Gi</template>
                    </a-input>
                    <a-select v-model="form.storageClass" size="large" style="width:300px;margin-left:20px;">
                        <a-option v-for="item in storages" :key="item.name" :label="item.name" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store'
let templateData = {
    "apiVersion": "apps.kubeblocks.io/v1alpha1",
    "kind": "Cluster",
    "metadata": {
        "name": "",
        "namespace": "",
    },
    "spec": {
        "clusterDefinitionRef": "postgresql",
        "clusterVersionRef": "postgresql-14.8.0",
        "terminationPolicy": "Delete",
        "componentSpecs": [
            {
                "componentDefRef": "postgresql",
                "monitor": true,
                "name": "postgresql",
                "replicas": 1,
                "resources": {
                    "requests": {
                        "cpu": "1000m",
                        "memory": "1024Mi"
                    },
                    "limits": {
                        "cpu": "1000m",
                        "memory": "1024Mi"
                    },
                },
                "serviceAccountName": "w7panel",
                "switchPolicy": { "type": "Noop" },
                "volumeClaimTemplates": [
                    {
                        "name": "data",
                        "spec": {
                            "accessModes": [ "ReadWriteOnce" ],
                            "resources": {
                                "requests": {
                                    "storage": "1Gi"
                                }
                            },
                            "storageClassName": "default-volume"
                        }
                    }
                ]
            }
        ],
    },
}

export default {
    props: ['show'],
    data(){
        return {
            namespaceActive: '',
            visible: false,
            form: {},
            dbTypes: [],
            versions: {},
            storages: [],
            rules: {
                type: [{ required: true, message: '请输入类型', trigger: 'blur' }],
                version: [{ required: true, message: '请选择版本', trigger: 'blur' }],
                title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                cpu: [{ required: true, message: '请输入CPU核数', trigger: 'blur' }],
                memory: [{ required: true, message: '请输入内存大小', trigger: 'blur' }],
                replicas: [{ required: true, message: '请输入实例数', trigger: 'blur' }],
                storage: [{ required: true, message: '请输入磁盘大小', trigger: 'blur' }],
            },
        }
    },
    watch: {
        show(v){
            this.visible = v;
            v && this.init();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getDbTypes();
        this.getStorage();
    },
    methods:{
        init(){
            this.form = {
                type: this.dbTypes?.[0] || '',
                version: '',
                title: '',
                cpu: 0,
                memory: 0,
                replicas: 1,
                storage: 0,
                storageClass: this.storages?.[0]?.name || '',
            }
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0]);
                    return;
                }
                let data = JSON.parse(JSON.stringify(templateData));
                data.metadata.name = this.form.title;
                data.metadata.namespace = this.namespaceActive;
                data.spec.clusterDefinitionRef = this.form.type;
                data.spec.clusterVersionRef = this.form.version;
                data.spec.componentSpecs[0].componentDefRef = this.form.type;
                data.spec.componentSpecs[0].name = this.form.type;
                data.spec.componentSpecs[0].replicas = Number(this.form.replicas);
                data.spec.componentSpecs[0].resources.requests.cpu = (this.form.cpu * 1000) + 'm';
                data.spec.componentSpecs[0].resources.requests.memory = (this.form.memory * 1024) + 'Mi';
                data.spec.componentSpecs[0].resources.limits.cpu = (this.form.cpu * 1000) + 'm';
                data.spec.componentSpecs[0].resources.limits.memory = (this.form.memory * 1024) + 'Mi';
                data.spec.componentSpecs[0].volumeClaimTemplates[0].spec.resources.requests.storage  = this.form.storage + 'Gi';
                data.spec.componentSpecs[0].volumeClaimTemplates[0].spec.storageClassName  = this.form.storageClass;

                k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/clusters',data).then(res=>{
                    this.$message.success('操作成功');
                    this.closeDrawer(true);
                });
            });
        },
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        },
        getDbTypes(){
            k8sproxy.get('/apis/apps.kubeblocks.io/v1alpha1/clusterdefinitions').then(res=>{
                let list = res?.data?.items || [];
                this.dbTypes = list.map(i=>i.metadata.name);
                this.form.type = this.dbTypes?.[0];
                return list
            }).then(async list=>{
                for(let i in list){
                    let name = list[i]?.metadata?.name;
                    if(!name){continue}
                    let {data} = await k8sproxy.get('/apis/apps.kubeblocks.io/v1alpha1/clusterversions?labelSelector=app.kubernetes.io/name='+name);
                    let items = data?.items || [];
                    this.versions[name] = items.map(i=>i.metadata?.name);
                }
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
        getStorage(){
            // k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims').then(res=>{
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                // list = list.filter(i=>!i.metadata.deletionTimestamp).map(item=>{
                //     item.created_at = window.formatDate(item.metadata.creationTimestamp);
                //     return {
                //         title: item?.metadata?.annotations?.title,
                //         name: item?.metadata?.name,
                //         size: item?.spec?.resources?.requests?.storage,
                //         storage_class: item?.spec?.storageClassName,
                //         created_at: item.created_at,
                //         creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                //     };
                // })
                // list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                list = list.map(i=>({
                    name: i.metadata.name,
                }))
                this.storages = list;
                this.form.storageClass = list?.[0]?.name;
            })
        },
    },
}
</script>

<style scoped>
.custom-radio-card {
  padding: 10px 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  /* width: 250px; */
  box-sizing: border-box;
}


.custom-radio-card-title {
  color: var(--color-text-1);
  font-size: 14px;
  /* font-weight: bold; */
  /* margin-bottom: 8px; */
}

.custom-radio-card:hover,
.custom-radio-card-checked{
  border-color: rgb(var(--primary-6));
}

.custom-radio-card-checked {
  background-color: var(--color-primary-light-1);
}

.custom-radio-card:hover .custom-radio-card-title,
.custom-radio-card-checked .custom-radio-card-title {
  color: rgb(var(--primary-6));
}

</style>