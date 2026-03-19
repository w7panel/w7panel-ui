<template>
    <div>

        <div v-if="!nodata" class="df">
            <a-tree
                v-model:expanded-keys="expandedKeys"
                v-model:selected-keys="selectedKeys"
                ref="tree"
                blockNode
                :data="data"
                :field-names="{key:'id',title:'label'}"
                :action-on-node-click="expand"
                @select="select"
                style="border:1px solid var(--color-neutral-3);padding:10px;"
            ></a-tree>
            <div class="fc ml-20">
                <table class="com-table" style="border:1px solid var(--color-neutral-3)"><tbody>
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
    
                            <a-popconfirm content="确定要删除该资源吗" @ok="toDelete(item.getdetail)" position="lt">
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

        <div v-else>
            <a-empty />
        </div>

        <yaml-drawer
            v-if="debug"
            :show="yamlData.show"
            :disabled="yamlData.disabled"
            :title="yamlData.title"
            :data="yamlData.data"
            @submit="yamlData.submit"
            @cancel="yamlData.show=false;"
        ></yaml-drawer>

        <podLog
            :show="logs.show"
            :data="{name: logs.name, containerList: logs.containerList}"
            :namespace="logs.namespace"
            :token="token"
            @close="logs.show=false;"
        ></podLog>
        
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
                <a :href="webshelllink" target="_blank" class="ml-10">
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
import dayjs from 'dayjs';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { podLog } from '@/components';

export default{
    props: ['token','userInfo'],
    data(){
        return {
            data: [],
            expandedKeys: [], // tree expanded keys
            selectedKeys: [],

            resourceItem: null,
            list: [],
            activeNs: '',
            debug: false,
            
            yamlData: {
                show: false,
                data: {},
                title: '',
                submit: null,
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
            nodata: false,
        }
    },
    created(){
        this.debug = this.userInfo?.['w7.cc/debug']=='true';
        this.getTree();
    },
    watch: {
        resourceItem: "getList",
        userInfo(){
            this.debug = this.userInfo?.['w7.cc/debug']=='true';
        },
    },
    computed: {
        webshelllink(){
            return `/fp/pod-webshell?pod=${this.ws.podName}&namespace=${this.ws.namespace}&containerName=${this.ws.container}&type=${this.ws.type}&api_token=${this.token}`
        }
    },
    components: {
        yamlDrawer,
        podLog,
    },
    methods: {
        
        select(s,d){
            if(d?.node?.children?.length){
                this.$refs.tree.expandNode(s[0],this.expandedKeys.includes(s[0])?false:true);
            }else{
                this.selectedKeys = s;
                this.resourceItem = d.node;
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
        openPwsb(item){
            // console.log(item,this.resourceItem)
            if(this.resourceItem.label=='pods'){
                k8sproxy.get('/apis/custom.metrics.k8s.io/v1beta1/namespaces/'+item.namespace+'/pods/'+item.name+'/pod_memory_working_set_bytes',{
                    customToken: this.token,
                }).then(res=>{
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
                k8sproxy.get('/apis/custom.metrics.k8s.io/v1beta1/nodes/'+item.name+'/pod_memory_working_set_bytes',{
                    customToken: this.token,
                }).then(res=>{
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
        toDelete(link){
            k8sproxy.delete(link,{customToken:this.token}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            })
        },
        openLog(item){
            this.logs = {
                show: true,
                name: item.name,
                namespace: item.namespace,
                containerList: item.containerList,
            }
        },
        openYaml(link){
            k8sproxy.get(link,{
                customToken: this.token,
            }).then(res=>{
                let data = res?.data;
                this.yamlData = {
                    show: true,
                    data: data,
                    disabled: false,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        if(/^\/api\/v1\//.test(link)){
                            return k8sproxy.put(link, data, {customToken:this.token}).then(res=>{
                                if(!res?.data){return}
                                this.$message.success("修改成功");
                                this.yamlData = { show:false };
                            })
                        }
                        return panelApi.post('/yaml', data, {customToken:this.token}).then(res=>{
                            if(!res?.data){return}
                            this.$message.success("修改成功");
                            this.yamlData = { show:false };
                        })
                    }
                }
            })
        },
        getList(){
            let v = this.resourceItem;
            let filter = (v.scope=='Namespaced'&&this.activeNs)? `namespaces/${this.activeNs}/` : '';
            let path = '/k8s-proxy/apis/'+v.name;
            if(v.name=="core"||v.name=="custom.metrics.k8s.io"){
                path = "/api"
            }
            k8sproxy.get(`${path}/${v.version}/${filter}${v.label}`,{
                loading: true,
                customToken: this.token,
            }).then(res=>{
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
                        creattime: dayjs(item.metadata.creationTimestamp).format('YYYY-MM-DD hh:mm:ss'),
                        getdetail: `${path}/${v.version}/${item.metadata?.namespace? 'namespaces/'+item.metadata.namespace+'/' : ''}${v.label}/${item.metadata.name}`,
                    }
                })
                this.list = list;
            })
        },
        async getTree(){
            this.nodata = false;
            await k8sproxy.get('/apis',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                loading: true,
                noAlert: true,
                customToken: this.token,
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
            }).catch(()=>{
                this.nodata = true;
            })

            if(this.nodata){return}

            k8sproxy.get('/api',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                loading: true,
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
    }
}
</script>
<style scoped>
</style>