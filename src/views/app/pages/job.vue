<template>
    <div class="padding-20">
        <table class="com-table"><tbody>
            <tr>
                <td>任务名称</td>
                <td>状态</td>
                <!-- <td>挂起</td> -->
                <td>执行开始时间</td>
                <td>执行完成时间</td>
                <td>执行时间</td>
                <td>操作</td>
            </tr>
            <tr v-for="(item,index) in joblist" :key="index">
                <td>
                    <span class="c-blue cursor" @click="toLog(item)" style="white-space: pre;">{{item.title||item.name}}</span>
                </td>
                <td>{{item.suspend?'挂起': item.status}}</td>
                <!-- <td>
                    <a-switch v-model="item.suspend" @change="exeImt(item,'Job')"></a-switch>
                </td> -->
                <td>{{item.startTime}}</td>
                <td>{{item.completionTime}}</td>
                <td>{{item.durationInSeconds}}</td>
                <td>
                    <a-tooltip v-if="debug" content="yaml">
                        <span class="opt-icon" @click="openYaml(item)">
                            <icon-code />
                        </span>
                    </a-tooltip>
                    <a-popconfirm content="确定要删除该任务吗" @ok="toDelete(item)" position="lt">
                        <a-tooltip content="删除">
                            <span class="opt-icon">
                                <icon-delete />
                            </span>
                        </a-tooltip>
                    </a-popconfirm>
                </td>
            </tr>
            <tr v-if="!joblist.length">
                <td colspan="6">
                    <a-empty />
                </td>
            </tr>
        </tbody></table>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <!-- log -->
        <jobLog :show="log.show" mode="modal" title="任务日志" :label-selector="log.label" @close="log.show=false;"></jobLog>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import jobLog from '@/components/job-log.vue';

export default {
    props: ['data','title'],
    data(){
        return {
            namespaceActive: '',
            joblist: [],
            yamlData: {},
            log: {
                show: false,
                label: '',
            },
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: {
        yamlDrawer,
        jobLog,
    },
    methods: {
        getList(){
            let appname = this.data?.metadata?.name;
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs?labelSelector=app='+appname,{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                this.joblist = list.map(i=>{
                    let status = i.status?.active > 0? '启动中' : (i.status?.succeeded? '成功' : '失败');
                    let durationInSeconds = '';
                    if(i.status.completionTime && i.status.startTime){
                        let st = new Date(i.status.startTime);
                        let ct = new Date(i.status.completionTime);
                        durationInSeconds = Math.floor((ct - st) / 1000) + '秒';
                    }
                    return {
                        title: i.metadata?.annotations?.title,
                        name: i.metadata?.name,
                        startTime: window.formatDate(i?.status?.startTime? i?.status?.startTime : ''),
                        completionTime: window.formatDate(i?.status?.completionTime? i?.status?.completionTime : ''),
                        durationInSeconds: durationInSeconds,
                        suspend: i?.spec?.suspend === true,
                        status: status,
                        selector: i?.spec?.selector?.matchLabels,
                    }
                })
                // 根据completionTime排序
                this.joblist.sort((a,b)=>{
                    return new Date(a.completionTime).getTime() - new Date(b.completionTime).getTime();
                })
            })
        },
        toDelete(item){
            k8sproxy.delete('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/'+item.name,{loading:true}).then(res=>{
                this.$message.sucdess('删除成功');
                this.getList();
            })
        },
        toLog(item){
            let selector = item?.selector;
            if(!selector){return;}
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            this.log = {
                show: true,
                label: label,
            }
        },
        exeImt(row, type, suspend){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ (type=='CronJob'?'cronjobs':'jobs') +'/'+row.name).then(res=>{
                let data = res?.data || {};
                data.spec.suspend = type=='CronJob'? row.suspend : (suspend!==undefined? suspend : row.suspend);
                k8sproxy.put('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ (type=='CronJob'?'cronjobs':'jobs') +'/'+row.name, data).then(res=>{
                    if(res?.data){
                        this.$message.success('操作成功');
                        this.getList();
                    }
                })
            })
        },
        openYaml(item){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/'+item.name).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
            });
        },
    }
}
</script>

<style>

.log-model .arco-modal-body{padding:10px;}
.log-model .log-model-title{position:relative; height:44px;}
.log-model .log-model-title .btns{position:absolute; right:0; top:0; height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 114px);}
.log-model .arco-modal-fullscreen .arco-modal-body>.df{height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body #term{height:100%;}
.log-model #term{height:418px;}

</style>