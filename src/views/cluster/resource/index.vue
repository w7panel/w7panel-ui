<template>
    <div class="padding-20 df df-c" style="height:calc(100vh - 60px); overflow:auto;">
        <route-breadcrumb class="df-s0" />
        <div class="df fc" style="height:300px;">
            <div class="treebox bg-white padding-16">
                <a-tree
                    v-model:expanded-keys="expandedKeys"
                    v-model:selected-keys="selectedKeys"
                    ref="tree"
                    blockNode
                    :data="data"
                    :field-names="{key:'id',title:'label'}"
                    action-on-node-click="expand"
                    @select="select"
                ></a-tree>
            </div>
            <div class="ml-20 fc bg-white padding-16" style="overflow:auto;">
                <div class="df ai-c jc-b">
                    <div class="df ai-c">
                        <span class="fs-14 df-s0">命名空间：</span>
                        <a-select v-model="activeNs" placeholder="选择命名空间" allow-search style="width:500px;">
                            <a-option value="">所有命名空间</a-option>
                            <a-option v-for="item in namespaceList" :key="item" :value="item">{{item}}</a-option>
                        </a-select>
                        
                        <a-tooltip content="刷新命名空间">
                            <icon-sync class="ml-10 fs-20 cursor c-66" @click="refresh()"/>
                        </a-tooltip>
                    </div>
                    <div class="df ai-c">
                        <a-button type="outline" @click="$router.push('/cluster/search')">原始查询</a-button>
                        <a-button type="primary" class="ml-20" @click="k8syaml.show=true">新建</a-button>
                    </div>
                </div>
                <table class="com-table mt-20"><tbody>
                    <tr>
                        <td>名称</td>
                        <td>命名空间</td>
                        <td>创建时间</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="item in list" :key="item.name">
                        <td>{{item.title || item.name}}</td>
                        <td>{{item.namespace}}</td>
                        <td>{{item.creattime}}</td>
                        <td>
                            <a-tooltip v-if="debug" content="yaml">
                                <span class="opt-icon" @click="openYaml(item.getdetail)">
                                    <icon-code />
                                </span>
                            </a-tooltip>

                            <a-tooltip v-if="item.kind=='PodList'" content="查看日志">
                                <span class="opt-icon" @click="openLog(item)">
                                    <icon-file />
                                </span>
                            </a-tooltip>

                            <a-tooltip v-if="item.kind=='PodList'" content="webshell">
                                <span class="opt-icon" @click="openWs(item)" :style="{opacity:item?.status?.toUpperCase()!='RUNNING'?0.5:1}">
                                    <icon-code-square />
                                </span>
                            </a-tooltip>
                            
                            <a-tooltip v-if="resourceItem.name=='custom.metrics.k8s.io'" content="查看">
                                <span class="opt-icon" @click="openPwsb(item)" >
                                    <icon-align-left />
                                </span>
                            </a-tooltip>

                            <a-popconfirm content="确定要删除该资源吗" @ok="toDelete(item.getdetail)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <span class="opt-icon">
                                        <icon-delete />
                                    </span>
                                </a-tooltip>
                            </a-popconfirm>
                        </td>
                    </tr>
                    <tr v-if="!list || !list.length">
                        <td colspan="4"><a-empty /></td>
                    </tr>
                </tbody></table>
            </div>
        </div>

        <yaml-drawer v-if="debug" :show="yamlData.show" :disabled="yamlData.disabled" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <k8syaml-drawer :show="k8syaml.show" @close="closeK8syaml" ></k8syaml-drawer>

        <podLog :show="logs.show" :data="{name: logs.name, containerList: logs.containerList}" :namespace="logs.namespace" @close="logs.show=false;"></podLog>

        <a-modal title="webshell" v-model:visible="ws.dialog" width="500px"  @cancle="ws.dialog = false;" top="10vh" :popup-container="false?'#allmodalbox':'body'">
            <template #title>webshell</template>
            <div style="margin-top:-10px;">
                <a-form :model="ws">
                    <a-form-item label="Shell环境">
                        <a-select v-model="ws.type" size="large" style="width:400px;" placeholder="请选择">
                            <a-option label="bin/sh" value="bin/sh"></a-option>
                            <a-option label="bin/bash" value="bin/bash"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="ws.containerList.length>1" label="容器">
                        <a-select v-model="ws.container" size="large" style="width:400px;" placeholder="请选择">
                            <a-option v-for="item in ws.containerList" :key="item.name" :label="item.name" :value="item.name"></a-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </div>
            <template #footer>
                <a-button size="small" @click="ws.dialog=false;">取消</a-button>
                <a :href="webshelllink+ws.type" target="_blank" class="ml-10">
                    <a-button size="small" type="primary" @click="ws.dialog=false;">确定</a-button>
                </a>
            </template>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore } from "@/store";
