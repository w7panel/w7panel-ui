<template>
    <div>
        <a-form-item v-if="!readonly" label="数据卷">
            <table class="com-table ftable"><tbody>
                <tr class="thead" >
                    <td>名称</td>
                    <td>类型</td>
                    <td>值</td>
                    <td>操作</td>
                </tr>

                <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" @click="addItem">
                    <div class="df ai-c jc-c">
                        <icon-plus :size="14" class="c-99" />
                        <span class="c-99 lh-1" style="margin-left:6px;">添加数据卷</span>
                    </div>
                </td></tr>
                <tr v-for="(item,index) in list" :key="index" style="background:var(--color-neutral-1);">
                    <td>{{ item.name }}</td>
                    <td>{{ types[item.type] }}</td>
                    <td>
                        <span v-if="item.type=='pvc'">PVC：{{ item.pvcName }}</span>
                        <span v-if="item.type=='configmap'">{{ item.configmapName }}{{ item.configmapAllKey?'':' 指定部分key' }}</span>
                        <span v-if="item.type=='nfs'">NFS路径：{{ item.nfsPathServer }}</span>
                        <span v-if="item.type=='secret'">{{ item.secretName }}{{ item.secretAllKey?'':' 指定部分key' }}</span>
                        <span v-if="item.type=='hostPath'">主机路径：{{ item.hostPathPath }}，检查类型：{{ item.hostPathType }}</span>
                    </td>
                    <td>
                        <span v-if="item.type!='pvcTemplate'" class="c-blue cursor" @click="editItem(index);">修改</span>
                        <span v-if="item.type!='pvcTemplate'" class="c-blue cursor ml-10" @click="list.splice(index,1);submit();">删除</span>
                    </td>
                </tr>
            </tbody></table>
        </a-form-item>
        
        <table v-if="readonly" class="com-table ftable" style="width:100%;"><tbody>
            <tr class="thead" >
                <td>名称</td>
                <td>类型</td>
                <td>值</td>
            </tr>
            <tr v-for="(item,index) in list" :key="index" style="background:var(--color-neutral-1);">
                <td>{{ item.name }}</td>
                <td>{{ types[item.type] }}</td>
                <td>
                    <span v-if="item.type=='pvc'">PVC：{{ item.pvcName }}</span>
                    <span v-if="item.type=='configmap'">{{ item.configmapName }}{{ item.configmapAllKey?'':' 指定部分key' }}</span>
                    <span v-if="item.type=='nfs'">NFS路径：{{ item.nfsPathServer }}</span>
                    <span v-if="item.type=='secret'">{{ item.secretName }}{{ item.secretAllKey?'':' 指定部分key' }}</span>
                    <span v-if="item.type=='hostPath'">主机路径：{{ item.hostPathPath }}，检查类型：{{ item.hostPathType }}</span>
                </td>
            </tr>
        </tbody></table>

        <a-drawer width="800px" v-model:visible="edit.show" @ok="submitEdit" @cancel="edit.show=false;">
            <template #title>修改数据卷</template>
            <a-form :model="edit" auto-label-width="">
                <a-form-item label="数据卷类型">
                    <a-select v-model="edit.type" placeholder="请选择" @change="changeEditType">
                        <a-option label="使用NFS盘" value="nfs"></a-option>
                        <a-option label="使用临时目录" value="emptyDir"></a-option>
                        <a-option label="使用主机目录" value="hostPath"></a-option>
                        <a-option label="使用已有PVC" value="pvc"></a-option>
                        <a-option v-if="appKind=='statefulsets'" label="创建动态PVC" value="pvcTemplate" :disabled="Boolean(id)"></a-option>
                        <a-option v-if="!isPlugin" label="使用ConfigMap" value="configmap"></a-option>
                        <a-option v-if="!isPlugin" label="使用Secret" value="secret"></a-option>
                    </a-select>
                </a-form-item>
            
                <a-form-item label="数据卷名称">
                    <a-input v-model="edit.name" placeholder="请输入名称"></a-input>
                </a-form-item>

                <template v-if="edit.type=='nfs'">
                    <a-form-item label="NFS路径">
                        <a-input v-model="edit.nfsPathServer" placeholder="如：127.0.0.1:/dir"></a-input>
                    </a-form-item>
                </template>
                <template v-if="edit.type=='hostPath'">
                    <a-form-item label="主机路径">
                        <a-input v-model="edit.hostPathPath" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="检查类型">
                        <a-select v-model="edit.hostPathType" placeholder="请选择">
                            <a-option label="DirectoryOrCreate" value="DirectoryOrCreate"></a-option>
                            <a-option label="Directory" value="Directory"></a-option>
                            <a-option label="FileOrCreate" value="FileOrCreate"></a-option>
                            <a-option label="File" value="File"></a-option>
                            <a-option label="Socket" value="Socket"></a-option>
                        </a-select>
                    </a-form-item>
                </template>
                <template v-if="edit.type=='pvc' && !isTemplate">
                    <a-form-item label="PVC">
                        <a-select v-model="edit.pvcName" placeholder="请选择">
                            <a-option v-for="(item,index) in pvcs.filter(i=>filterPvc?i.isCustom:i)" :key="index" :label="item.name" :value="item.name"></a-option>
                        </a-select>
                        <a-checkbox v-model="filterPvc" class="ml-20"><span style="text-wrap:nowrap;">存储分区</span></a-checkbox>
                    </a-form-item>
                </template>
                <template v-if="edit.type=='pvcTemplate'">
                    <a-form-item v-if="!isTemplate" label="存储">
                        <a-select v-model="edit.ptStorage" placeholder="请选择存储">
                            <a-option v-for="item in diskTags" :key="item" :label="item" :value="item"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="存储大小">
                        <a-input v-model="edit.ptStorageSize" type="number" placeholder="请输入">
                            <template #append>Gi</template>
                        </a-input>
                    </a-form-item>
                    <a-form-item label="多写">
                        <a-switch v-model="edit.ptAccessModes" checked-value="ReadWriteMany" unchecked-value="ReadWriteOnce"></a-switch>
                    </a-form-item>
                </template>
                <template v-if="edit.type=='configmap'">
                    <a-form-item label="选择ConfigMap">
                        <a-select v-model="edit.configmapName" :options="configmaps" placeholder="请选择" @change="edit.configmapKey = [];">
                            <!-- <a-option v-for="(item,index) in configmaps" :key="index" :label="item" :value="item"></a-option> -->
                            <template #option="{data}">
                                <div class="df ai-c jc-b">
                                    <span :class="{'lh-1':data.value}" style="white-space: pre-wrap; word-break: break-all;">{{ data.label }}</span>
                                    <span>
                                        <span v-if="data.value" class="df-s0 ml-10 c-blue cursor"  @click.stop="cfgEdit={show:true,id:data.value,type:'configmap'}">编辑</span>
                                        <a-popconfirm v-if="data.value" content="确定要删除吗" @ok="deleteConfigmap(data.value);(edit.configmapName==data.value) && (edit.configmapName='');" position="lt">
                                            <span class="df-s0 ml-10 c-blue cursor" @click.stop>删除</span>
                                        </a-popconfirm>
                                    </span>
                                </div>
                            </template>
                        </a-select>
                        <span class="ml-20 cursor c-blue" @click="cfgEdit={show:true,id:'',type:'configmap'}" style="text-wrap:nowrap;">新建</span>
                    </a-form-item>
                    <a-form-item label="选项">
                        <div class="df df-c mt-6" style="flex:1;">
                            <a-radio-group v-model="edit.configmapAllKey">
                                <a-radio :value="true">全部</a-radio>
                                <a-radio :value="false">指定部分Key</a-radio>
                            </a-radio-group>
                            <div v-if="!edit.configmapAllKey" class="mt-10" style="width:100%;">
                                <table class="keys-table" style="width:100%;"><tbody>
                                    <tr v-for="(item,index) in edit.configmapKey" :key="index">
                                        <td>
                                            <a-select v-model="item.key" placeholder="请选择">
                                                <a-option v-for="(key,kid) in (configmapKeys[edit.configmapName] || [])" :key="kid" :label="key" :value="key"></a-option>
                                            </a-select>
                                        </td>
                                        <td><a-input v-model="item.path" placeholder="文件名"></a-input></td>
                                        <td><a-input v-model="item.mode" placeholder="文件权限：如0644"></a-input></td>
                                        <td><icon-close class="cursor ml-10" @click="edit.configmapKey.splice(index,1);" /></td>
                                    </tr>
                                    <tr>
                                        <td colspan="4" @click="edit.configmapKey.push({key:'',path:'',mode:'0644'})">
                                            <a-button long>添加Item</a-button>
                                        </td>
                                    </tr>
                                </tbody></table>
                                <span class="mt-10 fs-12 c-99">向特定路径挂载，如挂载点是 /data/config，文件名是filename，最终该键值对的值会存储在/data/config/filename下</span>
                            </div>
                        </div>
                    </a-form-item>
                </template>
                <template v-if="edit.type=='secret'">
                    <a-form-item label="选择Secret">
                        <a-select v-model="edit.secretName" :options="secrets" placeholder="请选择" @change="edit.secretKey = [];">
                            <!-- <a-option v-for="(item,index) in secrets" :key="index" :label="item" :value="item"></a-option> -->
                            <template #option="{data}">
                                <div class="df ai-c jc-b">
                                    <span :class="{'lh-1':data.value}" style="white-space: pre-wrap; word-break: break-all;">{{ data.label }}</span>
                                    <span>
                                        <span v-if="data.value" class="df-s0 ml-10 c-blue cursor"  @click.stop="cfgEdit={show:true,id:data.value,type:'secret'}">编辑</span>
                                        <a-popconfirm v-if="data.value" content="确定要删除吗" @ok="deleteSecret(data.value);(edit.secretName==data.value) && (edit.secretName='');" position="lt">
                                            <span class="df-s0 ml-10 c-blue cursor" @click.stop>删除</span>
                                        </a-popconfirm>
                                    </span>
                                </div>
                            </template>
                        </a-select>
                        <span class="ml-20 cursor c-blue" @click="cfgEdit={show:true,id:'',type:'secret'}" style="text-wrap:nowrap;">新建</span>
                    </a-form-item>
                    <a-form-item label="选项">
                        <div class="df df-c mt-6" style="flex:1;">
                            <a-radio-group v-model="edit.secretAllKey">
                                <a-radio :value="true">全部</a-radio>
                                <a-radio :value="false">指定部分Key</a-radio>
                            </a-radio-group>
                            <div v-if="!edit.secretAllKey" class="mt-10" style="width:100%;">
                                <table class="keys-table" style="width:100%;"><tbody>
                                    <tr v-for="(item,index) in edit.secretKey" :key="index">
                                        <td>
                                            <a-select v-model="item.key" placeholder="请选择">
                                                <a-option v-for="(key,kid) in (secretKeys[edit.secretName] || [])" :key="kid" :label="key" :value="key"></a-option>
                                            </a-select>
                                        </td>
                                        <td><a-input v-model="item.path" placeholder="文件名"></a-input></td>
                                        <td><a-input v-model="item.mode" placeholder="文件权限：如0644"></a-input></td>
                                        <td><icon-close class="cursor ml-10" @click="edit.secretKey.splice(index,1);" /></td>
                                    </tr>
                                    <tr>
                                        <td colspan="4" @click="edit.secretKey.push({key:'',path:'',mode:'0644'})">
                                            <a-button long>添加Item</a-button>
                                        </td>
                                    </tr>
                                </tbody></table>
                                <span class="mt-10 fs-12 c-99">向特定路径挂载，如挂载点是 /data/config，文件名是filename，最终该键值对的值会存储在/data/config/filename下</span>
                            </div>
                        </div>
                    </a-form-item>
                </template>
            </a-form>
        </a-drawer>

        <configmap-editor
            :show="cfgEdit.show"
            :id="cfgEdit.id"
            :type="cfgEdit.type"
            @close="cfgEdit.show=false;"
            @submit="()=>{cfgEdit.type=='configmap'?getConfigMaps():getSecrets()}"
        ></configmap-editor>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';
