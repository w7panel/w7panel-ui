<template>
    <div class="padding-20">
        
        <a-form label-suffix="" auto-label-width class="padding-20 ">
            <a-form-item label="名称" style="margin-bottom:0;">{{info.name}}</a-form-item>
            <a-form-item label="版本" style="margin-bottom:0;">{{info.version}}</a-form-item>
            <a-form-item label="描述" style="margin-bottom:0;">{{info.description}}</a-form-item>
        </a-form>
        
        <a-tabs v-model="cardActive" class="helm-detail-tabs">
            <a-tab-pane :key="1" title="Resources">
                <a-table :data="resources" class="cptable" :pagination="false" @filter-change="resources=getResources(manifest);">
                    
                    <template #columns>
                         <!-- :filterable="filterable" -->
                        <a-table-column title="资源名称">
                            <template #title>
                                <div class="df ai-c">
                                    <span class="df-s0">资源名称</span>
                                    <a-input-search v-model="filterValue" class="ml-20" style="width:280px;" @search="tableFilter()" allow-clear @clear="tableFilter()" @press-enter="tableFilter()" placeholder="请输入搜索内容"/>
                                </div>
                            </template>
                            <template #cell="{ record }">
                                <span class="c-blue cursor" @click="tableFilter(record.kind)">{{record.kindTxt}}</span>
                                <span v-if="record.isApp" class="ml-5 c-blue cursor" @click="toApp(record)">{{record.name}}</span>
                                <span v-else class="ml-5">{{record.name}}</span>
                            </template>
                        </a-table-column>
                        <!-- <a-table-column title="资源名">
                            <template #cell="{ record }">{{record.name}}</template>
                        </a-table-column> -->
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <a-tooltip v-if="debug" content="yaml">
                                    <span class="opt-icon" @click="openYaml(record)">
                                        <icon-code />
                                    </span>
                                </a-tooltip>
                                <a-tooltip v-if="record.matchLabels" content="域名管理">
                                    <span class="opt-icon" @click="toDomain(record)">
                                        <icon-link />
                                    </span>
                                </a-tooltip>
                                <a-tooltip v-if="record.matchLabels" content="文件管理">
                                    <span class="opt-icon" @click="toFile(record)">
                                        <icon-folder />
                                    </span>
                                </a-tooltip>
                            </template>
                        </a-table-column>
                    </template>
                    <!-- <template #name-filter="{ filterValue, setFilterValue, handleFilterConfirm}">
                        <div class="bg-white padding-10 df ai-c" style="box-shadow:0 0 10px rgba(0, 0, 0, 0.2);transform:translateX(-50%);margin-left:24px;">
                            <a-input ref="tablesearchinput" :model-value="filterValue[0]" @input="(value)=>setFilterValue([value])"  @press-enter="handleFilterConfirm" placeholder="请输入搜索条件" />
                            <a-button ref="tablesearchbutton" @click="handleFilterConfirm" type="primary" style="padding:0 10px;"><template #icon><icon-search /></template></a-button>
                        </div>
                    </template> -->
                </a-table>
            </a-tab-pane>
            <a-tab-pane :key="2" title="Manifests">
                <div id="helmManifests"></div>
            </a-tab-pane>
            <a-tab-pane :key="3" title="Values">
                <div class="df ai-c jc-e">
                    <a-button v-if="userDefined" @click="update" type="outline" size="small">更新</a-button>
                    <a-checkbox v-model="userDefined" class="ml-20">仅用户定义</a-checkbox>
                </div>
                <div class="mt-10">
                    <div v-show="userDefined" id="helmUserValues"></div>
                    <div v-show="!userDefined" id="helmValues"></div>
                </div>
            </a-tab-pane>
            <a-tab-pane :key="4" title="Notes">
                <div v-text="notes" class="helm-notes padding-10"></div>
            </a-tab-pane>
        </a-tabs>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import {basicSetup, EditorView} from "codemirror";
import { yaml } from "@codemirror/lang-yaml";
import jsyaml from 'js-yaml';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { useNamespaceStore, useLoadingStore } from '@/store'
import { IconSearch } from '@arco-design/web-vue/es/icon';
import {h} from 'vue'
import { getUserInfo } from '@/utils/auth';

