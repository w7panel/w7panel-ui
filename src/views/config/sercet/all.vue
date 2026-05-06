<template>
    <div class="padding-20">
        <route-breadcrumb />
        <!-- <div class="bg-white padding-20">
            <a-button type="primary" @click="$router.push({name:'config-secret-form'})">新建</a-button>
        </div> -->
        <div class="bg-white padding-20 ">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td>创建时间</td>
                    <td>操作</td>
                </tr>
                <tr v-for="(item,index) in list" :key="index">
                    <td>{{item.name}}</td>
                    <td>{{item.type=='file'?'配置文件':'环境变量'}}</td>
                    <td>{{item.created_at}}</td>
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(item)"><icon-code /></i>
                        </a-tooltip>
                        <a-popconfirm content="确定要删除该配置文件吗" @ok="del(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                        <!-- <span class="cursor c-blue" @click="openYaml(item)">YAML</span> -->
                        <!-- <span class="cursor c-blue ml-10" @click="$router.push({name:'config-secret-form',params:{id:item.name}})">修改</span> -->
                        <!-- <a-popconfirm content="确定要删除该配置文件吗" @ok="del(item)" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
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
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: "",
            list: [],
            yamlData: {},
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: { yamlDrawer, },
    methods:{
        getList(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets',{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                this.list = list.map(i=>{
                    return {
                        title: i?.metadata?.annotations?.title || '',
                        type: i?.data?.['default-cnf']? 'file':'env',
                        name: i?.metadata?.name || '',
                        namespace: i?.metadata?.namespace || '',
                        created_at: window.formatDate(i?.metadata?.creationTimestamp),
                    }
                });
            })
        },
        openYaml(row){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+row.name,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.getList();
                            this.yamlData.show = false;
                        })
                    }
                }
            })
        },
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+row.name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            })
        },
    },
}
</script>

<style>

</style>