<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="openForm()"><template #icon><icon-plus /></template>新增</a-button>
        </div>
        <div class="bg-white padding-20 mt-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>micro_html</td>
                    <td>title</td>
                    <td style="width:300px;">操作</td>
                </tr>
                <tr v-for="(item,index) in list" :key="index">
                    <td>{{item.micro_html}}</td>
                    <td>{{item.title}}</td>
                    <td>
                        <a-tooltip content="预览">
                            <i class="opt-icon" @click="preview(item)"><icon-eye /></i>
                        </a-tooltip>
                        <a-popconfirm :content="'确认要删除吗'" @ok="toDelete(index)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr v-if="!list || !list.length">
                    <td colspan="3"><a-empty /></td>
                </tr>
            </tbody></table>
        </div>
        <a-drawer :width="800" :visible="form.show" @ok="submit" @cancel="form.show=false;" :popup-container="$popupContainer">
            <template #title>新增</template>
            <a-form :model="form" class="mt-20" label-width="80px" auto-label-width>
                <a-form-item label="名称">
                    <a-input v-model="form.title" placeholder="请输入名称" :spellcheck="false" />
                </a-form-item>
                <a-form-item label="URL">
                    <a-input v-model="form.micro_html" placeholder="请输入页面url" :spellcheck="false" />
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore } from '@/store';

export default {
    data(){
        return {
            namespaceActive: '',
            list: [],
            form: {
                show: false,
                micro_html: '',
                title: '',
            }
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
    },
    methods: {
        getData(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps?labelSelector=type=micro-plugin',{loading:true}).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title,
                        name: i.metadata.name,
                        micro_html: i.data?.micro_html,
                        creationTimestamp: new Date(i?.metadata?.creationTimestamp || 0).getTime(),
                    }
                })
                list.sort((a,b)=>(b.creationTimestamp - a.creationTimestamp));
                this.list = list;
            })
        },
        preview(item){
            this.$router.push('/micro-plugin/preview?name='+ item.name);
        },
        openForm(){
            this.form = {
                show: true,
                micro_html: '',
                title: '',
            }
        },
        submit(){
            let name = this.createName() + '-plugin'
            let o = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    name: name,
                    labels: { type: 'micro-plugin' },
                    annotations: {
                        title: this.form.title,
                    }
                },
                data: {
                    'micro_html': this.form.micro_html,
                }
            }
            return k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps", o, {loading:true}).then(res=>{
                this.form.show = false;
                this.getData();
            });
        },
        toDelete(index){
            let item = this.list[index];
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+ item.name, {loading:true}).then(res=>{
                this.getData();
            });
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
    }
}
</script>

<style>

</style>