export default {
    data(){
        return {
            namespaceActive: '',
            cardActive: 1,
            resources: [],
            manifests: '',
            manifestsEditor: null,
            filterValue: '',

            api: [],
            apis: [],

            values: '',
            valuesConfig: '',
            valuesEditor: null,
            valuesConfigEditor: null,
            userDefined: false,

            notes: '',
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            info: {
                name: '',
                version: '',
                description: '',
            },
            filterable: {
                filter: (value, record) => {
                    if(Array.isArray(value)){
                        value = value[0];
                    }
                    let checkName = record.name?.toLowerCase().includes(value?.toLowerCase());
                    let checkKind = record.kind?.toLowerCase().includes(value?.toLowerCase());
                    return checkName || checkKind;
                },
                filters: [],
                slotName: 'name-filter',
                icon: () => h(IconSearch),
            },
            debug: false,
        }
    },
    watch:{
        '$route.params.group'(){
            this.getData();
        },
        // userDefined(v){
        //     if(!this.valuesEditor){return}
        //     let txt = this.valuesEditor.state.doc.toString();
        //     this.valuesEditor.dispatch({
        //         changes: {from:0, to:txt.length, insert:v? this.valuesConfig : this.values }
        //     });
        // },
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getSearchData();
        this.getData();
    },
    components: {yamlDrawer},
    methods: {
        update(){
            let value = this.valuesConfigEditor.state.doc.toString();
            panelApi.put(`/helm/releases/${this.$route.params.group}/reuse`,{
                "namespace": this.namespaceActive,
                "vals": jsyaml.load(value),
            },{loading:true}).then(res=>{
                this.$message.success('操作成功');
                this.getData();
            });
        },
        tableFilter(value){
            if(value){this.filterValue = value;}
            this.resources = this.getResources(this.manifest).filter(record=>{
                let checkName = record.name?.toLowerCase().includes(this.filterValue?.toLowerCase());
                let checkKind = record.kind?.toLowerCase().includes(this.filterValue?.toLowerCase());
                return checkName || checkKind;
            })
        },
        async getSearchData(){
            await k8sproxy.get('/apis',{
                headers:{"Accept": "application/json;g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
                loading: true,
            }).then(res=>{
                let items = res?.data?.items || [];
                let o = {};
                for(let i of items){
                    let versions = {};
                    for(let v of i.versions){
                        let kinds = {};
                        if(!v?.resources){continue}
                        for(let k of v.resources){
                            kinds[k.responseKind.kind] = {
                                resource: k.resource,
                                scope: k.scope,
                            }
                        }
                        versions[v.version] = kinds;
                    }
                    o[i.metadata.name] = versions;
                }
                this.apis = o;
            })
            await k8sproxy.get('/api',{
                headers:{"Accept": "g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList,application/json;g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList,application/json"},
            }).then(res=>{
                let items = res?.data?.items || [];
                let o = {};
                let versions = {};
                for(let v of items?.[0]?.versions){
                    let kinds = {};
                    for(let k of v.resources){
                        kinds[k.responseKind.kind] = {
                            resource: k.resource,
                            scope: k.scope,
                        }
                    }
                    versions[v.version] = kinds;
                }
                o['core'] = versions;
                this.apis = Object.assign(this.apis,o);
            })
        },
        toApp(row){
            this.$router.push({
                name: 'app-detail-detail',
                params:{...this.$route.params, id:row.name, kind:row.kind.toLowerCase()+'s'}
            });
        },
        toFile(row){
            this.$router.push({
                name: 'app-detail-files',
                params:{...this.$route.params, id:row.name, kind:row.kind.toLowerCase()+'s'}
            });
        },
        toDomain(row){
            this.$router.push({
                name: 'app-detail-domain',
                params:{...this.$route.params, id:row.name, kind:row.kind.toLowerCase()+'s'}
            });
        },
        getData(){
            k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/appgroups/'+this.$route.params.group).then(res=>{
                this.info = {
                    ...this.info,
                    version: res.data.spec.version,
                }
            })
            panelApi.get('/helm/releases/'+this.$route.params.group,{loading:true}).then(res=>{
                let data = res?.data;
                this.info = {
                    ...this.info,
                    name: data?.chart?.metadata?.name,
                    description: data?.chart?.metadata?.description,
                }
                this.manifest = data.manifest;

                let values = this.deepMerge(data?.chart?.values, data?.config); // Object.assign(data?.chart?.values, data?.config);

                this.values = jsyaml.dump(values);
                this.valuesConfig = jsyaml.dump(data.config || {});

                this.notes = data?.info?.notes || '';
                this.editorInit({
                    editor: 'manifestsEditor',
                    domId: 'helmManifests',
                    yaml: this.manifest,
                    canEdit: false,
                });
                this.editorInit({
                    editor: 'valuesEditor',
                    domId: 'helmValues',
                    yaml: this.values,
                    canEdit: false,
                });
                this.editorInit({
                    editor: 'valuesConfigEditor',
                    domId: 'helmUserValues',
                    yaml: this.valuesConfig,
                    canEdit: true,
                });
                this.resources = this.getResources(this.manifest);
            })
        },
        getResources(m){
            let arr = m?.split('\n---\n') || [];
            let types = {
                'DaemonSet': '守护进程应用',
                'StatefulSet': '有状态应用',
                'Deployment': '无状态应用',
            }
            let datas = arr.map(i=>jsyaml.load(i));
            
            let list = datas.filter(i=>i).map(i=>{
                let kindTxt = '['+ ( types[i.kind] || i.kind) +']';
                return {
                    api: i.apiVersion,
                    kind: i.kind,
                    isApp: types[i.kind],
                    kindTxt: kindTxt,
                    name: i.metadata?.name,
                    namespace: i.metadata?.namespace,
                    matchLabels: i.spec?.selector?.matchLabels,
                }
            });
            list.sort((a,b)=>{
                return (types[a.kind]&&!types[b.kind])? -1 : 1;
            })
            return list;
        },
        openYaml(row){
            let api = row.api.split('/');
            if(api.length==1){
                api = ['core',row.api];
            }
            console.log(row,this.apis)
            let kind = this.apis[api[0]][api[1]][row.kind].resource;
            let namespace = this.apis[api[0]][api[1]][row.kind].scope == 'Namespaced'? 'namespaces/'+this.namespaceActive+'/' : '';

            let url = `${row.api=='v1'?'/k8s-proxy/api/':'/k8s-proxy/apis/'}${row.api}/${namespace}${kind}/${row.name}`;
            axios.get(url,{loading:true}).then(res=>{
                this.yamlData = {
                    show: true,
                    data: res.data,
                    title: row.name,
                    submit: (data)=>{
                        return axios.put(url, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        editorInit(o){
            // editor domId yaml
            let myTheme = EditorView.theme({"&": { height: 'auto'}}, {dark: false});
            if(!this[o.editor]){
                this[o.editor] = new EditorView({
                    doc: "",
                    extensions: [
                        basicSetup,
                        myTheme,
                        yaml(),
                        EditorView.editable.of(o.canEdit),
                    ],
                    parent: document.getElementById(o.domId),
                });
            }
            let txt = this[o.editor].state.doc.toString();
            this[o.editor].dispatch({
                changes: {from:0, to:txt.length, insert:o.yaml || ''}
            });
        },
        deepMerge(target, source) {
            const isObject = (obj) => obj && typeof obj === 'object';

            if (!isObject(target) || !isObject(source)) {
                return source;
            }

            Object.keys(source).forEach(key => {
                const targetValue = target[key];
                const sourceValue = source[key];

                if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                    target[key] = targetValue.concat(sourceValue);
                } else if (isObject(targetValue) && isObject(sourceValue)) {
                    target[key] = this.deepMerge(Object.assign({}, targetValue), sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            });

            return target;
        },
    },
}
</script>

<style scoped>
.helm-notes{white-space:pre-wrap; line-height:1.6; border:1px solid var(--color-neutral-3);}
</style>
<style>
.helm-detail-tabs .arco-tabs-content{padding-top:0;}
.helm-detail-tabs .arco-tabs-content-item{padding:10px;}
</style>