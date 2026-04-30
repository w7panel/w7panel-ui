<template>
    <div class="padding-20" style="height:100%; overflow:auto;">

        <!-- <Breadcrumb :routes="$route.name=='fp-user-resource'?fproutes:routes" /> -->

        <div class="padding-20 bg-white" >
            <div v-if="$route.query.status=='wait'" style="margin-bottom:20px;">
                <a-alert type="warning">当前资源为待回收状态，请通知用户及时续费。<span v-if="$route.query.time">回收时间：{{ $route.query.time }}</span></a-alert>
            </div>
            <a-form auto-label-width style="width:100%;">
                <a-form-item label="CPU" style="margin-bottom:0;">
                    <a-progress :percent="info.cpuPercent" :status="info.cpuPercent>=1?'danger':'normal'" :stroke-width="14" :style="{width:'160px'}" :show-text="false" />
                    <div class="fs-14 ml-20">{{info.usedCpu }}核/{{ info.cpu }}核</div>
                </a-form-item>
                <a-form-item label="内存" style="margin-bottom:0;">
                    <a-progress :percent="info.memoryPercent" :status="info.memoryPercent>=1?'danger':'normal'" :stroke-width="14" :style="{width:'160px'}" :show-text="false" />
                    <div class="fs-14 ml-20">{{info.usedMemory }}Gi/{{ info.memory }}Gi</div>
                </a-form-item>
                <a-form-item label="硬盘" style="margin-bottom:0;">
                    <a-progress :percent="info.fsPercent" :status="info.fsPercent>=1?'danger':'normal'" :stroke-width="14" :style="{width:'160px'}" :show-text="false" />
                    <div class="fs-14 ml-20">{{info.usedFs }}Gi/{{ info.fs }}Gi</div>
                </a-form-item>
            </a-form>
    
            <div class="mt-20">
                <resource-tree v-if="loginInfo.token" :token="loginInfo.token" :userInfo="userInfo"></resource-tree>
            </div>
            
            <!-- <div class="mt-20">
                <a-table :data="resources" class="cptable" :pagination="false" @filter-change="resources=getResources();">
                    <template #columns>
                        <a-table-column title="资源名称">
                            <template #title>
                                <div class="df ai-c">
                                    <span class="df-s0">资源名称</span>
                                    <a-input-search v-model="filterValue" class="ml-20" style="width:280px;" @search="tableFilter()" allow-clear @clear="tableFilter()" @press-enter="tableFilter()" placeholder="请输入搜索内容"/>
                                </div>
                            </template>
                            <template #cell="{ record }">
                                <span class="c-blue cursor" @click="tableFilter(record.kind)">{{record.kindTxt}}</span>
                                <span class="ml-5">{{record.name}}</span>
                            </template>
                        </a-table-column>
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <a-tooltip v-if="debug" content="yaml">
                                    <span class="opt-icon" @click="openYaml(record)">
                                        <icon-code />
                                    </span>
                                </a-tooltip>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div> -->
    
            <!-- yaml -->
            <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" :disabled="true" :nofooter="true" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore, useLoadingStore } from '@/store';
import { getUserInfo } from '@/utils/auth';
import resourceTree from '@/views/system/users/resource-tree.vue';

