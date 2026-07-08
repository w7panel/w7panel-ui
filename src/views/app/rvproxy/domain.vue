<template>
    <div class="padding-20">
        <Breadcrumb :routes="routes" />
        <div class="bg-white ">
            <domain-page />
        </div>
    </div>
</template>

<script>
import domainPage from "@/views/app/pages/domain.vue"
export default {
    data(){
        return {
            routes: [
                {name:'root'},
                {
                    name: "gateway",
                    label: "网关管理",
                },
                {
                    name: "gateway-rvproxy",
                    label: "反向代理",
                },
                {
                    name: "domain",
                    label: "域名",
                },
            ],
        }
    },
    components: {
        domainPage,
    },
}
</script>

<style>

</style>
