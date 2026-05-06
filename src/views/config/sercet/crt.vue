<template>
    <div class="padding-20" v-loading="loading">
        <route-breadcrumb />
        <div>
            <div>
                <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>创建证书</a-button>
            </div>
            <div class="bg-white padding-20 mt-20">
                <table class="com-table"><tbody>
                    <tr>
                        <td>证书名称</td>
                        <td>关联域名列表</td>
                        <td>有效期开始时间</td>
                        <td>有效期截止时间</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="(item,index) in list" :key="index">
                        <td>{{item.title || item.name}}</td>
                        <td>
                            <span v-if="item.domains.length==1">{{item.domains[0]}}</span>
                            <a-popover v-if="item.domains.length>1" placement="bottom" :width="200" trigger="hover">
                                <template #reference>
                                    <div class="df df-c cursor">
                                        <span>{{item.domains[0]}}</span>
                                        <span>等{{item.domains.length}}个域名</span>
                                    </div>
                                </template>
                                <div class="df df-c">
                                    <div v-for="(item,index) in item.domains" :key="index">
                                        <span>{{item}}</span>
                                    </div>
                                </div>
                            </a-popover>
                        </td>
                        <td>{{item.startTime}}</td>
                        <td>{{item.endTime}}</td>
                        <td>
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(item)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="openForm(item.name)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm content="确定要删除该证书吗" @ok="del(item)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>

                            <!-- <span class="c-blue cursor" @click="openYaml(item)">YAML</span> -->
                            <!-- <span class="c-blue cursor ml-10" @click="openForm(item.name)">修改</span> -->
                            <!-- <a-popconfirm content="确定要删除该证书吗" @ok="del(item)" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <span class="c-blue cursor ml-10">删除</span>
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
        <crtform-drawer :show="form.show" :id="form.id" @close="closeDrawer"></crtform-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import forge from 'node-forge';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore } from '@/store';
import crtformDrawer from './crtform-drawer.vue';
import { getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: "",
            yamlData: {},
            list: [],
            selectRows: [],
            loading: false,
            form: {
                show: false,
                id: '',
            },
            debug: false,
        }
    },
    components: {
        yamlDrawer,
        crtformDrawer,
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
            if(v){ this.getData();}
        },
        openYaml(row){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+row.name,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            });
        },
        getData(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/secrets?fieldSelector=type=kubernetes.io/tls',{loading:true}).then(res=>{
                let data = res?.data?.items || [];
                let list = data.map(item=>{
                    let crt = (item?.data && item?.data['tls.crt']) || '';
                    crt = atob(crt);
                    let json = {};
                    try{
                        json = forge.pki.certificateFromPem(crt);
                    }catch(e){
                        console.log('解析证书失败')
                    }
                    let domains = json?.subject?.attributes || [];
                    domains = domains.map(item=>item.value);
                    return {
                        title: item?.metadata?.annotations?.title || '',
                        name: item.metadata.name,
                        domains: domains,
                        startTime: window.formatDate(json?.validity?.notBefore),
                        endTime: window.formatDate(json?.validity?.notAfter),
                        creationTimestamp: new Date(item?.metadata?.creationTimestamp || 0).getTime(),
                    }
                });
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.list = list;
            })
        },
        del(row){
            k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+row.name,{loading:true}).then(res=>{
                if(!res?.data){return}
                this.$message.success('删除成功');
                this.getData();
            })
            return;
            this.$confirm('确定要删除该证书',"提示",{
                confirmButtonText: "确定",
                cancelButtonText: "取消",
            }).then(() =>{
            }).catch(()=>{})
        },
        // deleteMultiple(){
        //     let names = this.selectRows.map(i=>i.name);
        //     this.$confirm('确定要删除选中的内容吗',"提示",{
        //         confirmButtonText: "确定",
        //         cancelButtonText: "取消",
        //     }).then(async () =>{
        //         let length = names.length;
        //         let dellen = 0;
        //         this.loading = true;
        //         for(let i=0; i<length; i++){
        //             let del = await k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/secrets/'+names[i]).then(res=>{
        //                 return Boolean(res?.data);
        //             })
        //             if(del){dellen++}
        //         }
        //         this.loading = false;
        //         this.$message.success(`${dellen}条删除成功 ${length-dellen>0?(length-dellen)+'条删除失败':''}`);
        //         setTimeout(()=>{
        //             this.getData();
        //         },300)
        //     })
        // },
    },
}
</script>

<style>

</style>