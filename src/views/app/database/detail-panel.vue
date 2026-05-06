<template>
    <div class="df df-c" style="margin-left:18px;min-height:100%;">
        <div class="df">
            <div class="bg-white padding-20 df-s0" style="width:40%;min-width:500px;">
                <div class="fs-16 b">基础信息</div>
                <a-form class="mt-10" label-align="left">
                    <a-form-item label="名称" class="mb-0">{{info.dbType}}</a-form-item>
                    <a-form-item label="版本" class="mb-0">
                        <span>{{info.version}}</span>
                        <!-- <icon-edit class="cursor c-blue fs-16 ml-10" @click="openVersion" /> -->
                    </a-form-item>
                    <a-form-item label="状态" class="mb-0">{{info.status}}</a-form-item>
                    <a-form-item label="创建时间" class="mb-0">{{info.createdTime}}</a-form-item>
                </a-form>
                <a-divider />
                <div class="fs-16 b">配置信息</div>
                <a-form class="mt-10" label-align="left">
                    <a-form-item label="最大CPU" class="mb-0">
                        <span>{{info.limitCpu}} 核</span>
                        <icon-edit v-if="info.status=='Running'" class="cursor c-blue fs-16 ml-10" @click="openCpuMemory" />
                    </a-form-item>
                    <a-form-item label="最大内存" class="mb-0">{{info.limitMemory}}</a-form-item>
                    <a-form-item label="存储大小" class="mb-0">
                        <span>{{info.storage}}</span>
                        <span v-if="info.storageClassName" class="ml-10 cursor c-blue" @click="$router.push('/storage/disk')">（存储设备：{{info.storageClassName}}）</span>
                        <icon-edit v-if="info.status=='Running'" class="cursor c-blue fs-16 ml-10" @click="openStorage" />
                    </a-form-item>
                    <a-form-item label="实例数量" class="mb-0">
                        <span>{{info.replica}}</span>
                        <icon-edit v-if="info.status=='Running'" class="cursor c-blue fs-16 ml-10" @click="openReplica" />
                    </a-form-item>
                    <a-form-item label="部署节点" class="mb-0">
                        <span >{{info.buildNode}}</span>
                        <icon-edit class="cursor c-blue fs-16 ml-10" @click="openBuildNode" />
                    </a-form-item>
                </a-form>
            </div>
            <div class="bg-white padding-20 ml-20 fc">
                <div class="fs-16 b">
                    <span>连接信息</span>
                    <span class="ml-20 fs-18 c-99">
                        <icon-eye-invisible v-if="connectShow" class="cursor" @click="connectShow=!connectShow" />
                        <icon-eye v-else class="cursor" @click="connectShow=!connectShow" />
                    </span>
                    <span v-if="databaseLink" class="c-99 fs-18 ml-10">
                        <a :href="databaseLink" class="c-99" target="_blank"><icon-link class="cursor" /></a>
                    </span>
                </div>
                <a-form class="mt-16" label-align="left" layout="vertical" style="flex-direction:row;">
                    <a-form-item label="username" class="mb-0">
                        <a-input v-if="connectShow" v-model="connect.username" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                    <a-form-item label="password" class="mb-0 ml-20">
                        <a-input v-if="connectShow" v-model="connect.password" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                </a-form>
                <a-divider />
                <div class="fs-16 b">内网地址</div>
                <a-form class="mt-16" label-align="left" layout="vertical" style="flex-direction:row;">
                    <a-form-item label="host" class="mb-0">
                        <a-input v-if="connectShow" v-model="connect.hostEms" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                    <a-form-item label="port" class="mb-0 ml-20" style="width:200px;">
                        <a-input v-if="connectShow" v-model="connect.port" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                    <a-form-item label="connection" class="mb-0 ml-20">
                        <a-input v-if="connectShow" v-model="connect.connection" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                </a-form>
                <a-divider />
                <div class="df ai-c">
                    <div class="fs-16 b">外网地址</div>
                    <a-switch v-model="connect.wwSwitch" :loading="wwSwitchDisabled||info.status!='Running'" @change="wwSwitchChange" class="ml-20"></a-switch>
                </div>
                <a-form class="mt-16" label-align="left" layout="vertical" style="flex-direction:row;">
                    <a-form-item label="host" class="mb-0">
                        <a-input v-if="connectShow && connect.wwSwitch" v-model="connect.wwHost" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                    <a-form-item label="port" class="mb-0 ml-20" style="width:200px;">
                        <a-input v-if="connectShow && connect.wwSwitch" v-model="connect.wwPort" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                    <a-form-item label="connection" class="mb-0 ml-20">
                        <a-input v-if="connectShow && connect.wwSwitch" v-model="connect.wwConnection" readonly></a-input>
                        <a-input v-else default-value="****" readonly></a-input>
                    </a-form-item>
                </a-form>
            </div>
        </div>
        <div class="mt-20 bg-white padding-20 fc">
            <div class="df ai-c jc-b">
                <div class="fs-16 b">实例列表</div>
                <div class="df">
                    <a-button type="outline" :disabled="list.length<=1" @click="switchPod.show=true;switchPod.pod='';">切换</a-button>
                    <a-button type="outline" :disabled="info.status!='Running'" class="ml-10" @click="restart">重启</a-button>
                    <a-button type="outline" :disabled="info.status!='Running'" class="ml-10" @click="stopStart">{{info.status=='Running'?'停止':'启动'}}</a-button>
                </div>
            </div>
            <a-table :data="list" class="mt-20 cptable" :bordered="false" :pagination="false">
                <template #columns>
                    <a-table-column title="实例名称">
                        <template #cell="{ record }">
                            <a-popover position="bl" content-style="padding:6px 10px 10px;">
                                <span class="c-blue cursor">{{record.name}}{{record.primary?'（主）':''}}</span>
                                <template #content>
                                    <div style="max-height:400px;overflow:auto;">
                                        <div v-for="(ctn,ctnindex) in record.containers" :key="ctn.name" class="c-33 container-popover">
                                            <div class="df"><span class="b popover-label df-s0">容器id：</span>{{record.containerStatuses && record.containerStatuses.length && record.containerStatuses[ctnindex].containerID}}</div>
                                            <div class="df mt-10"><span class="b popover-label df-s0">镜像：</span>{{ctn.image}}</div>
                                            <div class="df mt-10"><span class="b popover-label df-s0">名称：</span>{{ctn.name}}</div>
                                            <div class="df mt-10"><span class="b popover-label df-s0">重启次数：</span>{{record.containerStatuses && record.containerStatuses.length && record.containerStatuses[ctnindex].restartCount}}</div>
                                        </div>
                                    </div>
                                </template>
                            </a-popover>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="状态">
                        <template #cell="{ record }">
                            <a-popover position="bottom" @popup-visible-change="v=>v?getEvents(record):null">
                                <span :class="{'c-green':record.status=='RUNNING','c-red':record.status!='RUNNING'}" class="cursor">{{record.statusTxt}}</span>
                                <template #content>
                                    <div style="max-height:400px; max-width:800px; overflow:auto;">
                                        <table class="com-table"><tbody>
                                            <tr>
                                                <td>资源名</td>
                                                <td>级别</td>
                                                <td>内容</td>
                                                <td>详细描述</td>
                                                <td>时间</td>
                                            </tr>
                                            <tr v-for="(record,index) in eventLs" :key="index">
                                                <td>{{record.name}}</td>
                                                <td>{{record.type}}</td>
                                                <td>{{record.reason}}</td>
                                                <td>{{record.message}}</td>
                                                <td>{{record.eventTime}}</td>
                                            </tr>
                                            <tr v-if="!eventLs||!eventLs.length">
                                                <td colspan="5" class="txt-c c-cc">没有数据</td>
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
                    <a-table-column title="cpu/内存">
                        <template #cell="{ record }">{{record.cpu}}核 / {{record.memory}}G</template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
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
                            <a-tooltip content="webshell">
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
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        
        
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <a-modal v-model:visible="log.showPod" title="查看日志" width="1000px" :fullscreen="log.fullscreen" :closable="false" class="log-model" :show-close="false" @open="openDialog" :popup-container="false?'#allmodalbox':'body'">
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
                    
                    <div v-if="log.containerList && log.containerList.length>1" class="df ai-c">
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
        <!-- @ok="openWebshell" -->
        <a-modal title="webshell" v-model:visible="ws.dialog" width="500px"  @cancle="ws.dialog = false;" top="10vh" :popup-container="false?'#allmodalbox':'body'">
            <template #title>webshell</template>
            <div style="margin-top:-10px;">
                <a-form :model="ws">
                    <a-form-item label="Shell环境">
                        <a-select v-model="ws.type" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option label="bin/sh" value="bin/sh"></a-option>
                            <a-option label="bin/bash" value="bin/bash"></a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item v-if="ws.row.containers && ws.row.containers.length>1" label="容器">
                        <a-select v-model="ws.container" size="large" style="width:400px;" @change="ws.getLink" placeholder="请选择">
                            <a-option v-for="item in ws.row.containers" :key="item.name" :label="item.name" :value="item.name"></a-option>
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

        <a-modal title="webshell" v-model:visible="wsd.show" width="1000px" :mask-closable="false" top="10vh" :footer="false" :popup-container="false?'#allmodalbox':'body'">
            <template #title>webshell</template>
            <web-shell
                v-if="wsd.show"
                :type="ws.type" 
                :pod="wsd.pod"
                :namespace="wsd.namespace"
                :containerName="wsd.containerName"
            ></web-shell>
        </a-modal>

        
        <a-modal :visible="changeStorage.show" title="磁盘" @cancel="changeStorage.show=false;" @ok="submitStorage">
            <a-form v-model="changeStorage" auto-label-width class="padding-10">
                <a-form-item label="磁盘" field="memory">
                    <a-input v-model="changeStorage.storage" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>Gi</template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>
        
        <a-modal :visible="cpuMemory.show" title="CPU/内存" @cancel="cpuMemory.show=false;" @ok="submitCpuMemory">
            <a-form v-model="cpuMemory" auto-label-width class="padding-10">
                <a-form-item label="CPU" field="cpu">
                    <a-input v-model="cpuMemory.cpu" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>核</template>
                    </a-input>
                </a-form-item>
                <a-form-item label="内存" field="memory">
                    <a-input v-model="cpuMemory.memory" type="number" size="large" placeholder="请输入" style="width:500px;">
                        <template #append>G</template>
                    </a-input>
                </a-form-item>
            </a-form>
        </a-modal>

        <!-- <a-modal :visible="changeVersion.show" title="修改版本" @cancel="changeVersion.show=false;" @ok="submitVersion">
            <a-form v-model="changeVersion" auto-label-width class="padding-10">
                <a-form-item label="版本">
                    <a-select v-model="changeVersion.version" size="large" placeholder="请选择" style="width:500px;">
                        <a-option v-for="item in versions" :key="item" :label="item" :value="item"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal> -->

        <a-modal :visible="switchPod.show" title="切换实例" @cancel="switchPod.show=false;" @ok="submitSwitchPod">
            <a-form v-model="switchPod" auto-label-width class="padding-10">
                <a-form-item label="实例">
                    <a-select v-model="switchPod.pod" size="large" placeholder="请选择" style="width:500px;">
                        <a-option v-for="item in list" :key="item" :label="item.name" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal :visible="replicaForm.show" title="修改副本" @cancel="replicaForm.show=false;" @ok="submitReplica">
            <a-form v-model="replicaForm" auto-label-width class="padding-10">
                <a-form-item label="副本数">
                    <a-input v-model="replicaForm.replica" type="number" size="large" placeholder="请输入" style="width:500px;"></a-input>
                </a-form-item>
            </a-form>
        </a-modal>
        
        <a-modal :visible="buildNodeForm.show" title="部署节点" width="560px" @ok="buildNodeFormSubmit" @cancel="buildNodeForm.show=false;">
            <div class=" df ai-c jc-c">
                <a-transfer
                    v-model="buildNodeForm.nodes"
                    :data="buildNodeForm.nodeList"
                    :title="['选择节点','部署节点']"
                    show-search
                    :source-input-search-props="{placeholder:'请输入搜索内容'}"
                    :target-input-search-props="{placeholder:'请输入搜索内容'}"
                    class="database-transfer"
                >
                    <template #to-target-icon>
                        <div class="df ai-c">
                            <icon-right />
                            <span class="ml-4">部署</span>
                        </div>
                    </template>
                    <template #to-source-icon>
                        <div class="df ai-c">
                            <icon-left />
                            <span class="ml-4">取消</span>
                        </div>
                    </template>
                </a-transfer>
            </div>
        </a-modal>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore } from '@/store'
