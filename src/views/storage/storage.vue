<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>创建存储</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>标识</td>
                    <td>别名</td>
                    <td>状态</td>
                    <td>存储类</td>
                    <td>存储空间大小</td>
                    <td>创建时间</td>
                    <td>操作</td>
                </tr>
                <tr v-for="(item,index) in list" :key="index">
                    <td>{{item.name}}</td>
                    <td>{{item.title}}</td>
                    <td>
                        <span v-if="item.status == 'Bound'" class="c-green">{{item.status}}</span>
                        <span v-else class="c-red">{{item.status}}</span>
                    </td>
                    <td>{{item.storage_class}}</td>
                    <td>{{item.size}}</td>
                    <td>{{item.created_at}}</td>
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(item)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="openForm(item.name)"><icon-edit /></i>
                        </a-tooltip>
                        <a-popconfirm content="确定要删除吗" @ok="del(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>

                        <!-- <span class="cursor c-blue operation" @click="openYaml(item)">YAML</span> -->
                        <!-- <span class="cursor c-blue operation" @click="toEdit(item)">修改</span> -->
                        <!-- <span class="cursor c-blue operation" @click="openForm(item.name)">修改</span>
                        <a-popconfirm content="确定要删除吗" @ok="del(item)" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <span class="cursor c-blue operation">删除</span>
                        </a-popconfirm> -->
                    </td>
                </tr>
                <tr v-if="!list || !list.length">
                    <td colspan="7"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>
        
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <storage-drawer :show="form.show" :id="form.id" @close="closeDrawer"></storage-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios'
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore } from '@/store';
import storageDrawer from './storage-drawer.vue';
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
    components: {
        yamlDrawer,
        storageDrawer,
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
    },
    methods: {
        openForm(v){
            this.form.id = v || '';
            this.form.show = true;
        },
        closeDrawer(v){
            this.form.show = false;
            if(v){this.getData();}
        },
        openYaml(row){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims/'+row.name).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.getData();
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            });
        },
        getData(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims',{loading:true}).then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.filter(i=>!i.metadata.deletionTimestamp).map(item=>{
                    item.created_at = window.formatDate(item.metadata.creationTimestamp);
                    return {
                        title: item?.metadata?.annotations?.title,
                        name: item?.metadata?.name,
                        size: item?.spec?.resources?.requests?.storage,
                        storage_class: item?.spec?.storageClassName,
                        created_at: item.created_at,
                        creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                        status: item?.status?.phase,
                    };
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.list = list;
            })
        },
        openAdd(){
            this.$router.push({name:'storage-storage-form'})
        },
        toEdit(row){
            this.$router.push({name:'storage-storage-form',params:{id:row.name}})
        },
        del(row){
            k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/persistentvolumeclaims/'+row.name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                setTimeout(()=>{
                    this.getData();
                },600)
            })
            return;
            this.$confirm('确定要删除吗',"提示",{
                confirmButtonText: "确定",
                cancelButtonText: "取消",
            }).then(() =>{
            }).catch(()=>{})
        },
    },
}
</script>

<style>

</style>