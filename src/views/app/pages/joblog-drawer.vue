<template>
    <a-modal v-model:visible="log.showPod" title="日志" width="1000px" :fullscreen="log.fullscreen" :closable="false" class="log-model" :show-close="false" @open="openDialog" @close="closeModal" :popup-container="false?'#allmodalbox':'body'">
        <template #title>
            <div class="df ai-c jc-c fc log-model-title">
                <span class="fs-18">任务日志</span>
                <div class="df ai-c btns">
                    <div class="btn ml-20 cursor" @click="fullscreen">
                        <icon-fullscreen v-if="!log.fullscreen" class="fs-20 c-66" />
                        <icon-fullscreen-exit v-else class="fs-20 c-66" />
                    </div>
                    <div class="btn ml-20 cursor" @click="closeModal">
                        <icon-close class="fs-20 c-66" />
                    </div>
                </div>
            </div>
        </template>
        
            <div style="margin-bottom:10px;">
                <div class="df ai-c">
                    <div class="df ai-c">
                        <div>是否跟踪：</div>
                        <div class="ml-10">
                            <a-switch v-model="log.follow" :checked-value="true" :unchecked-value="false" @change="getLog"></a-switch>
                        </div>
                    </div>
                    <div v-if="log.containerList.length>1" class="df ai-c">
                        <div class="ml-20">容器：</div>
                        <div class="ml-10">
                            <a-select v-model="log.container" @change="getLog" style="min-width:200px;">
                                <a-option v-for="i in log.containerList" :key="i" :value="i">{{i}}</a-option>
                            </a-select>
                        </div>
                    </div>
                </div>
                
            </div>
        <div class="df df-c" style="width:100%;">
            <div id="term"></div>
        </div>
    </a-modal>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from "axios";
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useNamespaceStore } from '@/store';

export default {
    props: ['show','label'],
    data(){
        return {
            namespaceActive: '',
            term: null,
            fitAddon: null,
            podcont: '',
            podname: '',

            log: {
                showPod: false,
                follow: true,
                fullscreen: false,
                containerList: [],
            },
            logSource: null,
            rules:{
                name: [{ required: true, message: '请输入存储名称', trigger: 'blur' }],
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    beforeUnmount(){
        this.disposeTerm();
    },
    watch: {
        show(val){
            this.log.showPod = val;
            val && this.getContList();
        },
    },
    methods: {
        disposeTerm(){
            try{
                if(this.term){
                    this.term.dispose();
                    this.term = null;
                }
                this.fitAddon = null;
            }catch(e){
                this.term = null;
                this.fitAddon = null;
            }
        },
        closeModal(){
            this.log.showPod = false;
            this.log.fullscreen = false;
            this.disposeTerm();
            this.$emit('close')
        },
        getContList(){
            let label = this.label;
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{params:{
                labelSelector: label
            }}).then(res=>{
                let items = res?.data?.items || [];
                let first = items?.[0];
                if(!first){return}
                this.podname = first?.metadata?.name;
                
                let containers = [];
                containers = first?.spec?.initContainers || [];
                containers = containers.concat(first?.spec?.containers || []);
                this.log.containerList = containers.map(i=>i.name);
                if(containers.length>1){
                    this.log.container = containers[0]?.name;
                }

                this.getLog();
            })
        },
        getLog(){
            let o = {};
            if(this.log.containerList.length>1){
                o.container = this.log.container;
            }
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ this.podname +'/log',{params:{
                follow: this.log.follow,
                ...o,
            }}).then(res=>{
                this.podcont = res.data || '';
                this.selectLog(this.podcont);
            })
        },
        openDialog(){
            if(!this.term){
                this.termInit(()=>{
                    this.selectLog(this.podcont);
                });
            } else {
                this.selectLog(this.podcont);
            }
        },
        termInit(callback){
            document.getElementById("term").innerHTML = "";
            this.term = new Terminal({
                rendererType: 'dom',
                cursorBlink: false,
            });
            this.term.open(document.getElementById("term"));

            this.fitAddon = new FitAddon();
            this.term.loadAddon(this.fitAddon);
            this.fitAddon.fit();

            callback && callback();
        },
        selectLog(e){
            if(!this.term){return}
            this.term.reset();
            e = e.replace(/\x20+/g,' ');
            e = e.replace(/(?<!\r)\n/g,'\r\n');
            setTimeout(()=>{this.fitAddon.fit();},30);
            setTimeout(()=>{this.term.write(e);},60);
        },
        fullscreen(){
            this.log.fullscreen = !this.log.fullscreen;
            this.$nextTick(()=>{
                this.term = null;
                this.openDialog();
            })
        },
    },
}
</script>

<style>

</style>