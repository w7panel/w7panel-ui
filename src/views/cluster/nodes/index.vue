<template>
    <div class="com-container df df-c">
        <route-breadcrumb />
        <div>
            <a-button v-if="permission.includes('cluster-nodes-add')" type="primary" @click="openForm()"><template #icon><icon-plus /></template>注册节点</a-button>
            <a-button v-if="permission.includes('cluster-nodes-registries')&&usermode!='cluster'" type="outline" class="ml-10" @click="openImgorigin">修改镜像源</a-button>
            <!-- <a-button v-if="permission.includes('cluster-nodes-gpu')" type="outline" class="ml-10" @click="clscf.dialog=true;">GPU管理</a-button> -->
            <!-- <a-button type="outline" class="ml-10" @click="nodebindshow=true;">专用存储管理</a-button> -->
            <a-button type="outline" class="ml-10" @click="openClusterInfo">集群信息</a-button>
        </div>
        
        <a-layout class="fc" style="margin-top:20px;">
            <a-layout-sider :width="160">
                <a-menu
                    v-model:selected-keys="selectMenu"
                    @menu-item-click="v=>selectMenu = [v]"
                >
                    <a-menu-item key="1">节点管理</a-menu-item>
                    <a-menu-item key="2">存储节点管理</a-menu-item>
                    <a-menu-item key="3">GPU节点管理</a-menu-item>
                </a-menu>
            </a-layout-sider>
            <a-layout-content class="ml-6 bg-white padding-20">
                <a-table v-if="selectMenu[0]=='1'" :data="list" class="nodestable" :scroll="{ x: 1600 }" :pagination="false" :bordered="false">
                    <template #columns>
                        <a-table-column title="节点名称" fixed="left" :width="300">
                            <template #cell="{ record }">
                                <div>
                                    <span>
                                        <span class="point" :class="record.ready?'green':'red'"></span>
                                        <span>{{record.name}}</span>
                                    </span>
                                    <!-- <span v-if="item.master">（主）</span> -->
                                </div>
                                <div class="mt-4">
                                    <a-tag color="arcoblue" size="small" bordered>{{record.master?'master':'agent'}}</a-tag>
                                    <a-tag v-if="record.controlPlane" class="ml-10" color="arcoblue" size="small" bordered>control plane</a-tag>
                                    <a-tag v-if="record.customTag" class="ml-10" color="arcoblue" size="small" bordered>{{record.customTag}}</a-tag>
                                    <a-tag v-if="record.storageTag" class="ml-10" color="arcoblue" size="small" bordered>storage</a-tag>
                                </div>
                            </template>
                        </a-table-column>
                        
                        <a-table-column title="IP" :width="350">
                            <template #cell="{ record }">
                                <div>
                                    <div>
                                        <span class="va-middle">{{record.internalIP}}</span>
                                        <a-icon :size="18" class="va-middle ml-4 c-blue cursor" @click="onekeyCopy(record.internalIP)" ><DocumentCopy/></a-icon>
                                    </div>
                                    <div v-if="record.publicIp">
                                        <div v-if="editPublicIp.show && editPublicIp.name==record.name">
                                            <a-input v-model="editPublicIp.ip" placeholder="请输入ip" style="width:200px;" size="small"></a-input>
                                            <a-button type="primary" class="ml-4" size="small" @click="toEditPublicIp">确定</a-button>
                                        </div>
                                        <div v-else class="df ai-c">
                                            <span class="va-middle">{{record.publicIp}}（公网）</span>
                                            <!-- <a-icon :size="18" class="va-middle ml-4 c-blue cursor" @click="onekeyCopy(record.publicIp)" ><DocumentCopy/></a-icon> -->
                                            
                                            <a-tooltip content="复制">
                                                <span class="opt-icon" style="margin-left:0;" @click="onekeyCopy(record.publicIp)">
                                                    <icon-copy />
                                                </span>
                                            </a-tooltip>
                                            <a-tooltip content="获取IP">
                                                <span class="opt-icon" style="margin-left:0;" @click="editPublicIp={show:true,name:record.name,ip:record.publicIp}">
                                                    <icon-pen />
                                                </span>
                                            </a-tooltip>
                                        </div>
    
                                    </div>
                                    <div v-else >
                                        <span>-</span>
                                        <a-tooltip content="获取IP">
                                            <span class="opt-icon ml-4" @click="refreshPublicIp(record)">
                                                <icon-sync />
                                            </span>
                                        </a-tooltip>
                                    </div>
                                </div>
                            </template>
                        </a-table-column>
                        
                        <a-table-column title="podCIDR">
                            <template #cell="{ record }">{{record.podCIDR}}</template>
                        </a-table-column>
    
                        <a-table-column title="环境">
                            <template #cell="{ record }">
                                <div class="df df-c">
                                    <span>{{record.osImage}}</span>
                                    <!-- <span>{{item.Hostname}}</span> -->
                                    <span>{{record.containerRuntimeVersion}}</span>
                                </div>
                            </template>
                        </a-table-column>
                        
                        <a-table-column title="cpu / 内存">
                            <template #cell="{ record }">
                                <div class="df df-c">
                                    <span>{{record.usedCpu?record.usedCpu+'核 / ':''}}{{record.cpu}}核</span>
                                    <span>{{record.usedMemory?record.usedMemory+'G / ':''}}{{record.memory}}G</span>
                                </div>
                            </template>
                        </a-table-column>
                        <a-table-column title="封锁" fixed="right" :width="100">
                            <template #cell="{ record }">
                                <a-switch v-model="record.unschedulable" @change="unschedulable(record)"></a-switch>
                            </template>
                        </a-table-column>
                        <a-table-column title="操作" fixed="right" :width="280">
                            <template #cell="{ record }">
                                <div class="options">
    
                                    <a-tooltip v-if="debug" content="yaml">
                                        <i class="opt-icon" @click="openYaml(record)"><icon-code /></i>
                                    </a-tooltip>
                                     <!-- v-if="permission.includes('cluster-nodes-files')" -->
                                    <a-tooltip v-if="fileeditor && record.ready" content="文件管理">
                                        <span class="opt-icon" @click="toFile(record)">
                                            <icon-folder />
                                        </span>
                                    </a-tooltip>
                                     <!-- v-if="permission.includes('terminal')" -->
                                    <a-tooltip v-if="webshell && record.ready" content="命令执行">
                                        <span class="opt-icon" @click="toWebshell(record)">
                                            <icon-code-square  />
                                        </span>
                                    </a-tooltip>
                                    <a-tooltip content="标签">
                                        <span class="opt-icon" @click="openSetLabels(record)">
                                            <icon-tag />
                                        </span>
                                    </a-tooltip>
                                    <a-popconfirm content="驱逐功能会将当前节点下所有的pod驱逐并按照相应策略重新分配应用，是否继续执行" @ok="openFuu(record)" position="lt">
                                        <a-tooltip content="驱逐">
                                            <span class="opt-icon">
                                                <icon-loop />
                                            </span>
                                        </a-tooltip>
                                    </a-popconfirm>
                                    <a-popconfirm content="是否删除节点" @ok="toDelete(record)" position="lt">
                                        <a-tooltip content="删除">
                                            <span class="opt-icon">
                                                <icon-delete />
                                            </span>
                                        </a-tooltip>
                                    </a-popconfirm>
                                </div>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
                <div v-if="selectMenu[0]=='2'">
                    <div v-if="!hasLonghornSystem" class="mt-40">
                        <a-empty>longhorn组件未安装，<span class="c-blue cursor" @click="insLonghorn">点击安装</span></a-empty>
                    </div>
                    <a-tabs v-else default-active-key="1">
                        <a-tab-pane key="1" title="节点规划">
                            <div v-if="hasLonghornSystem">
                                <a-alert class="mt-10">
                                    <div>添加存储节点，是用来规划可以使用哪些节点的硬盘来创建存储分区。</div>
                                    <div>设置专用节点，是用来规划存储专用节点，限制这些节点只能用于存储服务，非存储服务无法部署在这些节点且已经部署的会被驱逐。</div>
                                </a-alert>
                                <nb-page ref="nbpage" class="mt-10" :list="list" @submit="getList()"></nb-page>
                            </div>
                            <div v-else >
                                <a-empty>longhorn组件未安装，<span class="c-blue cursor" @click="insLonghorn">点击安装</span></a-empty>
                            </div>
                            
                        </a-tab-pane>
                        <a-tab-pane key="2" title="存储配置">
                            <nd-set></nd-set>
                        </a-tab-pane>
                    </a-tabs>
                </div>
                <div v-if="selectMenu[0]=='3'">
                    <set-gpu :show="selectMenu[0]=='3'" @close="clscf.dialog=false;" />
                </div>
            </a-layout-content>
        </a-layout>
        
        <a-drawer :width="800" :visible="setlabel.show" @ok="submitSetlabel" @cancel="setlabel.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>编辑标签</template>
            <a-form v-model="setlabel" auto-label-width class="mt-20">
                <a-form-item>
                    <div class="fc df df-c">
                        <div>
                            <div v-for="(item,index) in setlabel.reserve" :key="index" class="df ai-c mb-10">
                                <a-input v-model="item.key" size="large" disabled :spellcheck="false" style="width:300px;" placeholder="键名称"></a-input>
                                <span style="width:40px; text-align:center;">=</span>
                                <a-input v-model="item.value" size="large" disabled :spellcheck="false" style="width:300px;" placeholder="键值"></a-input>
                            </div>
                            <div v-for="(item,index) in setlabel.custom" :key="index" class="df ai-c mb-10">
                                <a-input v-model="item.key" size="large" @blur="checkReserve(item.key)" :spellcheck="false" style="width:300px;" placeholder="键名称"></a-input>
                                <span style="width:40px; text-align:center;">=</span>
                                <a-input v-model="item.value" size="large" :spellcheck="false" style="width:300px;" placeholder="键值"></a-input>
                                <icon-close class="fs-20 ml-10 cursor c-99" @click="setlabel.custom.splice(index,1)" />
                            </div>
                        </div>
                        <div class="df df-c ai-s mt-10">
                            <span class="c-blue cursor fs-16 " @click="setlabel.custom.push({key:'',value:''})">新增</span>
                            <div class="lh-14 c-99 mt-10">
                                <div>标签键名称不超过63个字符,仅支持英文、数字、'/'、'-',且不允许以('/')开头。支持使用前缀，更多说明 <a href="https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/labels/#%e8%af%ad%e6%b3%95%e5%92%8c%e5%ad%97%e7%ac%a6%e9%9b%86" target="blank" class="c-blue">查看详情</a></div>
                                <div>标签键值只能包含字母、数字及分隔符("-"、"_"、".")，且必须以字母、数字开头和结尾</div>
                            </div>
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </a-drawer>

        <a-modal v-model:visible="fuu.show" title="重分应用" width="900px" :popup-container="false?'#allmodalbox':'body'">
            <template #title>重分应用</template>
            <div class="df df-c pods">
                <div v-for="(item,index) in fuu.list" :key="index" class="item df ai-c jc-b">
                    <span class="c-blue">{{item.name}}</span>
                    <span v-if="item.check" class="fs-20 c-green"><icon-check /></span>
                    <span v-else-if="fuu.start" class="fs-12 c-99">等待中...</span>
                </div>
            </div>
            <template #footer>
                <a-button @click="fuu.show=false">取消</a-button>
                <a-button type="primary" @click="delfuu">确定</a-button>
            </template>
        </a-modal>

        <a-drawer :visible="form.show" width="800px" @ok="submitForm" @cancel="form.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>注册节点</template>
            <a-form ref="form" :model="form" auto-label-width>
                <a-form-item label="主服务器地址"  field="k3s_url" :rules="[{required:true,message:'请输入主服务器地址'}]">
                    <div style="flex:1;">
                        <a-input v-model="form.k3s_url" placeholder="请输入"></a-input>
                        <a-checkbox v-model="form.ww" @change="form.k3s_url = form.ww?publicIp:form.defaultURL" class="mt-8" :disabled="!publicIp">外网</a-checkbox>
                    </div>
                    <template #extra>主服务器(节点)apiserver地址: https://服务器内网ip:6443</template>
                </a-form-item>
                <!-- <a-form-item label="主服务器(节点)token" field="k3s_token" :rules="[{required:true,message:'请输入主服务器token'}]">
                    <a-input v-model="form.k3s_token" placeholder="请输入"></a-input>
                    <template #extra>
                        <span>主服务器(节点)token获取方式: 主服务执行sudo cat /var/lib/rancher/k3s/server/node-token</span>
                        <a-popover position="left">
                            <icon-question-circle-fill class="fs-14 cursor ml-2" />
                            <template #content>
                                <img src="@/assets/image/apiserver.png" alt="" />
                            </template>
                        </a-popover>
                    </template>
                </a-form-item> -->

                <a-form-item label="节点类型">
                    <a-select v-model="form.type" placeholder="请选择" @change="form.command?submitForm():'';">
                        <a-option value="agent">agent</a-option>
                        <a-option :disabled="config.type==1" value="server">server</a-option>
                    </a-select>
                </a-form-item>

                <a-form-item v-if="form.type=='server' && config.type==3" label="外部数据库">
                    <a-input v-model="form.ha" placeholder="请输入"></a-input>
                    <template #extra>--datastore-endpoint 配置地址, <a href="https://docs.rancher.cn/docs/k3s/installation/ha/_index#3-%E9%85%8D%E7%BD%AE%E5%9B%BA%E5%AE%9A%E7%9A%84%E6%B3%A8%E5%86%8C%E5%9C%B0%E5%9D%80" target="_blank" class="c-blue">详细说明</a></template>
                </a-form-item>
            </a-form>
            <div v-if="form.command" class="mt-20">
                <div><span class="c-blue cursor" @click="onekeyCopy(form.command)">复制此命令</span>, 在服务器执行此命令</div>
                <div class="mt-20" id="nodeterm"></div>
            </div>
        </a-drawer>
        <yaml-drawer :show="yamlData.show" :title="yamlData.title" :returnYaml="yamlData.returnYaml" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        <!-- <a-modal v-model:visible="commandModal.show" width="600px" @ok="commandExe" @cancel="commandModal.show=false;">
            <template #title>执行命令</template>
            <a-textarea v-model="commandModal.command" placeholder="请输入命令" allow-clear style="height:100px;" :spellcheck="false" />
        </a-modal> -->

        <a-drawer :visible="clusterInfo.show" width="800px" @ok="submitClusterInfo" @cancel="clusterInfo.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>集群信息</template>
            <a-form :model="clusterInfo" auto-label-width>
                <a-form-item label="开启公网">
                    <div class="padding-10" style="background:var(--color-neutral-1);width:300px;">
                        <div v-for="(item,index) in clusterInfo.ips" class="df ai-c padding-10" :key="index">
                            <div class="f1">
                                <span v-if="!item.edit">{{item.ip}}</span>
                                <a-input v-else v-model="item.ip" placeholder="请输入" @keyup.enter="item.edit=false" ></a-input>
                            </div>
                            <div class="ml-10">
                                <a-switch v-if="item.onlyshow" disabled :default-checked="true"></a-switch>
                                <a-switch v-else v-model="item.enable"></a-switch>
                            </div>
                            <div v-if="item.edit" class="ml-10 df ai-c jc-c cursor" @click="item.edit=false;" style="width:20px;">
                                <icon-check class="fs-16" />
                            </div>
                            <div v-else-if="!item.onlyshow" class="ml-10 df ai-c jc-c cursor" @click="clusterInfo.ips.splice(index,1);" style="width:20px;">
                                <icon-close class="fs-16" />
                            </div>
                        </div>
                        <a-button class="mt-10 mb-10" long @click="clusterInfo.ips.push({ip:'',onlyshow:false,enable:false,edit:true})">添加</a-button>
                    </div>
                </a-form-item>
                <a-form-item label="集群信息">
                    <a-button @click="checkClusterInfo={show: true,ip:clusterInfo.ips[0].ip,yaml: ''};getKubeconfig();">点击查看</a-button>
                </a-form-item>
            </a-form>
        </a-drawer>
        <!-- <a-modal v-model:visible="addIp.show" title="添加IP" @ok="clusterInfo.ips.push({ip:addIp.ip,onlyshow:false,enable:false});addIp.show=false;" @cancel="addIp.show=false;">
            <a-form :model="addIp" auto-label-width>
                <a-form-item label="IP">
                    <a-input v-model="addIp.ip" placeholder="请输入ip" />
                </a-form-item>
            </a-form>
        </a-modal> -->
        <a-drawer :visible="checkClusterInfo.show" width="800px" @cancel="checkClusterInfo.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>集群信息</template>
            <div style="height:100%;">
                <a-select v-model="checkClusterInfo.ip" placeholder="请选择" @change="getKubeconfig">
                    <a-option v-for="(item,index) in clusterInfo.ips" :key="index" :value="item.ip" :label="item.ip"></a-option>
                </a-select>

                <div class="mt-20" style="height:calc(100% - 52px);">
                    <yaml-editor v-if="checkClusterInfo.yaml" :yaml="checkClusterInfo.yaml" :disabled="true" :nofooter="true"></yaml-editor>
                </div>
            </div>
            <template #footer>
                <a-button @click="checkClusterInfo.show=false;">取消</a-button>
                <a-button :disabled="!checkClusterInfo.yaml" type="primary" @click="downloadClusterInfo">下载</a-button>
            </template>
        </a-drawer>

        <!-- <node-bind :show="nodebindshow" :list="list" @close="v=>{nodebindshow=false;v?getList():null;}"></node-bind> -->
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {FitAddon} from '@xterm/addon-fit';
import { useNamespaceStore,useLoadingStore } from '@/store'
import { getToken } from '@/utils/auth';
import yamlDrawer from '@/components/yaml-drawer.vue';
import setGpu from "./set-gpu.vue";
import { getUserInfo } from '@/utils/auth';
import nodeBind from '@/components/node/node-bind.vue';
import nbPage from '@/components/node/nb-page.vue';
import ddcNode from '@/components/node/ddc-node.vue';
import ndSet from '@/components/node/nd-set.vue';

