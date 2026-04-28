<template>
    <a-drawer :width="700" :visible="visible" @cancel="closeDrawer()" @ok="submit">
        <template #title>权限管理</template>
        <div>
            <a-form auto-label-width>
                
                <a-form-item label="权限套餐">
                    <a-select v-model="pmsForm.permissionPackage" @change="pmsFormChangePermissionPackage" placeholder="请选择">
                        <a-option v-if="!noCustom" label="自定义" value=""></a-option>
                        <a-option v-for="item in pmsls" :key="item.name" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>

                <a-tabs v-show="!noCustom" default-active-key="1" style="margin-bottom:20px;">

                    <a-tab-pane key="1" title="基础权限">
                        <a-form-item label="调试权限">
                            <a-switch :disabled="disabledBase" v-model="pmsForm.debug" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可查看并修改资源YAML内容。</template>
                        </a-form-item>
                        <a-form-item label="终端执行权限">
                            <a-switch :disabled="disabledBase" v-model="pmsForm.webshell" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可在终端控制台执行命令行。</template>
                        </a-form-item>
                        <a-form-item :disabled="disabledBase" label="文件管理权限">
                            <a-switch v-model="pmsForm.fileeditor" @change="pmsForm.permissionPackage=''"></a-switch>
                            <template #extra>开启后，可管理应用内的文件。</template>
                        </a-form-item>
                    </a-tab-pane>

                    <a-tab-pane key="2" title="菜单权限">
                        <a-form-item label="权限">
                            <div class="padding-10" style="background:var(--color-neutral-1);flex:1;">
                                <a-tree
                                    ref="tree"
                                    :checkable="true"
                                    v-model:checked-keys="pmsForm.list"
                                    @check="pmsForm.permissionPackage=''"
                                    :data="{shared:sharedTreeData,virtual:virtualTreeData,global:globalTreeData}[pmsForm.type]"
                                    check-strictly
                                />
                            </div>
                        </a-form-item>
                    </a-tab-pane>

                    <a-tab-pane key="3" title="域名白名单">
                        <whitelist-component ref="whitelist" :data="pmsForm.whitelist"></whitelist-component>
                    </a-tab-pane>
                </a-tabs>
            </a-form>
        </div>
    </a-drawer>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from "axios";
import { useNamespaceStore,useUserStore } from '@/store';
import whitelistComponent from '@/views/system/whitelist/whitelist-component.vue';

const sharedPass = [
    'cluster-nodes',
    'cluster-nodes-add',
    'cluster-nodes-registries',
    'cluster-nodes-gpu',
    'cluster-nodes-memory',
    'system-whitelist',
    'system-user',
    'system-usergroup',
    'system-permission',
    'system-manage',
    'zpk',
]

