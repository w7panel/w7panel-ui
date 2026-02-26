<template>
    <div>
        <!-- <div class="page-title df ai-c">webshell</div> -->
        <div class="padding-20">
            <div style="height:calc(100vh - 110px);">
                <web-shell v-if="wsShow" :type="type"></web-shell>
            </div>
        </div>
    </div>
</template>

<script>
import webShell from "@/components/web-shell.vue";

export default {
    data(){
        return {
            wsShow: false,
            type: 'bin/sh',
        }
    },
    created(){
        if(this.$route.query.shelltype == 'bin/bash'){
            this.type = 'bin/bash';
        }
        this.wsShow = true;
    },
    components: {
        webShell,
    },
    methods: {
        
    },
}
</script>

<style>

</style>