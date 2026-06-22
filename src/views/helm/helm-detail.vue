<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <route-breadcrumb :data="{name:title}" />
        <a-layout class="fc">
            <a-layout-sider :width="120">
                <div class="df df-c" style="height:100%;">
                    <a-tabs v-model:active-key="cardActive" @tab-click="changeKey" position="left" hide-content class="helm-menutabs">
                        <a-tab-pane key="detail" :title="this.title"></a-tab-pane>
                        <a-tab-pane key="resources" title="Resources"></a-tab-pane>
                        <a-tab-pane key="manifests" title="Manifests"></a-tab-pane>
                        <a-tab-pane key="values" title="Values"></a-tab-pane>
                        <a-tab-pane key="notes" title="Notes"></a-tab-pane>
                    </a-tabs>
                    <a-tabs v-if="appMenu && appLocation" :active-key="cardActive" @tab-click="toMicro" class="helm-menutabs mt-20" position="left" hide-content>
                        <a-tab-pane disabled title="应用菜单"></a-tab-pane>
                        <a-tab-pane v-for="item in appMenu" :key="item.do" :title="item.title"></a-tab-pane>
                    </a-tabs>
                </div>
            </a-layout-sider>
            <a-layout-content class="ml-6 df df-c">
                <div class="bg-white padding-20" style="min-height:100%;">
                    <a-form v-if="cardActive=='detail'" :model="info" auto-label-width>
                        <a-form-item label="名称" class="mb-0">{{info.title}}</a-form-item>
                        <a-form-item label="描述" class="mb-0">{{info.description}}</a-form-item>
                        <a-form-item label="命名空间" class="mb-0">{{info.namespace}}</a-form-item>
                        <a-form-item label="状态" class="mb-0">{{info.status}}</a-form-item>
                        <a-form-item label="创建时间" class="mb-0">{{info.first_deployed}}</a-form-item>
                        <a-form-item label="最后更新时间" class="mb-0">{{info.last_deployed}}</a-form-item>
                    </a-form>

                    <div v-if="cardActive=='resources'" >
                        <table class="com-table" style="width:100%;"><tbody>
                            <tr class="thead"><td>资源类型</td><td>资源名</td><td>操作</td></tr>
                            <tr v-for="(item,index) in manifest_json" :key="index">
                                <td>{{item.kind}}</td>
                                <td>
                                    <span v-if="item.kind=='Deployment'" @click="toDeployment(item.data)" class="cursor c-blue">{{item.name}}</span>
                                    <span v-else >{{item.name}}</span>
                                </td>
                                <td>
                                    <span v-if="debug" @click="openYaml(item)" class="c-blue cursor ml-10">YAML</span>
                                </td>
                            </tr>
                        </tbody></table>
                    </div>

                    <div v-if="cardActive=='manifests'" >
                        <div class="box df-s0">
                            <div class="yamldom hljs df" v-html="yamlDom"></div>
                        </div>
                    </div>

                    <div v-if="cardActive=='values'" >
                        <div class="box df-s0">
                            <div class="yamldom hljs df" v-html="valuesDom"></div>
                        </div>
                    </div>

                    <div v-if="cardActive=='notes'" >
                        <a-card title="Notes">
                            <div class="notes" style="white-space:pre-wrap;line-height:1.6;">{{notes}}</div>
                        </a-card>
                    </div>

                    <router-view v-if="$route.name=='helm-detail-micro' && appdata" :data="appdata" :url="appLocation" @refresh="getData" />
                </div>
            </a-layout-content>
        </a-layout>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';

import hljs from 'highlight.js';
import jsyaml from 'js-yaml';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';

import { useNamespaceStore } from '@/store';