import yamlDrawer from '@/components/yaml-drawer.vue';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import webShell from "@/components/web-shell.vue";
import { getToken } from '@/utils/auth';
import { getUserInfo } from '@/utils/auth';

export default {
    props: ['data'],
    data(){
        return {
            namespaceActive: '',
            info: {},
            connect: {},
            connectShow: false,

            list: [],
            eventLs: [],
            webshelllink: "",
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            log: {
                showPod: false,
                podcont: '',
                realtimeLog: false,
                name: "",
                ws: null,
                fullscreen: false,
                containerList: [],
            },
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
            // 修改磁盘
            changeStorage: {},
            // 垂直扩容
            cpuMemory: {},
            // 版本
            versions: [],
            // 修改版本
            changeVersion: {},
            // 副本数
            replicaForm: {},
            // 切换
            switchPod: {},
            databaseLink: '',
            wwSwitchDisabled: false,
            // 部署节点
            buildNodeForm: {
                show: false,
                nodes: [],
                nodeList: [],
                datas: [],
            },
            debug: false,
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.init();
        this.getList();
    },
    watch:{
        data(v){
            if(!v){return}
            this.init();
            this.getList();
        },
    },
    components: {yamlDrawer,webShell},
    methods: {
        async init(){
            if(!this.data || !Object.keys(this.data).length){return}
            
            let matchExpressions = this.data?.spec?.schedulingPolicy?.affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms?.[0]?.matchExpressions || [];
            let values = matchExpressions?.find(i=>i.key=='kubernetes.io/hostname'&&i.operator=='In')?.values || [];

            let d = this.data;
            let dbType = d?.metadata?.labels?.['w7panel.kubeblocks.io/name'] || d?.spec?.clusterDefinitionRef;
            let version = d?.metadata?.labels?.['w7panel.kubeblocks.io/version'] || d?.spec?.clusterVersionRef;
            this.info = {
                ...this.info,
                name: d?.metadata.name,
                createdTime: window.formatDate(this.data?.metadata?.creationTimestamp),
                dbType: dbType,
                version: version,
                limitCpu: d?.spec?.componentSpecs?.[0]?.resources?.limits?.cpu,
                limitMemory: d?.spec?.componentSpecs?.[0]?.resources?.limits?.memory?.replace(/^\d+(\.\d+)?/,v=>(v+' ')),
                storage: d?.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage?.replace(/^\d+(\.\d+)?/,v=>(v+' ')),
                status: d?.status?.phase,
                componentName: d.spec?.componentSpecs?.[0].name,
                replica: d?.spec?.componentSpecs?.[0]?.replicas,
                storageClassName: d?.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.storageClassName,
                buildNode: values?.length? values.length : '不限制',
            }
            if(d?.metadata?.annotations?.['w7panel.kubeblocks.io/account-secret-name']){
                this.connect = {
                    ...this.connect,
                    host: d?.metadata?.annotations?.['w7panel.kubeblocks.io/host'],
                    hostEms: d?.metadata?.annotations?.['w7panel.kubeblocks.io/host'],
                    port: d?.metadata?.annotations?.['w7panel.kubeblocks.io/port'],
                    wwHost: window.location.hostname,
                    wwPort: this.data?.spec?.services?.[0]?.spec?.ports?.[0]?.nodePort,
                    wwSwitch: this.data?.spec?.services?.[0]?.spec?.type == 'NodePort',
                }
                
                await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+d?.metadata?.annotations?.['w7panel.kubeblocks.io/account-secret-name']).then(res=>{
                    let data = res?.data;
                    this.connect = {
                        ...this.connect,
                        username: atob(data?.data?.username),
                        password: atob(data?.data?.password),
                    }
                })
            }else{
                await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/secrets/"+ this.info.name + "-conn-credential").then(res=>{
                    let data = res?.data;
                    this.connect = {
                        ...this.connect,
                        username: atob(data?.data?.username),
                        password: atob(data?.data?.password),
                        port: atob(data?.data?.port),
                        host: atob(data?.data?.host),
                        hostEms: atob(data?.data?.host),
                        wwHost: window.location.hostname,
                        wwPort: this.data?.spec?.services?.[0]?.spec?.ports?.[0]?.nodePort,
                        wwSwitch: this.data?.spec?.services?.[0]?.spec?.type == 'NodePort',
                    }
                });
            }

            let c = this.connect;
            this.connect.connection = this.info.dbType +'://'+ c.username +':'+ c.password +'@'+ c.host +':'+ c.port;
            this.connect.wwConnection = this.info.dbType +'://'+ c.username +':'+ c.password +'@'+ c.wwHost +':'+ c.wwPort;
            
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/cluster-dns').then(res=>{
                let clusterDns = res?.data?.data?.clusterDomain || '';
                clusterDns = clusterDns? '.'+clusterDns : '';
                this.connect.hostEms = this.connect.host + '.' + this.namespaceActive + '.svc' + clusterDns;
            });
            
            // let dbType = d?.spec?.clusterDefinitionRef;
            k8sproxy.get('/apis/apps.kubeblocks.io/v1alpha1/clusterversions?labelSelector=app.kubernetes.io/name='+dbType).then(res=>{
                let data = res?.data;
                let items = data?.items || [];
                this.versions = items.map(i=>i.metadata?.name);
            });
        },
        openBuildNode(){
            k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                this.buildNodeForm.datas = data;
                let list = data.map(item=>({
                    label: item.metadata.name,
                    value: item.metadata.name,
                }));
                let matchExpressions = this.data?.spec?.schedulingPolicy?.affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms?.[0]?.matchExpressions || [];
                let values = matchExpressions?.find(i=>i.key=='kubernetes.io/hostname'&&i.operator=='In')?.values || [];
                this.buildNodeForm.nodeList = list;
                this.buildNodeForm.nodes = values;
                this.buildNodeForm.show = true;
            });
        },
        buildNodeFormSubmit(){
            console.log(this.buildNodeForm.nodes);
            let nodeSelectorTerms = this.data?.spec?.schedulingPolicy?.affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms || [];
            nodeSelectorTerms[0] = nodeSelectorTerms?.[0] || {matchExpressions:[]};
            nodeSelectorTerms[0].matchExpressions = nodeSelectorTerms[0]?.matchExpressions || [];
            let find = nodeSelectorTerms[0].matchExpressions?.find(i=>i.key=='kubernetes.io/hostname');
            if(find){
                find.operator = 'In';
                find.values = this.buildNodeForm.nodes;
            }else{
                nodeSelectorTerms[0].matchExpressions.push({
                    key: 'kubernetes.io/hostname',
                    operator: 'In',
                    values: this.buildNodeForm.nodes,
                })
            }
            // console.log(nodeSelectorTerms);
            // return;
            k8sproxy.patch('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+ this.namespaceActive +'/clusters/'+this.data.metadata?.name, {
                spec:{
                    schedulingPolicy: {
                        affinity: {
                            nodeAffinity: {
                                requiredDuringSchedulingIgnoredDuringExecution: {
                                    nodeSelectorTerms: nodeSelectorTerms,
                                }
                            }
                        },
                    },
                }
            },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
                this.buildNodeForm.show = false;
                this.$message.success('操作成功');
                this.$emit('refresh');
            });
        },
        getList(){
            if(!this.data || !Object.keys(this.data).length){return}

            let labelSelector = 'labelSelector=app.kubernetes.io/instance=' + this.data.metadata.name;
            k8sproxy.get('/api/v1/pods?'+labelSelector).then(res=>{
                this.list = res?.data?.items?.map(item=>{
                    let podips = item?.status?.podIPs?.map(i=>i.ip) || [];
                    return {
                        key: item?.metadata?.name,
                        name: item?.metadata?.name,
                        namespace: item?.metadata?.namespace,
                        primary: item?.metadata?.labels?.['kubeblocks.io/role'] == 'primary',
                        containers: item?.spec?.containers || [],
                        containerStatuses: item.status?.containerStatuses || [],
                        containerName: item?.spec?.containers?.[0]?.name,
                        creationTimestamp: window.formatDate(item?.metadata?.creationTimestamp),
                        hostIp: item?.status?.hostIP,
                        podIps: podips.join(' , '),
                        startTime: window.formatDate(item?.status?.startTime),
                        status: item?.status?.phase?.toUpperCase() || '',
                        statusTxt: item?.status?.phase || '',
                        uid: item?.metadata?.uid,
                    }
                });
                
                let primary = this.list.find(i=>i.primary);
                let cmds = {
                    'mysql': `mysql -u${this.connect.username} -p${this.connect.password}`,
                    'postgresql': `psql -U ${this.connect.username}`,
                }
                let command = cmds[this.info.dbType];
                if(primary && command){
                    const encodedCommand = encodeURIComponent(command);
                    if(this.inMicro){
                        let token = getToken();
                        this.databaseLink = window.microApp?.getData()?.originUrl || '';
                        this.databaseLink = this.databaseLink.replace(/\/$/,'') + `/fp/pod-webshell?type=bin/sh&command=${encodedCommand}&pod=${primary.name}&namespace=${primary.namespace}&containerName=${primary.containerName}&api_token=${token}`;
                    }else{
                        this.databaseLink = `/fp/pod-webshell?command=${encodedCommand}&pod=${primary.name}&namespace=${primary.namespace}&containerName=${primary.containerName}&type=bin/sh`;
                    }
                }
            }).then(()=>{
                return k8sproxy.get("/apis/metrics.k8s.io/v1beta1/namespaces/"+ this.namespaceActive +"/pods?"+labelSelector)
            }).then(res=>{
                let items = res?.data?.items || [];
                items.forEach(item=>{
                    let cpu = item?.containers?.[0]?.usage?.cpu || '0';
                    let memory = item?.containers?.[0]?.usage?.memory || '0';
                    cpu = (Number(cpu.replace(/[a-zA-z]/g,'')) / 1000 / 1000 / 1000).toFixed(2);
                    memory = (Number(memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 ).toFixed(2);
                    
                    this.list.forEach(pod=>{
                        if(pod.name===item?.metadata?.name){
                            pod.cpu = cpu;
                            pod.memory = memory;
                        }
                    })
                })
            })
        },
        // 水平扩容
        openReplica(){
            this.replicaForm = {
                show: true,
                name: this.info.name,
                oldReplica: this.info.replica,
                replica: this.info.replica,
            }
        },
        // 提交水平扩容
        submitReplica(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'horizontal-scaling-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.replicaForm.name,
                    type: 'HorizontalScaling',
                    horizontalScaling: [{
                        componentName: this.info.componentName,
                        [Number(this.replicaForm.replica)>this.replicaForm.oldReplica? 'scaleOut' : 'scaleIn']: {
                            replicaChanges: Math.abs(Number(this.replicaForm.replica) - this.replicaForm.oldReplica),
                        }
                    }]
                }
            }).then(res=>{
                this.replicaForm.show = false;
                this.$message.success('操作成功');
                this.$emit('refresh');
            });
        },
        // 外网地址 switch
        wwSwitchChange(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata:{
                    name: 'expose-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.info.name,
                    type: 'Expose',
                    preConditionDeadlineSeconds: 0,
                    expose: [{
                        componentName: this.info.componentName,
                        services: [{
                            name: 'node-port',
                            roleSelector: 'primary',
                            serviceType: 'NodePort',
                        }],
                        switch: this.connect.wwSwitch? 'Enable' : 'Disable',
                    }]
                },
            }).then(res=>{
                this.$message.success('操作成功');
                this.wwSwitchDisabled = true;
                setTimeout(()=>{
                    this.wwSwitchDisabled = false;
                    this.$emit('refresh');
                },5000)
            });
        },
        // 切换
        submitSwitchPod(){
            if(!this.switchPod.pod){this.$message.warning('请选择实例');return;}
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata:{
                    name: 'switchover-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.info.name,
                    type: 'Switchover',
                    switchover: [{
                        componentName: this.info.componentName,
                        instanceName: this.switchPod.pod,
                    }]
                }
            }).then(res=>{
                this.$message.success('操作成功');
                this.switchPod.show = false;
                setTimeout(()=>{
                    this.getList();
                },5000)
            })
        },
        // 重启集群
        restart(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'restart-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.info.name,
                    type: 'Restart',
                    restart: [{
                        componentName: this.info.componentName,
                    }]
                }
            }).then(res=>{
                this.$message.success('操作成功');
                this.$emit('refresh');
            })
        },
        // 停止启动
        stopStart(){
            let row = {
                name: this.info.name,
                status: this.info.status,
            }
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: 'apps.kubeblocks.io/v1alpha1',
                kind: 'OpsRequest',
                metadata: {
                    name: (row.status=="Running"? 'stop' : 'start') + '-' + Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: row.name,
                    type: row.status=="Running"? 'Stop' : 'Start',
                }
            }).then(res=>{
                this.$message.success('操作成功');
                this.$emit('refresh');
            })
        },
        // // 修改版本
        // openVersion(){
        //     this.changeVersion = {
        //         show: true,
        //         oldVersion: this.data.spec?.clusterVersionRef,
        //         version: this.data.spec?.clusterVersionRef,
        //     }
        // },
        // // 提交版本
        // submitVersion(){
        //     if(this.changeVersion.version == this.changeVersion.oldVersion){
        //         this.changeVersion.show = false;
        //         return;
        //     }
        //     k8sproxy.patch('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+ this.namespaceActive +'/clusters/'+this.data.metadata?.name, {
        //         spec: {
        //             clusterVersionRef: this.changeVersion.version,
        //         }
        //     },{headers: {'Content-Type': 'application/merge-patch+json'}}).then(res=>{
        //         this.changeVersion.show = false;
        //         this.$message.success('操作成功');
        //         this.$emit('refresh');
        //     });
        // },
        
        // 垂直扩容
        openCpuMemory(){
            let i = this.data;
            let memory = i.spec?.componentSpecs?.[0]?.resources?.limits?.memory;
            let memoryNum = memory.replace(/^(\d+(\.\d+)?)Gi$/,(v,$1)=>Number($1)).replace(/^(\d+(\.\d+)?)Mi$/,(v,$1)=>$1*1024);
            this.cpuMemory = {
                show: true,
                name: i.metadata?.name,
                cpu: i.spec?.componentSpecs?.[0]?.resources?.limits?.cpu,
                memory: memoryNum,
                componentName: i.spec?.componentSpecs?.[0].name,
            }
        },
        // 提交垂直扩容
        submitCpuMemory(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'vertical-scaling-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.cpuMemory.name,
                    type: "VerticalScaling",
                    verticalScaling: [{
                        componentName: this.cpuMemory.componentName,
                        requests: {
                            memory: this.cpuMemory.memory + 'Gi',
                            cpu: this.cpuMemory.cpu,
                        },
                        limits: {
                            memory: this.cpuMemory.memory + 'Gi',
                            cpu: this.cpuMemory.cpu,
                        },
                    }]
                },
            }).then(res=>{
                this.cpuMemory.show = false;
                this.$message.success('操作成功');
                this.$emit('refresh');
            })
        },
        // 磁盘扩容
        openStorage(){
            let i = this.data;
            let storage = i.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage;
            let storageNum = storage.replace(/^(\d+(\.\d+)?)Gi$/,(v,$1)=>Number($1)).replace(/^(\d+(\.\d+)?)Mi$/,(v,$1)=>$1*1024);
            this.changeStorage = {
                show: true,
                name: i.metadata?.name,
                storage: storageNum,
                componentName: i.spec?.componentSpecs?.[0].name,
            }
        },
        // 提交磁盘扩容
        submitStorage(){
            k8sproxy.post('/apis/apps.kubeblocks.io/v1alpha1/namespaces/'+this.namespaceActive+'/opsrequests',{
                apiVersion: "apps.kubeblocks.io/v1alpha1",
                kind: "OpsRequest",
                metadata: {
                    name: 'volume-expansion-'+Date.now(),
                    namespace: this.namespaceActive,
                },
                spec: {
                    clusterName: this.changeStorage.name,
                    type: 'VolumeExpansion',
                    volumeExpansion: [{
                        componentName: this.changeStorage.componentName,
                        volumeClaimTemplates: [{
                            name: 'data',
                            storage: this.changeStorage.storage + 'Gi',
                        }]
                    }]
                }
            }).then(res=>{
                this.changeStorage.show = false;
                this.$message.success('操作成功');
                this.$emit('refresh');
            })
        },

        getEvents(row){
            this.eventLs = [];
            let query = `involvedObject.kind=Pod,involvedObject.uid=${row.uid},involvedObject.name=${row.name},involvedObject.namespace=${row.namespace}`
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/events?limit=500&&fieldSelector='+encodeURIComponent(query)).then(res=>{
                this.eventLs = res.data?.items || [];
                this.eventLs = this.eventLs.map(i=>{
                    i.name = i.metadata?.name;
                    i.eventTime = window.formatDate(i.eventTime);
                    return i;
                })
            })
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
                setTimeout(()=>{
                    this.getList();
                },600)
            }).catch(()=>{})
        },
        openLog(row){
            this.log.name = row.name;
            this.log.follow = true;
            this.log.container = row.containerName;
            this.log.containerList = row.containers;
            this.getLog();
        },
        getLog(){
            let o = {};
            if(this.log.containerList.length>=1){
                o.container = this.log.container;
            }
            if(!this.log.follow){
                k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/pods/'+this.log.name+'/log',{
                    params: {follow: false, ...o},
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
            this?.term?.reset();
            
            const controller = new AbortController();
            const { signal } = controller;
            const queryString = new URLSearchParams({follow: false, ...o}).toString();
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
                        
                        this.log.podcont = this.log.podcont + (chunk || '');
                        if(this.log.showPod){
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
            // this.term?.selectAll && this.term.selectAll();
        },
        fullscreen(){
            this.log.fullscreen = !this.log.fullscreen;
            this.$nextTick(()=>{
                this.term = null;
                this.openDialog();
            })
        },
        openWs(row){
            if(row?.status?.toUpperCase()!='RUNNING'){return;}
            this.ws.row = row;
            this.ws.dialog = true;
            this.ws.container = row.containerName;
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
    },
}
</script>

<style>
.arco-form-item.mb-0{margin-bottom:0;}
.arco-form-item.ml-20{margin-left:20px;}

.log-model .arco-modal-body{padding:10px;}
.log-model .log-model-title{position:relative; height:44px;}
.log-model .log-model-title .btns{position:absolute; right:0; top:0; height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body{height:calc(100vh - 114px);}
.log-model .arco-modal-fullscreen .arco-modal-body>.df{height:100%;}
.log-model .arco-modal-fullscreen .arco-modal-body #term{height:100%;}
.log-model #term{height:418px;}

.database-transfer .arco-transfer-operations .arco-btn{width:auto; padding:0 8px;}
.database-transfer .arco-transfer-view-search{padding:0;}
.database-transfer .arco-transfer-view{height:300px;}
.database-transfer .arco-transfer-list-item{padding:0;}

.container-popover+.container-popover{margin-top:10px;padding-top:10px;border-top:1px solid var(--color-neutral-3);}
</style>
