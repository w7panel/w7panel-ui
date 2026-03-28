<template>
    <div class="bg-white padding-20" style="height:100%;">
        <a-tabs
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
            <a-tab-pane v-for="(item, index) of data" :key="item.key" :title="item.name" :closable="index!==0">
                <webshell-tty
                    :ref="(el) => setShellRef(item.key, el)"
                    :token="token"
                    :show="item.key===activeIndex"
                    :type="$route.name=='fp-webshell'?'/bin/bash':''"
                ></webshell-tty>
            </a-tab-pane>
        </a-tabs>
    </div>
</template>

<script>
import webshellTty from '@/components/webshell-tty.vue';
import { getToken } from '@/utils/auth';

export default {
    data(){
        return {
            id: 1,
            token: '',
            activeIndex: '',
            data: [],
            shellRefs: {},
        }
    },
    components: {webshellTty},
    created(){
        const token = getToken();
        this.token = token;
        if(this.$route.query.api_token){
            this.token = this.$route.query.api_token;
        }

        this.data.push({
            key: 'ws'+Date.now(),
            name: 'webshell ' + this.id,
        });
        this.id ++;
        this.activeIndex = this.data[0].key;
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
            this.data.push({
                key: 'ws'+Date.now(),
                name: 'webshell ' + this.id,
            });
            this.id ++;
            this.activeIndex = this.data[this.data.length-1].key;
        },
        handleDelete(key){
            this.closeShellByKey(key);
            const index = this.data.findIndex(i => i.key === key);
            if (index < 0) return;
            const fallback = this.data.find(i => i.key !== key);
            this.data.splice(index, 1);
            if (fallback) {
                this.activeIndex = fallback.key;
            }
        },
    },
}
</script>

<style>
.webshell-tabs .arco-tabs-content{padding-top:20px; padding:20px;background-color:rgb(31, 29, 69);}
</style>
