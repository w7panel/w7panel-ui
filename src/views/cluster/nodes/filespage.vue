<template>
    <div class="padding-20">
        <Breadcrumb :routes="routes" />
        <div class="bg-white">
            <file-component :is_component="true" origin="nodes" :ip="$route.query.ip" />
        </div>
    </div>
</template>

<script>
import fileComponent from '@/views/app/pages/files.vue'
export default {
    data(){
        return {
            
            routes: [
                {name:'root'},
                {
                    name: "cluster",
                    label: "集群管理",
                },
                {
                    name: "cluster-nodes",
                    label: "节点管理",
                },
                {
                    name: "cluster-nodes-files",
                    label: "文件管理",
                },
            ],
        }
    },
    components: {
        fileComponent
    }
}
</script>

<style>

</style>