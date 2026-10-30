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
import {useNamespaceStore} from '@/store'
import appClientMenus from '@/router/app-menus'
import { buildPermissionMenuTree, loadPermissionMicroAppMenus } from '@/utils/permission-menu'
import { allowsExclusiveMenu, loadExclusivePolicy } from '@/utils/permission-exclusives'

export default {
    props: ['permission','disabled','allowedKeys','userGroup'],
    data(){
        return {
            expandKeys: [],
            checkedKeys: [],
            treeData: [],
            halfCheckedKeys: [],
            microAppTreeData: [],
            exclusiveRules: null,
        }
    },
    created(){
        this.init();
        loadExclusivePolicy().then(policy => { this.exclusiveRules = policy; this.init(); }).catch(() => { this.exclusiveRules = null; this.initTreeData(); });
        loadPermissionMicroAppMenus(useNamespaceStore().namespace).then(nodes=>{ this.microAppTreeData = nodes; }).catch(()=>{});
    },
    computed: {
        sourceTreeData(){
            return [...buildPermissionMenuTree(appClientMenus), ...this.microAppTreeData];
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
            this.initTreeData();
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
        },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.sourceTreeData));
            const allowed = this.allowedKeys ? new Set(this.allowedKeys) : null;
    
            const exclusivePolicy = this.exclusiveRules;
            function traverseAndDisable(nodes, keyPath = [], disabled) {
                const result = [];
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    const nodeAllowed = !allowed || allowed.has(node.key) || allowed.has(node.route);
                    const groupRestricted = !exclusivePolicy || !allowsExclusiveMenu(exclusivePolicy.rules, exclusivePolicy.clusterType, node.route || '', node.key);
                    if (groupRestricted) return;
                    if (node.children && node.children.length > 0) {
                        node.children = traverseAndDisable(node.children, currentKeyPath, disabled || groupRestricted);
                    }
                    if ((allowed && !nodeAllowed) || keys.includes(node.key) || disabled || groupRestricted) {
                        node.disabled = true;
                    }
                    result.push(node);
                });
                return result;
            }
            return traverseAndDisable(menuDataCopy, [], this.disabled);
        },
        filterAllowedKeys(keys){
			const permitted = (keys || []).filter(key => this.exclusiveRules && allowsExclusiveMenu(this.exclusiveRules.rules, this.exclusiveRules.clusterType, key, key));
			if(!this.allowedKeys){return permitted}
            const allowed = new Set(this.allowedKeys);
            return permitted.filter(key => allowed.has(key));
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
