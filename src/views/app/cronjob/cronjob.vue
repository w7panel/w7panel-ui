<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div v-if="permission.includes('app-cronjob-add')" class="mb-20">
            <a-button v-if="activekey!='3'" type="primary" @click="form.show=true;form.id='';"><template #icon><icon-plus /></template>新增</a-button>
            <a-button v-else type="primary" @click="$refs.buildimage.openAdd()"><template #icon><icon-plus /></template>新增构建镜像</a-button>
        </div>
        <div class="bg-white padding-20">
             <a-tabs v-model:active-key="activekey">
                <a-tab-pane key="1" title="周期执行"></a-tab-pane>
                <a-tab-pane key="2" title="单次执行"></a-tab-pane>
                <a-tab-pane key="3" title="构建镜像"></a-tab-pane>
            </a-tabs>

            <div v-if="activekey=='1'" >
                <a-table :data="list" class="cptable" :pagination="false" :bordered="false">
                    <template #columns>
                        <a-table-column title="任务名称">
                            <template #cell="{ record }">
                                <span class="point" :class="record.status_class"></span>
                                <span v-if="record.last_schedule" class="c-blue cursor" @click="showHis(record)">{{record.title||record.name}}</span>
                                <span v-else class="c-99">{{record.title||record.name}}</span>
                            </template>
                        </a-table-column>
                        <a-table-column title="执行周期">
                            <template #cell="{ record }">{{record.schedule_txt}}</template>
                        </a-table-column>
                        <a-table-column title="上次执行时间">
                            <template #cell="{ record }">{{record.last_schedule || '-'}}</template>
                        </a-table-column>
                        <a-table-column title="创建时间">
                            <template #cell="{ record }">{{record.create}}</template>
                        </a-table-column>
                        <a-table-column title="开启">
                            <template #cell="{ record }">
                                <a-switch v-model="record.suspend" :checked-value="false" :unchecked-value="true" @change="exeImt(record,'CronJob')"></a-switch>
                            </template>
                        </a-table-column>
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <a-tooltip content="yaml">
                                    <i class="opt-icon" @click="toYaml(record)"><icon-code /></i>
                                </a-tooltip>
                                <a-tooltip content="执行一次">
                                    <i class="opt-icon" @click="exeOnce(record)"><icon-play-arrow /></i>
                                </a-tooltip>
                                <a-tooltip v-if="permission.includes('app-cronjob-edit')" content="编辑">
                                    <i class="opt-icon" @click="toEdit(record,'cronjob')"><icon-edit /></i>
                                </a-tooltip>
                                <a-popconfirm v-if="permission.includes('app-cronjob-delete')" :content="'确认要删除吗'" @ok="toDelete(record)" position="lt">
                                    <a-tooltip content="删除">
                                        <i class="opt-icon"><icon-delete /></i>
                                    </a-tooltip>
                                </a-popconfirm>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div>
            <div v-else-if="activekey=='2'">
                <a-table :data="joblist" class="cptable" :expanded-keys="expandedKeys" @expanded-change="v=>expandedKeys=v" :pagination="false" :bordered="false">
                    <template #columns>
                        <a-table-column title="任务名称">
                            <template #cell="{ record }">
                                <span v-if="record.isChild" style="color:var(--color-neutral-4);">
                                    <span v-if="record.index<record.childLength">├──</span>
                                    <span v-else>└──</span>
                                </span>
                                <span class="point" :class="record.status_class"></span>
                                <span class="c-blue cursor" @click="showHis(record)">
                                    <span>{{record.title? record.titleBefore : record.name}}</span>
                                    <span class="ml-5">{{record.titleAfter}}</span>
                                </span>
                            </template>
                        </a-table-column>
                        <a-table-column title="来源">
                            <template #cell="{ record }">
                                <span v-if="record.source=='deployment'" class="c-blue cursor" @click="toApp(record)">{{record.sourceTitle}}</span>
                                <span v-else>{{record.sourceTitle}}</span>
                            </template>
                        </a-table-column>
                        <a-table-column title="上次执行时间">
                            <template #cell="{ record }">{{record.startTime}}</template>
                        </a-table-column>
                        <a-table-column title="上次执行时长">
                            <template #cell="{ record }">{{record.durationInSeconds}}</template>
                        </a-table-column>
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <a-tooltip v-if="debug&&!record.isgroup" content="yaml">
                                    <i class="opt-icon" @click="toYaml(record)"><icon-code /></i>
                                </a-tooltip>
                                <a-tooltip v-if="!record.isgroup" content="立即执行">
                                    <i class="opt-icon" @click="copyJob(record)"><icon-play-circle /></i>
                                </a-tooltip>
                                <a-tooltip v-if="!record.isgroup&&permission.includes('app-cronjob-edit')" content="编辑">
                                    <i class="opt-icon" @click="toEdit(record,'job')"><icon-edit /></i>
                                </a-tooltip>
                                <a-popconfirm v-if="!record.isgroup&&permission.includes('app-cronjob-delete')" :content="'确认要删除吗'" @ok="toDelete(record)" position="lt">
                                    <a-tooltip content="删除">
                                        <i class="opt-icon"><icon-delete /></i>
                                    </a-tooltip>
                                </a-popconfirm>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
            </div>
            <div v-else-if="activekey=='3'">
                <build-image ref="buildimage"></build-image>
            </div>
        </div>

        <!-- Pod 日志弹窗 -->
        <podLog 
            :show="logModal.show" 
            mode="modal" 
            title="查看日志"
            :pod-name="logModal.pod_name"
            :namespace="namespaceActive"
            :tail-lines="100"
            @close="logModal.show = false; logModal.pod_name = '';"
        />

        <!-- Job 日志弹窗（带执行记录 Tab） -->
        <jobLog 
            :show="jobLogModal.show" 
            mode="modal" 
            title="执行记录"
            :jobList="jobLogModal.jobList"
            :label-selector="jobLogModal.labelSelector"
            :namespace="namespaceActive"
            :tail-lines="100"
            @close="jobLogModal.show = false; jobLogModal.jobName = ''; jobLogModal.labelSelector = '';"
        />

        <cronjob-drawer :show="form.show" :id="form.id" :defaultData="form.defaultData" :type="form.type" @close="closeForm"></cronjob-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import yamlDrawer from '@/components/yaml-drawer.vue';
