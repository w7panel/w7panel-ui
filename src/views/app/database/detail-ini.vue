<template>
    <div class="bg-white padding-20 fc">
        
        <a-table :data="tableList" :pagination="false" :bordered="false" class="dbinitable">
            <template #columns>
                <a-table-column title="参数名">
                    <template #title>
                        <div class="df ai-c">
                            <span class="df-s0">参数名</span>
                            <a-input-search v-model="filterValue" class="ml-20" style="width:280px;" @search="tableFilter()" allow-clear @clear="tableFilter()" @press-enter="tableFilter()" placeholder="请输入搜索内容"/>
                        </div>
                    </template>
                    <template #cell="{ record }">
                        <a-popover v-if="dbtype!='mongodb'" position="right">
                            <icon-refresh v-if="record.isStatic" style="color:rgb(var(--danger-5));" class="mr-10" />
                            <icon-minus v-else class="c-99 mr-10" />
                            <template #content>
                                <span v-if="record.isStatic">静态参数，对这些参数进行修改会触发进程重启。</span>
                                <span v-else>动态参数，对这些参数进行修改会触发配置的动态重新加载，而无需重启进程。</span>
                            </template>
                        </a-popover>
                        <a-popover v-if="record.description" position="right">
                            <span class="cursor lh-1">
                                <span class="va-middle">{{record.key}}</span>
                                <icon-info-circle class="ml-4 fs-16 va-middle c-99" />
                            </span>
                            <template #content>
                                <div style="max-width:300px;">{{record.description}}</div>
                            </template>
                        </a-popover>
                        <span v-else>{{record.key}}</span>
                    </template>
                </a-table-column>
                <a-table-column v-if="dbtype!='mongodb'" title="参数默认值">
                    <template #cell="{ record }">
                        <span>{{record.default===''? '-' : record.default}}</span>
                    </template>
                </a-table-column>
                <a-table-column title="参数运行值" :width="dbtype=='mongodb'?600:400">
                    <template #cell="{ record }">
                        <div v-if="edit.name==record.name">
                            <a-select v-if="(record.type=='boolean'||record.type=='string')&&edit.options.length" v-model="edit.value" style="width:160px;" placeholder="请选择">
                                <a-option v-for="opt in edit.options" :key="opt" :value="opt" :label="opt.toString()"></a-option>
                            </a-select>
                            <a-input v-else-if="record.type=='number'" v-model="edit.value" size="small" :spellcheck="false" type="number" style="width:160px;" placeholder="请输入"></a-input>
                            <a-input v-else v-model="edit.value" size="small" :spellcheck="false" style="width:160px;" placeholder="请输入"></a-input>
                            <a-button size="small" type="primary" class="ml-10" @click="editValue">确定</a-button>
                            <a-button size="small" type="outline" class="ml-10" @click="edit.name=''">取消</a-button>
                        </div>
                        <div v-else>
                            <span>{{record.value===''? '-' : record.value}}</span>
                            <icon-edit @click="changeEdit(record)" class="ml-10 fs-16 c-blue cursor editbtn" />
                        </div>
                    </template>
                </a-table-column>
                <a-table-column v-if="dbtype!='mongodb'" title="参数可修改值" :width="300">
                    <template #cell="{ record }">
                        <a-popover v-if="record.type=='string'" position="left">
                            <span class="one-hide">{{record.enum || '-'}}</span>
                            <template #content>
                                <div style="max-width:500px;">{{record.enum}}</div>
                            </template>
                        </a-popover>
                        <span v-else-if="record.type=='integer'&&record.minimum&&record.maximum">{{'[' + record.minimum + ' - ' + record.maximum + ']'}}</span>
                        <span v-else>-</span>
                    </template>
                </a-table-column>
            </template>
        </a-table>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import ini from 'ini';
import jsyaml from "js-yaml";
import { useNamespaceStore } from '@/store'

