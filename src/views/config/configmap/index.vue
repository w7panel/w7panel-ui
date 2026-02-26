<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <!-- <a-button type="primary" @click="$router.push({name:'config-configmap-form'})">新建</a-button> -->
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新建</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td style="width:200px;">操作</td>
                </tr>
                <tr v-for="(item,index) in list" :key="index">
                    <td>
                        <div class="c-blue cursor" @click="$router.push({name:'config-configmap-detail',params:{id:item.name}})">{{item.title || item.name}}</div>
                    </td>
                    <td>{{item.type=='file'?'配置文件':'环境变量'}}</td>
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(item)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="openForm(item.name)"><icon-edit /></i>
                        </a-tooltip>
                        <a-popconfirm content="确定要删除该配置文件吗" @ok="del(item)" position="lt">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>

                        <!-- <span class="cursor c-blue" @click="openYaml(item)">YAML</span>
                        <span class="cursor c-blue ml-10" @click="openForm(item.name)">修改</span>
                        <a-popconfirm content="确定要删除该配置文件吗" @ok="del(item)">
                            <span class="cursor c-blue ml-10">删除</span>
                        </a-popconfirm> -->
                    </td>
                </tr>
                <tr v-if="!list || !list.length">
                    <td colspan="6"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <form-drawer :show="form.show" :id="form.id" @close="closeDrawer"></form-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import formDrawer from './form-drawer.vue';
import { getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: "",
            list: [],
            yamlData: {},
            form: {
                show: false,
                id: '',
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
        formDrawer,
    },
    methods:{
        openForm(v){
            this.form.id = v || '';
            this.form.show = true;
        },
        closeDrawer(v){
            this.form.show = false;
            if(v){ this.getList(); }
        },
        openYaml(row){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+row.name,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            });
        },
        getList(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps',{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title,
                        name: i.metadata.name,
                        type: i.data?.['default-cnf']? 'file':'env',
                        createTime: window.formatDate(i.metadata?.creationTimestamp),
                        creationTimestamp: new Date(i?.metadata?.creationTimestamp || 0).getTime(),
                    }
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.list = list;
            })
        },
        
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+row.name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            })
            return;
            this.$confirm('确定要删除该配置文件吗',"提示",{
                confirmButtonText: "确定",
                cancelButtonText: "取消",
            }).then(() =>{
            }).catch(()=>{})
        },
    }
}

</script>

<style>

</style>