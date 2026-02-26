<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <!-- <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加权限</a-button>
        </div> -->
        
        <div class=" bg-white padding-20">
            <table class="com-table"><tbody>
                <tr>
                    <td>名称</td>
                    <td>类型</td>
                    <td>创建时间</td>
                    <td>集群模式</td>
                    <td>操作</td>
                </tr>
                <tr v-for="(record,index) in list.filter(i=>i.type=='in')" :key="index+'in'">
                    <td>{{ record.title }}</td>
                    <td>{{ record.type=='in'? '系统内置' : '自定义'}}</td>
                    <td>-</td>
                    <td>{{ record.clustermodeTxt }}</td>
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                        </a-tooltip>
                        <a-button type="outline" class="ml-4" icon="plus" size="mini" @click="addCustom(record)">
                            <template #icon><icon-plus /></template>
                            <span>创建权限</span>
                        </a-button>
                        <!-- <a-tooltip v-if="record.type=='in'" content="创建新权限">
                            <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                        </a-tooltip> -->
                        <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </td>
                </tr>
                <tr><td colspan="5" style="padding:0;background:var(--color-border-1);height:5px;"></td></tr>
                <tr v-for="(record,index) in list.filter(i=>i.type!='in')" :key="index">
                    <td>{{ record.title }}</td>
                    <td>{{ record.type=='in'? '系统内置' : '自定义'}}</td>
                    <td>{{ record.created }}</td>
                    <td>{{ record.clustermodeTxt }}</td>
                    <td>
                        <a-tooltip v-if="debug" content="yaml">
                            <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                        </a-tooltip>
                        <a-tooltip content="修改">
                            <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                        </a-tooltip>
                        <a-tooltip v-if="record.type=='in'" content="创建新权限">
                            <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                        </a-tooltip>
                        <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt">
                            <a-tooltip content="删除">
                                <i class="opt-icon"><icon-delete /></i>
                            </a-tooltip>
                        </a-popconfirm>
                    </td>
                </tr>
            </tbody></table>
            <!-- <a-table class="cptable" :data="list.filter(i=>i.type=='in')" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="类型">
                        <template #cell="{record}">{{ record.type=='in'? '系统内置' : '自定义' }}</template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="created"></a-table-column>
                    <a-table-column title="集群模式" data-index="clustermodeTxt"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.type=='in'" content="创建新权限">
                                <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                            </a-tooltip>
                            <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>

            <a-table class="cptable mt-30" :data="list.filter(i=>i.type!='in')" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="类型">
                        <template #cell="{record}">{{ record.type=='in'? '系统内置' : '自定义' }}</template>
                    </a-table-column>
                    <a-table-column title="创建时间" data-index="created"></a-table-column>
                    <a-table-column title="集群模式" data-index="clustermodeTxt"></a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.type=='in'" content="创建新权限">
                                <i class="opt-icon" @click="addCustom(record)"><icon-plus /></i>
                            </a-tooltip>
                            <a-popconfirm v-if="record.name!=founderName && record.type!='in'" :content="'确认要删除吗'" @ok="del(record)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table> -->
        </div>

        <a-drawer
            :visible="form.show"
            direction="rtl"
            :width="800"
            title="菜单权限"
            @ok="submit"
            @cancel="form.show=false;"
        >
            <a-form :model="form" ref="form" auto-label-width :rules="rules">
                <a-form-item label="名称" field="title">
                    <a-input v-model="form.title" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="集群模式" :disabled="!!form.name && !form.isAdd" field="clustermode" :rules="[{required:true,message:'请选择集群模式', trigger: 'blur' }]">
                    <a-select v-model="form.clustermode" placeholder="请选择集群模式">
                        <a-option label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="form.clustermode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="form.clustermode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="form.clustermode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item>

                <a-tabs default-active-key="1" style="margin-bottom:20px;">

                    <a-tab-pane key="1" title="基础权限">
                        <a-form-item label="调试权限">
                            <a-switch v-model="form.debug" :disabled="form.name==founderName"></a-switch>
                            <template #extra>开启后，可查看并修改资源YAML内容。</template>
                        </a-form-item>
                        <a-form-item label="终端执行权限">
                            <a-switch v-model="form.webshell" :disabled="form.name==founderName"></a-switch>
                            <template #extra>开启后，可在终端控制台执行命令行。</template>
                        </a-form-item>
                        <a-form-item label="文件管理权限">
                            <a-switch v-model="form.fileeditor" :disabled="form.name==founderName"></a-switch>
                            <template #extra>开启后，可管理应用内的文件。</template>
                        </a-form-item>
                    </a-tab-pane>
                    <a-tab-pane key="2" title="菜单权限">
                        <a-form-item label="权限">
                            <div class="padding-10" style="background:var(--color-neutral-1);flex:1;">
                                <menu-select
                                    v-if="form.show"
                                    :disabled="form.name==founderName"
                                    :permission="form.permission"
                                    :allowedMode="form.clustermode"
                                    @checked="v=>form.permission=v"
                                ></menu-select>
                            </div>
                        </a-form-item>
                    </a-tab-pane>
                    <a-tab-pane key="3" title="域名白名单">
                        <whitelist-component ref="whitelist" :data="form.whitelist"></whitelist-component>
                    </a-tab-pane>
                </a-tabs>

            </a-form>
        </a-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import menuSelect from '@/views/system/permission/menu-select.vue';
import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import whitelistComponent from '../whitelist/whitelist-component.vue';

