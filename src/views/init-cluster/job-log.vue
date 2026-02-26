<template>
    <div v-if="visible" style="width:100%;">
        <div ref="termbox" class="mt-10" style="height:300px;"></div>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import { getToken } from '@/utils/auth';

export default {
    props: ['show','name'],
    data(){
        return {
            namespaceActive: 'default',
            visible: false,
            
            logls: {
                act: 0,
                list: [],
                open: false,

                podcont: "",
                pod_name: "",
                container: "",
                containerList: [],
                follow: false,
            },
            itemTerm: null,
        }
    },
    watch:{
        show(v){
            this.visible = v;
            if(!v){return}
            this.init();
            this.$nextTick(()=>{
                this.logls.open = true;
                let dom = this.$refs.termbox;
                dom.innerHTML = "";
                this.itemTerm = new Terminal({
                    rendererType: 'dom',
                    cursorBlink: false,
                });
                this.itemTerm.open(dom);

                this.itemFitAddon = new FitAddon();
                this.itemTerm.loadAddon(this.itemFitAddon);
                this.itemFitAddon.fit();

                this.selectItemLog(this.logls.podcont);
            })
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    beforeDestroy() {
        this.disposeTerm();
    },
    methods: {
        disposeTerm(){
            try{
                // 先销毁 term，它会自动清理已加载的 addons
                if(this.itemTerm){
                    this.itemTerm.dispose();
                    this.itemTerm = null;
                }
                // fitAddon 已被 term 自动处理，只需置空
                this.itemFitAddon = null;
            }catch(e){
                this.itemTerm = null;
                this.itemFitAddon = null;
            }
        },
        init(){
            this.showHis()
        },
        closeModal(){
            this.visible = false;
            this.$emit('close');
        },
        showHis(item){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/'+this.name+'?local=1').then(res=>{
                let data = [res?.data];
                let list = data.map(i=>{
                    let durationInSeconds = '';
                    if(i.status.completionTime && i.status.startTime){
                        let st = new Date(i.status.startTime);
                        let ct = new Date(i.status.completionTime);
                        durationInSeconds = Math.floor((ct - st) / 1000) + '秒';
                    }
                    let status_class = i.spec?.suspend? 'c-99' : (i.status?.succeeded? 'c-green' : 'c-red');
                    let status_text = i.spec?.suspend? '挂起' : (i.status?.succeeded? '成功' : '失败');
                    
                    return {
                        title: i.metadata.annotations.title || i.metadata.name,
                        name: i.metadata.name,
                        startTime: window.formatDate(i.status.startTime),
                        stimes: new Date(i.status.startTime).getTime(),
                        completionTime: window.formatDate(i.status.completionTime),
                        durationInSeconds: durationInSeconds,
                        suspend: i.spec?.suspend,
                        status_text: status_text,
                        status_class: status_class,
                        dataItem: i,
                        type: 'jobs',
                    }
                })
                list.sort((i,j)=>j.stimes-i.stimes);
                this.logls.list = list;
                this.logls.act = 0;
                this.logls.show = true;
                // this.logls.open = false;
                this.logls.podcont = '';
                this.getItemPod();
            })
        },
        getItemPod(){
            if(!this.logls.list?.length){
                this.logls.containerList = [];
                this.logls.container = '';
                this.logls.podcont = '';
                this.selectItemLog(this.logls.podcont);
                return
            }
            let selector = this.logls.list[this.logls.act]?.dataItem?.spec?.selector?.matchLabels;
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{params:{
                labelSelector: label,
                local: 1,
            }}).then(res=>{
                let items = res?.data?.items || [];
                let first = items?.[0];
                if(!first){return}
                let pod_name = first?.metadata?.name;
                this.logls.follow = true;
                this.logls.pod_name = pod_name;

                let containers = [];
                containers = first?.spec?.initContainers || [];
                containers = containers.concat(first?.spec?.containers || []);
                this.logls.containerList = containers.map(i=>i.name);
                
                if(containers.length>1){
                    this.logls.container = containers[0]?.name;
                }
                this.getItemLog();
            })
        },
        getItemLog(){
            let o = {};
            if(this.logls.containerList.length>1){
                o.container = this.logls.container;
            }
            if(!this.logls.follow){
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ this.logls.pod_name +'/log',{
                    params: {
                        follow: this.logls.follow,
                        local: 1,
                        ...o,
                    },
                    noAlert: true,
                }).then(res=>{
                    this.logls.podcont = res?.data || '';
                    if(this.logls.open){
                        this.selectItemLog(this.logls.podcont);
                    }
                }).catch(()=>{
                    setTimeout(()=>{
                        this.getItemLog();
                    }, 3000)
                })
            }else{
                this.logls.podcont = '';
                this?.term?.reset();
                
                const controller = new AbortController();
                const { signal } = controller;
                const queryString = new URLSearchParams({follow: true, ...o}).toString();
                fetch('/k8s-proxy/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ this.logls.pod_name +'/log?'+queryString+'&local=1', {
                    signal,
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "authorization": "Bearer "+getToken(),
                    },
                }).then(response=>{
                    // 检查响应是否成功且是流式响应
                    if (!response.ok || !response.body) {
                        if (response.status === 400) {
                            setTimeout(()=>{
                                this.getItemLog();
                            }, 3000)
                        }
                        return
                    }

                    // 获取流的读取器
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8'); // 用于将二进制数据解码为文本

                    // 递归读取流数据
                    let readStream = ()=>{
                        return reader.read().then(({ done, value }) => {
                            if(done){return}
                            if (!this.logls.follow) {
                                controller.abort();    
                                return;
                            }

                            // 将二进制数据解码为文本
                            const chunk = decoder.decode(value, { stream: true });
                            
                            this.logls.podcont = this.logls.podcont + (chunk || '');
                            if(this.logls.open){
                                // this.selectItemLog(this.logls.podcont);
                                let e = chunk;
                                e = e.replace(/\x20+/g,' ');
                                e = e.replace(/(?<!\r)\n/g,'\r\n');
                                this?.itemTerm?.write(e);
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
                })
            }
        },
        selectItemLog(e){
            if(!this.itemTerm){return}
            this.itemTerm.reset();
            e = e.replace(/\x20+/g,' ');
            e = e.replace(/(?<!\r)\n/g,'\r\n');
            setTimeout(()=>{this.itemFitAddon.fit();},30);
            setTimeout(()=>{this.itemTerm.write(e);},60);
        },
    },
}
</script>

<style scoped>
.box{border:1px solid var(--color-neutral-3);;}
</style>