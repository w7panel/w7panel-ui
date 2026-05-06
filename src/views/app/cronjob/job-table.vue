<template>
    <div>
        <a-table :data="list" class="cptable" :pagination="false" :bordered="false">
            <template #columns>
                <a-table-column title="任务名称">
                    <template #cell="{ record }">
                        <span class="point" :class="record.status_class"></span>
                        <span class="c-blue cursor" @click="$emit('showHis',record)">{{record.title}}</span>
                    </template>
                </a-table-column>
                <a-table-column title="操作" >
                    <template #cell="{ record }">
                        <a-tooltip v-if="debug&&!record.isgroup" content="yaml">
                            <i class="opt-icon" @click="toYaml(record)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="编辑">
                            <i class="opt-icon" @click="toEdit(record,'cronjob')"><icon-edit /></i>
                        </a-tooltip>
                        <a-popconfirm v-if="!record.isgroup" :content="'确认要删除吗'" @ok="toDelete(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                        <a-tooltip content="执行一次">
                            <i class="opt-icon" @click="exeOnce(record)"><icon-play-arrow /></i>
                        </a-tooltip>
                    </template>
                </a-table-column>
            </template>
        </a-table>
        
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';

export default {
    props: ['jobs'],
    data(){
        return {
            list: [],
            namespaceActive: '',
            yamlData: {
                show: false,
                data: null,
                title: '',
                submit: null,
            },
            form: {
                show: false,
                id: '',
                type: 'job',
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
    },
    methods: {
        exeOnce(item){
            let data = {
                apiVersion: 'batch/v1',
                kind: 'Job',
                metadata:{
                    name: this.createName(12),
                    namespace:  this.namespaceActive,
                    annotations: {
                        title: item.title || item.name,
                        "w7.cc/job-source": 'job',
                        "w7.cc/job-source-name": item.name,
                        "w7.cc/job-source-title": item.title,
                    },
                    labels: {
                        searchJob: item.searchJob,
                    },
                },
            };
            data.spec = {
                template: item.template,
            };
            k8sproxy.post('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs', data).then(res=>{
                if(res?.data){
                    this.$message.success('操作成功');
                    this.getList();
                }
            })
        },
        closeForm(v){
            this.form.show = false;
            if(v){ this.getList(); }
        },
        toEdit(row){
            this.form.show = true;
            this.form.id = row.name;
            this.form.type = 'job';
            this.$emit('edit',this.form);
        },
        toYaml(row){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/'+ row.type +'/'+row.name).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/'+ row.type +'/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
            });
        },
        toDelete(item){
            k8sproxy.delete('/api/v1/namespaces/'+this.namespaceActive+'/podtemplates/'+item.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
        },
        getList(){
            k8sproxy.get('/api/v1/namespaces/'+this.namespaceActive+'/podtemplates?labelSelector=type=job').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        name: i?.metadata?.name,
                        title: i?.metadata?.annotations?.title || i?.metadata?.name,
                        type: 'podtemplates',
                        template: i?.template,
                        searchJob: i?.metadata?.labels?.['searchJob'],
                    }
                });
                this.list = list;
                this.comStatus();
            });
            
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs').then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        statusSuccess: Boolean(!i.spec?.suspend && i.status?.succeeded),
                        sourceName: i.metadata.annotations['w7.cc/job-source-name'],
                        startTime: new Date(i.status.startTime).getTime(),
                        searchJob: i.metadata?.labels?.searchJob,
                    }
                })
                this.joblist = list;
                // console.log(list)
                this.comStatus();
            });
        },
        comStatus(){
            if(!this.list?.length || !this.joblist?.length){return}
            this.list.map((li,index)=>{
                let filter = this.joblist.filter(i=>i.searchJob==li.searchJob);
                if(!filter?.length){
                    li.status_class = 'c-99';
                    return;
                }
                filter.sort((i,j)=>j.startTime-i.startTime);
                li.status_class = filter?.[0]?.statusSuccess? 'c-green' : 'c-red';
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
    },
}
</script>

<style scoped>
.point{display:inline-block; width:8px; height:8px; border-radius:50%; background:#999; margin-left:6px; margin-right:6px;}
.point.c-red{background:#D00805;}
.point.c-green{background:#00A870;}
.point.gray{background:#999;}
</style>