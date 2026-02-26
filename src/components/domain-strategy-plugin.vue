<template>
    <div>
        <a-button type="primary" size="small" @click="openForm()">添加插件</a-button>
        <table class="com-table mt-10"><tbody>
            <tr>
                <td>名称</td>
                <td style="width:150px;">开启状态</td>
                <td style="width:200px;">操作</td>
            </tr>
            <tr v-for="item in plugin.allPlugin" :key="item.name">
                <td>
                    <div class="df">
                        <div>{{item.title}}{{item.version}}</div>
                        <span class="c-blue cursor ml-10 mr-10" @click="openForm(item)">修改</span>
                        <a-popconfirm v-if="item.currenturl && item.currenturl!=item.url" @ok="updatePlugin(item)" content="确定更新吗">
                            <span class="c-blue cursor mr-10">更新</span>
                        </a-popconfirm>
                    </div>
                    <div class="fs-12 c-99">{{item.description}}</div>
                </td>
                <td>
                    <a-switch v-model="item.disabled" :checked-value="false" @change="pluginSubmit" :unchecked-value="true"></a-switch>
                </td>
                <td>
                    <!-- <span class="c-blue cursor mr-10" @click="setPluginMatch(item)">配置</span> -->
                    <span class="c-blue cursor mr-10" @click="openCatchRules(item)">配置</span>
                </td>
            </tr>
        </tbody></table>
        <!-- <div class="mt-20 df ai-c jc-c">
            <a-button @click="$emit('close')">取消</a-button>
            <a-button @click="pluginSubmit" type="primary" class="ml-20">保存</a-button>
        </div> -->

        <a-drawer v-model:visible="matchConfig.show" title="配置" width="800px" @ok="pluginWriteMatch" @cancel="matchConfig.show=false;" @open="initEditor()">
            <div id="matcheditor" style="height:100%;"></div>
        </a-drawer>

        <domain-strategy-plugin-filecache
            :show="catchRules.show"
            :rules="catchRules.rules"
            :data="catchRules.data"
            :keyrules="catchRules.keyrules"
            @submit="catchSubmit"
            @close="catchRules.show=false;"
        ></domain-strategy-plugin-filecache>
        
        <domain-strategy-plugin-whitelist
            :show="wlRules.show"
            :data="wlRules.data"
            @submit="wlRulesSubmit"
            @close="wlRules.show=false;"
        ></domain-strategy-plugin-whitelist>

        <plugin-edit :show="form.show" :id="form.id" @close="closeEditPlugin"></plugin-edit>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import {basicSetup, EditorView} from "codemirror";
import { yaml } from "@codemirror/lang-yaml";
import jsyaml from "js-yaml";
import { useLoadingStore, useNamespaceStore } from '@/store';
import pluginForm from '@/views/app/plugin/plugin-form.vue';
import pluginEdit from '@/views/app/plugin/plugin-edit.vue';
import domainStrategyPluginFilecache from './domain-strategy-plugin-filecache.vue';
import domainStrategyPluginWhitelist from './domain-strategy-plugin-whitelist.vue';

