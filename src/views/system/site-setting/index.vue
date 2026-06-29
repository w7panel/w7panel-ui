<template>
    <div class="padding-20 site-setting-page">
        <route-breadcrumb />
        <app-direct
            setting-name="default"
            global-mode
            show-contact
            show-homepage
            class="site-setting-panel"
        />
    </div>
</template>

<script>
import AppDirect from '@/views/topapp/app-direct.vue';

export default {
    components: {
        AppDirect,
    },
}
</script>

<style scoped>
.site-setting-panel{
    margin-top:20px;
}
</style>
