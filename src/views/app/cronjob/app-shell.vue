<template>
    <div>
        <a-table :data="list" class="cptable" :expanded-keys="expandedKeys" @expanded-change="v=>expandedKeys=v" :pagination="false" :bordered="false">
            <template #columns>
                <a-table-column title="任务名称">
                    <template #cell="{ record }">
                        <span v-if="!record.isgroup" style="color:var(--color-neutral-4);">
                            <span v-if="record.index<record.childLength">├──</span>
                            <span v-else>└──</span>
                        </span>
                        <span class="point" :class="record.status_class"></span>
                        <span class="cursor ml-4" :class="(!record.status_class || record.status_class=='c-99')?'c-99':'c-blue'" @click="toLog(record)">{{record.title||record.name}}</span>
                    </template>
                </a-table-column>
                <a-table-column title="来源">
                    <template #cell="{ record }">{{record.sourceTitle}}</template>
                </a-table-column>
                <a-table-column title="上次执行时间">
                    <template #cell="{ record }">{{record.startTime}}</template>
                </a-table-column>
                <a-table-column title="创建时间">
                    <template #cell="{ record }">{{record.creationTimestamp}}</template>
                </a-table-column>
                <a-table-column title="操作">
                    <template #cell="{ record }">
                        <a-tooltip v-if="!record.isgroup" content="立即执行">
                            <i class="opt-icon" @click="copyJob(record)"><icon-play-circle /></i>
                        </a-tooltip>
                        <a-tooltip v-if="!record.isgroup&&permission.includes('app/cronjob/edit')" content="编辑">
                            <i class="opt-icon" @click="toEdit(record,'job')"><icon-edit /></i>
                        </a-tooltip>
                    </template>
                </a-table-column>
            </template>
        </a-table>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store';
import { getPermission } from '@/utils/auth';

