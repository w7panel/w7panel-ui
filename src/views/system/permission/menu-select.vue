<template>
    <div>
            <!-- v-model:expanded-keys="expandKeys" -->
        <a-tree
            v-if="treeData.length"
            ref="tree"
            :checkable="true"
            v-model:checked-keys="checkedKeys"
            v-model:half-checked-keys="halfCheckedKeys"
            :data="treeData"
            check-strictly
        />
    </div>
</template>

<script>
import appClientMenus from '@/router/app-menus'
import { buildPermissionMenuTree } from '@/utils/permission-menu'
import { loadClusterContext } from '@/utils/cluster-access'
import { exclusiveMenus, loadExclusiveMenus, allowsExclusiveMenu } from '@/utils/exclusive-menus'
import { keyToPermissionPath } from '@/utils/permission-match'

export default {
    props: ['permission','disabled','allowedKeys','userGroup'],
    data(){
        return {
            expandKeys: [],
            checkedKeys: [],
            treeData: [],
            halfCheckedKeys: [],
            isSubCluster: null,
        }
    },
    created(){
        this.init();
        loadClusterContext().then(context => { this.isSubCluster = context.isSubCluster; }).catch(() => {});
        loadExclusiveMenus().catch(() => {});
    },
    computed: {
        sourceTreeData(){
            exclusiveMenus.value;
            this.isSubCluster;
            return buildPermissionMenuTree(appClientMenus, undefined);
        },
    },
    watch: {
        disabled(){
            this.initTreeData();
        },
        allowedKeys(){
            this.checkedKeys = this.filterAllowedKeys(this.checkedKeys);
            this.halfCheckedKeys = this.filterAllowedKeys(this.halfCheckedKeys);
            this.initTreeData();
        },
        userGroup(){
			this.checkedKeys = this.filterAllowedKeys(this.checkedKeys);
			this.halfCheckedKeys = this.filterAllowedKeys(this.halfCheckedKeys);
            this.initTreeData();
        },
        sourceTreeData(){
            this.init();
        },
        checkedKeys(v){
            this.$emit('checked', this.halfCheckedKeys.concat(v));
        },
    },
    methods: {
        init(){
            // this.expandKeys = [];
            if(Array.isArray(this.permission)){
                this.checkedKeys = JSON.parse(JSON.stringify(this.permission));
            }else{
                this.checkedKeys = [];
            }
            this.checkedKeys = this.filterAllowedKeys(this.checkedKeys);
            this.initTreeData();
        },
        initTreeData(){
            this.treeData = this.filterTree([]);
            const enabled = new Set();
            const visit = nodes => nodes.forEach(node => {
                if (!node.disabled) enabled.add(node.key);
                visit(node.children || []);
            });
            visit(this.treeData);
            if (!this.disabled && this.isSubCluster !== null && exclusiveMenus.value) {
                this.checkedKeys = this.checkedKeys.filter(key => enabled.has(key));
                this.halfCheckedKeys = this.halfCheckedKeys.filter(key => enabled.has(key));
            }
        },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.sourceTreeData));
            const allowed = this.allowedKeys ? new Set(this.allowedKeys) : null;
            const context = this;
    
            function traverseAndDisable(nodes, keyPath = [], disabled) {
                const result = [];
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    const nodeAllowed = !allowed || allowed.has(node.key) || allowed.has(node.route);
                    const clusterType = context.isSubCluster ? 'child' : 'main';
                    const exclusiveAllowed = context.isSubCluster !== null && !!exclusiveMenus.value
                        && allowsExclusiveMenu(exclusiveMenus.value, clusterType, node.route || keyToPermissionPath(node.key));
                    const clusterAllowed = !node.clusterTypes || node.clusterTypes.includes(clusterType);
                    const nodeDisabled = (allowed && !nodeAllowed) || keys.includes(node.key) || disabled || !exclusiveAllowed || !clusterAllowed;
                    if (nodeDisabled) {
                        node.disabled = true;
                    }
                    if (node.children && node.children.length > 0) {
                        node.children = traverseAndDisable(node.children, currentKeyPath, nodeDisabled);
                    }
                    result.push(node);
                });
                return result;
            }
            return traverseAndDisable(menuDataCopy, [], this.disabled);
        },
        filterAllowedKeys(keys){
            if (this.isSubCluster === null || !exclusiveMenus.value) return keys || [];
            const clusterType = this.isSubCluster ? 'child' : 'main';
            const visible = (keys || []).filter(key => this.isSubCluster !== null && !!exclusiveMenus.value
                && allowsExclusiveMenu(exclusiveMenus.value, clusterType, keyToPermissionPath(key)));
            if(!this.allowedKeys){return visible}
            const allowed = new Set(this.allowedKeys);
            return visible.filter(key => allowed.has(key));
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
