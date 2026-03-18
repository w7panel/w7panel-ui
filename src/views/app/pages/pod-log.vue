<template>
    <a-modal v-model:visible="log.showPod" title="查看日志" width="1000px" :fullscreen="log.fullscreen" :closable="false" @open="openDialog" class="log-model" :show-close="false">
        <template #title>
            <div class="df ai-c jc-c fc log-model-title">
                <span class="fs-18">查看日志</span>
                <div class="df ai-c btns">
                    <div class="btn ml-20 cursor" @click="fullscreen">
                        <icon-fullscreen v-if="!log.fullscreen" class="fs-20 c-66" />
                        <icon-fullscreen-exit v-else class="fs-20 c-66" />
                    </div>
                    <div class="btn ml-20 cursor" @click="log.showPod=false;">
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
                
                <div class="df ai-c">
                    <div class="ml-20">容器：</div>
                    <div class="ml-10">
                        <a-select v-model="log.container" @change="getLog" style="min-width:150px;">
                            <a-option v-for="i in log.containerList" :key="i.name" :value="i.name">{{i.name}}</a-option>
                        </a-select>
                    </div>
                </div>

                <div class="df ai-c">
                    <div class="ml-20">条数：</div>
                    <div class="ml-10">
                        <a-select v-model="log.tailLines" @change="getLog" style="min-width:100px;">
                            <a-option :value="50">50条</a-option>
                            <a-option :value="100">100条</a-option>
                            <a-option :value="200">200条</a-option>
                            <a-option :value="500">500条</a-option>
                            <a-option :value="1000">1000条</a-option>
                            <a-option :value="2000">2000条</a-option>
                        </a-select>
                    </div>
                </div>
            </div>
        </div>
        <div class="df df-c" style="width:100%;">
            <div :id="id" class="termdialog"></div>
        </div>
    </a-modal>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore } from '@/store';
import { getToken,getUserInfo } from '@/utils/auth';

import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import axios from 'axios';

export default{
    props: ['show','data'],
    data(){
        return {
            id: 'termdialog',
            namespaceActive: '',
            log: {
                showPod: false,
                follow: true,
                podcont: '',
                realtimeLog: false,
                name: "",
                ws: null,
                fullscreen: false,
                containerList: [],
                container: '',
                tailLines: 100,
            },
            
            term: null,
            fitAddon: null,
            logController: null,
        }
    },
    created(){
        this.id = ('termdialog' + Math.random()).replace('.','');
        this.namespaceActive = useNamespaceStore().namespace;
    },
    mounted(){
        this.init();
    },
    beforeUnmount(){
        this.stopLogStream();
        this.disposeTerm();
    },
    watch:{
        show(){
            this.init();
        },
        'log.showPod'(v){
            if(!v){
                this.stopLogStream();
                this.disposeTerm();
                this.$emit('close')
            }
        },
    },
    methods: {
        stopLogStream(){
            if(this.logController){
                this.logController.abort();
                this.logController = null;
            }
        },
        disposeTerm(){
            try{
                // 先 dispose term，它会自动清理 loaded addons
                if(this.term){
                    this.term.dispose();
                    this.term = null;
                }
                // 然后单独置空 fitAddon（可能已经被 term.dispose 清理了）
                this.fitAddon = null;
            }catch(e){
                // 忽略 disposal 错误
                this.term = null;
                this.fitAddon = null;
            }
        },
        init(){
            if(!this.show){return}
            this.log.name = this.data.name;
            this.log.container = this.data.container;
            this.log.containerList = this.data.containerList;
            this.getLog();
        },
        getLog(){
            this.stopLogStream();
            
            let o = {};
            if(this.log.containerList.length>=1){
                o.container = this.log.container;
            }
            if(!this.log.follow){
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+this.log.name+'/log',{
                    params: {follow: false, tailLines: this.log.tailLines, ...o},
                }).then(res =>{
                    this.log.podcont = res.data || '';
                    if(this.log.showPod){
                        this.openDialog();
                    }else{
                        this.log.showPod = true;
                    }
                })
                return;
            }

            this.log.showPod = true;
            this.log.podcont = '';
            this.term?.reset();
            
            const controller = new AbortController();
            this.logController = controller;
            const { signal } = controller;
            const queryString = new URLSearchParams({follow: true, tailLines: this.log.tailLines, ...o}).toString();
            fetch('/k8s-proxy/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+this.log.name+'/log?'+queryString, {
                signal,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "authorization": "Bearer "+getToken(),
                },
            }).then(response=>{
                // 检查响应是否成功且是流式响应
                if (!response.ok || !response.body) {return}

                // 获取流的读取器
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8'); // 用于将二进制数据解码为文本

                // 递归读取流数据
                let readStream = ()=>{
                    return reader.read().then(({ done, value }) => {
                        if(done){return}
                        if (!this.log.follow || !this.log.showPod) {
                            controller.abort();    
                            return;
                        }

                        // 将二进制数据解码为文本
                        const chunk = decoder.decode(value, { stream: true });
                        
                        // 增量写入终端，不累积历史
                        if(this.log.showPod && this.term){
                            let e = chunk.replace(/\x20+/g,' ');
                            e = e.replace(/(?<!\r)\n/g,'\r\n');
                            this.term.write(e);
                        }
                        // 递归读取下一块数据
                        return readStream();
                    });
                }
                // 开始读取流
                return readStream();
            }).catch((error)=>{
                // 忽略 AbortError，这是组件卸载时正常中断请求
                if (error.name === 'AbortError' || error.code === 20) { return; }
                console.log('log fetch error', error)
            });
            return;
        },
        openDialog(){
            if(!this.term){
                setTimeout(()=>{
                    this.termInit(()=>{
                        this.selectLog(this.log.podcont);
                    });
                },100)
            } else {
                this.selectLog(this.log.podcont);
            }
        },
        termInit(callback){
            document.getElementById(this.id).innerHTML = "";
            this.term = new Terminal({
                cursorBlink: false,
            });
            this.term.open(document.getElementById(this.id));

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
            setTimeout(()=>{this.fitAddon?.fit();},30);
            setTimeout(()=>{this.term.write(e);},60);
            // this.term?.selectAll && this.term.selectAll();
        },
        fullscreen(){
            this.log.fullscreen = !this.log.fullscreen;
            this.$nextTick(()=>{
                this.term = null;
                this.openDialog();
            })
        },
    }
}
</script>
<style>

.log-model .arco-modal-body{padding:10px;}
.log-model .log-model-title{position:relative; height:44px;}
.log-model .log-model-title .btns{position:absolute; right:0; top:0; height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 114px);}
.log-model .arco-modal-fullscreen .arco-modal-body>.df{height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body .termdialog{height:100%;}
.log-model .termdialog{height:418px;}

</style>