<template>
    <div>
            <!-- v-model:expanded-keys="expandKeys" -->
        <a-tree
            ref="tree"
            :checkable="true"
            v-model:checked-keys="checkedKeys"
            v-model:half-checked-keys="halfCheckedKeys"
            :data="allowedModeTree"
            check-strictly
        />
    </div>
</template>

<script>
import { useUserStore } from '@/store'

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
    'system-license',
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
    'system-license',
    'zpk',
]
export default {
    props: ['permission','allowedMode','disabled'],
    data(){
        return {
            expandKeys: [],
            checkedKeys: [],
            treeData: useUserStore().getTreeData,
            halfCheckedKeys: [],

            sharedTreeData: [],
            virtualTreeData: [],
            globalTreeData: [],
        }
    },
    created(){
        this.init();
    },
    computed: {
        allowedModeTree(){
            if(this.allowedMode=='shared'){return this.sharedTreeData;}
            if(this.allowedMode=='virtual'){return this.virtualTreeData;}
            if(this.allowedMode=='global'){return this.globalTreeData;}
            return this.treeData;
        },
    },
    watch: {
        disabled(){
            this.initTreeData();
        },
        checkedKeys(v){
            this.$emit('checked', this.halfCheckedKeys.concat(v));
        },
        allowedMode(){
            this.filterAllowedMode();
        },
    },
    methods: {
        init(){
            // this.expandKeys = [];
            if(this.permission?.length){
                this.checkedKeys = JSON.parse(JSON.stringify(this.permission));
            }else{
                this.checkedKeys = this.getAllKeys(this.treeData);
            }
            this.filterAllowedMode();
            // 集群模式
            this.treeData = JSON.parse(JSON.stringify(this.treeData));

            this.initTreeData();
        },
        filterAllowedMode(){
            if(!this.checkedKeys.length||!this.allowedMode){return}
            this.checkedKeys = this.checkedKeys.filter(i=>{
                if(this.allowedMode=='shared'){
                    return !sharedPass.includes(i);
                }
                if(this.allowedMode=='virtual'){
                    return !virtualPass.includes(i);
                }
                return true;
            })
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
            traverseAndDisable(menuDataCopy, [], this.disabled);
            return menuDataCopy;
        },
        disabledTree(arr,boo){
            function traverse(node) {
                if (arr.includes(node.key)) {
                    node.disabled = boo;
                }
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => traverse(child));
                }
            }
            this.treeData.forEach(rootNode => traverse(rootNode));
        },
        getAllKeys(tree) {
            const keys = [];
            function traverse(node) {
                keys.push(node.key);
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => traverse(child));
                }
            }
            tree.forEach(root => traverse(root));
            return keys;
        },
    },
}
</script>

<style>

</style>