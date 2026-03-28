<template>

    <div
        class="bg-white padding-20"
        style="height:100%;"
        :style="{height:($route.name=='dialog-pod-webshell')?'100vh':'100%'}"
    >
        <a-tabs
            v-if="show"
            type="card-gutter"
            class="webshell-tabs"
            v-model:active-key="activeIndex"
            :editable="true"
            @add="handleAdd"
            @delete="handleDelete"
            show-add-button
            auto-switch
            justify
        >
            <a-tab-pane v-for="(item, index) of tabs" :key="item.key" :title="item.name" :closable="index!==0">
                <web-shell
                    :ref="(el) => setShellRef(item.key, el)"
                    :show="item.key===activeIndex"
                    :type="data.type"
                    :api_token="token"
                    :ip="data.ip"
                    :pod="data.pod"
                    :origin="data.origin"
                    :namespace="data.namespace"
                    :containerName="data.containerName"
                    :defaultCommand="defaultCommand"
                ></web-shell>
            </a-tab-pane>
        </a-tabs>
    </div>
</template>

<script>
import webShell from '@/components/web-shell.vue';

export default {
    data(){
        return {
            show: false,
            token: '',
            activeIndex: '',
            tabs: [],
            id: 1,
            data: {
                ip: '',
                type: '',
                pod: '',
                origin: '',
                namespace: '',
                containerName: ''
            },
            defaultCommand: '',
            shellRefs: {},
        }
    },
    components: {webShell},
    created(){
        this.data = this.$route.query;
        if(this.$route.query.api_token){
            this.token = this.$route.query.api_token;
        }
        if(this.$route.query.command){
            this.defaultCommand = this.$route.query.command;
        }

        this.tabs.push({
            key: 'ws'+Date.now(),
            name: 'webshell ' + this.id,
        });
        this.id ++;
        this.activeIndex = this.tabs[0].key;
    },
    mounted(){
        this.show = true;
        // if(this.data.type && this.data.pod && this.data.namespace && this.data.containerName){
        //     this.show = true;
        // }
    },
    methods: {
        setShellRef(key, el){
            if (el) {
                this.shellRefs[key] = el;
                return;
            }
            delete this.shellRefs[key];
        },
        closeShellByKey(key){
            const shell = this.shellRefs[key];
            if (shell && typeof shell.closeSocketGracefully === 'function') {
                shell.closeSocketGracefully();
            }
            delete this.shellRefs[key];
        },
        handleAdd(){
            this.tabs.push({
                key: 'ws'+Date.now(),
                name: 'webshell ' + this.id,
            });
            this.id ++;
            this.activeIndex = this.tabs[this.tabs.length-1].key;
        },
        handleDelete(key){
            this.closeShellByKey(key);
            const index = this.tabs.findIndex(i => i.key === key);
            if (index < 0) return;
            const fallback = this.tabs.find(i => i.key !== key);
            this.tabs.splice(index, 1);
            if (fallback) {
                this.activeIndex = fallback.key;
            }
        },
    },
}
</script>

<style>
.webshell-tabs .arco-tabs-content{padding-top:20px; padding:20px; background-color:rgb(31, 29, 69);}
</style>
