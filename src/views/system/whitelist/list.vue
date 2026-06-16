<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加</a-button>
        </div>
        <div class="bg-white padding-20 mt-20 fc">
            <a-table :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="域名">
                        <template #cell="{ record }">
                            {{record.prefix}}{{record.domain}}
                        </template>
                    </a-table-column>
                    <a-table-column v-if="userMode=='cluster'" title="随机前缀">
                        <template #cell="{record}">
                            <a-switch v-model="record.prefixRandom" @change="editPrefixRandom(record)"></a-switch>
                        </template>
                    </a-table-column>
                    <a-table-column title="启用">
                        <template #cell="{ record,rowIndex }">
                            <a-switch v-model="record.disabled" :checked-value="false" :unchecked-value="true" @change="chengDisabled(record,rowIndex)"></a-switch>
                            <!-- {{record.disabled?'否':'是'}} -->
                        </template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record,rowIndex }">
                            <a-popconfirm :content="'确认要删除吗'" @ok="del(record,rowIndex)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <span :id="'whitelist-remove-'+rowIndex" class="c-blue cursor operation">删除</span>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <a-drawer :width="800" title="添加" :visible="form.show" @ok="submit" @cancel="form.show=false;" :popup-container="$popupContainer">
            <a-form ref="form" :rules="rules" :model="form" auto-label-width class="padding-20">
                <a-form-item label="前缀" field="prefix">
                    <span>{{form.prefix}}</span>
                    <!-- <a-input v-model="form.prefix" :spellcheck="false" placeholder="请输入"></a-input> -->
                </a-form-item>
                <a-form-item label="域名" field="domain">
                    <a-input v-model="form.domain" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="启用">
                    <a-switch v-model="form.disabled" :checked-value="false" :unchecked-value="true" ></a-switch>
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore,useLoadingStore } from '@/store';
import { getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            exist: false,
            namespaceActive: '',
            list: [],
            form: {
                show:false,
            },
            rules: {
                prefix: [{ required: true, message: '请输入前缀', trigger: 'blur' },],
                domain: [{ required: true, message: '请输入域名', trigger: 'blur' },],
            },
            userMode: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
        this.userMode = getUserInfo()?.['w7.cc/user-mode'];
    },
    methods: {
        editPrefixRandom(row,index){
            let list = this.list.map((i,id)=>{
                let prefixRandom = id==index? row.prefixRandom : i.prefixRandom;
                return {
                    prefix: i.prefix,
                    domain: i.domain,
                    disabled: i.disabled,
                    prefixRandom: prefixRandom,
                }
            })
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{
                data:{whiteList:JSON.stringify(list)}
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.form.show = false;
                this.getList();
            })
        },
        getList(){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{noAlert:true}).then(res=>{
                this.exist = true;
                let list = [];
                try{
                    list = JSON.parse(res?.data?.data?.whiteList)
                }catch{}
                list.map(i=>{
                    i.prefixRandom = i?.prefixRandom || false;
                    i.disabled =  i?.disabled || false;
                })
                this.list = list;
            })
        },
        add(){
            this.form = {
                ...this.form,
                show: true,
                prefix: '*.',
                domain: '',
                disabled: false,
            }
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }
                
                let formData = {
                    prefix: this.form.prefix,
                    domain: this.form.domain,
                    disabled: this.form.disabled,
                }
                if(this.exist){
                    let list = this.list.map(i=>{
                        return {
                            prefix: i.prefix,
                            domain: i.domain,
                            disabled: i.disabled,
                        }
                    })
                    list.push(formData);
                    k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{
                        data:{whiteList:JSON.stringify(list)}
                    },{
                        headers: {'Content-Type': 'application/strategic-merge-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }else{
                    let data = {
                        kind: 'ConfigMap',
                        apiVersion: 'v1',
                        metadata: {
                            name: 'domain-white-list',
                            namespace: this.namespaceActive,
                        },
                        data: {
                            whiteList: JSON.stringify([formData]),
                        }
                    }
                    k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps', data, {loading:true}).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                }
            });
        },
        chengDisabled(row,index){
            let list = this.list.map((i,id)=>{
                let disabled = id==index? row.disabled : i.disabled;
                return {
                    prefix: i.prefix,
                    domain: i.domain,
                    disabled: disabled,
                }
            })
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{
                data:{whiteList:JSON.stringify(list)}
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.form.show = false;
                this.getList();
            })
        },
        del(row,index){
            let list = this.list.map(i=>{
                return {
                    prefix: i.prefix,
                    domain: i.domain,
                    disabled: i.disabled,
                }
            })
            list.splice(index,1);
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/configmaps/domain-white-list',{
                data:{whiteList:JSON.stringify(list)}
            },{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.form.show = false;
                this.getList();
            })
        },
    },
}
</script>

<style>

</style>