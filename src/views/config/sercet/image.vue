<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <div>
                <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新建</a-button>
            </div>
            <div class="bg-white padding-20 mt-20">
                <table class="com-table"><tbody>
                    <tr>
                        <td>名称</td>
                        <td>仓库地址</td>
                        <td>命名空间</td>
                        <td>用户名</td>
                        <td>创建时间</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="(item,index) in list" :key="index">
                        <td>{{item.title || item.name}}</td>
                        <td>{{item.host}}</td>
                        <td>{{item.ns}}</td>
                        <td>{{item.username}}</td>
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

                            <!-- <span class="c-blue cursor operation" @click="openYaml(item)">YAML</span>
                            <span class="c-blue cursor operation" @click="openForm(item.name)">修改</span>
                            <a-popconfirm content="确定要删除该镜像仓库吗" @ok="del(item)" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <span class="c-blue cursor operation">删除</span>
                            </a-popconfirm> -->
                        </td>
                    </tr>
                    <tr v-if="!list || !list.length">
                        <td colspan="6"><a-empty /></td>
                    </tr>
                </tbody></table>
            </div>
        </div>
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <imageform-drawer :show="form.show" :id="form.id" @close="closeDrawer"></imageform-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore } from '@/store';
import imageformDrawer from './imageform-drawer.vue';
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
        imageformDrawer,
    },
    methods:{
        closeDrawer(v){
            this.form.show = false;
            if(v){ this.getList(); }
        },
        openForm(v){
            this.form.id = v || '';
            this.form.show = true;
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
                            this.yamlData = { show:false };
                        })
                    }
                }
            });
        },
        getList(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/dockerconfigjson',{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                this.list = list.map(i=>{
                    let dockerconfigjson = {};
                    if(i?.data['.dockerconfigjson']){
                        let dj = {}
                        try{
                            dj = JSON.parse(atob(i?.data['.dockerconfigjson']));
                        } catch(e){}
                        if(dj?.auths){
                            let o = Object.keys(dj?.auths).map(i=>({
                                host: i,
                                username: dj?.auths[i]?.username || '',
                                password: dj?.auths[i]?.password || '',
                            }));
                            o.length && (dockerconfigjson = o[0]);
                        }
                    }

                    return {
                        title: i?.metadata?.annotations?.title || '',
                        name: i?.metadata?.name || '',
                        namespace: i?.metadata?.namespace || '',
                        ns: atob(i?.data?.namespace || ''),
                        created_at: window.formatDate(i?.metadata?.creationTimestamp),
                        username: dockerconfigjson?.username || '',
                        // password: dockerconfigjson?.password || '',
                        host: dockerconfigjson?.host || '',
                    }
                });
            })
        },
        
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+row.name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getList();
            })
        },
    }
}

</script>

<style>

</style>