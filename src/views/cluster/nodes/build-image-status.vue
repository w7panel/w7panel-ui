<template>
    <div>
        <!-- @cancel="closeDrawer(true)" -->
        <a-modal
            v-model:visible="visible"
            :title="title"
            title-align="start"
            width="1000px"
            :footer="false"
            :closable="false"
            :mask-closable="false"
        >
            <template #title>
                <div class="df ai-c jc-b fc model-title">
                    <span class="fs-18">{{title}}</span>
                    <div class="df ai-c btns">
                        <div class="btn ml-20 cursor" @click="(status==1||status==2)?closeDrawer(true):appDialogConfirm.show=true;">
                            <icon-close class="fs-20 c-66" />
                        </div>
                    </div>
                </div>
            </template>
            <div class="df df-c ai-c" style="height:360px;">
                
                <div class="df df-c ai-c mt-20">
                    <icon-check-circle-fill v-if="status==1" style="font-size:80px;color:rgb(var(--green-6));" />
                    <icon-close-circle-fill v-else-if="status==2" class="c-red" style="font-size:80px;" />
                    <img v-else src="@/assets/image/loading.png" style="width:60px; height:auto;" class="loader" alt="" />
                    <div class="fs-18 mt-16 c-99">
                        <div v-if="status==1">任务成功</div>
                        <div v-else-if="status==2">任务失败</div>
                        <div v-else>任务执行中</div>
                    </div>
                </div>

                <div class="task mt-60">

                    <div class="item df ai-c">
                        <div class="fc df ai-c" style="overflow:hidden;">
                            <span class="df-s0">执行命令</span>
                            <span class="fc ml-20 c-99 one-hide txt-overhidden cursor" @click="log.type='exec';openLog();">{{exec.lastRow}}</span>
                        </div>
                        <div class="df-s0 ml-20">
                            <icon-check-circle-fill v-if="exec.status==1" class="c-green" />
                            <span v-if="exec.status==1" class="ml-6">正常</span>
                            <icon-close-circle-fill v-if="exec.status==2" class="c-red" />
                            <span v-if="exec.status==2" class="ml-6">失败</span>
                            <icon-loading v-if="exec.status==3" />
                            <span v-if="exec.status==3" class="ml-6">执行中...</span>
                            <span v-if="exec.status==0" class="ml-6">未执行</span>
                        </div>
                    </div>

                    <div class="item df ai-c">
                        <div class="fc df ai-c" style="overflow:hidden;">
                            <span class="df-s0">镜像推送</span>
                            <span class="fc ml-20 c-99 one-hide txt-overhidden cursor" @click="log.type='imagePush';openLog();">{{imagePush.lastRow}}</span>
                        </div>
                        <div class="df-s0 ml-20">
                            <icon-check-circle-fill v-if="imagePush.status==1" class="c-green" />
                            <span v-if="imagePush.status==1" class="ml-6">正常</span>
                            <icon-close-circle-fill v-if="imagePush.status==2" class="c-red" />
                            <span v-if="imagePush.status==2" class="ml-6">失败</span>
                            <icon-loading v-if="imagePush.status==3" />
                            <span v-if="imagePush.status==3" class="ml-6">执行中...</span>
                            <span v-if="imagePush.status==0" class="ml-6">未执行</span>
                        </div>
                    </div>
                </div>

            </div>
        </a-modal>

        <a-modal :visible="appDialogConfirm.show" @ok="appDialogConfirm.show=false;closeDrawer(true)" @cancel="appDialogConfirm.show=false;">
            <template #title>提示</template>
            <div>关闭后任务将被终止，是否关闭？</div>
        </a-modal>

        <a-modal title="详情" width="900px" v-model:visible="log.show" :footer="false">
            <div class="log-terminal" ref="bislog"></div>
        </a-modal>
    </div>