import k8syamlDrawer from '@/components/k8syaml-drawer.vue';
import podLog from '@/components/pod-log.vue';
import webShell from "@/components/web-shell.vue";
import { getUserInfo } from '@/utils/auth';
import { getToken } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceList: [],
            activeNs: "", // namespace
            data: [], // tree data
            expandedKeys: [], // tree expanded keys
            selectedKeys: [],
            resourceItem: null, // active resource item
            list: [], // list data
            yamlData: {
                show: false,
                data: {},
                title: '',
                submit: null,
            },
            k8syaml:{
                show: false,
            },
            logs: {
                show: false,
                name: '',
                namespace: '',
                containerList: [],
            },
            ws: {
                dialog: false,
                podName: '',
                namespace: '',
                type: 'bin/sh',
                containerList: [],
                container: null,
            },
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceList = useNamespaceStore().namespaceList;
        if(this.$route.query.namespace){ this.activeNs = this.$route.query.namespace; }
        this.refresh();
        this.getTree().then(()=>{
            if(!this.$route.query.target){return}
            this.$nextTick(()=>{
                let d = JSON.parse(decodeURIComponent(this.$route.query.target));
                this.resourceItem = d;
                this.selectedKeys = [d.id];
                this.expandedKeys = [
                    d.name,
                    d.id.replace('-'+d.label,''),
                ]
            })
        });
    },
    watch:{
        activeNs(v){
            if(!this.resourceItem || this.resourceItem.scope!=='Namespaced'){return}
            this.$router.push({query:{...this.$route.query, namespace: v}})
            this.getList();
        },
        resourceItem: "getList",
    },
    components: { yamlDrawer, k8syamlDrawer, podLog, webShell },
    computed: {
        webshelllink(){
            let token = getToken();
            return `/fp/pod-webshell?pod=${this.ws.podName}&namespace=${this.ws.namespace}&containerName=${this.ws.container}&api_token=${token}&type=`
        }
    },
    methods: {
        openPwsb(item){
            // console.log(item,this.resourceItem)
            if(this.resourceItem.label=='pods'){
                k8sproxy.get('/apis/custom.metrics.k8s.io/v1beta1/namespaces/'+item.namespace+'/pods/'+item.name+'/pod_memory_working_set_bytes').then(res=>{
                    let data = res?.data;
                    this.yamlData = {
                        show: true,
                        data: data,
                        disabled: true,
                        title: item.name,
                        submit: (data)=>{ this.yamlData = { show:false }; }
                    }
                })
            }
            if(this.resourceItem.label=='nodes'){
                k8sproxy.get('/apis/custom.metrics.k8s.io/v1beta1/nodes/'+item.name+'/pod_memory_working_set_bytes').then(res=>{
                    let data = res?.data;
                    this.yamlData = {
                        show: true,
                        data: data,
                        disabled: true,
                        title: item.name,
                        submit: (data)=>{ this.yamlData = { show:false }; }
                    }
                })
            }
        },
        openWs(row){
            if(row?.status?.toUpperCase()!='RUNNING'){return;}
            this.ws.dialog = true;
            this.ws.podName = row.name;
            this.ws.namespace = row.namespace;
            this.ws.containerList = row.containerList || [];
            this.ws.container = row.containerName;
        },

        openLog(item){
            this.logs = {
                show: true,
                name: item.name,
                namespace: item.namespace,
                containerList: item.containerList,
            }
        },
        closeK8syaml(e){
            this.k8syaml.show = false;
            if(!e){return}
            this.getTree();
            this.getList();
        },
        refresh(){
            useNamespaceStore().setNamespaceList().then(()=>{        
                this.namespaceList = useNamespaceStore().namespaceList;
            });
        },
        select(s,d){
            if(d?.node?.children?.length){
                this.$refs.tree.expandNode(s[0],this.expandedKeys.includes(s[0])?false:true);
            }else{
                this.selectedKeys = s;
                this.resourceItem = d.node;
                console.log(this.selectedKeys)
                this.$router.push({query:{
                    ...this.$route.query,
                    target: encodeURIComponent(JSON.stringify(this.resourceItem))
                }})
            }
        },
        
        getList(){
            let v = this.resourceItem;
            let filter = (v.scope=='Namespaced'&&this.activeNs)? `namespaces/${this.activeNs}/` : '';
            let path = '/k8s-proxy/apis/'+v.name;
            if(v.name=="core"||v.name=="custom.metrics.k8s.io"){
                path = "/k8s-proxy/api"
            }
            axios.get(`${path}/${v.version}/${filter}${v.label}`,{loading:true}).then(res=>{
                let data = res?.data;
                let list = data?.items || [];
                list = list.map(item =>{
                    let containers = [];
                    containers = item?.spec?.initContainers || [];
                    containers = containers.concat(item?.spec?.containers || []);
                    return {
                        name: item.metadata.name,
                        kind: data.kind,
                        status: item?.status?.phase?.toUpperCase() || '',
                        namespace: item.metadata?.namespace || "-",
                        containerList: containers,
                        containerName: containers[0]?.name,
                        creattime: window.formatDate(item.metadata.creationTimestamp),
                        getdetail: `${path}/${v.version}/${item.metadata?.namespace? 'namespaces/'+item.metadata.namespace+'/' : ''}${v.label}/${item.metadata.name}`,
                    }
                })
                this.list = list;
            })
        },
        openYaml(link){
            axios.get(link).then(res=>{
                let data = res?.data;
                this.yamlData = {
                    show: true,
                    data: data,
                    disabled: false,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        if(/^\/k8s-proxy\/api\/v1\//.test(link)){
                            return axios.put(link, data).then(res=>{
                                if(!res?.data){return}
                                this.$message.success("修改成功");
                                this.yamlData = { show:false };
                            })
                        }
                        return panelApi.post('/yaml', data).then(res=>{
                            if(!res?.data){return}
                            this.$message.success("修改成功");
                            this.yamlData = { show:false };
                        })
                    }
                }
            })
        },
        toDelete(link){
            axios.delete(link).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            })
        },
        getTree(){
            // this.treeloading = true;
            return k8sproxy.get('/apis',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items || [];
                let data = this.parseData(arr);
                
                for(let i in data){
                    let id = data[i].id;
                    let c = data[i].children
                    for(let s in c){
                        if(id=='custom.metrics.k8s.io' && c[s].id=='custom.metrics.k8s.io-v1beta1'){
                            c[s].children.push({
                                id: "custom.metrics.k8s.io-v1beta1-pods",
                                label: "pods",
                                name: "custom.metrics.k8s.io",
                                scope: "Namespaced",
                                version: "v1",
                            });
                            c[s].children.push({
                                id: "custom.metrics.k8s.io-v1beta1-nodes",
                                label: "nodes",
                                name: "custom.metrics.k8s.io",
                                scope: "Cluster",
                                version: "v1",
                            });
                        }
                    }
                }
                this.data = data;
            }).then(()=>{
                return k8sproxy.get('/api',{
                    headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                    loading: true,
                })
            }).then(res=>{
                if(!res?.data?.items?.length){return}
                let arr = [res?.data?.items[0]]
                arr[0].metadata.name = 'core';
                let data = this.parseData(arr);
                this.data = this.data.concat(data).sort((a,b)=>{
                    return a.label.localeCompare(b.label);
                });
            })
        },
        parseData(arr){
            let data = arr.map(item => {

                return {
                    id: item.metadata.name,
                    label: item.metadata.name,
                    children: item.versions.map(version => ({
                        id: item.metadata.name + '-' + version.version,
                        label: version.version,
                        children: version?.resources?.map(resource => ({
                            id: item.metadata.name + '-' + version.version + '-' + resource.resource,
                            label: resource.resource,
                            name: item.metadata.name,
                            version: version.version,
                            scope: resource.scope,
                        }))?.sort((a,b)=>{
                            return a.label.localeCompare(b.label);
                        }) || [],
                    })).sort((a,b)=>{
                        return a.label.localeCompare(b.label);
                    })
                };
            }).sort((a,b)=>{
                return a.label.localeCompare(b.label);
            });
            return data;
        },
    },
}
</script>

<style scoped>
.treebox{overflow-x:hidden;overflow-y:auto;}
</style>