import cronjobDrawer from './cronjob-drawer.vue';
import jobTable from './job-table.vue';
import appShell from './app-shell.vue';
import { getPermission } from '@/utils/auth';
import { getUserInfo } from '@/utils/auth';
import podLog from '@/components/pod-log.vue';
import jobLog from '@/components/job-log.vue';
import {useNamespaceStore} from "@/store";
import buildImage from './build-image.vue';

export default {
    components: {
        yamlDrawer,
        cronjobDrawer,
        jobTable,
        appShell,
        podLog,
        jobLog,
    },
    data(){
        return {
            namespaceActive: '',
            allJobs: [],
            list: [],
            joblist: [],
            activekey: '1',
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },

            // Pod 日志弹窗
            logModal: {
                show: false,
                pod_name: '',
            },

            // Job 日志弹窗（带执行记录）
            jobLogModal: {
                show: false,
                jobList: [],
                labelSelector: '',
            },

            form: {
                show: "",
                id: '',
                type: '',
                defaultData: null,
            },
            
            expandedKeys: [],
            permission: [],
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
    },
    watch: {
        activekey(){
            this.getData();
        },
    },
    components: {
        buildImage,
    },
    methods: {
        toApp(item){
            this.$router.push({path: '/app/deployments/'+item.sourceName});
        },
        showHis(item){
            // 如果是 Job（有 dataItem），直接用 JobLog 组件
            if(item.dataItem?.kind === 'Job'){
                this.jobLogModal.jobName = item.name;
                this.jobLogModal.labelSelector = '';
                this.jobLogModal.show = true;
                return;
            }
            
            // 如果是 CronJob，从 searchJob 获取 Job 列表
            if(!item.searchJob){
                // 尝试用 labelSelector 方式
                let selector = item?.dataItem?.spec?.selector?.matchLabels;
                if(selector){
                    let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
                    this.jobLogModal.jobName = '';
                    this.jobLogModal.labelSelector = label;
                    this.jobLogModal.show = true;
                }
                return;
            }
            
            // 获取 Job 列表
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs?labelSelector=searchJob='+item.searchJob).then(res=>{
                let data = res?.data?.items || [];
                
                let list = data.map(i=>{
                    let durationInSeconds = '';
                    if(i.status.completionTime && i.status.startTime){
                        let st = new Date(i.status.startTime);
                        let ct = new Date(i.status.completionTime);
                        durationInSeconds = Math.floor((ct - st) / 1000) + '秒';
                    }
                    let status_class = i.spec?.suspend? 'c-99' : (i.status?.succeeded? 'c-green' : 'c-red');
                    let status_text = i.spec?.suspend? '挂起' : (i.status?.succeeded? '成功' : '失败');
                    
                    return {
                        title: i.metadata.annotations.title || i.metadata.name,
                        name: i.metadata.name,
                        startTime: window.formatDate(i.status.startTime),
                        stimes: new Date(i.status.startTime).getTime(),
                        completionTime: window.formatDate(i.status.completionTime),
                        durationInSeconds: durationInSeconds,
                        suspend: i.spec?.suspend,
                        status_text: status_text,
                        status_class: status_class,
                        dataItem: i,
                        type: 'jobs',
                    }
                })
                list.sort((i,j)=>j.stimes-i.stimes);

                this.jobLogModal.jobList = list;
                this.jobLogModal.labelSelector = '';
                this.jobLogModal.show = true;
            });
        },
        closeForm(v){
            this.form.show = false;
            if(v){ this.getData(); }
        },
        getData(){
            if(this.activekey=='1'){
                k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/cronjobs').then(res=>{
                    let list = res?.data?.items || [];
                    this.list = list.map(i=>{
                        return {
                            title: i.metadata?.annotations?.title,
                            name: i.metadata.name,
                            schedule_txt: this.getCron(i.spec?.schedule),
                            last_schedule: window.formatDate(i?.status?.lastScheduleTime? i?.status?.lastScheduleTime : ''),
                            last_successful: window.formatDate(i?.status?.lastScheduleTime? i?.status?.lastScheduleTime : ''),
                            create: window.formatDate(i?.metadata?.creationTimestamp),
                            suspend: i?.spec?.suspend === true,
                            searchJob: i.spec?.jobTemplate?.metadata?.labels?.['searchJob'],
                            dataItem: i,
                            type: 'cronjobs',
                        }
                    })
                    this.comStatus();
                })
                
                k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs').then(res=>{
                    let list = res?.data?.items || [];
                    list = list.map(i=>{
                        return {
                            statusSuccess: Boolean(!i.spec?.suspend && i.status?.succeeded),
                            sourceName: i.metadata?.annotations?.['w7.cc/job-source-name'] || '',
                            startTime: new Date(i.status.startTime).getTime(),
                            searchJob: i.metadata?.labels?.searchJob,
                        }
                    })
                    this.allJobs = list;
                    this.comStatus();
                });
            }else if(this.activekey=='2'){
                k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs?labelSelector=w7.cc/job-source!=cronjob').then(res=>{
                    let list = res?.data?.items || [];
                    list = list.filter(i=>i.metadata?.annotations?.['w7.cc/job-source']!=='deployment')
                    let grouplist = [];
                    list = list.map(i=>{
                        let durationInSeconds = '';
                        if(i.status.completionTime && i.status.startTime){
                            let st = new Date(i.status.startTime);
                            let ct = new Date(i.status.completionTime);
                            durationInSeconds = Math.floor((ct - st) / 1000) + '秒';
                        }
                        let status_class = i.spec?.suspend? 'c-99' : (i.status?.succeeded? 'c-green' : 'c-red');
                        let status_text = i.spec?.suspend? '挂起' : (i.status?.succeeded? '成功' : '失败');
                        let o = {
                            key: i.metadata.name,
                            title: i.metadata?.annotations?.title || i.metadata.name,
                            name: i.metadata.name,
                            sourceName: i.metadata.annotations['w7.cc/job-source-name'],
                            sourceTitle: i.metadata.annotations['w7.cc/job-source-title'],
                            source: i.metadata.annotations['w7.cc/job-source'],
                            searchJob: i.metadata?.labels?.searchJob,

                            startTime: window.formatDate(i.status.startTime),
                            completionTime: window.formatDate(i.status.completionTime),
                            durationInSeconds: durationInSeconds,
                            suspend: i.spec?.suspend,
                            status_text: status_text,
                            status_class: status_class,
                            status_success: !i.spec?.suspend && i.status?.succeeded,
                            dataItem: i,
                            type: 'jobs',
                        }
                        let matchTitle = o.title?.match(/^(\[[^\]]+\])(.*)$/)
                        if(matchTitle){
                            o.titleBefore = matchTitle[1];
                            o.titleAfter = matchTitle[2];
                        }else{
                            o.titleBefore = o.title;
                            o.titleAfter = '';
                        }
                        return o;
                    })
                    list.map(i=>{
                        let isonly = list.filter(j=>j.sourceName==i.sourceName);
                        if(isonly.length==1 || !i.sourceName){
                            grouplist.push(i);
                            return;
                        }
                        let findgroup = grouplist.find(j=>j.sourceName==i.sourceName);
                        if(findgroup){
                            // no-op
                        }else{
                            let title = "";
                            switch(i.source){
                                case 'cronjob': title = '周期执行 "'+i.sourceTitle+'" 的脚本任务'; break;
                                case 'deployment': title = '应用 "'+ i.sourceTitle +'" 的脚本任务'; break;
                                case 'job': title = '脚本任务 "'+ i.sourceTitle +'"'; break;
                                case 'custom': title = '脚本任务 "'+ i.sourceTitle +'"'; break;
                                default: title = i.sourceTitle; break;
                            }
                            let titleBefore = '';
                            let titleAfter = '';
                            let matchTitle = title?.match(/^(\[[^\]]+\])(.*)$/)
                            if(matchTitle){
                                titleBefore = matchTitle[1];
                                titleAfter = matchTitle[2];
                            }else{
                                titleBefore = title;
                                titleAfter = '';
                            }
                            grouplist.push({
                                key: i.sourceName,
                                title: title,
                                titleAfter: titleAfter,
                                titleBefore: titleBefore,
                                ...i,
                            })
                        }
                    })
                    this.joblist = grouplist;
                })
            }
        },
        comStatus(){
            if(!this.list?.length || !this.allJobs?.length){return}
            this.list.map((li,index)=>{
                let filter = this.allJobs.filter(i=>i.searchJob==li.searchJob);
                if(!filter?.length){
                    li.status_class = 'c-99';
                    return;
                }
                filter.sort((i,j)=>j.startTime-i.startTime);
                li.status_class = filter?.[0]?.statusSuccess? 'c-green' : 'c-red';
            })
        },
        toYaml(row){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ row.type +'/'+row.name).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ row.type +'/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getData();
                        })
                    }
                }
            });
        },
        toEdit(row,type){
            this.form.show = true;
            this.form.id = row.name;
            this.form.type = type;
            this.form.defaultData = null;
        },
        exeOnce(row){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/cronjobs/'+row.name).then(res=>{
                let data = res?.data || {};
                data.kind = 'Job';
                data.metadata.annotations = data.metadata?.annotations || {};
                data.metadata.annotations.title = data?.metadata?.annotations?.title;
                data.metadata.annotations['w7.cc/job-source'] = data.spec?.jobTemplate?.metadata?.annotations?.['w7.cc/job-source'] || '';
                data.metadata.annotations['w7.cc/job-source-name'] = data.spec?.jobTemplate?.metadata?.annotations?.['w7.cc/job-source-name'] || '';
                data.metadata.annotations['w7.cc/job-source-title'] = data.spec?.jobTemplate?.metadata?.annotations?.['w7.cc/job-source-title'] || '';

                data.metadata.name = this.createName(12);
                data.metadata.labels = data?.metadata?.labels || {};
                data.metadata.labels.searchJob = data.spec?.jobTemplate?.metadata?.labels?.searchJob;
                data.metadata.labels['w7.cc/job-source'] = 'cronjob';
                delete data.metadata.resourceVersion;
                data.spec = data.spec.jobTemplate.spec;
                data.spec.suspend = false;
                delete data.status;
                
                k8sproxy.post('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs', data).then(res=>{
                    if(res?.data){
                        this.$message.success('操作成功');
                        this.getData();
                    }
                })
            });
        },
        copyJob(row){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/'+row.name).then(res=>{
                let data = res?.data || {};
                data.metadata.name = this.createName(12);
                delete data.metadata.resourceVersion;
                delete data.metadata.uid;
                delete data.metadata.creationTimestamp;
                delete data.status;
                delete data.spec.template.metadata;
                data.spec = {template: data.spec.template};
                
                k8sproxy.post('/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs', data, {loading:true}).then(res=>{
                    if(res?.data){
                        this.$message.success('操作成功');
                        this.getData();
                    }
                })
            });
        },
        exeImt(row, type, suspend){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ (type=='CronJob'?'cronjobs':'jobs') +'/'+row.name).then(res=>{
                let data = res?.data || {};
                data.spec.suspend = type=='CronJob'? row.suspend : (suspend!==undefined? suspend : row.suspend);

                k8sproxy.put('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ (type=='CronJob'?'cronjobs':'jobs') +'/'+row.name, data).then(res=>{
                    if(res?.data){
                        this.$message.success('操作成功');
                        this.getData();
                    }
                })
            })
        },
        toDelete(row){
            k8sproxy.delete('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/'+ (this.activekey=='1'?'cronjobs':'jobs') +'/'+row.name).then(res=>{
                this.$message.success('删除成功');
                this.getData();
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
        getCron(cron,getObj){
            let txt = '';
            let obj = {};
            if(!cron){return getObj ? obj : txt;}
            let m = null;
            if(m = cron.match(/^(\d+) (\d+) (\d+) \* \?/)){
                let time = this.getTime(m[2], m[1], 0);
                txt = `每月${m[3]}日 ${time} 执行`;
                obj = {cycle:'everymon', week:1, day:Number(m[3]), hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) \? \* (\d)/)){
                let w = '日一二三四五六';
                let time = this.getTime(m[2], m[1], 0);
                txt = `每周${w[m[3]]} ${time} 执行`;
                obj = {cycle:'everyweek', week:Number(m[3]), day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) \* \* \*/)){
                let time = this.getTime(m[2], m[1], 0);
                txt = `每天 ${time} 执行`;
                obj = {cycle:'everyday', week:1, day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) \* \* \* \*/)){
                let time = this.getTime(null, m[1], 0);
                txt = `每小时 ${time} 执行`;
                obj = {cycle:'everyhour', week:1, day:1, hour:0, min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) (\d+) [\d\*]+\/(\d+) \* \?/)){
                let time = this.getTime(m[2], m[1], m[0]);
                txt = `每隔${m[3]}天，${time} 执行`;
                obj = {cycle:'eoday', week:1, day:Number(m[3]), hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^(\d+) [\d\*]+\/(\d+) \* \* \*/)){
                let time = this.getTime(null, m[1], 0);
                txt = `每隔${m[2]}小时，${time} 执行`;
                obj = {cycle:'eohour', week:1, day:1, hour:Number(m[2]), min:Number(m[1]), second:0, };
            }else if(m = cron.match(/^[\d\*]+\/(\d+) \* \* \* \*/)){
                txt = `每隔${m[1]}分钟执行`;
                obj = {cycle:'eomin', week:1, day:1, hour:0, min:Number(m[1]), second:0, };
            }
            return getObj ? obj : txt;
        },
        getTime(h,m,s){
            if(h!==null){
                h = Number(h)
                h = h<10? '0'+h : h;
            }
            m = Number(m)
            m = m<10? '0'+m : m;
            s = Number(s)
            s = s<10? '0'+s : s;
            return (h===null? '' : (h+':'))+m+':'+s;
        },
    }
}
</script>

<style scoped>
.point{display:inline-block; width:8px; height:8px; border-radius:50%; background:#999; margin-left:6px; margin-right:6px;}
.point.c-red{background:#D00805;}
.point.c-green{background:#00A870;}
.point.gray{background:#999;}
</style>