export default {
    props: ['data','show'],
    data(){
        return {
            namespaceActive: '',
            plugin: {
                allPlugin: [],
            },
            config: {
                show: false,
                editName: '',
                yaml: '',
                editor: null,
                url: '',
                disabled: true,
            },
            matchConfig: {
                show: false,
                yaml: '',
                editName: '',
                editor: null,
            },
            addPlugin: {
                show: false,
                cdn: '',
            },
            form: {
                show: false,
                id: '',
            },

            catchRules: {
                show: false,
                rules: [],
                keyrules: [],
                data: {},
            },

            wlRules: {
                show: false,
                name: '',
                data: {},
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    watch: {
        data: "getAllPlugin",
        show(v){
            if(!v){return}
            this.getAllPlugin();
        },
    },
    components: {
        pluginForm,
        pluginEdit,
        domainStrategyPluginFilecache,
        domainStrategyPluginWhitelist,
    },
    methods: {
        wlRulesSubmit(data){
            console.log(data)
            
            let item = this.plugin.allPlugin.find(i=>i.name==this.wlRules.name);
            if(!item){return}
            
            let o = {
                "response_code": data?.errpage?.code,
                "response_content": data?.errpage?.content,
                "white_domains": data?.list || [],
            }
            
            item.content.spec.defaultConfig = o;
            k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(res=>{
                this.$message.success('操作成功')
                this.getAllPlugin();
                this.wlRules.show = false;
            })
        },
        openCatchRules(item){
            if(item.is_cdn){
                let config  = item.content?.spec?.matchRules?.[item.hasname]?.config || null;
                
                this.catchRules = {
                    ...this.catchRules,
                    show: true,
                    name: item.name,
                    rules: item.path_cache_rules,
                    keyrules: item.path_key_cache_rules,
                    data: { ...config, },
                }
                return;
            }
            if(item.is_whitelist){
                let config = item.content?.spec?.defaultConfig;
                this.wlRules = {
                    ...this.wlRules,
                    show: true,
                    name: item.name,
                    data: {
                        list: config?.white_domains || [],
                        errpage: {
                            code: config?.response_code || '404',
                            content: config?.response_content || '',
                        }
                    }
                }
                return;
            }
            if(item.hasname>-1){
                let config  = item.content?.spec?.matchRules?.[item.hasname]?.config;
                let yaml = config? jsyaml.dump(config) : '';
                this.matchConfig.yaml = yaml;
            }else{
                this.matchConfig.yaml = "";
            }
            if(this.matchConfig.editor){
                let txt = this.matchConfig.editor.state.doc.toString();
                this.matchConfig.editor.dispatch({
                    changes: {from:0, to:txt.length, insert:this.matchConfig.yaml || ''}
                });
            }
            this.matchConfig.editName = item.name;
            this.matchConfig.show = true;

        },
        catchSubmit(data){
            let item = this.plugin.allPlugin.find(i=>i.name==this.catchRules.name);
            if(!item){return}
            let rewrite = this.data.metadata?.annotations?.['higress.io/enable-rewrite']==='true'? this.data?.metadata?.annotations?.['higress.io/upstream-vhost'] : '';

            let pcr = data.path_cache_rules.filter(i=>i.cache_ttl && i.weight).map(i=>{
                // i.paths = i?.paths? i?.paths?.trim()?.replace(/(^;)|(;$)/,'')?.split(';') : [];
                return i;
            })
            let pkcr = data.path_key_cache_rules.filter(i=>i.weight).map(i=>{
                // i.paths = i?.paths? i?.paths?.trim()?.replace(/(^;)|(;$)/,'')?.split(';') : [];
                // i.keys = i?.keys? i?.keys?.trim()?.replace(/(^;)|(;$)/,'')?.split(';') : [];
                return i;
            })
            let o = {
                access_key: data.access_key,
                secret_key: data.secret_key,
                bucket: data.bucket,
                host: data.host,
                region: data.region,
                path_cache_rules: pcr,
                path_key_cache_rules: pkcr,
            }
            if(rewrite){ o.rewrite_host = rewrite;}
            
            if(item.hasname>-1){
                item.content.spec.matchRules[item.hasname].config = o;
                k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(res=>{
                    this.$message.success('操作成功')
                    this.getAllPlugin();
                    this.catchRules.show = false;
                })
            }else{
                item.content.spec.matchRules = item.content.spec?.matchRules || [];
                item.content.spec.matchRules.push({
                    config: o,
                    configDisable: true,
                    ingress: [this.namespaceActive + '/' + this.data.metadata.name],
                });
                k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(res=>{
                    this.$message.success('操作成功')
                    this.getAllPlugin();
                    this.catchRules.show = false;
                })
            }
        },
        openForm(row){
            this.form.show = true;
            this.form.id = row?.name || '';
        },
        closeEditPlugin(v){
            this.form.show = false;
            if(v){ this.getAllPlugin(); }
        },
        // closeAddPlugin(v){
        //     this.addPlugin.show = false;
        //     if(v){ this.getAllPlugin(); }
        // },
        async pluginSubmit(){
            useLoadingStore().loading = true;
            for(let i=0; i<this.plugin.allPlugin.length; i++){
                let item = this.plugin.allPlugin[i];
                if(item.is_whitelist){
                    item.content.spec.defaultConfigDisable = item.disabled;
                    await k8sproxy.patch('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, {
                        spec: {
                            defaultConfigDisable: item.disabled
                        }
                    },{
                        headers: {'Content-Type': 'application/merge-patch+json'}
                    }).then(()=>{}).catch(()=>{});
                    continue;
                }
                if(item.disabled){
                    if(item.hasname>-1 && !item.content.spec?.matchRules?.[item.hasname]?.configDisable){
                        item.content.spec.matchRules[item.hasname].configDisable = true;
                        await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(()=>{}).catch(()=>{});
                    }
                    continue
                }
                if(item.hasname>-1){
                    // configDisable 可能 undefinde
                    if(item.content.spec?.matchRules?.[item.hasname]?.configDisable!==false){
                        item.content.spec.matchRules[item.hasname].configDisable = false;
                        await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(()=>{}).catch(()=>{});
                    }
                }else{
                    item.content.spec.matchRules = item.content.spec?.matchRules || [];
                    item.content.spec.matchRules.push({
                        config: {},
                        configDisable: false,
                        ingress: [this.namespaceActive + '/' + this.data.metadata.name],
                    });
                    await k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(()=>{}).catch(()=>{});
                }
            }
            useLoadingStore().loading = false;
            this.$message.success('操作成功');
            this.getAllPlugin();
        },
        // 更新
        updatePlugin(item){
            let currenturl = item.currenturl;
            if(!currenturl){return}
            item.content.spec.url = currenturl;
            k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(res=>{
                this.$message.success('操作成功');
                this.getAllPlugin();
            });
        },
        // 提交配置
        pluginWriteMatch(){
            let yaml = this.matchConfig.editor.state.doc.toString();

            let item = this.plugin.allPlugin.find(i=>i.name==this.matchConfig.editName);
            if(item.hasname>-1){
                item.content.spec.matchRules[item.hasname].config = jsyaml.load(yaml);
            }else{
                item.content.spec.matchRules = item.content.spec?.matchRules || [];
                item.content.spec.matchRules.push({
                    config: jsyaml.load(yaml),
                    configDisable: true,
                    ingress: [this.namespaceActive + '/' + this.data.metadata.name],
                })
            }
            k8sproxy.put('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+item.name, item.content).then(res=>{
                this.$message.success('操作成功')
                this.getAllPlugin();
                this.matchConfig.show = false;
            })
        },
        // editor
        initEditor(){
            this.$nextTick(()=>{
                let o = this.matchConfig;
                if(!o.editor){
                    let height = document.getElementById('matcheditor').offsetHeight;
                    let myTheme = EditorView.theme({"&": { height: height + "px"}}, {dark: false});
                    o.editor = new EditorView({
                        doc: "",
                        extensions: [
                            basicSetup,
                            myTheme,
                            yaml(),
                        ],
                        parent: document.getElementById('matcheditor'),
                    });
                    let txt = o.editor.state.doc.toString();
                    o.editor.dispatch({
                        changes: {from:0, to:txt.length, insert:o.yaml || ''}
                    });
                }
            });
        },
        // 插件列表
        getAllPlugin(){
            if(!this.data || !this.data.metadata || !this.data.metadata.name){return}
            k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins').then(res=>{
                let list = res?.data?.items || [];
                this.plugin.allPlugin = list.map(i=>{
                    let hasname = i?.spec?.matchRules?.findIndex(m=>{
                        return m?.ingress?.includes(this.namespaceActive + '/' + this.data?.metadata?.name);
                    })

                    let is_whitelist = i.metadata?.labels?.['higress.io/wasm-plugin-name'] == 'w7-white-domain';
                    let disabled = true;
                    if(i?.spec?.matchRules?.[hasname]?.configDisable === false){ disabled = false; }
                    if(is_whitelist){
                        disabled = i?.spec?.defaultConfigDisable===false? false : true;
                    }
                    // let version = i?.spec?.url?.match(/(?<=:)[^:]+$/)?.[0];
                    let version = i?.metadata?.labels?.['higress.io/wasm-plugin-version'];
                    version = version? '@'+version : '';
                    return {
                        name: i.metadata.name,
                        title: i.metadata?.annotations?.['higress.io/wasm-plugin-title'] || i.metadata.name,
                        description: i.metadata?.annotations?.['higress.io/wasm-plugin-description'] || '',
                        currenturl: i.metadata?.annotations?.['w7.cc/plugin-url'] || '',
                        is_cdn: i.metadata?.labels?.['higress.io/wasm-plugin-name'] == 'w7-cdn-proxy',
                        is_whitelist: is_whitelist,

                        url: i.spec?.url || '',
                        version: version,
                        hasname: hasname,
                        disabled: disabled,
                        content: i,
                        config: i?.spec?.defaultConfig,
                        path_cache_rules: i?.spec?.matchRules?.[hasname]?.config?.path_cache_rules || [],
                        path_key_cache_rules: i?.spec?.matchRules?.[hasname]?.config?.path_key_cache_rules || [],
                    }
                });
                let enable = this.plugin.allPlugin.filter(i=>!i.disabled).length;
                this.$emit('pluginbadge',enable)
            })
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