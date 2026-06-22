<template>
    <a-spin :loading="loading" class="padding-20" style="display:block;">
        
        <div class="df jc-b">
            <!-- <a-button type="primary" :disabled="!selectedKeys.length" @click="charts.show=true;">监控</a-button> -->
            <a-popconfirm content="是否确定销毁选中的容器并重建" @ok="deleteMultiple" position="rt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                <a-button type="primary" :disabled="!selectedKeys.length">销毁重建</a-button>
            </a-popconfirm>
        </div>
        <div class="bg-white mt-20">
             <!--  -->
                <a-table 
                    :data="list" 
                    :expandable="expandable"
                    :expanded-keys="expandedKeys"
                    @expanded-change="onExpandedChange"
                    class="cptable app-pod-table"
                    :pagination="false"
                    :bordered="false"
                    
                    :row-selection="rowSelection"
                    v-model:selectedKeys="selectedKeys"
                >
                <template #columns>
                    <a-table-column title="实例名称">
                        <template #cell="{ record }">
                            <div class="df ai-c">
                                <a-popover position="bl" :content-style="{ padding: '6px 10px 10px' }">
                                    <span class="c-blue cursor one-hide" style="max-width:300px;">{{record.name}}</span>
                                    <template #content>
                                        <span>{{record.name}}</span>
                                    </template>
                                </a-popover>
                                <a-tooltip content="复制">
                                    <i class="opt-icon ml-10" @click="onekeyCopy(record.name)"><icon-copy /></i>
                                </a-tooltip>
                            </div>
                            <!-- <a-popover position="bl" :content-style="{ padding: '6px 10px 10px' }">
                                <template #content>
                                    <div class="c-33">
                                        <div class="df"><span class="b popover-label df-s0">容器id：</span>{{record.containerStatuses && record.containerStatuses.length && record.containerStatuses[0].containerID}}</div>
                                        <div class="df mt-10"><span class="b popover-label df-s0">镜像：</span>{{record.containers[0].image}}</div>
                                        <div class="df mt-10"><span class="b popover-label df-s0">名称：</span>{{record.containers[0].name}}</div>
                                        <div class="df mt-10"><span class="b popover-label df-s0">重启次数：</span>{{record.containerStatuses && record.containerStatuses.length && record.containerStatuses[0].restartCount}}</div>
                                    </div>
                                </template>
                            </a-popover> -->
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="状态">
                        <template #cell="{ record }">
                            <a-popover position="bottom" @popup-visible-change="v=>v?getEvents(record):stopRequestStatus()">
                                <!-- <span v-if="record.status=='RUNNING'" class="c-green cursor">运行中</span>
                                <span v-else-if="record.status=='STOPPED'" class="c-red cursor">已停止</span>
                                <span v-else-if="record.status=='RESTARTING'" class="c-red cursor">重启中</span>
                                <span v-else-if="record.status=='PENDING'" class="c-red cursor">创建中</span>
                                <span v-else-if="record.status=='UNKNOWN'" class="c-red cursor">未知</span> -->
                                <span :class="{'c-green':record.status=='RUNNING','c-red':record.status!='RUNNING'}" class="cursor">{{record.statusTxt}}</span>
                                <template #content>
                                    <div style="max-height:300px; width:1200px; overflow:auto;">
                                        <div class="df ai-c jc-e" style="margin-bottom:10px;margin-right:30px;">
                                            <icon-sync class="fs-18 c-blue cursor" @click="getEvents(record)" />
                                        </div>
                                        <table class="com-table"><tbody>
                                            <tr>
                                                <td>首次出现时间</td>
                                                <td>最后出现时间</td>
                                                <td>级别</td>
                                                <td>资源类型</td>
                                                <td style="width:100px;">资源名称</td>
                                                <td>内容</td>
                                                <td>详细描述</td>
                                                <td>出现次数</td>
                                            </tr>
                                            <tr v-for="(record,index) in eventLs" :key="index">
                                                <td>{{record.startTime}}</td>
                                                <td>{{record.lastTime}}</td>
                                                <td>{{record.type}}</td>
                                                <td>{{record.kind}}</td>
                                                <td>{{record.name}}</td>
                                                <td>{{record.reason}}</td>
                                                <td>
                                                    <div style="max-height:80px;width:200px;overflow:auto;">{{record.message}}</div>
                                                </td>
                                                <td>{{record.count}}</td>
                                            </tr>
                                            <tr v-if="!eventLs||!eventLs.length">
                                                <td colspan="8" class="txt-c c-cc">没有数据</td>
                                            </tr>
                                        </tbody></table>
                                    </div>
                                </template>
                            </a-popover>
                        </template>
                    </a-table-column>

                    <a-table-column title="容器ip" data-index="podIps"></a-table-column>
                    <a-table-column title="节点ip" data-index="hostIp"></a-table-column>
                    <a-table-column title="创建时间" data-index="creationTimestamp"></a-table-column>
                    <!-- <a-table-column title="CPU/内存">
                        <template #cell="{ record }">{{record.cpu}}核 / {{record.memory}}G</template>
                    </a-table-column> -->
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <div class="nowrap">
                                <a-tooltip v-if="debug" content="yaml">
                                    <span class="opt-icon" @click="openYaml(record)">
                                        <icon-code />
                                    </span>
                                </a-tooltip>
                                <a-tooltip content="查看日志">
                                    <span class="opt-icon" @click="openLog(record)">
                                        <icon-file />
                                    </span>
                                </a-tooltip>
                                 <!-- v-if="permission.includes('terminal')" -->
                                <a-tooltip v-if="webshell=='true'" content="webshell">
                                    <span class="opt-icon" @click="openWs(record)" :style="{opacity:record?.status?.toUpperCase()!='RUNNING'?0.5:1}">
                                        <icon-code-square />
                                    </span>
                                </a-tooltip>
                                <a-popconfirm content="是否确定销毁容器并重建" @ok="deleteRow(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                    <a-tooltip content="销毁重建">
                                        <span class="opt-icon">
                                            <icon-delete />
                                        </span>
                                    </a-tooltip>
                                </a-popconfirm>
                            </div>
                        </template>
                    </a-table-column>
                </template>
                
                <template #expand-row="{ record }" >
                    <div style="width:100%;overflow:hidden;">
                        <table class="com-table" style="width:1400px;"><tbody>
                            <tr>
                                <td>容器名称</td>
                                <td>容器ID</td>
                                <td>镜像版本号</td>
                                <td>CPU</td>
                                <td>内存</td>
                                <td>重启次数</td>
                                <td>上次退出原因</td>
                                <td>状态</td>
                            </tr>
                            <tr v-for="(ctn,cid) in record.ctn" :key="cid">
                                <td>{{ ctn.name }}</td>
                                <td>
                                    <div class="df ai-c">
                                        <a-popover v-if="ctn.containerID!='-'" position="bl" :content-style="{ padding: '6px 10px 10px' }">
                                            <span class="cursor one-hide" style="max-width:200px;">{{ ctn.containerID }}</span>
                                            <template #content>
                                                <span>{{ ctn.containerID }}</span>
                                            </template>
                                        </a-popover>
                                        <span v-else>{{ ctn.containerID }}</span>
                                        <a-tooltip v-if="ctn.containerID!='-'" content="复制">
                                            <i class="opt-icon ml-4" @click="onekeyCopy(ctn.containerID)"><icon-copy /></i>
                                        </a-tooltip>
                                    </div>
                                </td>
                                <td>
                                    <div class="df ai-c">
                                        <a-popover position="bl" :content-style="{ padding: '6px 10px 10px' }">
                                            <span class="cursor one-hide" style="max-width:200px;">{{ ctn.image }}</span>
                                            <template #content>
                                                <span>{{ ctn.image }}</span>
                                            </template>
                                        </a-popover>
                                        <a-tooltip content="复制">
                                            <i class="opt-icon ml-4" @click="onekeyCopy(ctn.image)"><icon-copy /></i>
                                        </a-tooltip>
                                    </div>
                                </td>
                                <td>{{ ctn.cpu }}</td>
                                <td>{{ ctn.memory }}</td>
                                <td>{{ ctn.restartCount }}</td>
                                <td>{{ ctn.reason }}</td>
                                <td>
                                    <span class="nowrap" :class="{'c-red':ctn.status!=='running','c-green':ctn.status=='running',}">{{ ctn.status }}</span>
                                </td>
                            </tr>
                        </tbody></table>
                    </div>
                </template>
                
                <template #expand-icon="{record,expanded}">
                    <div class="df ai-c jc-c cursor" style="padding:2px;">
                        <icon-minus v-if="expanded" />
                        <icon-plus v-else />
                    </div>
                </template>
            </a-table>
        </div>
        
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <!-- <a-modal v-model:visible="log.showPod" title="查看日志" width="1000px" :fullscreen="log.fullscreen" :closable="false" class="log-model" :show-close="false" @open="openDialog" :popup-container="$popupContainer">
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
        </a-modal> -->
        <!-- @ok="openWebshell" -->
        <a-modal title="webshell" v-model:visible="ws.dialog" width="500px"  @cancel="ws.dialog = false;" top="10vh" :popup-container="$popupContainer">
            <template #title>webshell</template>
            <div style="margin-top:-10px;">
                <a-form :model="ws">
                    <a-form-item label="Shell环境">
                        <a-select v-model="ws.type" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option label="bin/sh" value="bin/sh"></a-option>
                            <a-option label="bin/bash" value="bin/bash"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="容器">
                        <a-select v-model="ws.container" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option v-for="item in ws.containers" :key="item.name" :label="item.name" :value="item.name"></a-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </div>
            <template #footer>
                <a-button size="small" @click="ws.dialog=false;">取消</a-button>
                <a :href="webshelllink" target="_blank" class="ml-10">
                    <a-button size="small" type="primary" @click="ws.dialog=false;">确定</a-button>
                </a>
                <!-- <a-button v-if="inMicro" :href="webshelllink" target="_blank" size="small" type="primary" @click="ws.dialog=false;">确定</a-button> -->
                <!-- <a-button v-else size="small" type="primary" @click="openWebshell">确定</a-button> -->
            </template>
        </a-modal>

        <a-modal title="webshell" v-model:visible="wsd.show" width="1000px" :mask-closable="false" top="10vh" :footer="false" :popup-container="$popupContainer">
            <template #title>webshell</template>
            <web-shell
                v-if="wsd.show"
                :type="ws.type" 
                :pod="wsd.pod"
                :namespace="wsd.namespace"
                :containerName="wsd.containerName"
            ></web-shell>
        </a-modal>

        <!-- <a-drawer :width="740" title="监控" :visible="charts.show" @cancel="charts.show=false;" :footer="false" :popup-container="$popupContainer">
            <pods-charts v-if="charts.show" :list="selectedKeys"></pods-charts>
        </a-drawer> -->

        <podLog :show="logCpn.show" :data="logCpn.data" @close="logCpn.show=false;"></podLog>
    </a-spin>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';