import yamlEditor from "@/components/yaml-editor.vue";
import { getPermission,getWebshell,getFileEditor } from '@/utils/auth';
import jsyaml from "js-yaml";

const templateYaml = `apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
    name: longhorn
    namespace: kube-system
spec:
    chart: https://cdn.w7.cc/w7panel/charts/longhorn-1.7.2.tgz
    createNamespace: true
    set:
        csi.attacherReplicaCount: 1
        csi.provisionerReplicaCount: 1
        csi.resizerReplicaCount: 1
        csi.snapshotterReplicaCount: 1
        defaultSettings.storageReservedPercentageForDefaultDisk: '0'
        longhornUI.replicas: 0
    targetNamespace: longhorn-system
    version: v1.7.2
`

export default {
    data(){
        return {
            namespaceActive: '',
            columns: [
                {
                    title: '名称',
                    dataIndex: 'name',
                    key: 'name',
                },
                {
                    title: 'podCIDR',
                    dataIndex: 'podCIDR',
                    key: 'podCIDR',
                },
            ],
            data: [],
            list: [],
            labelReserve: [
                'beta.kubernetes.io/arch',
                'beta.kubernetes.io/instance-type',
                'beta.kubernetes.io/os',
                'kubernetes.io/arch',
                'kubernetes.io/hostname',
                'kubernetes.io/os',
                'node-role.kubernetes.io/control-plane',
                'node-role.kubernetes.io/master',
                'node.kubernetes.io/instance-type',
            ],
            
            setlabel: {
                show: false,
                reserve: [],
                custom: [],
                name: '',
            },
            
            fuu: {
                show: false,
                list: [],
                row: null,
                start: false,
            },

            form: {
                show: false,
                defaultURL: '',
                k3s_url: '',
                k3s_token: '',
                command: '',
                ww: false,
                type: 'agent',
                ha: '',
            },
            term: null,
            publicIp: '',
            yamlData: {},
            // commandModal: {
            //     pod_name: '',
            //     containerName: '',
            //     namespace: '',
            //     show: false,
            //     command: '',
            //     item: {},
            // },

            config: {
                type: 1,
                value: '',
            },
            haWarn: false,
            clscf: {
                dialog: false,
            },
            
            permission: [],
            debug: false,
            webshell: '',
            fileeditor: '',
            editPublicIp: {
                show: false,
                name: '',
                ip: '',
            },
            clusterInfo: {
                show: false,
                loading: false,
                ips: [],
                addIps: [],
            },
            addIp: {
                show: false,
                ip: '',
            },
            checkClusterInfo: {
                show: false,
                ip: '',
                yaml: '',
            },
            usermode: '',

            // nodebindshow: false,

            selectMenu: ['1'],
            hasLonghornSystem: false,
        }
    },
    created(){
        let userInfo = getUserInfo();
        this.usermode = userInfo?.['w7.cc/user-mode'];

        this.webshell = getWebshell() == 'true';
        this.fileeditor = getFileEditor() == 'true';
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.permission = getPermission() || [];
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
        this.getConfig();
        this.testLonghornSystem();
    },
    watch: {
        selectMenu: 'testLonghornSystem',
    },
    components: {
        yamlDrawer,
        setGpu,
        yamlEditor,
        nodeBind,
        nbPage,
        ddcNode,
        ndSet,
    },
    methods: {
        insLonghorn(){
            panelApi.post('/yaml', templateYaml, {loading:true}).then(res=>{
                this.$message.success('操作成功')
                this.testLonghornSystem();
            });
        },
        testLonghornSystem(){
            if(this.selectMenu[0]!='2'){return}
            panelApi.get('/helm/releases/longhorn?namespace=longhorn-system',{loading:true,noAlert:true}).then(res=>{
                if(res?.data){this.hasLonghornSystem = true;}
            }).catch(()=>{
                this.hasLonghornSystem = false;
            })
        },
        // async submitTransfer(){
        //     try {
        //         await Promise.all([
        //             this.$refs?.nbpage?.submit()
        //         ]);
        //     } catch (error) {}
        //     this.$message.success('操作成功');
        //     this.getList();
        // },
        downloadClusterInfo(){
            function downloadStringAsFile(content, filename, contentType) {
                // 创建Blob对象，包含要下载的内容和文件类型
                const blob = new Blob([content], { type: contentType });
                
                // 创建一个a标签用于触发下载
                const a = document.createElement('a');
                
                // 创建指向Blob对象的URL
                const url = URL.createObjectURL(blob);
                
                // 设置下载相关属性
                a.href = url;
                a.download = filename;
                
                // 将a标签添加到文档中并触发点击事件
                document.body.appendChild(a);
                a.click();
                
                // 清理资源
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
            };
            downloadStringAsFile(this.checkClusterInfo.yaml, "kubeconfig.yaml", "text/plain");
        },
        getKubeconfig(){
            panelApi.get('/kubeconfig',{params:{
                apiServerUrl: 'https://'+ this.checkClusterInfo.ip +':6443'
            }}).then(res=>{
                let data = res.data;
                this.checkClusterInfo.yaml = jsyaml.dump(data);
            })
        },
        submitClusterInfo(){
            let enable = this.clusterInfo.ips.filter(i=>!i.onlyshow&&i.enable)?.map(i=>i.ip);
            let disable = this.clusterInfo.ips.filter(i=>!i.onlyshow&&!i.enable)?.map(i=>i.ip);

            k8sproxy.patch('/api/v1/namespaces/kube-system/configmaps/k3s.config',[{
                op: 'replace',
                path: '/data/k3s.tls-san',
                value: enable.join(','),
            },{
                op: 'replace',
                path: '/data/k3s.tls-san.disabled',
                value: disable.join(','),
            },{
                op: 'replace',
                path: '/metadata/labels/data-hash',
                value: String(Date.now()),
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.clusterInfo.show = false;
            })
        },
        openClusterInfo(){
            this.clusterInfo = {
                ...this.clusterInfo,
                show: true,
                loading: true,
                ips: [],
                addIps: [],
            };
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3s.config').then(res=>{
                let ips = res?.data?.data?.['k3s.default-tls-san'] || '';
                ips = ips?.split(',')?.filter(i=>i);
                ips = ips.map(i=>{
                    return {
                        ip: i,
                        onlyshow: true,
                        enable: false,
                    }
                })
                
                let enable = res?.data?.data?.['k3s.tls-san'] || '';
                enable = enable?.split(',')?.filter(i=>i);
                ips = ips.concat(enable.map(i=>{
                    return {
                        ip: i,
                        onlyshow: false,
                        enable: true,
                    }
                }))
                let disabled = res?.data?.data?.['k3s.tls-san.disabled'] || '';
                disabled = disabled?.split(',')?.filter(i=>i);
                ips = ips.concat(disabled.map(i=>{
                    return {
                        ip: i,
                        onlyshow: false,
                        enable: false,
                    }
                }))

                this.clusterInfo = {
                    ...this.clusterInfo,
                    loading: false,
                    ips: ips,
                }
            }).finally(()=>{
                this.clusterInfo.loading = false;
            })
        },
        toEditPublicIp(){
            k8sproxy.patch('/api/v1/nodes/'+this.editPublicIp.name,[{
                op: 'replace',
                path: '/metadata/labels/w7.public-ip',
                value: this.editPublicIp.ip
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
                this.editPublicIp.show = false;
            });
        },
        refreshPublicIp(row){
            k8sproxy.patch('/api/v1/nodes/'+row.name,[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1load-public-ip',
                value: 'true'
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                setTimeout(()=>{
                    this.getList();
                },3600);
            });
        },
        getConfig(){
            // config
            k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3s.config').then(res=>{
                // console.log(res.data);
                let data = res?.data || {};
                if(data.data?.['k3s.cluster-init']==='false' && data.data?.['k3s.datastore-endpoint']===''){
                    this.config.type = 1;
                }else if(data.data?.['k3s.cluster-init']==='true'){
                    this.config.type = 2;
                }else if(data.data?.['k3s.datastore-endpoint']!==''){
                    this.config.type = 3;
                    this.config.value = data.data?.['k3s.datastore-endpoint'];
                }
            })
        },
        openImgorigin(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/registries",{noAlert:true}).then(res=>{
                this.yamlData = {
                    show: true,
                    data: res?.data?.data?.['default.cnf'],
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    returnYaml: true,
                    submit: this.submitImgorigin,
                }
            }).catch(()=>{
                this.yamlData = {
                    show: true,
                    data: '',
                    title: 'registries',
                    returnYaml: true,
                    submit: this.submitImgorigin,
                }
            })
        },
        submitImgorigin(data){
            // data = jsyaml.dump(data, { indent: 4 });
            
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/registries",{loading:true,noAlert:true}).then(res=>{
                k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/registries",{
                    metadata: {
                        labels: {
                            'data-hash': '' + Date.now()
                        }
                    },
                    data: {
                        'default.cnf': data,
                    },
                },{
                    headers: {'Content-Type': 'application/strategic-merge-patch+json'}
                }).then(res=>{
                    this.$message.success("操作成功");
                    this.yamlData = {...this.yamlData, show:false,};
                })
            }).catch(e=>{
                if(e?.response?.status==404){
                    // 创建configmap
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",{
                        apiVersion: 'v1',
                        kind: 'ConfigMap',
                        metadata: {
                            name: 'registries',
                            annotations: {
                                title: '镜像仓库',
                            }
                        },
                        data: {
                            'default.cnf': data,
                        },
                    }).then(res=>{
                        this.$message.success("操作成功");
                        this.yamlData = {...this.yamlData, show:false,};
                    })
                }
            })
        },
        openYaml(row){
            k8sproxy.get("/api/v1/nodes/"+row.name,{loading:true}).then(res=>{
                let data = res?.data || {};
                this.yamlData = {
                    show: true,
                    data: data,
                    title: data?.metadata?.annotations?.title || data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/nodes/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
                console.log(this.yamlData);
            });
        },
        // commandExe(){
        //     let command = 'nsenter -t 1 --mount --uts --ipc --net --pid -- ' + this.commandModal.command;
        //     let cmd = command.split(' ');
        //     cmd = cmd.map(i=>('command='+i));
        //     cmd = cmd.join('&');
            
        //     let params = `podName=${this.commandModal.pod_name}&containerName=${this.commandModal.containerName}&tty=false&namespace=${this.commandModal.namespace}&${cmd}`;
        //     return panelApi.get(`/exec?${params}`,{responseType: 'text', loading:true}).then(res=>{
        //         this.commandModal.show = false;
        //         this.commandModal.command = '';
        //         this.$message.success("执行成功");
        //         this.getList();
        //     }).catch(err=>{
        //         this.$message.error("执行失败");
        //     });
        // },
        toWebshell(item){
            let ip = item.internalIP;
            let token = getToken();
            this.webshelllink = window.microApp?.getData()?.originUrl || '';
            this.webshelllink = this.webshelllink.replace(/\/$/,'') + `/fp/pod-webshell?type=bin/sh&ip=${ip}&api_token=${token}&origin=nodes`;
            let isopen = window.open(this.webshelllink);
            if(!isopen){
                console.log("请在新窗口打开");
            }
            return;

            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                params:{
                    labelSelector: `w7.cc/daemonset=w7`
                },
                loading:true,
            }).then(res=>{
                let items = res?.data?.items || [];
                let find = items.find(i=>{
                    if(!i?.status?.hostIP){return false}
                    return i.status.hostIP==ip;
                })
                // if(find){
                //     this.commandModal = {
                //         pod_name: find?.metadata?.name,
                //         containerName: find?.spec?.containers?.[0]?.name,
                //         namespace: find?.metadata?.namespace,
                //         show: true,
                //         command: '',
                //         item: item,
                //     };
                // }
                if(find){
                    let token = getToken();
                    this.webshelllink = window.microApp?.getData()?.originUrl || '';
                    this.webshelllink = this.webshelllink.replace(/\/$/,'') + `/fp/pod-webshell?type=bin/sh&pod=${find.metadata.name}&namespace=${find.metadata.namespace}&containerName=${find?.spec?.containers?.[0]?.name}&api_token=${token}&origin=nodes`;
                    let isopen = window.open(this.webshelllink);
                    if(!isopen){
                        console.log("请在新窗口打开");
                    }
                }
            })
        },
        toFile(item){
            this.$router.push({
                path: '/cluster/nodes-files',
                query: {
                    ip: item.internalIP,
                    podName: item.name,
                },
            })
        },
        termInit(callback){
            document.getElementById("nodeterm").innerHTML = "";
            this.term = new Terminal({
                rendererType: 'dom',
                cursorBlink: false,
            });
            this.term.open(document.getElementById("nodeterm"));

            this.fitAddon = new FitAddon();
            this.term.loadAddon(this.fitAddon);
            this.fitAddon.fit();

            callback && callback();
        },
        openForm(){
            let ip = this.list?.find(i=>i.master)?.internalIP;
            if(!ip){return}
            this.form.defaultURL = 'https://' + ip + ':6443';
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/pods",{
                params:{
                    labelSelector: `w7.cc/daemonset=w7`
                },
                loading:true,
            }).then(res=>{
                let items = res?.data?.items || [];
                let find = items.find(i=>{
                    if(!i?.status?.hostIP){return false}
                    return i.status.hostIP==ip;
                })
                return {
                    pod_name: find?.metadata?.name,
                    containerName: find?.spec?.containers?.[0]?.name,
                    namespace: find?.metadata?.namespace,
                }
            }).then(d=>{
                let command = 'nsenter -t 1 --mount --uts --ipc --net --pid -- cat /var/lib/rancher/k3s/server/node-token';
                let cmd = command.split(' ');
                cmd = cmd.map(i=>('command='+i));
                cmd = cmd.join('&');

                let params = `podName=${d.pod_name}&containerName=${d.containerName}&tty=false&namespace=${d.namespace}&${cmd}`
                return panelApi.get(`/exec?${params}`,{responseType: 'text', loading:true})
            }).then(res=>{
                let k3s_token = res?.data || '';
                this.form.k3s_url = this.form.defaultURL;//this.publicIp? (this.publicIp + ':6443') : this.form.defaultURL;
                this.form.k3s_token = k3s_token.replace(/\n/g,'');
                this.form.show = true;
                this.form.command = false;
                this.form.ww = false;
            }).catch(()=>{
                console.log('获取token失败')
            })
        },
        submitForm(){
            this.$refs.form.validate(error=>{
                if(error){return}
                let origin = window.origin;
                if(window.__MICRO_APP_ENVIRONMENT__){
                    origin = window.microApp?.getData()?.requestUrl?.replace(/\/$/,'') || '';
                }
                let master = this.list.find(i=>i.master);
                let nodename = ' K3S_NODE_NAME=' + this.form.type + this.getMaxNum(this.form.type);
                let version = master? ' INSTALL_K3S_VERSION='+master.version : '';
                let ha = this.form.ha? (` K3S_DATASTORE_ENDPOINT=${this.form.ha}`) : '';
                let uuid =  ` UUID=${this.createName(12)}`;
                
                // let url = `${origin}`;
                // let ip = this.list?.find(i=>i.master)?.internalIP;
                // let localurl = window.location.protocol+'//' + ip + ':' + window.location.port;
                // this.form.command = `curl -sfL ${ this.form.ww? url : localurl }/k3s-${this.form.type}.sh | K3S_URL=${this.form.k3s_url} K3S_TOKEN=${this.form.k3s_token}${uuid}${ha}${nodename}${version} sh -`;
                this.form.command = `curl -sfL https://cdn.w7.cc/w7panel/install.sh | K3S_URL=${this.form.k3s_url} K3S_TOKEN=${this.form.k3s_token}${uuid}${ha}${nodename}${version} sh -`;
                this.$nextTick(()=>{
                    this.termInit(()=>{
                        let e = this.form.command;
                        if(!this.term){return}
                        this.term.reset();
                        e = e.replace(/\x20+/g,' ');
                        e = e.replace(/(?<!\r)\n/g,'\r\n');
                        setTimeout(()=>{this.fitAddon.fit();},30);
                        setTimeout(()=>{this.term.write(e);},60);
                    });
                })
            })
        },
        getMaxNum(type){
            let regexp = new RegExp('^'+type+'\\d+$');
            let list = this.list.filter(i=>regexp.test(i.name)).map(i=>Number(i.name.match(/\d+$/)[0]));
            return list.length? Math.max(...list) + 1 : 1;
        },
        async delfuu(){
            this.fuu.start = true;
            let i = 0;
            for(i=0; i<this.fuu.list.length && this.fuu.show; i++){
                await k8sproxy.delete("/api/v1/namespaces/"+ this.fuu.list[i].namespace +"/pods/"+this.fuu.list[i].name).then(res=>{
                    this.fuu.list[i].check = true;
                });
            }
            if(i==this.fuu.list.length){
                this.$message.success('操作成功');
                this.fuu.show = false;
            }
        },
        openFuu(row){
            k8sproxy.get('/api/v1/pods', {loading:true}).then(res=>{
                if(!res?.data){return}
                let list = res.data?.items || [];
                list = list.filter(i=>{
                    return i.status.hostIP == row.internalIP
                        && i.metadata?.labels?.app != 'w7panel'
                        && i.metadata?.labels?.app != 'w7panel-offline'
                        && i.metadata?.annotations?.['w7.cc/deny-delete'] != 'true'
                        && i.metadata?.namespace != 'kube-system'
                        && i.metadata?.namespace != 'higress-system'
                })
                // console.log(list.length)
                this.fuu.list = list.map(i=>{
                    return {
                        name: i.metadata.name,
                        kind: res.data.kind,
                        api_version: res.data.apiVersion,
                        namespace: i.metadata?.namespace,
                        check: false,
                    }
                });
                this.fuu.start = false;
                this.fuu.show = true;
            })
        },
        toDelete(item){
            k8sproxy.delete('/api/v1/nodes/'+item.name).then(res=>{
                if(!res?.data){return}
                this.$message.success('操作成功');
                this.getList();
            });
        },
        checkReserve(v){
            if(this.labelReserve.indexOf(v)>-1){ this.$message.warning('不能使用保留标签') }
        },
        // 提交编辑标签
        submitSetlabel(){
            this.setlabel.custom = this.setlabel.custom.filter(i=> (i.key && i.value) );
            let arr = this.setlabel.reserve.concat(this.setlabel.custom);
            let obj = {};
            arr.map(i=> obj[i.key] = i.value)
            
            let json = this.data?.find(i=>i.metadata.name == this.setlabel.name);
            if(json){
                json.metadata.labels = obj;
                k8sproxy.put('/api/v1/nodes/'+this.setlabel.name,json).then(res=>{
                    if(!res?.data){return}
                    this.$message.success('操作成功');
                    this.setlabel.show = false;
                    this.getList();
                });
            }else{
                this.$message.warning('节点不存在');
            }
        },
        unschedulable(item){
            let data = {spec:{unschedulable:item.unschedulable}}
            k8sproxy.patch('/api/v1/nodes/'+item.name,data,{
                headers: {'Content-Type': 'application/strategic-merge-patch+json'}
            }).then(res=>{
                if(!res?.data){return}
                this.$message.success('操作成功');
                this.getList();
            });
        },
        openSetLabels(item){
            let json = this.data?.find(i=>i.metadata.name == item.name);
            this.setlabel.show = true;
            let labels = json.metadata?.labels || {};
            let reserve = [];
            let custom = [];
            for(let i in labels){
                if(this.labelReserve.indexOf(i)>-1){
                    reserve.push({key:i, value:labels[i]});
                }else{
                    custom.push({key:i, value:labels[i]});
                }
            }
            this.setlabel.reserve = reserve;
            this.setlabel.custom = custom;
            this.setlabel.name = item.name;
        },
        getList(){
            k8sproxy.get('/api/v1/nodes',{loading:true}).then(res=>{
                if(!res?.data){return}
                let data = res.data?.items || [];
                this.data = data;
                let list = data.map(item=>{
                    if(item?.metadata?.labels?.['node-role.kubernetes.io/master'] && item.metadata.labels?.['w7.public-ip']){
                        this.publicIp = 'https://' + item.metadata.labels?.['w7.public-ip'] + ':6443';
                    }
                    let ready = item?.status?.conditions?.find(i=>i.type=='Ready')?.status == 'True';
                    
                    return {
                        name: item.metadata.name,
                        podCIDR: item.spec.podCIDR,
                        internalIP: item.status.addresses[0].address,
                        // publicIp: item.status.addresses[1]?item.status.addresses[1].address:'',
                        publicIp: item.metadata.labels?.['w7.public-ip'],
                        osImage: item.status.nodeInfo.osImage,
                        Hostname: item.status.nodeInfo.machineID,
                        containerRuntimeVersion: item.status.nodeInfo.containerRuntimeVersion,
                        unschedulable: !!item.spec.unschedulable,
                        labels: item.metadata.labels,
                        taints: item.spec.taints,
                        master: item?.metadata?.labels?.['node-role.kubernetes.io/master'],
                        controlPlane: item?.metadata?.labels?.['node-role.kubernetes.io/control-plane'],
                        customTag: item?.metadata?.labels?.['node-role.kubernetes.io/custom'],
                        storage: item?.metadata?.labels?.['node.kubernetes.io/storage'],
                        storageTag: item?.metadata?.labels?.['node-role.kubernetes.io/storage'] === 'true',
                        containerName: '',
                        version: item?.status?.nodeInfo.kubeletVersion,
                        swap: item?.metadata?.annotations?.['w7.cc.swap'],
                        isServer: item?.metadata?.labels?.['node-role.kubernetes.io/master'] === 'true',
                        
                        cpu: item.status.allocatable.cpu,
                        memory: (Number(item.status.allocatable.memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 ).toFixed(2),
                        ready: ready,
                    }
                })
                // 根据名称排序
                list.sort((a,b)=>{
                    if(a.name < b.name){
                        return -1;
                    }else if(a.name > b.name){
                        return 1;
                    }else{
                        return 0;
                    }
                })

                this.list = list;
                
                let ip = this.list?.find(i=>i.master)?.internalIP;
                if(ip){
                    this.form.defaultURL = 'https://' + ip + ':6443';
                }
            }).then(()=>{
                return k8sproxy.get('/apis/metrics.k8s.io/v1beta1/nodes')
            }).then(res=>{
                let d = res?.data?.items || [];
                d.map(i=>{
                    let find = this?.list?.find(f=>f.name==i.metadata.name);
                    if(find){
                        find.usedCpu = (Number(i.usage.cpu.replace(/[a-zA-z]/g,'')) / 1000 / 1000 / 1000).toFixed(2);
                        find.usedMemory = (Number(i.usage.memory.replace(/[a-zA-z]/g,'')) / 1024 / 1024 ).toFixed(2);
                    }
                })
            })
        },
        createName(length){
            let len = length || 8;
            let s = 'abcdefghijklmnopqrstuvwxyz';
            let p = '';
            for(var i=0; i<len; i++){
                p = p + s[parseInt(Math.random()*s.length)]
            }
            return p;
        },
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
    },
}
</script>

<style>
.nodestable .opt-icon{cursor:pointer; box-sizing:border-box; display:inline-block; line-height:1; min-width:24px; padding:4px; border-radius:2px; font-size:16px; color:#165dff;}
body[arco-theme='dark'] .filetable .opt-icon{color:#3c7eff;}
.nodestable .opt-icon:hover{background:var(--color-secondary-hover);}
.nodestable .opt-icon + .opt-icon{margin-left:10px;}
</style>
<style scoped>
.mb-10{margin-bottom:10px;}
.pods{max-height:500px; overflow:auto;}
.pods .item{min-height:36px; padding:4px 10px 4px 0; border-bottom:1px solid #eee;}
.point{width:8px; height:8px; border-radius:50%; background:#999; display:inline-block; margin-right:6px;}
.point.red{background:#D00805;}
.point.green{background:#00A870;}
</style>