</template>
<script>
import { useNamespaceStore } from '@/store';
import { k8sproxy, panelApi } from '@/utils/api';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import axios from 'axios';
import { getToken } from '@/utils/auth';
export default{
    props: ['show','data','serverInfo'],
    data(){
        return {
            namespaceActive: 'default',
            title: "打包容器镜像",
            visible: false,
            exec: {
                status: 0,
                result: '',
                lastRow: '',
            },
            imagePush: {
                status: 0,
                result: '',
                lastRow: '',
            },
            log: {
                show: false,
                data: '',
                type: '',
            },
            term: null,
            fitAddon: null,

            socket: null,
            socketClose: false,
            preAddress: 'registry.local.w7.cc/',
            appDialogConfirm: {show:false},
        }
    },
    computed: {
        imageName(){
            return `${this.data?.namespace||this.namespaceActive}/${this.data?.imageName}`
        },
        status(){
            if(this.exec.status==1 && this.imagePush.status==1){return 1;}
            if(this.exec.status==2 || this.imagePush.status==2){return 2;}
            return 3;
        }
    },
    watch: {
        show(v){
            this.visible = v;
            v && this.init();
            if(!v){
                this.$emit('reject','close');
            }
        },
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
    },
    methods: {
        init(){
            this.imagePush.lastRow = '';
            this.exec.lastRow = '';
            
            this.exec = {
                ...this.exec,
                status: 3,
                result: '',
            };
            this.imagePush.status = 3;

            this.getStatus();
        },
        
        async runExec(data){
            let baseURL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
            let url = baseURL + '/panel-api/v1/exec';
            
            const params = new URLSearchParams();
            params.set('podName', data?.podName || '');
            params.set('namespace', this.namespaceActive);
            params.set('containerName', data?.containerName || '');
            params.append('command', '/bin/sh');
            params.append('command', '-c');
            params.append('command', data.command);
            params.set('tty', 'false');
            params.set('api-token', getToken());
            
            return new Promise((resolve, reject) => { 
                let result = '';
                this.socket = new WebSocket(`${url}?${params.toString()}`);
                this.socket.onopen = () => {
                    this.socketClose = false;
                }
                this.socket.onmessage = (res) => {
                    let chunk = res?.data;
                    result += chunk;
                    this.exec.result = result;
                    this.exec.lastRow = chunk.split('\n').filter(Boolean).pop();
                    // 日志弹窗打开且类型匹配时实时写入终端
                    if(this.log.show && this.log.type == 'exec'){
                        this.writeChunk(chunk);
                    }
                }
                this.socket.onclose = (e)=>{
                    console.log('socket close',e)
                    this.socketClose = true;
                    // 如果reason里包含timeout或upstream_close则失败
                    if(e.reason.includes('timeout') || e.reason.includes('upstream_close')){
                        this.exec.status = 2;
                        reject(e);
                        return;
                    }
                    resolve({data: result});
                }
                this.socket.onerror = (e)=>{
                    this.socketClose = true;
                    reject(e);
                }
            });
        },
        async getStatus(){
            let buildContainer = this.data;
            this.exec.status = 0;
            this.imagePush.status = 0;
            
            // 执行命令
            if(buildContainer.cmd){
                this.exec.result = '';
                this.exec.status = 3;
                try{
                    await this.runExec({
                        podName: buildContainer.podName,
                        containerName: buildContainer.containerName,
                        command: buildContainer.cmd,
                    });
                    this.exec.status = 1;
                }catch{
                    this.$emit('reject','cmd');
                    this.exec.status = 2;
                }
            }else{
                this.exec.status = 1;
                this.exec.result = '';
            }
            if(this.exec.status==2){return;}
            if(!this.visible){return}

            // 镜像推送
            try{
                this.imagePush.status = 3;
                this.imagePush.result = '';
                await axios.post(this.serverInfo.agentUrl.replace(/\/$/,'')+'/panel-api/v1/containers/image/export-push',{
                    containerID: buildContainer.containerID?.replace?.(/^containerd:\/\//,''),
                    imageName: this.imageName,
                    registryDomain: this.serverInfo.registryDomain,
                },{
                    // loading: true,
                    timeout: 0,
                    // 👇 关键：开启流式响应，实时获取返回数据
                    responseType: 'stream',
                    onDownloadProgress: async (progressEvent) => {
                        try {
                            // 实时获取返回的文本内容
                            const chunk = progressEvent?.target?.responseText || progressEvent?.event?.target?.responseText;
                            if (chunk) {
                                this.imagePush.result += chunk;
                                this.imagePush.lastRow = chunk.split('\n').filter(Boolean).pop();

                                if(this.log.show && this.log.type=='imagePush'){
                                    this.writeChunk(chunk);
                                }
                            }
                        } catch (e) {}
                    },
                }).then(async res=>{
                    this.imagePush.status = 1;
                    console.log('镜像推送成功');
                    this.$emit('complete',{imageName:this.preAddress + this.imageName});
                }).catch(err=>{ 
                    console.log('镜像推送失败: ' + (err.response?.data?.message || err.message || '未知错误'));
                    this.imagePush.status = 2;
                    this.$emit('reject','image')
                });
            }catch(err){
                console.log('镜像推送失败: ' + (err.response?.data?.message || err.message || '未知错误'));
                this.imagePush.status = 2;
                return;
            }
            if(this.imagePush.status==2){return;}
            if(!this.visible){return}
            
            if(buildContainer.pinned){
                await axios.post(this.serverInfo.agentUrl+'/panel-api/v1/registry/patch/images/label',{
                    "name": this.preAddress + this.imageName,
                    "labels": {"io.cri.containerd.pinned":"pinned", "io.cattle.k3s.pinned":"pinned"},
                    "replace": true,
                },{
                    noAlert: true,
                    // loading: true,
                }).then(()=>{}).catch(()=>{});
            }

            if(!this.visible){return}
            if(buildContainer.updateImage){
                this.onBuildComplete({
                    newImage: this.preAddress + this.imageName,
                    containerName: buildContainer.containerName,
                    ownerRef: buildContainer.ownerRef,
                });
            }
        },
        
        async onBuildComplete({newImage,containerName,ownerRef}){

            try {
                let kind = ownerRef.kind;
                let name = ownerRef.name;
                // 如果 owner 是 ReplicaSet，继续向上查找到 Deployment
                if(kind === 'ReplicaSet'){
                    let { data: rs } = await k8sproxy.get(`/apis/apps/v1/namespaces/${this.namespaceActive}/replicasets/${name}`);
                    let deployRef = rs?.metadata?.ownerReferences?.[0];
                    if(deployRef?.kind === 'Deployment'){
                        kind = 'Deployment';
                        name = deployRef.name;
                    }
                }

                let kindApiMap = {
                    'Deployment': 'apis/apps/v1',
                    'StatefulSet': 'apis/apps/v1',
                    'DaemonSet': 'apis/apps/v1',
                    'Pod': 'api/v1',
                };
                let apiPrefix = kindApiMap[kind] || 'apis/apps/v1';
                let resource = kind.toLowerCase() + 's';

                // 查找容器在 spec.containers 中的索引
                let { data: workload } = await k8sproxy.get(`${apiPrefix}/namespaces/${this.namespaceActive}/${resource}/${name}`);
                let containers = workload?.spec?.template?.spec?.containers || [];
                let idx = containers.findIndex(c => c.name === containerName);
                if(idx === -1){ idx = 0; }

                await k8sproxy.patch(`/${apiPrefix}/namespaces/${this.namespaceActive}/${resource}/${name}`, [{
                    op: 'replace',
                    path: `/spec/template/spec/containers/${idx}/image`,
                    value: newImage,
                }], {
                    headers: {'Content-Type': 'application/json-patch+json'},
                    loading: true,
                });
                this.$message.success('容器镜像已更新');
            } catch(e) {
                this.$message.error('更新容器镜像失败: ' + (e?.response?.data?.message || e.message));
            }
        },
        openLog(){
            this.log.show = true;
            if(this.log.type=='exec'){
                this.log.data = this.exec.result;
            }else if(this.log.type=='imagePush'){
                this.log.data = this.imagePush.result;
            }
            this.$nextTick(()=>{
                this.initTerm();
                if(this.log.data){
                    let text = this.log.data.replace(/\x20+/g, ' ');
                    text = text.replace(/(?<!\r)\n/g, '\r\n');
                    this.$nextTick(()=>{
                        this.term?.write(text);
                        this.fitAddon?.fit();
                    });
                }
            });
        },
        initTerm(){
            if(this.term){
                try { this.term.dispose(); } catch{}
                this.term = null;
                this.fitAddon = null;
            }
            let dom = this.$refs.bislog;
            if(!dom) return;
            dom.innerHTML = '';
            this.term = new Terminal({
                cursorBlink: false,
            });
            this.term.open(dom);
            this.fitAddon = new FitAddon();
            this.term.loadAddon(this.fitAddon);
            this.$nextTick(()=>{
                this.fitAddon.fit();
            });
        },
        writeChunk(chunk){
            if(!this.term) return;
            try {
                let text = chunk.replace(/\x20+/g, ' ');
                text = text.replace(/(?<!\r)\n/g, '\r\n');
                this.term.write(text);
            } catch{}
        },
        closeDrawer(v){
            this.visible = false;
            this.log.show = false;
            if(this.socket && !this.socketClose){
                try { this.socket.close(); } catch{}
                this.socketClose = true;
                this.socket = null;
            }
            try {
                if(this.term){ this.term.dispose(); this.term = null; this.fitAddon = null; }
            } catch{}
            this.$emit('close',v);
        },
    }
}
</script>
<style scoped>

.task{width:800px; border:1px solid var(--color-neutral-3); border-radius:4px;}
.task .item.title{background:#f0f3fa; font-weight:bold;}
.task .item{padding:20px; border-bottom:1px solid var(--color-neutral-3);}
.task .item:last-child{border-bottom:none;}

.loader{animation: spin 3s linear infinite; vertical-align:middle;}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}


.log-terminal {
    width: 100%;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--color-neutral-3);
}
</style>