import configmapEditor from '@/views/config/configmap/form-drawer.vue'
import { getToken } from '@/utils/auth';

export default{
    props: ['data','kind','readonly','isPlugin','isTemplate'],
    data(){
        return {
            namespaceActive: 'default',
            types: {
                nfs: '使用NFS盘',
                emptyDir: '使用临时目录',
                pvc: '使用已有PVC',
                configmap: '使用ConfigMap',
                secret: '使用Secret',
                hostPath: '使用主机目录',
                pvcTemplate: '创建动态PVC',
            },
            list: [],
            edit: {},
            appKind: '',

            pvcs: [],
            configmaps: [],
            configmapKeys: {},
            secrets: [],
            secretKeys: {},
            diskTags: [],

            // 编辑configmap
            cfgEdit: {
                show: false,
                id: '',
                type: 'configmap',
            },
            filterPvc: false,
            token: '',
        }
    },
    created(){
        if(window.__POWERED_BY_WUJIE__ && window?.$wujie?.props?.paneltoken){
            this.token = window.$wujie.props.paneltoken;
        }else{
            this.token = getToken();
        }
        this.namespaceActive = useNamespaceStore().namespace;
        this.appKind = this.kind;
        this.init();
    },
    watch: {
        kind(v){this.appKind = v || this.appKind},
        data: 'init',
    },
    components: {
        configmapEditor,
    },
    methods: {
        init(){
            let kind = this.data?.kind;
            kind = kind? kind.toLowerCase() + 's' : '';
            if(!this.kind){this.appKind = kind; }
            let volumes = this.data?.spec?.template?.spec?.volumes || [];
            let volumeClaimTemplates = this.data?.spec?.template?.spec?.volumeClaimTemplates || [];

            this.list = this.dataToForm({volumes,volumeClaimTemplates});
            this.submit();
        },
        addItemFromOut(addVolumes){
            
            let volumes = this.data?.spec?.template?.spec?.volumes || [];
            volumes = volumes.concat(addVolumes);
            let volumeClaimTemplates = this.data?.spec?.template?.spec?.volumeClaimTemplates || [];

            this.list = this.dataToForm({volumes,volumeClaimTemplates});
            this.submit();
        },
        dataToForm({volumes=[], volumeClaimTemplates=[]}){ 
            
            let vt = volumeClaimTemplates.map(i=>{
                return {
                    name: i.metadata.name,
                    ptAccessModes: i?.spec?.accessModes?.[0] || 'ReadWriteOnce',
                    ptStorageSize: i?.spec?.resources?.requests?.storage?.replace?.('Gi',''),
                    ptStorage: i?.spec?.storageClassName,
                    type: 'pvcTemplate',
                }
            })
            
            let arr = volumes.map(i=>{
                let type = '';
                let nfsPathServer = '';
                let pvcName = '';
                let configmapName = '', configmapAllKey = true, configmapKey = [];
                let secretName =  '', secretAllKey = true, secretKey = [];
                let hostPathType = '', hostPathPath = '';

                if(i.emptyDir){ type = 'emptyDir'; }
                if(i.hostPath){
                    type = 'hostPath';
                    hostPathType = i.hostPath?.type;
                    hostPathPath = i.hostPath?.path;
                }
                if(i.persistentVolumeClaim){
                    type = 'pvc';
                    pvcName = i.persistentVolumeClaim?.claimName || '';
                }
                if(i.nfs){
                    type = 'nfs';
                    nfsPathServer = i.nfs?.server || '';
                    nfsPathServer = nfsPathServer? nfsPathServer + ':' : '';
                    nfsPathServer = nfsPathServer + (i.nfs?.path || '');
                }
                if(i.configMap){
                    type = 'configmap';
                    configmapName = i.configMap?.name || '';
                    configmapAllKey = !i.configMap?.items?.length;
                    if(!configmapAllKey){
                        configmapKey = i.configMap.items || [];
                        configmapKey = configmapKey.map(i=>{
                            i.mode = i.mode?.toString?.(8);
                            return i;
                        })
                    }
                }
                if(i.secret){
                    type = 'secret';
                    secretName = i.secret?.name || '';
                    secretAllKey = !i.secret?.items?.length;
                    if(!secretAllKey){
                        secretKey = i.secret.items || [];
                        secretKey = secretKey.map(i=>{
                            i.mode = i.mode?.toString?.(8);
                            return i;
                        })
                    }
                }
                return {
                    name: i.name,
                    type,
                    nfsPathServer,
                    pvcName,
                    configmapName,
                    configmapAllKey,
                    configmapKey,
                    secretName,
                    secretAllKey,
                    secretKey,
                    hostPathType,
                    hostPathPath,
                }
            })
            return vt.concat(arr);
        },
        getDisks(){
            if(this.isTemplate){return}
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses',{
                customToken: this.token,
            }).then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.map(item=>{
                    return item.metadata.name;
                })
                list = list.filter(i=>i!='longhorn'&&i!='longhorn-static')
                this.diskTags = list;
            });
        },
        submit(){
            let volumes = [];
            let volumeClaimTemplates = [];
            this.list.map(i=>{
                let o = {name: i.name};
                if(i.type=='emptyDir'){}
                if(i.type=='hostPath'){
                    o.hostPath = {
                        path: i.hostPathPath,
                        type: i.hostPathType,
                    }
                }
                if(i.type=='nsfs'){
                    let match = i.nfsPathServer.match(/^(.+):(.+)$/);
                    o.nfs = {
                        path: match?.[1] || '',
                        server: match?.[2] || '',
                    }
                }
                if(i.type=='pvc'){ o.persistentVolumeClaim = {claimName:i.pvcName}; }
                if(i.type=='configmap'){
                    o.configMap = {
                        defaultMode: 420,
                        name: i.configmapName,
                    }
                    if(!i.configmapAllKey){
                        o.configMap.items = i.configmapKey.map(i=>{
                            i.mode = Number("0o" + i.mode);
                            return i;
                        })
                    }
                }
                if(i.type=='secret'){
                    o.secret = {
                        defaultMode: 420,
                        secretName: i.secretName,
                    }
                    if(!i.secretAllKey){
                        o.secret.items = i.secretKey.map(i=>{
                            i.mode = Number("0o" + i.mode);
                            return i;
                        })
                    }
                }
                if(i.type=='pvcTemplate'){
                    volumeClaimTemplates.push({
                        kind: 'PersistentVolumeClaim',
                        apiVersion: 'v1',
                        metadata:{
                            name: i.name,
                        },
                        spec:{
                            accessModes:[i.ptAccessModes],
                            resources:{requests:{storage:i.ptStorageSize+'Gi'}},
                            storageClassName: i.ptStorage,
                        },
                    })
                }else{
                    volumes.push(o)
                }
            })
            this.$emit('submit', {
                volumes,
                volumeClaimTemplates,
            });
        },
        addItem(){
            this.edit = {
                ...this.edit,
                show: true,
                isEdit: -1,
                type: 'nfs',
                name: '',
                nfsPathServer: '',
                pvcName: '',
                configmapName: '',
                configmapAllKey: true,
                configmapKey: [],
                secretName: '',
                secretAllKey: true,
                secretKey: [],
                hostPathHost: '',
                hostPathType: 'DirectoryOrCreate',
                ptStorage: '',
                ptStorageSize: '',
                ptAccessModes: 'ReadWriteOnce',
            }
            this.filterPvc = true;
        },
        editItem(index){
            this.edit = {
                show: true,
                isEdit: index,
                ...this.list[index],
            }
            this.changeEditType();
            this.filterPvc = false;
        },
        submitEdit(){
            let o = {...this.edit}
            delete o.show;
            delete o.isEdit;
            if(this.edit.isEdit != -1){
                this.list[this.edit.isEdit] = o;
            }else{
                this.list.push(o);
            }
            this.edit.show = false;
            this.submit();
        },
        changeEditType(){
            if(this.edit.type=='pvc'){ this.getPvcs(); }
            if(this.edit.type=='configmap'){ this.getConfigMaps(); }
            if(this.edit.type=='secret'){ this.getSecrets(); }
            if(this.edit.type=='pvcTemplate'){ this.getDisks(); }
        },
        getPvcs(){
            if(this.isTemplate){return}
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims',{
                loading:true,
                customToken: this.token,
            }).then(res=>{
                let pvcs = res?.data?.items || [];
                this.pvcs = pvcs?.map(i=>({
                    name: i.metadata.name,
                }));
                this.getCustom();
            })
        },
        
        // 判断是否手动创建
        getCustom(){
            return k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/longhorn-volumes-config',{
                customToken: this.token,
                noAlert:true
            }).then(res=>{
                if(!res.data){return}
                let arr = res.data?.data?.customs?.split(',');
                this.pvcs.map(i=>{
                    i.isCustom = arr.includes(i.name);
                });
            })
        },
        getConfigMaps(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{
                customToken: this.token,
                loading:true
            }).then(res=>{
                let configmaps = res?.data?.items || [];
                this.configmaps = [];
                this.configmapKeys = {};
                configmaps?.map(i=>{
                    this.configmaps.push({
                        label: i.metadata.name,
                        value: i.metadata.name,
                    });
                    this.configmapKeys[i.metadata.name] = Object.keys(i?.data || {});
                });
            })
        },
        deleteConfigmap(name){
            k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/'+name,{
                customToken: this.token,
                loading:true
            }).then(res=>{
                this.$message.success('操作成功');
                this.getConfigMaps();
            })
        },
        getSecrets(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets',{
                customToken: this.token,
                loading:true
            }).then(res=>{
                let secrets = res?.data?.items || [];
                this.secrets = [];
                this.secretKeys = {};
                secrets?.map(i=>{
                    this.secrets.push({label:i.metadata.name,value:i.metadata.name});
                    this.secretKeys[i.metadata.name] = Object.keys(i?.data || {});
                });
            })
        },
        deleteSecret(id){
            k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+ id,{
                customToken: this.token,
                loading:true
            }).then(res=>{
                this.$message.success('操作成功');
                this.getSecrets();
            });
        }
    }
}
</script>
<style scoped>
.keys-table td{padding:4px;}
</style>