export default {
    props: ['data','dbtype'],
    data(){
        return {
            namespaceActive: '',
            clusterName: '',
            list: [],
            filterValue: '',
            tableList: [],

            edit: {
                name: '',
                origin: '',
                value: '',
                options: [],
            }
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
    },
    watch:{
        data(v){
            if(!v){return}
            this.init();
        },
    },
    methods: {
        changeEdit(row){
            if(this.dbtype=='mongodb'){
                let options = [];
                if(row.type=='boolean'){ options = [true,false]; }
                this.edit = {
                    name: row.name,
                    origin: row.value,
                    value: row.value,
                    options,
                }
            }else{
                let options = [];
                if(row.type=='string'){ options = row.enum || []; }
                this.edit = {
                    name: row.name,
                    origin: row.value,
                    value: row.value,
                    options,
                }
            }
        },
        editValue(){
            // if(this.edit.value===this.edit.origin){
            //     this.edit = {...this.edit, name:''};
            //     return
            // }
            let data = {
                apiVersion: 'apps.kubeblocks.io/v1alpha1',
                kind: 'OpsRequest',
                metadata: {
                    name: this.createName(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.data.metadata.name,
                    enqueueOnForce: false,
                    preConditionDeadlineSeconds: 0,
                    reconfigure: {
                        componentName: this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/reconfigure-component-name'],
                        configurations: [{
                            keys: [{
                                key: this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/configmap-key'],
                                parameters: [{
                                    key: this.edit.name,
                                    value: this.edit.value.toString(),
                                }]
                            }],
                            name: this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/reconfigure-name'],
                        }]
                    },
                    type: 'Reconfiguring'
                },
            }
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',data).then(res=>{
                this.$message.success('操作成功');
                this.getList();
                this.edit = {name:'',value:''};
            })
        },
        tableFilter(){
            this.tableList = this.list.filter(i=>{
                return i.key.toLowerCase().includes(this.filterValue?.toLowerCase());
            })
        },
        init(){
            this.clusterName = this.data?.metadata?.name;
            if(!this.clusterName){return}
            this.getList();
        },
        async getList(){
            let list = [];

            let mn = this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/constraints-name'];
            let { data } = await k8sproxy.get('/apis/apps.kubeblocks.io/v1beta1/configconstraints/'+mn, {loading:true,});
            
            if(this.dbtype=='mongodb'){
                list = await this.parseMongodb(data);
            }else{
                list = await this.parseList(data);
            }
            
            this.list = list;
            this.tableFilter();
        },
        async parseMongodb(data){
            let configname = this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/configmap-name'];
            let configkey = this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/configmap-key'];
            let { data:config } = await k8sproxy.get('/api/v1/namespaces/default/configmaps/'+configname,{loading:true});
            let perseIni = jsyaml.load(config?.data?.[configkey]);
            let flattenObject = function(obj, parentKey = '') {
                let result = [];
                for (let key in obj) {
                    let newKey = parentKey ? `${parentKey}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key]!== null) {
                        result = result.concat(flattenObject(obj[key], newKey));
                    } else {
                        result.push({
                            key: newKey,
                            name: newKey,
                            value: obj[key]!==undefined? obj[key] : '',
                            type: typeof obj[key]
                        });
                    }
                }
                return result;
            }
            let list = flattenObject(perseIni);
            return list;
        },
        async parseList(data){
            let list = [];
            let properties = data?.spec?.parametersSchema?.schemaInJSON?.properties?.spec?.properties || {}
            let staticParameters = data?.spec?.staticParameters || [];
            let dynamicParameters = data?.spec?.dynamicParameters || [];
            let immutableParameters = data?.spec?.immutableParameters || [];

            for(let i in properties){
                let isStatic = staticParameters.includes(i);
                let isDynamic = dynamicParameters.includes(i);
                let isImmutable = immutableParameters.includes(i);
                if(isImmutable){continue}
                list.push({
                    ...properties[i],
                    key: i,
                    name: i,
                    isStatic,
                    isDynamic,
                    isImmutable,
                })
            }

            let configname = this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/configmap-name'];
            let configkey = this.data?.metadata?.annotations?.['w7panel.kubeblocks.io/configmap-key'];
            let { data:config } = await k8sproxy.get('/api/v1/namespaces/default/configmaps/'+configname,{loading:true});
            let perseIni = ini.parse(config?.data?.[configkey]);
            let o = {};
            for(let ini in perseIni){
                for(let name in perseIni[ini]){
                    o[name] = {
                        value: perseIni[ini][name],
                        key: ini+'.'+name
                    }
                }
            }
            list.map(i=>{
                i.value = i.default!==undefined? i.default : '';
                let item = o?.[i.name];
                if(!item){return}
                i.value = item?.value || i.value;
                i.key = item?.key || i.key;
            })

            return list;
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
.dbinitable .editbtn{display:none;}
.dbinitable tr:hover .editbtn{display:inline-block;}
</style>