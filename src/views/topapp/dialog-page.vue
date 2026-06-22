<template>
    <div style="width:100%;height:100%;">
        <micro-container :appgroup="$route.params.group" :menuActive="menuActive"></micro-container>
    </div>
</template>
<script>
import microContainer from '@/views/topapp/micro-container.vue'
export default{
    data(){
        return {
            namespaceActive: '',
            identifie: '',
            menuActive: '',
        }
    },
    created(){
        this.menuActive = decodeURIComponent(this.$route.query?.do || '');
    },
    components: {
        microContainer,
    },
}
</script>
<style scoped>
</style>
