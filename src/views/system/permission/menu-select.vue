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
import {useUserStore} from '@/store'

export default {
    props: ['permission','disabled','allowedKeys'],
    data(){
        return {
            expandKeys: [],
            checkedKeys: [],
            sourceTreeData: useUserStore().getTreeData,
            treeData: [],
            halfCheckedKeys: [],
        }
    },
    created(){
        this.init();
    },
    watch: {
        disabled(){
            this.initTreeData();
        },
        allowedKeys(){
            this.checkedKeys = this.filterAllowedKeys(this.checkedKeys);
            this.initTreeData();
        },
        checkedKeys(v){
            this.$emit('checked', this.halfCheckedKeys.concat(v));
        },
    },
    methods: {
        init(){
            // this.expandKeys = [];
            if(this.permission?.length){
                this.checkedKeys = JSON.parse(JSON.stringify(this.permission));
            }else{
                this.checkedKeys = this.allowedKeys ? [] : this.getAllKeys(this.sourceTreeData);
            }
            this.checkedKeys = this.filterAllowedKeys(this.checkedKeys);
            this.sourceTreeData = JSON.parse(JSON.stringify(this.sourceTreeData));

            this.initTreeData();
        },
        initTreeData(){
            this.treeData = this.filterTree([]);
        },
        filterTree(keys){
            const menuDataCopy = JSON.parse(JSON.stringify(this.sourceTreeData));
            const allowed = this.allowedKeys ? new Set(this.allowedKeys) : null;
    
            function traverseAndDisable(nodes, keyPath = [], disabled) {
                const result = [];
                nodes.forEach(node => {
                    const currentKeyPath = [...keyPath, node.key];
                    if (node.children && node.children.length > 0) {
                        node.children = traverseAndDisable(node.children, currentKeyPath, disabled);
                    }
                    const nodeAllowed = !allowed || allowed.has(node.key) || allowed.has(node.route);
                    if (allowed && !nodeAllowed && (!node.children || node.children.length === 0)) {
                        return;
                    }
                    if (keys.includes(node.key) || disabled) {
                        node.disabled = true;
                    }
                    result.push(node);
                });
                return result;
            }
            return traverseAndDisable(menuDataCopy, [], this.disabled);
        },
        filterAllowedKeys(keys){
            if(!this.allowedKeys){return keys || []}
            const allowed = new Set(this.allowedKeys);
            return (keys || []).filter(key => allowed.has(key));
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
