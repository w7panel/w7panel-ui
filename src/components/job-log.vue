<template>
    <a-modal :visible="visible" class="logsmodal" width="1100px" :footer="false" @open="logls.open=true;" @cancel="closeModal()" :popup-container="false?'#allmodalbox':'body'">
        <template #title>执行记录</template>
        <div class="df">
            <div>
                <div class="df jc-e" style="height:400px; overflow:auto; max-width:300px;">
                    <a-tabs v-model:active-key="logls.act" position="left" class="logtabs">
                        <a-tab-pane v-for="(item,index) in logls.list" :key="index">
                            <template #title>
                                <span>{{item.startTime}}</span>
                                <span class="ml-10">{{item.durationInSeconds}}</span>
                            </template>
                        </a-tab-pane>
                    </a-tabs>
                </div>
            </div>
            <div class="ml-20 fc">
                
                <div style="margin-bottom:10px;">
                    <div class="df ai-c">
                        <div class="df ai-c">
                            <div>是否跟踪：</div>
                            <div class="ml-10">
                                <a-switch v-model="logls.follow" :checked-value="true" :unchecked-value="false" @change="getItemLog"></a-switch>
                            </div>
                        </div>
                        <div v-if="logls.containerList.length>1" class="df ai-c">
                            <div class="ml-20">容器：</div>
                            <div class="ml-10">
                                <a-select v-model="logls.container" @change="getItemLog" style="min-width:150px;">
                                    <a-option v-for="i in logls.containerList" :key="i" :value="i">{{i}}</a-option>
                                </a-select>
                            </div>
                        </div>
                        <div class="df ai-c">
                            <div class="ml-20">条数：</div>
                            <div class="ml-10">
                                <a-select v-model="logls.tailLines" @change="getItemLog" style="min-width:100px;">
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
                <div ref="termbox" class="mt-10" style="height:400px;"></div>
            </div>
        </div>
    </a-modal>

</template>

<script>
import { k8sproxy } from '@/utils/api';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import axios from 'axios';
import { useNamespaceStore } from '@/store';

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
                tailLines: 100,
            },
            itemTerm: null,
            itemFitAddon: null,
            retryCount: 0,
            maxRetries: 5,
            currentRequest: null,
        }
    },
    watch:{
        show(v){
            this.visible = v;
            v && this.init();
        },
        "logls.open"(v){
            if(!v){return}
            let dom = this.$refs.termbox;
            dom.innerHTML = "";
            this.itemTerm = new Terminal({
                cursorBlink: false,
            });
            this.itemTerm.open(dom);

            this.itemFitAddon = new FitAddon();
            this.itemTerm.loadAddon(this.itemFitAddon);
            this.itemFitAddon.fit();

            this.selectItemLog(this.logls.podcont);
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    beforeUnmount() {
        this.stopLogStream();
        this.disposeTerm();
    },
    methods: {
        disposeTerm(){
            try{
                if(this.itemTerm){
                    this.itemTerm.dispose();
                    this.itemTerm = null;
                }
                this.itemFitAddon = null;
            }catch(e){
                this.itemTerm = null;
                this.itemFitAddon = null;
            }
        },
        stopLogStream(){
            if(this.currentRequest){
                this.currentRequest.cancel();
                this.currentRequest = null;
            }
        },
        init(){
            this.showHis()
        },
        closeModal(){
            this.stopLogStream();
            this.disposeTerm();
            this.visible = false;
            this.$emit('close');
        },
        showHis(item){
            k8sproxy.get('/apis/batch/v1/namespaces/'+ this.namespaceActive +'/jobs/'+this.name).then(res=>{
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
                this.logls.open = false;
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
                labelSelector: label
            }}).then(res=>{
                let items = res?.data?.items || [];
                let first = items?.[0];
                if(!first){return}
                let pod_name = first?.metadata?.name;
                this.logls.follow = false;
                this.logls.pod_name = pod_name;

                let containers = [];
                containers = first?.spec?.initContainers || [];
                containers = containers.concat(first?.spec?.containers || []);
                this.logls.containerList = containers.map(i=>i.name);
                
                if(containers.length>1){
                    this.logls.container = containers[0]?.name;
                }
                this.getItemLog();
            }).catch((err)=>{
                console.error('Failed to get pod:', err);
            })
        },
        getItemLog(){
            this.stopLogStream();

            let o = {};
            if(this.logls.containerList.length>1){
                o.container = this.logls.container;
            }

            // 创建取消令牌
            const CancelToken = axios.CancelToken;
            const source = CancelToken.source();
            this.currentRequest = source;

            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+ this.logls.pod_name +'/log',{
                params: {
                    follow: this.logls.follow,
                    tailLines: this.logls.tailLines,
                    ...o,
                },
                noAlert: true,
                cancelToken: source.token,
            }).then(res=>{
                this.logls.podcont = res.data || '';
                this.retryCount = 0;
                this.currentRequest = null;
                if(this.logls.open){
                    this.selectItemLog(this.logls.podcont);
                }
            }).catch((err)=>{
                if (axios.isCancel(err)) {
                    return;
                }
                if (this.retryCount >= this.maxRetries) {
                    return;
                }
                this.retryCount++;
                const delay = 3000 * Math.pow(2, this.retryCount - 1);
                setTimeout(()=>{
                    this.getItemLog();
                }, delay);
            })
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

<style>

</style>