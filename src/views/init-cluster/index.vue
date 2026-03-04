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
                    <div class="df ai-c padding-10" style="border-bottom: 1px solid var(--color-neutral-3); padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">集群初始化</div>
                        <div @click="logModal.show=true" class="fc ml-20 c-99 txt-overhidden cursor">{{ lastRow }}</div>
                        <div class="df-s0 ml-20">
                            <div v-if="status=='complete'">
                                <icon-check-circle-fill class="c-green fs-16" />
                                <span class="ml-6">成功</span>
                            </div>
                            <div v-if="status=='running'">
                                <icon-loading class="fs-16" />
                                <span class="ml-6">初始化中...</span>
                            </div>
                            <div v-else-if="status=='failed'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">失败</span>
                                <span class="ml-6 c-blue cursor" @click="toInitCluster">重试</span>
                            </div>
                            <div v-else-if="status=='unknow'">
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">未初始化</span>
                            </div>
                        </div>
                    </div>
                    <div class="df ai-c jc-b padding-10" style=" padding:20px 0;">
                        <div class="df-s0" style="color:var(--color-text-2);">启动集群</div>
                        
                        <div class="df-s0 ml-20">
                            <div v-if="startCluster">
                                <icon-check-circle-fill class="c-green fs-16" />
                                <span class="ml-6">成功</span>
                            </div>
                            <div v-else>
                                <icon-close-circle-fill class="c-red fs-16" />
                                <span class="ml-6">失败</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="status=='complete'||status=='failed'" class="mt-20 df jc-c">
                    <!-- <a-button v-if="status=='failed'||status=='unknow'" :disabled="!canInit" type="primary" size="large" @click="toInitCluster">初始化集群</a-button> -->
                    <a-button v-if="!weihuModal || !startCluster" type="outline" @click="changeWeihuModal" size="large" style="margin:0 10px;">进入救援模式</a-button>
                    <a-button v-else-if="weihuModal" type="outline" @click="changeWeihuModal" size="large" style="margin:0 10px;">退出救援模式</a-button>

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

                <!-- <div class="df df-c ai-c padding-20 bg-white">
                    <div>
                        <icon-check-circle-fill v-if="status=='complete'" style="font-size:80px;color:rgb(var(--green-6));" />
                        <img v-else-if="status=='running'" src="@/assets/image/loading.png" style="width:60px; height:auto;" class="loader" alt="" />
                        <icon-close-circle-fill v-else class="c-red" style="font-size:80px;" />
                    </div>
                    <div class="fs-30 mt-20 c-33">
                        <div v-if="status=='complete'">集群初始化成功</div>
                        <div v-if="status=='running'">集群初始化中...</div>
                        <div v-else-if="status=='failed'">集群初始化失败</div>
                        <div v-else-if="status=='unknow'">集群未初始化</div>
                    </div>

                    <job-log :show="logs.show" :name="logs.name" @close="logs.show=false" @lastRow="v=>lastRow=v" class="mt-20"></job-log>
                    <div class="mt-20">
                        <a-button v-if="status=='failed'||status=='unknow'" type="primary" size="large" @click="toInitCluster">初始化集群</a-button>
                        <a-button v-if="status=='complete'" type="primary" size="large" @click="$router.push('/')">进入管理</a-button>
                    </div>
                </div> -->
            </div>
        </div>

        <get-job-log :name="logs.name" @podcont="podcont"></get-job-log>

        <a-modal v-model:visible="logModal.show" width="800px" :hide-cancel="true" @cancel="logModal.open=false;"  @ok="logModal.open=false;" @open="logModal.open=true;">
            <template #title>查看日志</template>
            <div ref="termbox" style="height:300px;"></div>
            <template #footer></template>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import jobLog from '@/views/init-cluster/job-log.vue';
import getJobLog from '@/views/init-cluster/get-job-log.vue';
import { getK8sinfo } from '@/utils/auth';

import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export default {
    data(){
        return {
            status: '',
            jobName: '',
            namespace: '',
            logs: {
                show: false,
                name: '',
            },
            lastRow: '',
            logModal: {
                show: false,
                open: false,
                log: '',
            },

            itemTerm: null,
            itemFitAddon: null,
            hasOverResource: false,
            canInit: false,

            weihuModal: false,
            startCluster: false,

            appgroups: [],
        }
    },
    async created(){
        await panelApi.post('/k3k/overselling/check',{},{noAlert:true}).then(()=>{}).catch(()=>{}) 
        await this.getInfo();
        this.getStatus();
        
        if(this.status=='failed' || this.status=='unknow'){
            this.toInitCluster();
        }
    },
    components: {
        jobLog,
        getJobLog,
    },
    beforeDestroy() {
        this.disposeTerm();
    },
    watch:{
        'logModal.open'(v){
            if(v){
                this.terminalInit()
            }else{
                this.disposeTerm();
            }
        },
        'logModal.log'(){
            this.writeLog();
        }
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
        deleteAppgroup(item){
            k8sproxy.delete('/apis/appgroup.w7.cc/v1alpha1/namespaces/default/appgroups/'+item.name,{noAlert:true}).then(res=>{
                this.$message.success('操作成功');
                this.getStatus();
            })
        },
        getStatus(){
            panelApi.get('/k3k/info',{loading:true}).then(res=>{
                this.weihuModal = res?.data?.['w7.cc/weihu'] == 'true';
                console.log(this.weihuModal)
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
            })

            k8sproxy.get('/version',{noAlert:true,loading:true}).then(res=>{
                this.startCluster = true;
            }).catch(()=>{
                this.startCluster = false;
            })
        },
        changeWeihuModal(){
            panelApi.post('/k3k/wh').then(res=>{
                this.$message.success('操作成功');
                this.getStatus();
            });
        },
        terminalInit(){
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
            this.writeLog();
        },
        writeLog(){
            if(!this.itemTerm){return}
            this.itemTerm.reset();
            let e = this.logModal.log;
            e = e.replace(/\x20+/g,' ');
            e = e.replace(/(?<!\r)\n/g,'\r\n');
            setTimeout(()=>{this.itemFitAddon.fit();},30);
            setTimeout(()=>{this.itemTerm.write(e);},60);
        },
        podcont(data){
            this.logModal.log = data;
            let arr = data.split('\n').filter(i=>/\w/.test(i));
            let lastRow = arr.length? arr[arr.length-1] : '';
            lastRow = lastRow.replace(/\u001b\[\d{1,3}(;1)?m/g,'');
            this.lastRow = lastRow;
        },
        getInfo(){
            return panelApi.get('/k3k/info',{loading:true}).then(res=>{
                this.status = res?.data?.['w7.cc/k3k-job-status'];
                this.jobName = res?.data?.['w7.cc/k3k-job-name'];
                this.namespace = res?.data?.['w7.cc/k3k-namespace'];
                this.hasOverResource = res?.data?.['w7.cc/has-over-resource'] == 'true';
                this.canInit = res?.data?.['w7.cc/can-init-cluster'] == 'true';
                
                if(this.jobName){
                    this.logs = {
                        show: true,
                        name: this.jobName,
                    }
                }
                if(this.status == 'running'){
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
                    // this.$router.push('/');
                }
            })
        },
        toInitCluster(){
            panelApi.post('/k3k/init').then(res=>{
                this.logs.show = false;
                this.logs.name = '';
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
.appgroups>div{border-bottom:1px solid var(--color-neutral-3);}
.appgroups>div:last-child{border-bottom:0;}
</style>