<template>
    <div>
        <div class="padding-20">
            <!-- <route-breadcrumb :data="{id:title}" /> -->
            <div class="bg-white">
                <table class="com-table"><tbody>
                    <tr>
                        <td>名称</td>
                        <td>镜像</td>
                        <td>更新时间</td>
                        <td>版本</td>
                        <td style="width:200px;">操作</td>
                    </tr>
                    <tr v-for="(item,index) in list" :key="index">
                        <td>
                            <a-popover position="bl">
                                <span class="c-blue cursor">{{item.name}}</span>
                                <template #content>
                                    <div style="max-height:400px; overflow:auto;">
                                        <table class="com-table"><tbody>
                                            <tr>
                                                <td>资源名</td>
                                                <td>级别</td>
                                                <td>内容</td>
                                                <td>详细描述</td>
                                                <td>时间</td>
                                            </tr>
                                            <tr v-for="(item,index) in eventLs" :key="index">
                                                <td>{{item.name}}</td>
                                                <td>{{item.type}}</td>
                                                <td>{{item.reason}}</td>
                                                <td>{{item.message}}</td>
                                                <td>{{item.eventTime}}</td>
                                            </tr>
                                            <tr v-if="!eventLs||!eventLs.length">
                                                <td colspan="5" class="txt-c c-cc">没有数据</td>
                                            </tr>
                                        </tbody></table>
                                    </div>
                                </template>
                            </a-popover>
                        </td>
                        <td>
                            <div>
                                <div>容器名称：<span>{{item.pod}}</span></div>
                                <div>镜像：<span>{{item.image}}</span></div>
                                <div>版本：<span>{{item.tag}}</span></div>
                            </div>
                        </td>
                        <td>{{item.createdAt}}</td>
                        <td>{{item.revision}}</td>
                        <td>
                            <a-tooltip content="diff">
                                <i class="opt-icon" @click="selDiff(item)"><icon-branch /></i>
                            </a-tooltip>
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(item)"><icon-code /></i>
                            </a-tooltip>
                            <a-popconfirm v-if="activeVersion!=item.revision" content="确定要回滚到当前版本吗" @ok="rollback(item)" position="lt">
                                <a-tooltip v-if="activeVersion!=item.revision" content="回滚">
                                    <i class="opt-icon"><icon-undo /></i>
                                </a-tooltip>
                            </a-popconfirm>
                            <a-popconfirm v-if="activeVersion!=item.revision" content="确定要删除吗" @ok="toDelete(item)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>

                            <!-- <span class="cursor c-blue operation" @click="selDiff(item)">diff</span>
                            <span class="cursor c-blue operation" @click="openYaml(item)">YAML</span>
                            <a-popconfirm content="确定要删除吗" @ok="toDelete(item)">
                                <span class="cursor c-blue operation">删除</span>
                            </a-popconfirm> -->
                        </td>
                    </tr>
                    <tr v-if="!list || !list.length">
                        <td colspan="6"><a-empty /></td>
                    </tr>
                </tbody></table>
            </div>
        </div>

        <a-modal v-model:visible="compare.show" width="450px" @ok="openDiff(compare.revision)" :popup-container="false?'#allmodalbox':'body'">
            <template #title>选择对比版本</template>
            <div class="df ai-c jc-c">
                <a-select v-model="compare.revision" placeholder="请选择版本" style="width:300px;">
                    <a-option v-for="item in compare.list" :key="item.revision" :label="item.revision" :value="item.name"></a-option>
                </a-select>
            </div>
        </a-modal>
        
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <diff-txt :show="versiondiff.show" :old="versiondiff.old" :new="versiondiff.new" @cancel="versiondiff.show=false;"></diff-txt>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import diffTxt from '@/components/diff-txt.vue';
import { getUserInfo } from '@/utils/auth';

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: '',
            list: [],
            yamlData: {},
            eventLs: [],
            versiondiff: {},
            compare: {
                show: false,
                name: '',
                list: [],
                revision: '',
                loading: false,
            },
            activeVersion: '',
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
        this.activeVersion = this.data?.metadata?.annotations?.['deployment.kubernetes.io/revision'];
    },
    watch:{
        data(v){
            this.activeVersion = this.data?.metadata?.annotations?.['deployment.kubernetes.io/revision'];
        }
    },
    components: {
        yamlDrawer,
        diffTxt,
    },
    methods: {
        rollback(item){
            let kind = {
                'deployments': 'Deployment',
                'statefulsets': 'StatefulSet',
                'daemonsets': 'DaemonSet',
            }[this.$route.params.kind];
            panelApi.put('/rollback',{
                apiVersion: 'apps/v1',
                kind: kind,
                name: this.$route.params.id,
                namespace: this.namespaceActive,
                toRevision: item.revision,
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        getList(){
            let matchLabels = this.data?.spec?.selector?.matchLabels;
            if(!matchLabels){return}
            let labelSelector = '';
            for(let i in matchLabels){
                labelSelector += i+'='+matchLabels[i]+',';
            }
            let url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets`;
            if(this.$route.params.kind=='daemonsets'){
                url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/controllerrevisions`;
            }
            axios.get(url,{
                params: {labelSelector: labelSelector.replace(/,$/,'')},
                loading: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(item=>{
                    if(this.$route.params.kind=='daemonsets'){
                        return {
                            name: item?.metadata?.name,
                            revision: item?.revision,
                            namespace: item?.metadata?.namespace,
                            pod: item?.data?.spec?.template?.spec?.containers[0]?.name,
                            image: item?.data?.spec?.template?.spec?.containers[0]?.image?.split(':')?.[0],
                            tag: item?.data?.spec?.template?.spec?.containers[0]?.image?.split(':')?.[1],
                            createdAt: window.formatDate(item?.metadata?.creationTimestamp),
                            uid: item?.metadata?.uid,
                        }
                    }
                    return {
                        name: item?.metadata?.name,
                        revision: item?.metadata?.annotations?.['deployment.kubernetes.io/revision'],
                        namespace: item?.metadata?.namespace,
                        pod: item?.spec?.template?.spec?.containers[0]?.name,
                        image: item?.spec?.template?.spec?.containers[0]?.image?.split(':')?.[0],
                        tag: item?.spec?.template?.spec?.containers[0]?.image?.split(':')?.[1],
                        createdAt: window.formatDate(item?.metadata?.creationTimestamp),
                        uid: item?.metadata?.uid,
                    }
                });
                list = list.sort((a,b)=>{return b.revision - a.revision});
                this.list = list;
            })
        },
        selDiff(item){
            this.compare = {
                show: true,
                name: item.name,
                revision: '',
                list: this.list.filter(i=>i.revision != item.revision),
            }
        },
        openDiff(oldname){
            // let old = this.list.find(i=>i.revision == item.revision - 1);
            // if(!old){this.$message.error("没有上一个版本");return;}
            this.compare.loading = true;
            k8sproxy.get(`/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${this.compare.name}`,{loading:true}).then(res=>{
                let data = res.data;
                k8sproxy.get(`/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${oldname}`,{loading:true}).then(res=>{
                    let oldData = res.data;        
                    this.compare.show = false;
                    this.versiondiff = {
                        show: true,
                        old: oldData,
                        new: data,
                    }
                }).finally(()=>{
                    this.compare.loading = false;
                })
            }).catch(()=>{
                this.compare.loading = false;
            });
        },
        openYaml(item){
            let url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${item.name}`;
            if(this.$route.params.kind=='daemonsets'){
                url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/controllerrevisions/${item.name}`;
            }
            axios.get(url,{loading:true}).then(res=>{
                let data = res.data;
                this.yamlData = {
                    show: true,
                    title: item.name,
                    data: data,
                    submit: (data)=>{
                        k8sproxy.put(`/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${item.name}`,data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = { show:false,};
                            this.getList();
                        })
                    }
                }
            })
        },
        toDelete(row){
            let url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${row.name}`;
            if(this.$route.params.kind=='daemonsets'){
                url = `/k8s-proxy/apis/apps/v1/namespaces/${this.namespaceActive}/controllerrevisions/${row.name}`;
            }
            axios.delete(url).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            });
            // this.$confirm('确定要删除吗',"提示",{
            //     confirmButtonText: "确定",
            //     cancelButtonText: "取消",
            // }).then(() =>{
            // }).catch(()=>{})
        },
        getEvents(row){
            this.eventLs = [];
            let query = `involvedObject.kind=ReplicaSet,involvedObject.uid=${row.uid},involvedObject.name=${row.name},involvedObject.namespace=${row.namespace}`
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/events?limit=500&&fieldSelector='+encodeURIComponent(query)).then(res=>{
                this.eventLs = res.data?.items || [];
                this.eventLs = this.eventLs.map(i=>{
                    i.name = i.metadata?.name;
                    i.eventTime = window.formatDate(i.eventTime);
                    return i;
                })
            })
        },
    },
}
</script>

<style>
</style>