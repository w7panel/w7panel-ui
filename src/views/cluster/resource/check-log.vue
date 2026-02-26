<template>
    <a-modal v-model:visible="visible" title="查看日志" width="1000px" :fullscreen="log.fullscreen" :closable="false" class="log-model" :show-close="false" @open="openDialog" :popup-container="false?'#allmodalbox':'body'">
        <template #title>
            <div class="df ai-c jc-c fc log-model-title">
                <span class="fs-18">查看日志</span>
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
                            <a-option v-for="i in log.containerList" :key="i.name" :value="i.name">{{i.name}}</a-option>
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
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { getToken } from '@/utils/auth';
import axios from 'axios';

export default {
    props: ['show', 'data', 'token'],
    data(){
        return {
            visible: false,
            log: {
                podcont: '',
                realtimeLog: false,
                name: "",
                namespace: "",
                ws: null,
                fullscreen: false,
                containerList: [],
                container: null,
            },
        }
    },
    watch: {
        show(v){
            this.visible = v;
            if(!v){return}
            this.openLog();
        },
    },
    methods: {
        openLog(){
            this.log.name = this.data?.name;
            this.log.follow = true;
            this.log.namespace = this.data?.namespace;
            this.log.containerList = this.data?.containerList || [];
            this.log.container = this.data?.containerList?.[0]?.name;
            this.getLog();
        },
        closeModal(){
            this.visible = false;
            this.$emit('close');
        },
        fullscreen(){
            this.log.fullscreen = !this.log.fullscreen;
            this.$nextTick(()=>{
                this.term = null;
                this.openDialog();
            })
        },
        selectLog(e){
            if(!this.term){return}
            this.term.reset();
            e = e.replace(/\x20+/g,' ');
            e = e.replace(/(?<!\r)\n/g,'\r\n');
            setTimeout(()=>{this.fitAddon.fit();},30);
            setTimeout(()=>{this.term.write(e);},60);
            // this.term?.selectAll && this.term.selectAll();
        },
        getLog(){
            this.log.podcont = '';
            this.term?.reset();

            let o = {};
            if(this.log.containerList.length>1){
                o.container = this.log.container;
            }
            if(!this.log.follow){
                k8sproxy.get('/api/v1/namespaces/'+ this.log.namespace +'/pods/'+this.log.name+'/log',{
                    params: {
                        follow: false,
                        ...o,
                    },
                    customToken: this.token,
                }).then(res =>{
                    this.log.podcont = res.data || '';
                    this.openDialog();
                })
                return;
            }
            
            const controller = new AbortController();
            const { signal } = controller;
            fetch('/k8s-proxy/api/v1/namespaces/'+ this.log.namespace +'/pods/'+this.log.name+'/log?follow=' + this.log.follow + (o.container?'&container='+o.container : ''), {
                signal,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "authorization": "Bearer "+ (this.token || getToken()),
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
                        if (!this.log.follow || !this.visible) {
                            controller.abort();    
                            return;
                        }

                        // 将二进制数据解码为文本
                        const chunk = decoder.decode(value, { stream: true });
                        
                        this.log.podcont = this.log.podcont + (chunk || '');
                        if(this.visible){
                            // this.openDialog();
                            let e = chunk;
                            e = e.replace(/\x20+/g,' ');
                            e = e.replace(/(?<!\r)\n/g,'\r\n');
                            this?.term?.write(e);
                        }
                        // 递归读取下一块数据
                        return readStream();
                    });
                }
                // 开始读取流
                return readStream();
            }).catch((error)=>{
                if (error.name === 'AbortError' || error.code === 20) { return; }
                console.log('log fetch error', error)
            });
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
    },
}
</script>

<style>
.log-model .arco-modal-body{padding:10px;}
.log-model .log-model-title{position:relative; height:44px;}
.log-model .log-model-title .btns{position:absolute; right:0; top:0; height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 114px);}
.log-model .arco-modal-fullscreen .arco-modal-body>.df{height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body #term{height:100%;}
.log-model #term{height:418px;}
</style>