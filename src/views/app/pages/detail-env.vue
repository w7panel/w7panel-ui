<template>
    <div class="padding-20">
          <a-table :data="list" :pagination="false">
            <template #columns>
                <a-table-column title="名称">
                    <template #cell="{ record }">
                        <span class="va-middle">{{record.title}}</span>
                        <a-popover v-if="record.description">
                            <icon-question-circle class="ml-4 fs-18 cursor c-66 va-middle" />
                            <template #content>
                                <div>{{record.description}}</div>
                            </template>
                        </a-popover>
                    </template>
                </a-table-column>
                <a-table-column title="键">
                    <template #cell="{ record }">
                        {{record.name}}
                    </template>
                </a-table-column>
                <a-table-column title="值">
                    <template #cell="{ record }">
                        <a-input v-model="formEnv[record.name]" size="small" :spellcheck="false" />
                    </template>
                </a-table-column>
            </template>
        </a-table>
        <div class="mt-20 txt-c">
            <a-button type="primary" @click="save">保存编辑的内容</a-button>
        </div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store';

export default {
    props: ['data'],
    data(){
        return {
            namespaceActive: 'default',
            env: [],
            formEnv: {},
            list: [],
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    watch:{
        data(v,ov){
            this.init();
        },
    },
    methods: {
        init(){
            this.env = this.data?.spec?.template?.spec?.containers[0]?.env || [];
            let list = this.data?.metadata?.annotations?.['w7.cc/start-params'];
            try{
                list = JSON.parse(list);
            }catch(e){
                list = [];
            }
            list = list.map(item=>{
                let value = this.env.find(v=>v.name==item.name);
                item.value = value?.value || item?.values_text || '';
                this.formEnv[item.name] = value?.value || '';
                return item;
            });
            this.list = list;
            console.log(list);
        },
        save(){
            let env = JSON.parse(JSON.stringify(this.env));
            for(let i in this.formEnv){
                let find = env.find(v=>v.name==i);
                if(!find){
                    env.push({name:i,value:this.formEnv[i]});
                }else{
                    find.value = this.formEnv[i];
                }
            }
            let containers = JSON.parse(JSON.stringify(this.data?.spec?.template?.spec?.containers));
            containers[0].env = env;

            k8sproxy.patch("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ this.$route.params.kind +"/"+this.$route.params.id, {
                spec: {
                    template: {
                        spec: { containers: containers, }
                    }
                }
            }, {
                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
            }).then(res=>{
                this.changeServerEdit = false;
                this.$message.success("修改成功");
                this.$emit('refresh');
            }).catch(()=>{})
        },
    },
}
</script>

<style>

</style>