export default {
    data(){
        return {
            
            routes: [
                {name:'root'},
                {name: "usermanage", label: "多租户管理"},
                {name: "system-resource", label: "资源管理"},
                {name: "user-resource", label: '查看资源'},
            ],
            fproutes: [
                {name:'root'},
                {name: "fp-usermanage-resource", label: "资源管理"},
                {name: "fp-user-resource", label: '查看资源'},
            ],

            info:{
                cpu: 0,
                usedCpu: 0,
                cpuPercent: 0,
                memory: 0,
                usedMemory: 0,
                memoryPercent: 0,
                fs: 0,
                usedFs: 0,
                fsPercent: 0,
            },
            loginInfo: {
                token: '',
            },

            resources: [],
            filterValue: '',
            
            apis: [],

            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            debug: false,
            namespaceActive: '',
            
            userInfo: {},
        }
    },
    async created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        
        await this.getToken();
        await panelApi.get('/auth/userinfo',{
            customToken: this.loginInfo.token,
        }).then(res=>{
            this.userInfo = res.data;
        })
        this.getData();

        // this.getSearchData();
        // this.getResources();
    },
    components: {
        yamlDrawer,
        resourceTree,
    },
    methods: {
        getToken(){
            panelApi.post(`/k3k/cvm/${this.$route.query.namespace}/action/${this.$route.query.username}/login`).then(res=>{
                this.loginInfo = res.data;
            })
            // return panelApi.post('/k3k/login',{
            //     k3kUserName: this.$route.query.username,
            // }).then(res=>{
            //     this.loginInfo = res.data;
            // })
        },
        
        tableFilter(value){
            if(value){this.filterValue = value;}
            this.getResources(()=>{
                this.resources = this.resources.filter(record=>{
                    let checkName = record.name?.toLowerCase().includes(this.filterValue?.toLowerCase());
                    let checkKind = record.kind?.toLowerCase().includes(this.filterValue?.toLowerCase());
                    return checkName || checkKind;
                })
            })
        },
        
        async getSearchData(){
            await k8sproxy.get('/apis',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                loading: true,
                customToken: this.loginInfo.token,

            }).then(res=>{
                let items = res?.data?.items || [];
                let o = {};
                for(let i of items){
                    let versions = {};
                    for(let v of i.versions){
                        let kinds = {};
                        if(!v?.resources){continue}
                        for(let k of v.resources){
                            kinds[k.responseKind.kind] = {
                                resource: k.resource,
                                scope: k.scope,
                            }
                        }
                        versions[v.version] = kinds;
                    }
                    o[i.metadata.name] = versions;
                }
                this.apis = o;
            })
            await k8sproxy.get('/api',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                customToken: this.loginInfo.token,
            }).then(res=>{
                let items = res?.data?.items || [];
                let o = {};
                let versions = {};
                for(let v of items[0].versions){
                    let kinds = {};
                    for(let k of v.resources){
                        kinds[k.responseKind.kind] = {
                            resource: k.resource,
                            scope: k.scope,
                        }
                    }
                    versions[v.version] = kinds;
                }
                o['core'] = versions;
                this.apis = Object.assign(this.apis,o);
            })
        },

        async getResources(callback){
            
            let datas = [];

            await k8sproxy.get('/apis/apps/v1/daemonsets',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'DaemonSet';
                    i.apiVersion = 'apps/v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/apis/apps/v1/deployments',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'Deployment';
                    i.apiVersion = 'apps/v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/apis/apps/v1/statefulsets',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'StatefulSet';
                    i.apiVersion = 'apps/v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/api/v1/configmaps',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'ConfigMap';
                    i.apiVersion = 'v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/api/v1/persistentvolumeclaims',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'PersistentVolumeClaim';
                    i.apiVersion = 'v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/api/v1/persistentvolumes',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'PersistentVolume';
                    i.apiVersion = 'v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/api/v1/secrets',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'Secret';
                    i.apiVersion = 'v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})

            await k8sproxy.get('/api/v1/serviceaccounts',{
                customToken: this.loginInfo.token,
                loading: true,
            }).then(res=>{
                let arr = res?.data?.items?.map(i=>{
                    i.kind = 'ServiceAccount';
                    i.apiVersion = 'v1';
                    return i;
                })
                datas = datas.concat(arr || []);
            }).catch(()=>{})
            
            let types = {
                'Daemonset': '守护进程应用',
                'Statefulset': '有状态应用',
                'Deployment': '无状态应用',
            }
            
            let list = datas.filter(i=>i).map(i=>{
                let kindTxt = '['+ ( types[i.kind] || i.kind) +']';
                return {
                    api: i.apiVersion,
                    kind: i.kind,
                    isApp: types[i.kind],
                    kindTxt: kindTxt,
                    name: i.metadata?.name,
                    namespace: i.metadata?.namespace,
                    matchLabels: i.spec?.selector?.matchLabels,
                }
            });
            list.sort((a,b)=>{
                return (types[a.kind]&&!types[b.kind])? -1 : 1;
            })
            this.resources = list;
            callback && callback();
        },

        openYaml(row){
            let api = row.api.split('/');
            if(api.length==1){
                api = ['core',row.api];
            }
            let kind = this.apis[api[0]][api[1]][row.kind].resource;
            let namespace = this.apis[api[0]][api[1]][row.kind].scope == 'Namespaced'? 'namespaces/'+row.namespace+'/' : '';
            
            let url = `${row.api=='v1'?'/api/':'/apis/'}${row.api}/${namespace}${kind}/${row.name}`;
            k8sproxy.get(url,{
                loading: true,
                customToken: this.loginInfo.token,
            }).then(res=>{
                this.yamlData = {
                    show: true,
                    data: res.data,
                    title: row.name,
                    submit: (data)=>{
                        return axios.put(url, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        getData(){
            panelApi.get('/metrics/usage/normal',{
                customToken: this.loginInfo.token,
            }).then(res=>{
                let data = res.data;

                let cpu = data?.cpu?.total || 0;
                cpu = cpu / 1000;
                cpu = Number(cpu.toFixed(2));

                let usedCpu = data?.cpu?.usage || 0;
                usedCpu = usedCpu / 1000;
                usedCpu = Number(usedCpu.toFixed(2));

                let memory = data?.memory?.total || 0;
                memory = memory / 1024 / 1024 / 1024;
                memory = Number(memory.toFixed(2));

                let usedMemory = data?.memory?.usage || 0;
                usedMemory = usedMemory / 1024 / 1024 / 1024;
                usedMemory = Number(usedMemory.toFixed(2));

                this.info.cpu = cpu;
                this.info.usedCpu = Number(usedCpu.toFixed(2));
                this.info.cpuPercent = Number((usedCpu / cpu).toFixed(2));

                this.info.memory = memory;
                this.info.usedMemory = Number(usedMemory.toFixed(2));
                this.info.memoryPercent = Number((usedMemory / memory).toFixed(2));
            })
            
            panelApi.get('/metrics/usage/disk',{                
                customToken: this.loginInfo.token,
            }).then(res=>{
                let data = res?.data;

                let fs = data?.disk?.total || 0;
                fs = fs / 1024 / 1024 / 1024;
                fs = Number(fs.toFixed(2));

                let usedFs = data?.disk?.usage || 0;
                usedFs = usedFs / 1024 / 1024 / 1024;
                usedFs = Number(usedFs.toFixed(2));
                
                this.info.fs = fs;
                this.info.usedFs = usedFs;
                this.info.fsPercent = Number((usedFs / fs).toFixed(2));
            })
        },
        
    },
}
</script>

<style>

</style>