export default {
    data() {
        return {
            namespaceActive: '',
            title: '',
            cardActive: 'detail',
            
            info: {},
            manifest_json: [],
            yamlDom: '',
            valuesDom: '',
            notes: '',

            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },

            appLocation: '',
            appMenu: null,
            appdata: null,
            debug: false,

        }
    },
    created() {
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getData();
        if(this.$route.name=='helm-detail-micro'){
            this.cardActive = this.$route.params.page;
        }else if(this.$route.query.key){
            this.cardActive = this.$route.query.key;
        }

    },
    components: {
        yamlDrawer,
    },
    methods: {
        getData(){
            panelApi.get(`/helm/releases/${this.$route.params.name}`).then(res=>{
                let data = res?.data;
                
                this.title = data?.chart?.metadata?.annotations?.title || this.$route.params.name;
                this.info = {
                    ...data?.info,
                    name: this.$route.params.name,
                    title: this.title,
                    namespace: data?.namespace,
                    description: data?.chart?.metadata?.description,
                    first_deployed: window.formatDate(data?.info?.first_deployed),
                    last_deployed: window.formatDate(data?.info?.last_deployed),
                };
                this.notes = data.info?.notes;

                this.setYaml(data.manifest);
                this.setJson(data.chart?.values);
                this.setTable(data.manifest);
                this.setMenu(data.chart);
            })
        },
        changeKey(v){
            if(this.$route.name!='helm-detail'){
                this.$router.push({name:'helm-detail', params: this.$route.params, query:{key:v}});
            }
        },
        toMicro(v){
            this.cardActive = v;
            this.$router.push('/helm/'+this.$route.params.name+'/micro/' + v);
        },
        setMenu(data){
            if(data?.metadata?.annotations?.['w7.cc/bindings'] && data?.metadata?.annotations?.['w7.cc/static-url']){
                let bindings = data.metadata.annotations['w7.cc/bindings'];
                let location = data.metadata.annotations['w7.cc/static-url'];
                try{
                    bindings = JSON.parse(bindings);
                }catch(e){ bindings = []; }
                let menu = bindings?.find(i=>i.name=='founder'&&i.support=='thirdparty_cd');
                if(menu?.menu?.length){
                    this.appMenu = menu.menu.map(i=>{
                        i.do = i.do.replace(/^\//,'');
                        return i;
                    });
                    this.appLocation = location;
                }else{
                    this.appMenu = [];
                    this.appLocation = '';
                    if(this.$route.name=='app-detail-micro'){
                        this.$router.push({name:'app-detail-detail', params: this.$route.params});
                    }
                }
                this.appdata = this.manifest_json?.find(i=>i?.data?.metadata?.name==data?.metadata?.annotations?.app)?.data || {};
            }
        },
        toDeployment(data){
            this.$router.push('/app/deployments/'+ data.metadata.name)
        },
        openYaml(row){
            this.yamlData = {
                show: true,
                data: row.data,
                title: row.name,
                submit: (data)=>{
                    panelApi.post('/yaml?namespace='+this.namespaceActive, data).then(res=>{
                        if(res?.data){
                            this.$message.success('操作成功');
                            this.yamlData = {show:false};
                            this.getData();
                        }
                    })
                }
            }
        },
        setTable(manifest){
            let jsonarr = jsyaml.loadAll(manifest);
            jsonarr = jsonarr.filter(i=>i&&i.kind);
            let arr = ['Job','DaemonSet','StatefulSet','Deployment',]
            
            this.manifest_json = jsonarr.sort((i,j)=>{
                if(arr.indexOf(i.kind)>arr.indexOf(j.kind)){ return -1; }
                if(arr.indexOf(i.kind)<arr.indexOf(j.kind)){ return 1; }
                return i.kind<j.kind? -1 : 1;
            });
            this.manifest_json = this.manifest_json.map(i=>{
                let o = {};
                o.kindinclude = (['Deployment','StatefulSet','DaemonSet','Job'].indexOf(i.kind)>-1);
                o.kind = i.kind;
                o.name = i?.metadata?.name || '';
                o.data = i;
                return o;
            })
        },
        setYaml(yaml){
            this.yamlDom = hljs.highlight(yaml, {language: 'yaml'}).value;
            let len = this.yamlDom.split(/\r?\n/).map((i,id)=>`<div>${id+1}</div>`).join('');
            this.yamlDom = `<div class="gutters">${len}</div><pre class='pre fc' style="margin:0;"><code class='language-yaml'>${this.yamlDom}</code></pre>`;
        },
        setJson(json){
            json = JSON.stringify(json, null, 4);
            this.valuesDom = hljs.highlight(json, {language: 'json'}).value;
            let len = this.valuesDom.split(/\r?\n/).map((i,id)=>`<div>${id+1}</div>`).join('');
            this.valuesDom = `<div class="gutters">${len}</div><pre class='pre fc' style="margin:0;"><code class='language-yaml'>${this.valuesDom}</code></pre>`;
        },
    },
}
</script>

<style scoped>
</style>
<style>
.helm-menutabs .arco-tabs-nav-tab{width:120px; padding-top:10px;}
.helm-menutabs .arco-tabs-nav-vertical .arco-tabs-tab{white-space: pre-wrap; line-height: 1.2;}

.yamldom{line-height:24px; overflow-x:auto; border:1px solid #ddd;}
.yamldom .gutters{
    position:sticky;
    left:0;
    font-size:12px;
    line-height:24px;
    border-right: 1px solid #ddd;
    padding:0 10px 0 10px;
    margin-right:10px;
    text-align:right;

    /* background-color:#f5f5f5;
    color:#6c6c6c; */
    background-color:#282c34;
    color:#abb2bf;
}
.yamldom pre{margin:0;}
</style>
