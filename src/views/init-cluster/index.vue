<template>
    <div style="height:100%; overflow:auto;">
        <div class="df df-c ai-c" style="margin-bottom:20px;">
            <div class="mt-60">
                <icon-check-circle-fill v-if="hasOverResource && status=='complete'" style="font-size:80px;color:rgb(var(--green-6));" />
                <img v-else-if="status=='running'" src="@/assets/image/loading.png" style="width:60px; height:auto;" class="loader" alt="" />
                <icon-close-circle-fill v-else class="c-red" style="font-size:80px;" />
                <div class="fs-18 mt-16 c-99">
                    <div v-if="hasOverResource && status=='complete'">初始化成功</div>
                    <div v-else-if="status=='running'">初始化中</div>
                    <div v-else>初始化失败</div>
                </div>
            </div>
            <div class="steps mt-20">
                <a-steps current="3" label-placement="vertical">
                    <a-step>注册云端</a-step>
                    <a-step>费用清单</a-step>
                    <a-step>配置任务</a-step>
                </a-steps>
            </div>

            <div class="mt-40" style="width:1000px;">
                <div class="bg-white" style="border: 1px solid var(--color-neutral-3);padding:0 20px;">

                    <div class="df ai-c jc-b" style="border-bottom: 1px solid var(--color-neutral-3); padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">资源可用性检测</div>
                        <div class="df ai-c lh-1">
                            <icon-check-circle-fill v-if="hasOverResource" class="c-green fs-16" />
                            <icon-close-circle-fill v-if="!hasOverResource" class="c-red fs-16" />
                            <span class="ml-6">{{ hasOverResource? '成功':'失败' }}</span>
                        </div>
                    </div>
                    <div class="df ai-c jc-b" style="border-bottom:1px solid var(--color-neutral-3); padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">存储空间</div>
                        <div class="df ai-c lh-1">
                            <icon-check-circle-fill v-if="storageSpace.proper" class="c-green fs-16" />
                            <icon-close-circle-fill v-if="!storageSpace.proper" class="c-red fs-16" />
                            <span class="ml-6">{{ storageSpace.proper? '正常':'超出' }}</span>
                            <span class="ml-6 c-red" v-if="!storageSpace.proper">({{ storageSpace.used }}/{{ storageSpace.total}})</span>
                        </div>
                    </div>
                    <div class="df ai-c padding-10" style="border-bottom: 1px solid var(--color-neutral-3); padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">集群初始化</div>
                        <div @click="openLogModal(jobName)" class="fc ml-20 c-99 txt-overhidden cursor">{{ lastRow }}</div>
                        <div class="df-s0 ml-20">
                            <div v-if="status=='complete'">
                                <icon-check-circle-fill class="c-green fs-16" />
                                <span class="ml-6">{{status_text||'成功'}}</span>
                            </div>
                            <div v-if="status=='running'">
                                <icon-loading class="fs-16" />
                                <span class="ml-6">{{status_text||'初始化中...'}}</span>
                            </div>
                            <div v-else-if="status=='failed'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">{{status_text||'失败'}}</span>
                                <span class="ml-6 c-blue cursor" @click="toInitCluster">重试</span>
                            </div>
                            <div v-else-if="status=='unknow'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">{{status_text||'未初始化'}}</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="weihuModal" class="df ai-c padding-10" style="border-bottom: 1px solid var(--color-neutral-3); padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">救援任务</div>
                        <div @click="openLogModal(weihuJobName)" class="fc ml-20 c-99 txt-overhidden cursor">{{ weihuLastRow }}</div>
                        <div class="df-s0 ml-20">
                            <div v-if="weihuStatus=='complete'">
                                <icon-check-circle-fill class="c-green fs-16" />
                                <span class="ml-6">成功</span>
                            </div>
                            <div v-if="weihuStatus=='running'">
                                <icon-loading class="fs-16" />
                                <span class="ml-6">初始化中...</span>
                            </div>
                            <div v-else-if="weihuStatus=='failed'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">失败</span>
                                <span class="ml-6 c-blue cursor" @click="toRetryWeihu">重试</span>
                            </div>
                            <div v-else-if="weihuStatus=='unknow'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">未初始化</span>
                            </div>
                        </div>
                    </div>
                    <div class="df ai-c jc-b padding-10" style=" padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">启动集群</div>
                        <div @click="startClusterLog.show=true;" class="fc ml-20 c-99 txt-overhidden cursor">{{startClusterLog.lastRow}}</div>
                        <div class="df-s0 ml-20">
                            <div v-if="startCluster">
                                <icon-check-circle-fill class="c-green fs-16" />
                                <span class="ml-6">成功</span>
                            </div>
                            <div v-else>
                                <icon-loading class="fs-16" style="margin-right:6px;" />
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">失败</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="status=='complete'||status=='failed'" class="mt-20 df jc-c">
                    <template v-if="storageSpace.proper">
                        <a-button v-if="weihuModal" type="outline" @click="changeWeihuModal" size="large" style="margin:0 10px;">退出救援模式</a-button>
                        <a-button v-else-if="!weihuModal || !startCluster" type="outline" @click="changeWeihuModal" size="large" style="margin:0 10px;">进入救援模式</a-button>
                    </template>

                    <a-button v-if="!startCluster" type="primary" @click="$router.push(`/order-base?expand=true`)" size="large" style="margin:0 10px;">扩容资源</a-button>

                    <a-button v-if="status=='complete' && startCluster && !weihuModal" type="primary" size="large" style="margin:0 10px;" @click="$router.push('/')">进入管理</a-button>
                </div>

                <div v-if="weihuModal" class="mt-20 padding-20 appgroups bg-white">
                    <div v-for="(item,index) in appgroups" :key="index" class="df jc-b ai-c">
                        <span>{{ item.title }}</span>

                        <a-popconfirm content="确定要删除吗" @ok="deleteAppgroup(item)" position="lt">
                            <span class="c-blue cursor">删除</span>
                        </a-popconfirm>
                    </div>
                </div>
            </div>
        </div>

        <!-- 日志弹窗 -->
        <podLog 
            :show="startClusterLog.show" 
            mode="modal" 
            title="查看日志" 
            :height="400" 
            :local="true"
            :pod-name="startClusterLog.pod_name"
            :namespace="startClusterLog.namespace"
            :container="startClusterLog.container_name"
            @close="startClusterLog.show = false;"
        />
        
        <job-log
            :show="logModal.show"
            mode="modal"
            :showTabs="false"
            title="查看日志"
            :local="true"
            :jobName="logModal.jobName"
            :namespace="logModal.namespace"
            :tail-lines="500"
            @close="logModal.show = false; logModal.jobName = ''; logModal.namespace = '';"
        />

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import podLog from '@/components/pod-log.vue';
import jobLog from '@/components/job-log.vue'
import { getToken } from '@/utils/auth';