export default {

    data(){
        return {
            namespaceActive: '',
            apps: [],
            list: [],
            allJobs: [],
            expandedKeys: [],
            permission: [],
        }
    },
    created(){
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    methods: {
        getList(){
            // "/apis/apps/v1/namespaces/"+ this.namespaceActive +"/deployments"
            k8sproxy.get(`/apis/w7panel.w7.com/v1alpha1/namespaces/${this.namespaceActive}/appgroups`,{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                this.apps = {};
                list.map(i=>this.apps[i.metadata.name] = i);
                list = list.filter(i=>i.metadata?.labels?.['w7.cc/has-shell']==='true');
                list = list.map(i=>{
                    let name = i.metadata.name;
                    let title = i.metadata?.annotations?.title || name;
                    let item = {
                        title: '应用 "'+ title +'" 的脚本任务',
                        key: name,
                        isgroup: true,
                        status_class: 'c-99',
                        children: [],
                    }
                    
                    let shell = i.metadata?.annotations?.['w7.cc/shells'];
                    try{ shell = JSON.parse(shell); }catch{ shell = []; }
                    shell = shell.map(s=>{
                        let start = "";
                        switch(s.type){
                            case 'install': start = "应用安装时触发"; break;
                            case 'upgrade': start = "应用更新时触发"; break;
                            case 'uninstall': start = "应用卸载时触发"; break;
                            default: start = "应用脚本"; break;
                        }
                        return {
                            ...s,
                            appName:i.metadata.name,
                            title: '['+start+']' + (s.title || '默认任务'),
                        }
                    })

                    // if(i.metadata?.labels?.['w7.cc/has-build']==='true'){
                    //     shell = shell.concat([
                    //         {title: '[应用安装时触发]'+title+'构建镜像', appName:i.metadata.name, searchJob:i.metadata.name+'-build-install'},
                    //         {title: '[应用更新时触发]'+title+'构建镜像', appName:i.metadata.name, searchJob:i.metadata.name+'-build-upgrade'},
                    //     ])
                    // }
                    shell = shell.map(i=>{
                        i.childLength = shell.length;
                        return i;
                    });
                    item.children = shell;
                    item.status_class = 'c-99';
                    return item;
                });
                this.list = list;
                // console.log(list);
            }).then(()=>{
                return k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs')
            }).then(res=>{
                this.allJobs = res?.data?.items || [];
                let ml = this.allJobs.map(i=>{
                    let o = {
                        statusSuccess: Boolean(!i.spec?.suspend && i.status?.succeeded),
                        source: i.metadata?.annotations?.['w7.cc/job-source'],
                        sourceName: i.metadata?.annotations?.['w7.cc/job-source-name'],
                        sourceTitle: i.metadata?.annotations?.['w7.cc/job-source-title'],
                        searchJob: i.metadata?.labels?.searchJob,
                        startTime: window.formatDate(i.status.startTime),
                        creationTimestamp: window.formatDate(i.metadata.creationTimestamp),
                        
                    }
                    return o;
                })
                this.list.map(i=>{
                    let parentStatus = 'c-99'
                    i.children?.map((item,index)=>{
                        if(!item.searchJob){return}
                        let sj = ml.find(j=>j.searchJob==item.searchJob);
                        if(!sj){return;}
                        if(parentStatus=='c-99'){ parentStatus = 'c-green'; }
                        i.children[index] = {
                            ...item,
                            ...sj,
                            status_class: sj.statusSuccess? 'c-green' : 'c-red',
                        }
                        if(!sj.statusSuccess){ parentStatus = 'c-red'; }
                    })
                    i.status_class = parentStatus;
                })
                console.log(this.list)
            });
        },
        toLog(row){
            if(row.isgroup){
                if(this.expandedKeys.includes(row.key)){
                    this.expandedKeys = this.expandedKeys.filter(i=>i!=row.key);
                    return;
                }
                this.expandedKeys.push(row.key);
                return;
            }
            if(!row.status_class || row.status_class=='c-99'){return;}
            this.$emit('showHis',row);
        },
        toEdit(record){
            if(!record.searchJob){return}
            let data = this.getJobContent(record);
            this.$emit('toEditApp',data);
        },
        copyJob(record){
            let data = this.getJobContent(record);
            
            let vname = 'lsml-'+ this.createName();
            let cts = data.spec?.template?.spec?.containers || [];
            let volumes = data.spec?.template?.spec?.volumes || [];
            let volumesNames = [];
            // 添加临时目录/data
            cts.map((i,index)=>{
                let cvn = cts[index].volumeMounts.map(vm=>vm.name) || [];
                volumesNames = volumesNames.concat(cvn);
                let vmdata = cts[index].volumeMounts?.find(i=>i.mountPath=='/tmp-w7-data');
                //  || !volumes?.find(i=>i.name==vmdata.name)?.emptyDir
                if(!vmdata){
                    cts[index].volumeMounts.push({name: vname, mountPath: '/tmp-w7-data'});
                    volumes.push({name: vname, emptyDir: {}})
                    volumesNames.push(vname);
                }
            })
            volumes = volumes.filter(i=>volumesNames.includes(i.name));
            volumes = Array.from(new Set(volumes.map(JSON.stringify))).map(JSON.parse);
            
            k8sproxy.post('/apis/batch/v1/namespaces/'+this.namespaceActive+'/jobs', data, {loading:true}).then(res=>{
                if(res?.data){
                    this.$message.success('操作成功');
                    this.getList();
                }
            })
        },
        getJobContent(record){
            let app = this.apps[record.appName];
            let command = record.shell? ["/bin/sh", "-c", record.shell] : [];
            try{
                app.spec.template.spec.containers[0].command = command;
            }catch{}
            let data = {
                kind: 'Job',
                apiVersion: 'batch/v1',
                metadata: {
                    name: this.createName(12),
                    namespace:  this.namespaceActive,
                    annotations: {
                        title: record.title,
                        recordApp: '["'+ record.appName +'"]',
                        'w7.cc/job-source': 'deployment',
                        'w7.cc/job-source-name': record.appName,
                        'w7.cc/job-source-title': app?.metadata?.annotations?.title,
                    },
                    labels: {
                        searchJob: record.searchJob,
                    },
                },
                spec: {
                    template: {
                        spec: {
                            containers: app.spec.template.spec.containers,
                            restartPolicy: 'Never',
                            volumes: app.spec.template.spec.volumes,
                        },  
                    },
                },
            }
            return data;
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
    },
}
</script>

<style scoped>
.point{display:inline-block; width:8px; height:8px; border-radius:50%; background:#999; margin-left:6px; margin-right:6px;}
.point.c-red{background:#D00805;}
.point.c-green{background:#00A870;}
.point.gray{background:#999;}
</style>