const dataTemplate = {
    "kind": "ConfigMap",
    "apiVersion": "v1",
    "metadata": {
        "name": "k3k.permission",
        "namespace": "default",
        "labels": {
            "type": "permission",
        },
        "annotations": {},
    },
    "data": {
        "menu": "[]"
    }
}

export default {
    data(){
        return {
            namespaceActive: 'default',
            list: [],
            form: {
                show: false,
                title: '',
                name: '',
                debug: false,
                webshell: false,
                fileeditor: false,
                clustermode: 'shared',
                permission: [],
            },
            rules: {
                title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            debug: false,

            sharedTreeData: [],
            virtualTreeData: [],

            founderName: 'k3k.permission.founder',
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
    },
    components: {
        menuSelect,
        yamlDrawer,
        whitelistComponent,
    },
    methods: {
        // initTreeData(){
        //     this.sharedTreeData = this.filterTree(sharedPass);
        //     this.virtualTreeData = this.filterTree(virtualPass);
        // },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.treeData));
    
            function traverseAndDisable(nodes, keyPath = []) {
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    if (keys.includes(node.key)) {
                        node.disabled = true;
                    }
                    if (node.children && node.children.length > 0) {
                        traverseAndDisable(node.children, currentKeyPath);
                    }
                });
            }
            traverseAndDisable(menuDataCopy);
            return menuDataCopy;
        },
        getList(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=permission",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = i?.data?.menu || '[]';
                    permission = JSON.parse(permission);
                    let whitelist = [];
                    try{
                        let wl = i.metadata?.annotations?.['w7.cc/domain-white-list'];
                        whitelist = wl? JSON.parse(wl) : whitelist;
                    }catch{}
                    return {
                        originData: i,
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        permission: permission,
                        
                        debug: i.data?.debug == 'true',
                        webshell: i.data?.webshell == 'true',
                        fileeditor: i.data?.fileeditor == 'true',
                        clustermode: i?.metadata?.labels?.clustermode,
                        clustermodeTxt: {shared:'共享',virtual:'独享',global:'全局'}?.[i.metadata?.labels?.clustermode],
                        whitelist: whitelist,

                        type: i.metadata?.labels?.typemode,
                    }
                });
                this.list = list;
            })
        },
        // add(){
        //     this.form = {
        //         show: true,
        //         title: '',
        //         name: '',
        //         clustermode: 'shared',
        //         permission: [],
        //         whitelist: [],
        //     }
        // },
        addCustom(row){
            let originData = JSON.parse(JSON.stringify(row.originData));
            delete originData.metadata.resourceVersion;
            delete originData.metadata.creationTimestamp;
            delete originData.metadata.uid;
            originData.metadata.name = originData.metadata.name + '.' + this.createName();
            originData.metadata.labels = originData.metadata.labels || {};
            originData.metadata.labels.typemode = 'custom';
            
            let originTitle = originData.metadata?.annotations?.title || '';

            this.form.originData = originData;
            this.edit({
                ...row,
                title: '',
                name: originData.name,
                isAdd: true,
                originTitle: originTitle? '['+originTitle+'] ' : '',
            });
        },
        edit(row){
            this.form = {
                ...this.form,
                isAdd: row.isAdd,
                originTitle: row.originTitle || '',
                show: true,
                title: row.title,
                name: row.name,
                clustermode: row.clustermode,
                permission: row.permission,
                debug: row.debug,
                webshell: row.webshell,
                fileeditor: row.fileeditor,
                whitelist: row.whitelist,
            }
        },
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
        },
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0]);
                    return;
                }

                let whitelist = this.$refs.whitelist.getList() || [];
                whitelist = JSON.stringify(whitelist);

                if(!this.form.name || this.form.isAdd){
                    let data = null;
                    if(this.form.isAdd){
                        data = this.form.originData;
                    }else{
                        data = JSON.parse(JSON.stringify(dataTemplate));
                    }
                    if(this.form.isAdd){
                        data.metadata.annotations.title = this.form.originTitle + this.form.title;
                    }else{
                        data.metadata.name = 'k3k.permission.' + this.createName();
                        data.metadata.annotations.title = this.form.title;
                    }
                    data.metadata.namespace = this.namespaceActive;
                    data.metadata.annotations['w7.cc/domain-white-list'] = whitelist;
                    data.data.menu = JSON.stringify(this.form.permission);
                    data.data.debug = String(this.form.debug);
                    data.data.webshell = String(this.form.webshell);
                    data.data.fileeditor = String(this.form.fileeditor);
                    data.metadata.labels.clustermode = this.form.clustermode;
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }else{
                    k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+this.form.name,[{
                        op: 'replace',
                        path: '/metadata/annotations/title',
                        value: this.form.title,
                    },{
                        op: 'replace',
                        path: '/metadata/annotations/w7.cc~1domain-white-list',
                        value: whitelist,
                    },{
                        op: 'replace',
                        path: '/data/menu',
                        value: JSON.stringify(this.form.permission),
                    },{
                        op: 'replace',
                        path: '/metadata/labels/clustermode',
                        value: this.form.clustermode,
                    },{
                        op: 'replace',
                        path: '/data/debug',
                        value: String(this.form.debug),
                    },{
                        op: 'replace',
                        path: '/data/webshell',
                        value: String(this.form.webshell),
                    },{
                        op: 'replace',
                        path: '/data/fileeditor',
                        value: String(this.form.fileeditor),
                    }],{
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        openYaml(name){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
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