export default {
    components: {
        podLog,
        jobLog,
    },
    data(){
        return {
            interval: null,
            status: '',
            status_text: '',
            jobName: '',
            lastRow: '',

            weihuJobName: '',
            weihuStatus: '',
            weihuLastRow: '',

            namespace: '',
            logModal: {
                show: false,
                pod_name: '',
                namespace: '',
            },

            hasOverResource: false,
            canInit: false,

            weihuModal: false,
            startCluster: false,
            startClusterInterval: null,

            startClusterLog: {
                show: false,
                pod_name: '',
                namespace: '',
                container_name: '',
                log: '',
                lastRow: '',
            },
            controller: null,

            appgroups: [],
            storageSpace: {
                proper: true,
                used: 0,
                total: 0,
            },
        }
    },
    async created(){
        await panelApi.post('/k3k/overselling/check',{},{noAlert:true}).then(()=>{}).catch(()=>{}) 
        await this.getInfo();
        await this.getDisk();
        this.getStatus({needGetInfo:false});
        
        if(this.status=='failed' || this.status=='unknow'){
            this.toInitCluster();
        }
    },
    beforeUnmount(){
        clearTimeout(this.startClusterInterval);
        clearTimeout(this.interval);
        try{
            this.controller.abort();
        }catch{};
    },
    computed: {
        isCvm(){
            return this.$route.query.cvmName && this.$route.query.cvmNamespace;
        },
    },
    methods: {
        getDisk(){
            let parseData = (data)=>{

                const formatStorageSize = (bytes) => {
                    // 1 GiB = 1024 MiB = 1024*1024*1024 bytes
                    return bytes >= 1024 ** 3 
                        ? `${(bytes / (1024 ** 3)).toFixed(0)}Gi` 
                        : `${(bytes / (1024 ** 2)).toFixed(0)}Mi`;
                };
                
                this.storageSpace.total = data?.disk?.total || 0;
                this.storageSpace.total = formatStorageSize(this.storageSpace.total);
                
                this.storageSpace.used = data?.disk?.usage || 0;
                this.storageSpace.used = formatStorageSize(this.storageSpace.used);

                this.storageSpace.proper = data?.disk?.usage < data?.disk?.total;
            }
            if(this.isCvm){
                const name = this.$route.query.cvmName;
                const namespace = this.$route.query.cvmNamespace;
                return panelApi.get(`/metrics/usage/cvm/${namespace}/name/${name}/disk`,{noAlert:true}).then(res=>{ 
                    parseData(res.data);
                })
            }else{
                return panelApi.get('/metrics/usage/disk').then(res=>{ 
                    parseData(res.data);
                })
            }
        },
        openLogModal(jobName){
            if(!jobName || !this.namespace) return;
            this.logModal.jobName = jobName;
            this.logModal.namespace = this.namespace;
            this.logModal.show = true;
        },
        deleteAppgroup(item){
            k8sproxy.delete('/apis/appgroup.w7.cc/v1alpha1/namespaces/default/appgroups/'+item.name,{noAlert:true}).then(res=>{
                this.$message.success('操作成功');
                this.getStatus();
            })
        },
        async getStatus({needGetInfo=true, stop=false}={}){
            
            if(this.isCvm){ return }

            if(needGetInfo){
                let {data} = await panelApi.get('/k3k/info',{loading:true});
                this.weihuModal = data?.['w7.cc/weihu'] == 'true';
                
                this.startClusterLog = {
                    ...this.startClusterLog,
                    pod_name: data?.['w7.cc/server-pod-name'],
                    namespace: data?.['w7.cc/k3k-namespace'],
                    container_name: data?.['w7.cc/server-container-name'],
                }
                this.streamLog();
            }
            this.getAppgroup();
            if(stop){return}
            this.getStartCluster();
        },
        getAppgroup(){
            if(this.weihuModal){
                k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/default/appgroups',{noAlert:true}).then(res=>{
                    if(!res?.data?.items){return}
                    let list = res.data.items.map(i=>{
                        return {
                            title: i?.spec?.title || i.metadata?.name,
                            name: i.metadata?.name,
                        }
                    })
                    this.appgroups = list;
                })
            }
        },
        getStartCluster(){
            clearTimeout(this.startClusterInterval)
            k8sproxy.get('/version',{noAlert:true,loading:false}).then(res=>{
                this.startCluster = true;
                this.getAppgroup();
            }).catch(()=>{
                this.startCluster = false;
                this.startClusterInterval = setTimeout(this.getStartCluster,5000)
            })
        },
        changeWeihuModal(){
            if(this.isCvm){
                panelApi.post(`/k3k/cvm/${this.$route.query.cvmNamespace}/action/${this.$route.query.cvmName}/rescue`).then(res=>{
                    this.$message.success("操作成功");
                    this.weihuModal = !this.weihuModal;
                    this.startCluster = false;
                    this.getCvmInfo();
                    setTimeout(this.getCvmInfo,5000);
                })
                return;
            }
            panelApi.post('/k3k/wh').then(res=>{
                this.$message.success('操作成功,集群重启中....');
                this.getStatus({stop:true});
                
                this.startCluster = false;
                setTimeout(this.getStartCluster,6000);
            });
        },
        getInfo(){
            if(this.isCvm){
                return this.getCvmInfo();
            };
            return panelApi.get('/k3k/info',{loading:true}).then(res=>{
                this.status = res?.data?.['w7.cc/k3k-job-status'];
                this.jobName = res?.data?.['w7.cc/k3k-job-name'];
                
                this.weihuModal = res?.data?.['w7.cc/weihu'] == 'true';
                this.weihuStatus = res?.data?.['w7.cc/weihu-job-status'];
                this.weihuJobName = res?.data?.['w7.cc/weihu-job'];
                
                this.namespace = 'default'; // res?.data?.['w7.cc/k3k-namespace'] || 'default';
                this.hasOverResource = res?.data?.['w7.cc/has-over-resource'] == 'true';
                this.canInit = res?.data?.['w7.cc/can-init-cluster'] == 'true';

                this.startClusterLog = {
                    show: false,
                    pod_name: res?.data?.['w7.cc/server-pod-name'],
                    namespace: res?.data?.['w7.cc/k3k-namespace'],
                    container_name: res?.data?.['w7.cc/server-container-name'],
                }
                this.streamLog();

                // 更新 lastRow
                if(this.status == 'running'){
                    this.lastRow = '初始化中...';
                } else if(this.status == 'complete'){
                    this.lastRow = '初始化完成';
                } else if(this.status == 'failed'){
                    this.lastRow = '初始化失败，点击查看日志';
                }
                // 维护模式 lastRow
                if(this.weihuStatus == 'running'){
                    this.weihuLastRow = '初始化中...';
                } else if(this.weihuStatus == 'complete'){
                    this.weihuLastRow = '初始化完成';
                } else if(this.weihuStatus == 'failed'){
                    this.weihuLastRow = '初始化失败，点击查看日志';
                }
                
                if(this.status == 'running' || this.weihuStatus == 'running' || (this.status!=='complete' && this.weihuStatus=='complete')){
                    this.interval = setTimeout(this.getInfo,5000);
                }else if(this.status == 'complete'){
                    panelApi.get("/auth/console/info?code=test").then(res=>{
                        let data = res?.data;
                        if(data.cluster_id == "" && data.thirdparty_cd_token !=""){
                            panelApi.post('/auth/console/register-to-console?offline_url='+window.location.origin,{
                                offline_url: window.location.origin,
                                offlineUrl: window.location.origin,
                            }).then(()=>{}).catch(()=>{})
                        }
                    })
                }
            })
        },
        async getCvmInfo(){
            try{
                clearTimeout(this.startClusterInterval);
                clearTimeout(this.interval);
            }catch{}

            let name = this.$route.query.cvmName;
            let namespace = this.$route.query.cvmNamespace;
            
            await panelApi.post(`/k3k/cvm/${namespace}/action/${name}/check-resource`,{noAlert:true}).then(res=>{
                this.hasOverResource = !!res?.data?.pass;
            })

            await panelApi.get(`/k3k/cvm/v1/${namespace}/info/${name}`,{noAlert:true}).then(res=>{
                let phase = res?.data?.status?.phase;
                let clusterPhase = res?.data?.status?.clusterPhase;
                if(phase == 'new'){
                    this.status = 'unknow';
                    this.status_text = '';
                }else{
                    this.status = {
                        'Pending':'running',
                        'Provisioning':'running',
                        'Ready':'complete',
                        'Failed':'failed',
                        'Terminating':'failed',
                        'Unknown':'failed',
                    }[clusterPhase];

                    this.status_text = {
                        'Pending':'创建中',
                        'Provisioning':'配置中',
                        'Ready':'运行中',
                        'Failed':'故障',
                        'Terminating':'回收中',
                        'Unknown':'未知',
                    }[clusterPhase]
                }
                this.cvmInfo = res?.data;

                // 启动集群成功
                this.startCluster = this.cvmInfo?.status?.phase == 'ready';
                
                this.startClusterLog = {
                    show: false,
                    pod_name: this.cvmInfo?.status?.server0PodName,
                    namespace: this.cvmInfo?.metadata?.namespace,
                    container_name: this.cvmInfo?.status?.server0ContainerName,
                }
                this.streamLog();
                

                // 维护模式
                this.weihuModal = this.cvmInfo?.spec?.rescue;
                this.weihuJobName = this.cvmInfo?.status?.rescueJobName;
                this.namespace = 'default'; 
                
                this.weihuLastRow = ''
                if(this.weihuModal){
                    this.weihuStatus = this.cvmInfo?.status?.rescuePhase?.toLowerCase?.();
                    this.weihuStatus = this.weihuStatus == 'success'? 'complete' : this.weihuStatus;
                    
                    // 维护模式 lastRow
                    if(this.weihuStatus == 'running'){
                        this.weihuLastRow = '初始化中...';
                    } else if(this.weihuStatus == 'complete'){
                        this.weihuLastRow = '初始化完成';
                    } else if(this.weihuStatus == 'failed'){
                        this.weihuLastRow = '初始化失败，点击查看日志';
                    }
                    this.getAppgroup();
                }

                if(this.status == 'running' || this.weihuStatus == 'running' || (this.status!=='complete' && this.weihuStatus=='complete')){
                    this.interval = setTimeout(this.getInfo,5000);
                }else if(!this.startCluster){
                    this.startClusterInterval = setTimeout(this.getCvmInfo,5000)
                }
            })
        },
        streamLog() {
            let podName = this.startClusterLog.pod_name;
            let params = {
                follow: true,
                tailLines: 100,
                container: this.startClusterLog.container_name,
                local: 1,
            }
            const queryString = new URLSearchParams(
                Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
            ).toString();

            const url = `/k8s-proxy/api/v1/namespaces/${this.startClusterLog.namespace}/pods/${podName}/log?${queryString}`;

            try{
                this.controller.abort();
            }catch{};
            this.controller = new AbortController();
            const authToken = getToken();

            this.startClusterLog.log = '';
            this.startClusterLog.lastRow = '';

            fetch(url, {
                signal: this.controller.signal,
                headers: {
                    accept: 'application/json, text/plain, */*',
                    ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
                },
            }).then(response => {
                if (!response?.ok || !response.body) {
                    console.error('Stream response error:', response?.status);
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');

                const readStream = () => {
                    return reader.read().then(({ done, value }) => {
                        if (done) return;
                        // if (!this.follow || !this.visible) {
                        //     this.controller.abort();
                        //     return;
                        // }

                        const chunk = decoder.decode(value, { stream: true });
                        // this.writeChunk(chunk);
                        this.startClusterLog.log += chunk;
                        this.startClusterLog.lastRow = this.startClusterLog.log.split('\n').filter(Boolean).pop();
                        return readStream();
                    });
                };
                return readStream();
            }).catch(error => {
                if (error.name === 'AbortError' || error.code === 20) return;
                console.error('Log stream error:', error);
            });
        },
        toInitCluster(){
            panelApi.post('/k3k/init').then(res=>{
                this.$message.success('开始初始化');
                this.$nextTick(()=>{
                    this.getInfo();
                })
            });
        },
        toRetryWeihu(){
            panelApi.post('/k3k/whjob').then(res=>{
                this.$message.success('开始初始化');
                this.$nextTick(()=>{
                    this.getInfo();
                })
            });
        },
    }
}
</script>

<style scoped>
.loader{animation: spin 3s linear infinite; vertical-align:middle;}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.txt-overhidden{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.appgroups>div{border-bottom:1px solid var(--color-neutral-3); padding:10px 0;}
.appgroups>div:last-child{border-bottom:0;}
</style>