// import { Terminal } from '@xterm/xterm';
// import '@xterm/xterm/css/xterm.css';
// import { FitAddon } from '@xterm/addon-fit';

import webShell from "@/components/web-shell.vue";
import podsCharts from '@/components/pods-charts.vue';
import podLog from '@/components/pod-log.vue';
import { getToken, getUserInfo } from '@/utils/auth';

import { getPermission } from '@/utils/auth';
import { getWebshell } from '@/utils/auth';


export default {
    props: ['data','title'],
    data(){
        return {
            webshelllink: "",
            expandable: {
                title: '展开/收起',
                width: 80,
            },
            
            loading: false,
            namespaceActive: "",

            nativeList: [],
            list: [],
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            logCpn: {
                show: false,
                data: {},
            },
            // log: {
            //     showPod: false,
            //     podcont: '',
            //     realtimeLog: false,
            //     name: "",
            //     ws: null,
            //     fullscreen: false,
            //     containerList: [],
            // },
            ws: {
                dialog: false,
                type: 'bin/sh',
                row: {},
            },
            wsd: {
                show: false,
                pod: '',
                namespace: '',
                containerName: '',
            },
            eventLs: [],
            eventWatch: true,
            
            // 全选
            selectedKeys: [],
            rowSelection: {
                type: 'checkbox',
                showCheckedAll: true,
                width: 80,
            },

            charts:{
                show: false,
            },

            userInfo: {},
            debug: false,
            permission: [],
            webshell: '',

            statusController: null,
            watchController: null,
            watchLabel: '',
            expandedKeys: [],  // 展开的行
        }
    },
    created(){
        this.webshell = getWebshell();
        this.permission = getPermission() || [];
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.userInfo = getUserInfo();
        this.getList();
    },
    watch: {
        data(v,ov){
            // data 变化时重新获取 Pod 列表（使用 watch 模式）
            if(v && Object.keys(v)?.length){
                this.getList();
            }
        },
    },
    beforeUnmount(){
        this.stopRequestStatus();
        this.stopWatch();
    },
    components: {yamlDrawer,webShell,podsCharts,podLog},
    methods: {
        onekeyCopy(text){
            var textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.style.position = 'fixed';
            textarea.style.clip = 'rect(0 0 0 0)';
            textarea.style.top = '10px';
            textarea.value = text;
            textarea.select();
            let copy = document.execCommand('copy', true);
            document.body.removeChild(textarea);
            if(copy){
                this.$message.success("复制成功");
            }else{
                this.$message.warning('复制失败，请手动复制');
            }
        },
        stopRequestStatus(){
            try{
                if(this.statusController){
                    this.statusController?.abort();
                    this.statusController = null;
                }
            }catch(e){
                if(e.name !== 'AbortError'){
                    console.error(e);
                }
            }
        },
        stopWatch(){
            try{
                if(this.watchController){
                    this.watchController?.abort();
                    this.watchController = null;
                }
            }catch(e){
                // 忽略 AbortError，这是请求取消的正常行为
                if(e.name !== 'AbortError'){
                    console.error('stopWatch error:', e);
                }
            }
        },
        deleteMultiple(){
            Promise.all(this.selectedKeys.map(i=>{
                return k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/pods/"+i)
            })).then(()=>{
                this.$message.success("操作成功");
                this.selectedKeys = [];
                setTimeout(()=>{
                    // this.getList();
                },600)
            })
            return;
        },

        getList(){
            if(!Object.keys(this.data || {})?.length){
                this.loading = false;
                return;
            }
            let selector = this.data?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            if(this.watchController && this.watchLabel === label){
                return;
            }

            this.list = [];
            this.nativeList = [];
            this.expandedKeys = [];  // 重置展开状态
            
            // 停止之前的 watch
            this.stopWatch();
            
            const controller = new AbortController();
            this.watchController = controller;
            this.watchLabel = label;
            const closeLoading = () => {
                if(this.watchController === controller){
                    this.loading = false;
                }
            };
            const { signal } = controller;
            const queryString = new URLSearchParams({ labelSelector: label, watch: 'true', }).toString();
            fetch("/k8s-proxy/api/v1/namespaces/" + this.namespaceActive + "/pods?" + queryString, {
                signal,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "authorization": "Bearer " + getToken(),
                },
            }).then(response => {
                if (!response.ok) {
                    console.error('请求失败，状态码:', response.status);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                if (!response.body) {
                    console.error('响应体不是流式数据');
                    throw new Error('Response body is not a readable stream');
                }
                closeLoading();

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                const readStream = async () => {
                    try {
                        const { done, value } = await reader.read();

                        if (done) {
                            console.log('流读取完成');
                            if (buffer.trim()) {
                                try {
                                    const parsed = JSON.parse(buffer);
                                    this.setNativeList(parsed);
                                } catch (e) {
                                    console.error('处理最后缓冲区数据失败:', e);
                                }
                            }
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        const combinedData = buffer + chunk;
                        const lines = combinedData.split('\n');
                        buffer = lines.pop() || '';

                        lines.forEach(line => {
                            const trimmedLine = line.trim();
                            if (!trimmedLine) return;
                            
                            try {
                                const parsed = JSON.parse(trimmedLine);
                                this.setNativeList(parsed);
                            } catch (e) {
                                console.error('解析单行数据失败:', e);
                            }
                        });

                        return readStream();
                    } catch (error) {
                        if (error?.name === 'AbortError' || error?.code === 20) {
                            try { reader.releaseLock(); } catch (e) { if (e?.name !== 'AbortError') { console.error(e); } }
                            return;
                        }
                        console.error('读取流数据时发生错误:', error);
                        try { reader.releaseLock(); } catch (e) { if (e?.name !== 'AbortError') { console.error(e); } }
                        throw error;
                    }
                };

                return readStream();
            }).catch((error)=>{
                if (error.name === 'AbortError' || error.code === 20) { return; }
                console.log('cache',error)
                if(this.watchController === controller){
                    this.watchController = null;
                    this.watchLabel = '';
                }
                closeLoading();
            });

            // metrics 在展开时获取，首次加载不获取
        },
        // 获取 metrics
        // @param {boolean} onlyExpanded - 是否只更新展开行，默认 false
        fetchMetrics(onlyExpanded = false){
            let selector = this.data?.spec?.selector?.matchLabels || {};
            let label = Object.keys(selector).map(key=>`${key}=${selector[key]}`).join(',');
            let namespace = this.userInfo?.['k3k.io/cluster-mode']=="shared"? this.userInfo?.['w7.cc/k3k-namespace'] : this.namespaceActive;
            
            k8sproxy.get("/apis/metrics.k8s.io/v1beta1/namespaces/"+ namespace +"/pods",{params:{
                labelSelector: label,
                ...(this.userInfo?.['k3k.io/cluster-mode']=="virtual"?{}:{local: 1}),
            }}).then(res=>{
                let items = res?.data?.items || [];
                items.forEach(item=>{
                    // 首次加载(onlyExpanded=false)时更新所有 Pod，展开变化/变化刷新时只更新展开行
                    if(onlyExpanded && !this.expandedKeys.includes(item.metadata.name)){
                        return;
                    }
                    let listIndex = this.list.findIndex(i=>i.name==item.metadata.name);
                    item?.containers?.map(container=>{
                        let cpu = container?.usage?.cpu || '0';
                        let memory = container?.usage?.memory || '0';
                        cpu = (Number(cpu.replace(/[a-zA-z]/g,'')) / 1000 / 1000 / 1000).toFixed(2);
                        memory = (Number(memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 ).toFixed(2);

                        let ctnIndex = this.list?.[listIndex]?.ctn?.findIndex(c=>c.name==container.name) ?? -1;
                        if(ctnIndex>-1){
                            this.list[listIndex].ctn[ctnIndex].cpu = cpu + '核';
                            this.list[listIndex].ctn[ctnIndex].memory = memory + 'Gi';
                        }
                    })
                })
            }).catch((error)=>{
                if (error?.name !== 'AbortError') { console.error(error); }
            })
        },
        // 展开/收起行变化时
        onExpandedChange(expandedKeys){
            const oldKeys = new Set(this.expandedKeys);
            this.expandedKeys = expandedKeys;
            // 如果有新增的展开行，获取 metrics
            const newKeys = expandedKeys.filter(k => !oldKeys.has(k));
            if(newKeys.length > 0){
                this.fetchMetrics(true);
            }
        },
        // 转换 Pod 对象为列表项（单个）
        transformPodItem(item){
            let podips = item?.status?.podIPs?.map(i=>i.ip) || [];
            let containerStatuses = (item.status?.containerStatuses || []).concat(item?.status?.initContainerStatuses || []);
            let ctnlist = (item.spec?.containers || []).concat(item?.spec?.initContainers || []);
            let ctn = ctnlist.map(i=>{
                let cs = containerStatuses?.find(c=>c.name==i.name)
                return {
                    name: i.name,
                    containerID: cs?.containerID ?? '-',
                    image: i.image,
                    restartCount: cs?.restartCount ?? '-',
                    reason: cs?.lastState?.terminated?.reason ?? '-',
                    status: Object.keys(cs?.state || {})?.[0] || '-',
                }
            })
            return {
                key: item?.metadata?.name,
                name: item?.metadata?.name,
                namespace: item?.metadata?.namespace,
                containers: item?.spec?.containers || [],
                ctn: ctn,
                initContainers: item?.spec?.initContainers || [],
                containerStatuses: containerStatuses,
                containerName: item?.spec?.containers?.[0]?.name,
                creationTimestamp: window.formatDate(item?.metadata?.creationTimestamp),
                hostIp: item?.status?.hostIP,
                podIps: podips.join(' , '),
                startTime: window.formatDate(item?.status?.startTime),
                status: item?.status?.phase?.toUpperCase() || '',
                statusTxt: item?.status?.phase || '',
                uid: item?.metadata?.uid,
            }
        },
        // 增量更新 Pod 列表
        setNativeList(option){
            if(!option?.type || !option?.object){return}
            
            const obj = option.object;
            const name = obj?.metadata?.name;
            
            if(option.type=='ADDED'){
                // 新增 Pod
                const index = this.nativeList.findIndex(item => item.metadata.name === name);
                if(index === -1){
                    this.nativeList.push(obj);
                    const newItem = this.transformPodItem(obj);
                    this.list.push(newItem);
                }
            }else if(option.type=='MODIFIED'){
                // 修改 Pod
                const nativeIndex = this.nativeList.findIndex(item => item.metadata.name === name);
                if(nativeIndex !== -1){
                    this.nativeList[nativeIndex] = obj;
                    const listIndex = this.list.findIndex(item => item.name === name);
                    if(listIndex !== -1){
                        const isExpanded = this.expandedKeys.includes(name);
                        if(isExpanded){
                            // 展开状态：保留 metrics 并立即刷新
                            const oldCtn = this.list[listIndex].ctn;
                            const metricsMap = {};
                            oldCtn?.forEach(c => {
                                if(c.cpu || c.memory){
                                    metricsMap[c.name] = { cpu: c.cpu, memory: c.memory };
                                }
                            });
                            const newItem = this.transformPodItem(obj);
                            newItem.ctn?.forEach(c => {
                                if(metricsMap[c.name]){
                                    c.cpu = metricsMap[c.name].cpu;
                                    c.memory = metricsMap[c.name].memory;
                                }
                            });
                            this.list[listIndex] = newItem;
                            // 立即刷新 metrics（只更新展开行）
                            this.fetchMetrics(true);
                        }else{
                            // 非展开状态：直接替换（不需要 metrics）
                            this.list[listIndex] = this.transformPodItem(obj);
                        }
                    }
                }
            }else if(option.type=='DELETED'){
                // 删除 Pod
                this.nativeList = this.nativeList.filter(i=>i.metadata.name!=name);
                this.list = this.list.filter(i=>i.name!=name);
            }
        },
        openYaml(row){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods/"+row.name,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/pods/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            });
        },
        deleteRow(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/pods/"+row.name,{loading:true}).then(res=>{
                this.$message.success("操作成功");
                // setTimeout(()=>{
                //     this.getList();
                // },600)
            }).catch((error)=>{
                if (error?.name !== 'AbortError') { console.error(error); }
            })
            // this.$confirm('是否确定销毁容器并重建', '提示', {confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'}).then(()=>{
            // }).catch(()=>{})
        },
        openLog(row){
            // this.log.name = row.name;
            // this.log.follow = true;
            // this.log.container = row.containerName;
            // this.log.containerList = (row?.containers||[]).concat(row?.initContainers||[]);
            // this.getLog();
            // return;
            this.logCpn = {
                show: true,
                data: {
                    name: row.name,
                    container: row.containerName,
                    containerList: (row?.containers||[]).concat(row?.initContainers||[]),
                }
            }
        },
        // getLog(){
        //     let o = {};
        //     if(this.log.containerList.length>=1){
        //         o.container = this.log.container;
        //     }
        //     if(!this.log.follow){
        //         k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+this.log.name+'/log',{
        //             params: {follow: false, ...o},
        //         }).then(res =>{
        //             this.log.podcont = res.data || '';
        //             if(this.log.showPod){
        //                 this.openDialog();
        //             }else{
        //                 this.log.showPod = true;
        //             }
        //         })
        //         return;
        //     }

        //     this.log.showPod = true;
        //     this.log.podcont = '';
        //     this?.term?.reset();
            
        //     const controller = new AbortController();
        //     const { signal } = controller;
        //     const queryString = new URLSearchParams({follow: this.log.follow, ...o}).toString();
        //     fetch('/k8s-proxy/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+this.log.name+'/log?'+queryString, {
        //         signal,
        //         "headers": {
        //             "accept": "application/json, text/plain, */*",
        //             "authorization": "Bearer "+getToken(),
        //         },
        //     }).then(response=>{
        //         // 检查响应是否成功且是流式响应
        //         if (!response.ok || !response.body) {return}

        //         // 获取流的读取器
        //         const reader = response.body.getReader();
        //         const decoder = new TextDecoder('utf-8'); // 用于将二进制数据解码为文本

        //         // 递归读取流数据
        //         let readStream = ()=>{
        //             return reader.read().then(({ done, value }) => {
        //                 if(done){return}
        //                 if (!this.log.follow || !this.log.showPod) {
        //                     controller.abort();    
        //                     return;
        //                 }

        //                 // 将二进制数据解码为文本
        //                 const chunk = decoder.decode(value, { stream: true });
                        
        //                 this.log.podcont = this.log.podcont + (chunk || '');
        //                 if(this.log.showPod){
        //                     // this.openDialog();
        //                     let e = chunk;
        //                     e = e.replace(/\x20+/g,' ');
        //                     e = e.replace(/(?<!\r)\n/g,'\r\n');
        //                     this?.term?.write(e);
        //                 }
        //                 // 递归读取下一块数据
        //                 return readStream();
        //             });
        //         }
        //         // 开始读取流
        //         return readStream();
        //     });
        //     return;
        // },
        // openDialog(){
        //     if(!this.term){
        //         setTimeout(()=>{
        //             this.termInit(()=>{
        //                 this.selectLog(this.log.podcont);
        //             });
        //         },100)
        //     } else {
        //         this.selectLog(this.log.podcont);
        //     }
        // },
        // termInit(callback){
        //     document.getElementById("term").innerHTML = "";
        //     this.term = new Terminal({
        //         rendererType: 'dom',
        //         cursorBlink: false,
        //     });
        //     this.term.open(document.getElementById("term"));

        //     this.fitAddon = new FitAddon();
        //     this.term.loadAddon(this.fitAddon);
        //     this.fitAddon.fit();

        //     callback && callback();
        // },
        // selectLog(e){
        //     if(!this.term){return}
        //     this.term.reset();
        //     e = e.replace(/\x20+/g,' ');
        //     e = e.replace(/(?<!\r)\n/g,'\r\n');
        //     setTimeout(()=>{this.fitAddon.fit();},30);
        //     setTimeout(()=>{this.term.write(e);},60);
        //     // this.term?.selectAll && this.term.selectAll();
        // },
        // fullscreen(){
        //     this.log.fullscreen = !this.log.fullscreen;
        //     this.$nextTick(()=>{
        //         this.term = null;
        //         this.openDialog();
        //     })
        // },
        openWs(row){
            if(row?.status?.toUpperCase()!='RUNNING'){return;}
            this.ws.row = row;
            this.ws.dialog = true;
            this.ws.container = row.containerName;
            this.ws.containers = (row?.containers||[]).concat(row?.initContainers||[]);
            this.ws.getLink = ()=>{
                if(this.inMicro){
                    let token = getToken();
                    this.webshelllink = window.microApp?.getData()?.originUrl || '';
                    this.webshelllink = this.webshelllink.replace(/\/$/,'') + `/fp/pod-webshell?type=${this.ws.type}&pod=${row.name}&namespace=${row.namespace}&containerName=${this.ws.container}&api_token=${token}`;
                }else{
                    this.webshelllink = `/fp/pod-webshell?pod=${row.name}&namespace=${row.namespace}&containerName=${this.ws.container}&type=${this.ws.type}`;
                }
            }
            this.ws.getLink();
        },
        // openWebshell(){
        //     this.ws.dialog = false;
        //     let row = this.ws.row;

        //     this.wsd = {
        //         show: !this.inMicro,
        //         pod:row.name,
        //         namespace: row.namespace,
        //         containerName: row.containerName,
        //     };
        // },
        getEvents(row){
            this.eventLs = [];
            this.stopRequestStatus();

            let query = `involvedObject.kind=Pod,involvedObject.uid=${row.uid},involvedObject.name=${row.name},involvedObject.namespace=${row.namespace}`
            
            const MAX_EVENTS = 500;
            
            const controller = new AbortController();
            this.statusController = controller;
            const { signal } = controller;
            
            fetch('/k8s-proxy/api/v1/namespaces/'+ this.namespaceActive +'/events?watch=true&limit=500&&fieldSelector='+encodeURIComponent(query), {
                signal,
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "authorization": "Bearer "+getToken(),
                },
            }).then(response=>{
                // 检查响应是否成功且是流式响应
                if (!response.ok){
                    // console.log('!response.ok')
                    return;
                }
                if(!response.body) {
                    // console.log('!response.body')
                    return
                }

                // 获取流的读取器
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8'); // 用于将二进制数据解码为文本

                let buffer = "";
                // 递归读取流数据
                let readStream = ()=>{
                    return reader.read().then(({ done, value }) => {
                        if(done){return}
                        
                        // 将二进制数据解码为文本
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        // console.log('lines',lines);
                        
                        lines.forEach((line, index) => {
                            // 最后一行可能不完整，留到下次处理
                            if (index === lines.length - 1) { buffer = line; return; }
                            // 合并缓冲区和当前行（如果有缓冲区内容）
                            const data = buffer ? buffer + line : line;
                            buffer = '';
                            if (!data){ console.log('!data'); return;}
                            // console.log('data',data);
                            try {
                                const option = JSON.parse(data);
                                
                                if(option.type=='ADDED'){
                                    this.eventLs.push(option?.object || {})
                                }else if(option.type=='MODIFIED'){
                                    const index = this.eventLs.findIndex(item => item.metadata.name === option?.object?.metadata?.name);
                                    if (index !== -1) { this.eventLs[index] = option?.object; }
                                }else if(option.type=='DELETED'){
                                    this.eventLs = this.eventLs.filter(i=>i.metadata.name!=option?.object?.metadata?.name);
                                }
                                if(this.eventLs.length > MAX_EVENTS){
                                    this.eventLs = this.eventLs.slice(-MAX_EVENTS);
                                }
                            } catch (e) {
                                // console.log('try error',e)
                            }
                            
                            this.eventLs = this.eventLs.map(i=>{
                                i.name = i.metadata?.name;
                                i.eventTime = window.formatDate(i.eventTime);
                                i.startTime = window.formatDate(i.firstTimestamp);
                                i.lastTime = window.formatDate(i.lastTimestamp);
                                i.kind = i.involvedObject?.kind;
                                i.count = i.count;
                                return i;
                            }).sort((a,b)=>a.startTime<b.startTime?1:-1)
                        });
                        // 递归读取下一块数据
                        return readStream();
                        
                    });
                }
                // 开始读取流
                return readStream();
            }).catch(error => {
                // console.log('cache',error)
                if (error.name === 'AbortError') { console.log('请求已被中止'); }
            });
            return;
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

.app-pod-table .arco-table-tr-expand>.arco-table-td{padding:10px; background:var(--color-bg-2);}
.app-pod-table .arco-table-tr-expand:hover>.arco-table-td{background:var(--color-bg-2)!important;}
.app-pod-table .arco-table-expand-btn{width:auto; height:auto; border: 0; outline: 0;}
</style>