const virtualPass = [
    'cluster-nodes-add',
    'cluster-nodes-gpu',
    'cluster-nodes-memory',
    'system-whitelist',
    'system-user',
    'system-usergroup',
    'system-permission',
    'system-manage',
    'zpk',
]
export default {
    props: ['show','list','name', 'debug','fileeditor','whitelist','webshell','permissionPackage','disabledBase','disabledMenu','noCustom'],
    data(){
        return {
            namespaceActive: '',
            pmsls: [],
            permissionPackageList: [],
            permissionPackageListShared: [],
            permissionPackageListVirtual: [],
            pmsForm: {
                type: 'virtual',
                permissionPackage: '',
                list: [],
                treeData: [],
                debug: false,
                fileeditor: false,
                webshell: false,
            },
            
            sharedTreeData: [],
            virtualTreeData: [],
            globalTreeData: [],
        }
    },
    components: {
    },
    watch:{
        show(){
            this.visible = this.show;
            this.init();
        },
        disabledMenu(){
            this.initTreeData();
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.treeData = useUserStore().getTreeData;
        this.init();
        this.taocan();
        this.initTreeData();
    },
    components: {
        whitelistComponent,
    },
    methods: {
        init(){
            this.pmsForm.debug = this.debug || false;
            this.pmsForm.fileeditor = this.fileeditor || false;
            this.pmsForm.webshell = this.webshell || false;
            this.pmsForm.list = this.list || [];
            this.pmsForm.type = 'virtual'; //this.type || 'shared';
            this.pmsForm.permissionPackage = this.permissionPackage || '';
            this.hasDebug = this.debug===true || this.debug===false;
            this.pmsForm.whitelist = this.whitelist || [];
            
            this.pmsls = this.permissionPackageListVirtual;

            // this.pmsls = this.permissionPackageList;
            // if(this.type=='shared'){ this.pmsls = this.permissionPackageListShared; }
            // if(this.type=='virtual'){ this.pmsls = this.permissionPackageListVirtual; }
        },
        submit(){
            let whitelist = this.$refs.whitelist.getList() || [];
            whitelist = JSON.stringify(whitelist);
            
            let find = this.permissionPackageList.find(i=>i.name==this.pmsForm.permissionPackage);
            let role = find?.role || '';
            this.$emit('submit',{
                list: this.pmsForm.list,
                permissionPackage: this.pmsForm.permissionPackage,
                role: role,
                debug: this.pmsForm.debug,
                fileeditor: this.pmsForm.fileeditor,
                webshell: this.pmsForm.webshell,
                name: this.name,
                whitelist: whitelist,
            })
            this.closeDrawer();
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        taocan(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=permission",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = i?.data?.menu || '[]';
                    permission = JSON.parse(permission);
                    
                    let whitelist = i.metadata?.annotations?.['w7.cc/domain-white-list'] || '[]';
                    whitelist = JSON.parse(whitelist);

                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        permission: permission,
                        clustermode: i.metadata?.labels?.clustermode,
                        debug: i.data?.debug == 'true',
                        webshell: i.data?.webshell == 'true',
                        fileeditor: i.data?.fileeditor == 'true',
                        whitelist: whitelist,
                        role: i?.metadata?.labels?.['w7.cc/role'] || '',
                    }
                });
                this.permissionPackageList = list;
                this.pmsls = list; //.filter(i=>i.clustermode=='virtual');
                // this.permissionPackageListShared = list.filter(i=>i.clustermode=='shared');
                // this.permissionPackageListVirtual = list.filter(i=>i.clustermode=='virtual');
                // this.pmsls = this.permissionPackageList;
                // if(this.type=='shared'){ this.pmsls = this.permissionPackageListShared; }
                // if(this.type=='virtual'){ this.pmsls = this.permissionPackageListVirtual; }
            })
        },
        // 修改权限切换套餐
        pmsFormChangePermissionPackage(){
            if(this.pmsForm.permissionPackage==''){return}
            let find = this.permissionPackageList.find(i=>i.name==this.pmsForm.permissionPackage);
            if(!find){return}
            let permission = find?.permission || [];
            this.pmsForm.list = permission.filter(i=>!(this.pmsForm.type=='shared'?sharedPass:virtualPass).includes(i));
            this.pmsForm.debug = find.debug;
            this.pmsForm.webshell = find.webshell;
            this.pmsForm.fileeditor = find.fileeditor;
            this.pmsForm.whitelist = find.whitelist;
        },
        initTreeData(){
            this.sharedTreeData = this.filterTree(sharedPass);
            this.virtualTreeData = this.filterTree(virtualPass);
            this.globalTreeData = this.filterTree([]);
        },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.treeData));
    
            function traverseAndDisable(nodes, keyPath = [], disabled) {
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    if (keys.includes(node.key) || disabled) {
                        node.disabled = true;
                    }
                    if (node.children && node.children.length > 0) {
                        traverseAndDisable(node.children, currentKeyPath, disabled);
                    }
                });
            }
            traverseAndDisable(menuDataCopy, [], this.disabledMenu);
            return menuDataCopy;
        },
    },

}
</script>

<style scoped>
</style>