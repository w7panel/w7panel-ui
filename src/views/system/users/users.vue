<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="df">
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加用户</a-button>
            <!-- <a-button type="outline" class="ml-20" @click="openRegister">注册设置</a-button> -->
        </div>
        <div class="bg-white mt-20">
            <a-form layout="inline" class="padding-20" style="padding-bottom:12px;">
                <a-form-item label="用户名">
                    <a-input v-model="search.username" placeholder="请输入用户名"></a-input>
                </a-form-item>
                <a-form-item label="用户组">
                    <a-select v-model="search.usergroup">
                        <a-option label="全部" value=""></a-option>
                        <a-option v-for="(item,index) in groupList" :key="index" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="过期状态">
                    <a-select v-model="search.expiretime" placeholder="请选择" style="min-width:150px;">
                        <a-option label="全部" value=""></a-option>
                        <a-option label="未过期" value="notexpired"></a-option>
                        <a-option label="已过期" value="expired"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="资源回收阶段">
                    <a-select v-model="search.clusterStatus" placeholder="请选择" style="min-width:150px;">
                        <a-option label="全部" value=""></a-option>
                        <a-option label="无资源" value="new"></a-option>
                        <a-option label="有资源" value="ready"></a-option>
                        <a-option label="待回收" value="wait"></a-option>
                        <a-option label="回收中" value="recycle"></a-option>
                        <a-option label="创建中" value="creating"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" @click="getList">确定</a-button>
                </a-form-item>
            </a-form>
        </div>
        
        <div class="bg-white padding-20 mt-20 fc">
            <a-table class="cptable user-cptable" :data="list" :virtual-list-props="{height:580}" :pagination="false" :bordered="false" :scroll="{ x: 1000 }">
                <template #columns>
                    <a-table-column title="用户名" data-index="name">
                        <template #cell="{ record }">
                            <div>
                                <span v-if="record.policy!='normal'&&record.policyTitle" class="c-blue cursor mr-4" @click="search.usergroup = record.policy; getList();">[{{record.policyTitle}}]</span>
                                <span>{{record.name}}</span>
                            </div>
                        </template>
                    </a-table-column>

                    <a-table-column title="费用">
                        <template #cell="{record}">
                            <div @click="openCost(record)" class="cursor df ai-c">
                                
                                <span class="lh-20">{{record.costTitle||'-'}}</span>
                                <i v-if="(record.clustermode!='global'&&record.clustermode!='')" class="opt-icon hovershow"><icon-edit /></i>
                            </div>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="配额" :width="400">
                        <template #cell="{record,rowIndex}">
                            <div class="df df-c">
                                <div v-if="record.policy=='normal'">-</div>
                                <div v-else class="df ai-c">
                                    <span v-if="record.clusterStatusTxt" class="cursor lh-20 mr-4" :class="{'ready':'c-blue','new':'c-99','wait':'c-red','recycle':'c-99','creating':'c-orange'}[record.clusterStatus]"  @click="search.clusterStatus = record.clusterStatus; getList();">[{{record.clusterStatusTxt}}]</span>
                                    <span>
                                        <span v-if="record.sourceStatus==-1" class="c-red mr-4">{{ record.sourceStatusTxt }}</span>
                                        <span v-if="record.sourceStatus==1" class="c-green mr-4">{{ record.sourceStatusTxt }}</span>
                                        <span v-if="record.sourceStatus==2" class="c-red mr-4">{{ record.sourceStatusTxt }}</span>
                                        <span v-if="record.sourceStatus==3" class="c-orange mr-4">{{ record.sourceStatusTxt }}</span>
                                        <span v-if="record.sourceStatus==4" class="c-red mr-4">{{ record.sourceStatusTxt }}</span>
                                        <a-popover v-if="record.sourceStatus==5" position="bl" @popup-visible-change="v=>v?getErrorReason(record,rowIndex):null" content-style="padding:6px 10px 10px;min-width:100px;min-height:40px;">
                                            <span class="c-red cursor mr-4">{{ record.sourceStatusTxt }}</span>
                                            <template #content>
                                                <a-spin :loading="record.podStatus && record.podStatus.loading" style="width:100%;height:100%;">
                                                    <div class="c-33" style="white-space:pre;">{{ record.podStatus && record.podStatus.data }}</div>
                                                </a-spin>
                                            </template>
                                        </a-popover>
                                    </span>
    
                                    <span>
                                        <span v-if="record.sourceStatus==4 || record.sourceStatus==5" class="lh-20 cursor c-99">{{record.peie||'-'}}</span>
                                        <span v-else-if="record.clusterStatus=='new' || record.clusterStatus=='recycle'" class="lh-20 cursor c-99">{{record.peie||'-'}}</span>
                                        <span v-else @click="toUserResource(record)" class="lh-20 cursor c-blue">{{record.peie||'-'}}</span>
                                    </span>
                                    
                                    <i v-if="(record.clustermode!='global'&&record.clustermode!='')" @click="editQuota(record)" class="opt-icon hovershow"><icon-edit /></i>
                                    
                                    <a-tooltip v-if="record.clusterStatus=='new'" content="创建资源" @click="csCreate(record)">
                                        <i class="opt-icon hovershow"><icon-plus /></i>
                                    </a-tooltip>
    
                                    <a-tooltip v-if="record.clusterStatus=='ready'" content="回收资源" @click="csWait(record)">
                                        <i class="opt-icon hovershow"><icon-refresh /></i>
                                    </a-tooltip>
                                    <a-tooltip v-if="record.clusterStatus=='wait'" content="恢复资源" @click="csReady(record)">
                                        <i class="opt-icon hovershow"><icon-reply /></i>
                                    </a-tooltip>
                                    
                                    <a-popconfirm v-if="record.clusterStatus=='wait'||record.clusterStatus=='creating'" :content="'确定快速回收吗'" @ok="quickCsReady(record)" position="tr">
                                        <a-tooltip content="快速回收">
                                            <i class="opt-icon hovershow"><icon-close /></i>
                                        </a-tooltip>
                                    </a-popconfirm>
                                </div>
                                <div>
                                    <div class="fs-12 c-99 df ai-c" :class="{cursor:record.expiretime}">
                                        <span v-if="record.userMode!=='cluster'">-</span>
                                        <span v-else-if="record.clusterStatus=='new'">-</span>
                                        <span v-else class="lh-20">{{record.expiretime? (record.expiretime+' 到期') : '永久'}}</span>
                                        <a-tooltip v-if="record.clusterStatus!=='new' && record.policy!=='normal' && record.peie" content="修改到期时间">
                                            <i class="opt-icon hovershow" @click="editExpiretime(record)"><icon-edit /></i>
                                        </a-tooltip>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="权限" :width="150">
                        <template #cell="{record}">
                            <span @click="openPmsForm(record)" class="cursor df ai-c">
                                <span class="lh-20">{{record.permissionPackageTitle||'自定义'}}</span>
                                <i class="opt-icon hovershow"><icon-edit /></i>
                            </span>
                        </template>
                    </a-table-column>
                    
                    <a-table-column title="集群模式" data-index="clustermode" :width="100">
                        <template #cell="{ record }">
                            {{{shared:'共享',virtual:'独享',global:'全局','':'全局'}[record.clustermode]}}
                        </template>
                    </a-table-column>

                    <a-table-column title="操作" :width="200" fixed="right">
                        <template #cell="{ record,rowIndex }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip v-if="record.userMode!=='founder'" content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            
                            <a-tooltip content="webshell">
                                <span class="opt-icon" @click="openWs(record)" :style="{opacity:record?.status=='complete'?1:0.5}">
                                    <icon-code-square />
                                </span>
                            </a-tooltip>
                            <a-popconfirm v-if="record.userMode!=='founder'" :content="'确认要删除吗'" @ok="del(record,rowIndex)" position="lt">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <!-- <a-drawer :width="600" title="注册设置" :visible="register.show" @ok="submitRegister" @cancel="register.show=false;">
            <a-form ref="register" :model="register" auto-label-width class="padding-20">
                <a-form-item label="默认用户组">
                    <a-select v-model="register.defaultPolicyName" placeholder="请选择">
                        <a-option v-for="item in groupList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="开启注册">
                    <a-switch v-model="register.allowConsoleRegister"></a-switch>
                </a-form-item>
                <a-form-item label="上架微擎云市场">
                    <a-switch v-model="register.showInShop"></a-switch>
                    <template #extra>开启后，会将用户组作为服务器套餐上架至微擎云市场</template>
                </a-form-item>
            </a-form>
        </a-drawer> -->
        <a-drawer :width="600" :title="form.isEdit?'修改用户':'添加用户'" :visible="form.show" @ok="submit" @cancel="form.show=false;" @open="$refs.form.clearValidate()" :popup-container="false?'#allmodalbox':'body'">
            <a-form ref="form" :rules="rules" :model="form" auto-label-width class="padding-20">
                <a-form-item label="用户名" field="username">
                    <a-input v-model="form.username" :disabled="form.isEdit" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="密码" field="password">
                    <a-input v-model="form.password" type="password" :spellcheck="false" placeholder="请输入"></a-input>
                </a-form-item>
                
                <a-form-item label="用户组" field="policy">
                    <a-select v-model="form.policy" @change="changePolicy" placeholder="请选择用户组">
                        <a-option label="无" value="normal"></a-option>
                        <a-option v-for="item in form.isEdit?groupList.filter(i=>i.allowedMode==form.clustermode):groupList" :key="item.name" :label="item.title" :value="item.name"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="集群模式" field="clustermode">
                    <a-select v-model="form.clustermode" :disabled="true||!!form.policy" placeholder="请选择集群模式">
                        <a-option label="全局" value="global"></a-option>
                        <a-option label="共享" value="shared"></a-option>
                        <a-option label="独享" value="virtual"></a-option>
                    </a-select>
                    <template #extra>
                        <div v-if="form.clustermode=='shared'">共享：基于主集群轻度隔离，轻量，适用于内部团队场景。</div>
                        <div v-if="form.clustermode=='virtual'">独享：基于主集群完全隔离，完整的集群架构，适用于商业多租户场景。</div>
                        <div v-if="form.clustermode=='global'">全局：可直接对创始人端后台进行管理。</div>
                    </template>
                </a-form-item>
                <!-- <a-form-item v-if="!form.isEdit" label="到期时间" field="expiretime">
                    <a-date-picker v-if="!form.forever" v-model="form.expiretime" showTime class="mr-20" />
                    <a-checkbox v-model="form.forever">永久</a-checkbox>
                    <template v-if="form.isEdit&&form.clusterStatus=='wait'" #extra>
                        <a-checkbox v-model="form.waitToReady" :disabled="form.waitToReadyDisabled">是否恢复待回收资源</a-checkbox>
                    </template>
                </a-form-item> -->
                <a-form-item label="演示用户">
                    <a-switch v-model="form.demouser"></a-switch>
                </a-form-item>
                <a-form-item label="救援模式">
                    <a-switch v-model="form.weihu"></a-switch>
                </a-form-item>
            </a-form>
        </a-drawer>
        <!-- yaml -->
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        
        <a-modal title="到期时间" :visible="expiretimeModal.show" width="600px" @ok="submitExpiretime" @cancel="expiretimeModal.show=false;">
            <a-form ref="expiretimeModal" :rules="expiretimeModalRules" :model="expiretimeModal" auto-label-width>
                <a-form-item label="到期时间" field="expiretime">
                    <a-date-picker v-if="!expiretimeModal.forever" v-model="expiretimeModal.expiretime" style="width:300px;" showTime class="mr-20" />
                    <a-checkbox v-model="expiretimeModal.forever">永久</a-checkbox>
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal title="创建资源" :visible="createCluster.show" width="600px" :ok-loading="createCluster.loading" @ok="submitCreateCluster" @cancel="createCluster.show=false;" okText="初始化集群">
            <a-form ref="createCluster" :model="createCluster" :rules="ccModalRules" auto-label-width>
                <a-form-item label="到期时间" field="expiretime">
                    <a-date-picker v-if="!createCluster.forever" v-model="createCluster.expiretime" style="width:300px;" showTime class="mr-20" />
                    <a-checkbox v-model="createCluster.forever">永久</a-checkbox>
                </a-form-item>
            </a-form>

        </a-modal>

        <a-modal title="webshell" v-model:visible="ws.dialog" width="500px"  @cancel="ws.dialog = false;" top="10vh" :popup-container="false?'#allmodalbox':'body'">
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
            </template>
        </a-modal>
        <permission-edit
            :show="pmsForm.show"
            :list="pmsForm.list"
            :permissionPackage="pmsForm.permissionPackage"
            :type="pmsForm.type"
            :debug="pmsForm.debug"
            :webshell="pmsForm.webshell"
            :fileeditor="pmsForm.fileeditor"
            :name="pmsForm.name"
            :whitelist="pmsForm.whitelist"
            :disabledBase="pmsForm.userMode=='founder'"
            :disabledMenu="pmsForm.userMode=='founder'"
            @close="pmsForm.show=false"
            @submit="submitPermission"
        ></permission-edit>
        <quota-edit
            :show="quotaForm.show"
            :data="quotaForm.data"
            :name="quotaForm.name"
            :clustermode="quotaForm.clustermode"
            @close="quotaForm.show=false"
            @submit="submitQuota"
        ></quota-edit>

        <cost-edit
            :show="costForm.show"
            :data="costForm"
            :list="costList"
            @submit="submitCost"
            @close="costForm.show=false"
        ></cost-edit>

    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';

import axios from 'axios';
import { useNamespaceStore,useLoadingStore } from '@/store';
import bcrypt from "bcryptjs";
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import permissionEdit from '@/components/permission-edit.vue';
import quotaEdit from '@/components/quota-edit.vue';
import costEdit from '@/components/cost-edit.vue';
import dayjs from 'dayjs';

const dataTemplate = {
    apiVersion: 'v1',
    automountServiceAccountToken: true,
    kind: 'ServiceAccount',
    metadata: {
        labels:{
            "w7.cc/user-mode": "cluster",
            "k3k.io/cluster-status": "new",
        },
        annotations: {
            password: '',
        },
        name: '',
        namespace: 'default',
    }
}

export default {
    data(){
        return {
            namespaceActive: '',
            search: {
                username: '',
                expiretime: '',
                clusterStatus: '',
                usergroup: '',
            },
            list: [],
            form: {
                show: false,
                forever: false,
                username: '',
                password: '',
                storageclass: '',
                expiretime: null,
                clustermode: '',
                whitelist: [],
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            rules: {
                username: [{ required: true, message: '请输入用户名', trigger: 'blur' },],
                password: [{ required: true, message: '请输入密码', trigger: 'blur' },],
                storageclass: [{ required: true, message: '请选择存储设备', trigger: 'blur' },],
                storageSize: [{ required: true, message: '请输入存储大小', trigger: 'blur' },],
                clustermode: [{ required: true, message: '请选择集群模式', trigger: 'blur' },],
                policy: [{ required: true, message: '请选择用户组', trigger: 'blur' },],
                expiretime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.form.forever){cb('请选择到期时间'); return}
                    cb();
                }, trigger: 'blur'}],
            },
            expiretimeModalRules: {
                expiretime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.expiretimeModal.forever){cb('请选择到期时间'); return}
                    cb();
                }}],
            },
            ccModalRules: {
                expiretime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.createCluster.forever){cb('请选择到期时间'); return}
                    cb();
                }}],
            },
            storageLs: [],
            ws: {
                dialog: false,
                type: 'bin/sh',
                row: {},
            },
            groupList: [],
            debug: false,
            pmsForm: {
                show: false,
                name: '',
                permissionPackage: '',
                type: 'shared',
                list: [],
            },
            quotaForm: {
                show: false,
                name: '',
                data: {},
            },

            permissionPackageList: [],

            // register: {
            //     show: false,
            //     allowConsoleRegister: false,
            //     defaultPolicyName: '',
            //     showInShop: false,
            // },
            costList: [],
            
            costForm: {
                show: false,
                name: "",
                package: "",
                buymode: "",
                cpu: "",
                memory: "",
                storage: "",
                bandwidth: "",
                packageConfig: [],
            },
            
            userInfo: {},

            expiretimeModal: {
                show: false,
                name: '',
                expiretime: '',
            },
            createCluster: {
                show: false,
                name: '',
                expiretime: '',
            },

            leavePage: false,
            statusList: [],
        }
    },
    async created(){
        this.userInfo = getUserInfo();
        this.debug = this.userInfo?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        
        await this.getCostList();

        this.getList();
        this.getStatus();
        // this.getStorageList();
        this.getUserGroup();
        this.getPermissionPackages();
    },
    components: {
        yamlDrawer,
        permissionEdit,
        quotaEdit,
        costEdit,
    },
    unmounted(){
        this.leavePage = true;
    },
    methods: {
        toUserResource(row){
            if(row.clusterStatus=='recycle'){return}
            if(row.clusterStatus=='new'){return}
            let time = row.recycleTime || '';
            this.$router.push('/usermanage/user-resource?username='+row.name+'&time='+time+'&status='+row.clusterStatus);
        },
        submitExpiretime(){
            this.$refs.expiretimeModal.validate((err) => {
                if (err) {
                    return;
                }
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+this.expiretimeModal.name,[{
                    op: this.expiretimeModal.forever? 'remove' : 'replace',
                    path: '/metadata/annotations/w7.cc~1expiretime',
                    ...(this.expiretimeModal.forever? {} : {value: this.expiretimeModal.expiretime}),
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                    loading: true,
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.expiretimeModal.show = false;
                    this.getList();
                })
            })
        },
        submitCreateCluster(){
            this.$refs.createCluster.validate((err) => {
                if (err) { return; }
                
                this.createCluster.loading = true;
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+this.createCluster.name,[{
                    op: this.createCluster.forever? 'remove' : 'replace',
                    path: '/metadata/annotations/w7.cc~1expiretime',
                    ...(this.createCluster.forever? {} : {value: this.createCluster.expiretime}),
                },{
                    op: 'replace',
                    path: '/metadata/labels/w7.cc~1over-mode',
                    value: 'success',
                },{
                    op: 'replace',
                    path: '/metadata/labels/w7.cc~1base-order-pass',
                    value: 'true',
                },],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                    loading: true,
                }).then(res=>{
                    return panelApi.post('/k3k/init-cluster',{k3kUserName:this.createCluster.name})
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.createCluster.show = false;
                    this.createCluster.loading = false; 
                    this.getList();
                }).catch(()=>{
                    this.createCluster.loading = false;
                })
            })
        },
        csCreate(row){
            this.createCluster = {
                ...this.createCluster,
                show: true,
                expiretime: row.expiretime,
                name: row.name,
            }
        },
        editExpiretime(row){
            this.expiretimeModal = {
                ...this.expiretimeModal,
                show: true,
                expiretime: row.expiretime,
                name: row.name,
            }
        },
        openCost(row){
            if(row.clustermode!='global'&&row.clustermode!=''){
                this.costForm = {
                    ...this.costForm,
                    show: true,
                    name: row?.name,
                    package: row?.costName || "",
                    buymode: row?.cost?.buymode || "give",
                    cpu: row?.cost?.cpu || "",
                    memory: row?.cost?.memory || "",
                    storage: row?.cost?.storage || "",
                    bandwidth: row?.cost?.bandwidth || "",
                    packageConfig: row?.cost?.packageConfig || [],
                }
            }
        },
        submitCost(data){
            let editQuota = [];
            let find = this.list.find(i=>i.name==this.costForm.name)?.data;
            
            if(data.package && data.limit && find?.metadata?.annotations?.['w7.cc/quota-limit-lock']!=='true'){
                editQuota.push({
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1quota-limit',
                    value: data.limit,
                })
            }
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+this.costForm.name,[
                ...editQuota,
                {
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1cost-name',
                    value: data.package,
                },{
                    op: 'replace',
                    path: '/metadata/annotations/w7.cc~1cost',
                    value: JSON.stringify({
                        cpu: data.cpu,
                        memory: data.memory,
                        storage: data.storage,
                        bandwidth: data.bandwidth,
                        packageConfig: data?.packageConfig || [],
                    }),
                },
            ],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.costForm.show = false;
                this.getList();
            })
        },
        // openRegister(){
        //     k8sproxy.get('/api/v1/namespaces/kube-system/configmaps/k3k.config',{noAlert:true}).then(res=>{
        //         this.register = {
        //             show: true,
        //             allowConsoleRegister: res?.data?.data?.allowConsoleRegister === 'true',
        //             showInShop: res?.data?.data?.showInShop === 'true',
        //             defaultPolicyName: res?.data?.data?.defaultPolicyName,
        //         }
        //     }).catch((err)=>{
        //         if(err?.response?.status != 404){
        //             if(error?.response?.data?.message){
        //                 this.$message.error(error?.response?.data?.message);
        //             }
        //             return;
        //         }
                
        //         let o = {
        //             apiVersion: 'v1',
        //             kind: 'ConfigMap',
        //             metadata: {
        //                 name: 'k3k.config',
        //                 labels: {},
        //                 annotations: {},
        //             },
        //             data: {},
        //         }
        //         k8sproxy.post("/api/v1/namespaces/kube-system/configmaps", o,{loading:true}).then(res=>{
        //             this.register = {
        //                 show: true,
        //                 allowConsoleRegister: false,
        //                 showInShop: false,
        //                 defaultPolicyName: '',
        //             }
        //         });
        //     })
        // },
        // submitRegister(){
        //     k8sproxy.patch('/api/v1/namespaces/kube-system/configmaps/k3k.config',{
        //         data:{
        //             allowConsoleRegister: String(this.register.allowConsoleRegister),
        //             showInShop: String(this.register.showInShop),
        //             defaultPolicyName: this.register.defaultPolicyName,
        //         }
        //     },{
        //         headers: {'Content-Type': 'application/merge-patch+json'}
        //     }).then(res=>{
        //         this.$message.success('操作成功')
        //         this.register.show = false;
        //     })
        // },
        changePolicy(){
            if(!this.form.policy){return}
            if(this.form.policy=='normal'){
                this.form.clustermode = 'global';
                
                this.form.menu = '';
                this.form.menuname = '';
                this.form.whitelist = [];
                this.form.demouser = false;
            }
            let find = this.groupList.find(i=>i.name==this.form.policy);
            if(!find){return}
            this.form.clustermode = find.allowedMode;
            
            this.form.menu = find.menu
            this.form.menuname = find.menuname;
            this.form.whitelist = find.whitelist;
            this.form.demouser = find.demouser;
        },
        editQuota(row){
            if(row.clustermode!='global'&&row.clustermode!=''){
                this.quotaForm = {
                    show: true,
                    name: row.name,
                    data: row.quotaLimit,
                    clustermode: row.clustermode,
                }
            }
        },
        submitQuota(data){
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+data.name,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1quota-limit',
                value: data.limit,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1quota-limit-lock',
                value: String(data.isLock),
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.quotaForm.show = false;
                this.getList();
            })
        },
        openPmsForm(row){
            row = JSON.parse(JSON.stringify(row))
            this.pmsForm = {
                show: true,
                name: row.name,
                permissionPackage: row.permissionPackage || '',
                debug: row.debug,
                webshell: row.webshell,
                fileeditor: row.fileeditor,
                type: row.clustermode,
                list: row.permission,
                whitelist: row.whitelist || [],
                userMode: row.userMode,
            }
        },
        submitPermission(data){
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+data.name,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1menu',
                value: JSON.stringify(data.list),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1menu-name',
                value: data.permissionPackage,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1domain-white-list',
                value: data.whitelist,
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1debug',
                value: String(data.debug),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1web-shell',
                value: String(data.webshell),
            },{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1file-editor',
                value: String(data.fileeditor),
            },
            ...(data.role?[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1role',
                value: data.role,
            }]:[])
            ],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.pmsForm.show = false;
                this.getList();
            })
        },
        csWait(row){
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+row.name,[{
                op: 'replace',
                path: '/metadata/labels/k3k.io~1cluster-status',
                value: 'wait'
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        quickCsReady(row){
            k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+row.name,[{
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1pending-recycle-time',
                value: dayjs().format('YYYY-MM-DD hh:mm:ss')
            },{
                op: 'replace',
                path: '/metadata/labels/k3k.io~1cluster-status',
                value: 'recycle'
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
            // if(!row.is_expired){
            // }else{
            //     this.$message.error('用户已到期，请先修改到期时间');
            //     setTimeout(()=>{
            //         this.edit(row,true);
            //     },600)
            // }
        },
        csReady(row){
            if(!row.is_expired){
                k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+row.name,[{
                    op: 'replace',
                    path: '/metadata/labels/k3k.io~1cluster-status',
                    value: 'ready'
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.getList();
                })
            }else{
                this.$message.error('用户已到期，请先修改到期时间');
                setTimeout(()=>{
                    this.edit(row,true);
                },600)
            }
        },
        getUserGroup(){
            k8sproxy.get('/apis/k3k.io/v1alpha1/virtualclusterpolicies',{
                // params:{ limit:500, },
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let md = i.metadata;
                    let spec = i.spec;
                    
                    let whitelist = i.metadata?.annotations?.['w7.cc/domain-white-list'] || '[]';
                    whitelist = JSON.parse(whitelist);
                    return {
                        name: md.name,
                        title: md.annotations?.title || md.name,
                        allowedMode: spec.allowedMode,
                        limit: md.annotations?.['w7.cc/quota-limit'] || '{}',
                        menu: md.annotations?.['w7.cc/menu'] || '[]',
                        
                        menuname: md.annotations?.['w7.cc/menu-name'] || '',
                        debug: md.annotations?.['w7.cc/debug'] == 'true',
                        webshell: md.annotations?.['w7.cc/web-shell'] == 'true',
                        fileeditor: md.annotations?.['w7.cc/file-editor'] == 'true',
                        whitelist: whitelist,
                        costName: md.annotations?.['w7.cc/cost-name'] || '',
                        cost: md.annotations?.['w7.cc/cost'] || '',
                        demouser: md.labels?.['w7.cc/demo-user']=='true',
                        role: md.labels?.['w7.cc/role'] || '',
                    }
                })
                this.groupList = list;
                if(this.list?.length){
                    this.list.map((i,index)=>{
                        let name = i.policy || '';
                        let title = i.policyTitle;
                        if(name){
                            let find = this.groupList.find(i=>i.name == name);
                            title = find?.title || title;
                        }
                        i.policyTitle = title;
                    })
                }
            })
        },
        openWs(row){
            if(row?.status!=='complete'){return;}
            this.ws.row = row;
            this.ws.dialog = true;
            this.ws.container = 'w7panel-agent';
            this.ws.containers = [];
            this.ws.getLink = ()=>{
                if(this.inMicro){
                    let token = getToken();
                    this.webshelllink = window.microApp?.getData()?.originUrl || '';
                    this.webshelllink = this.webshelllink.replace(/\/$/,'') + `/fp/pod-webshell?type=${this.ws.type}&pod=w7panel-k3k-agent-${row.name}&namespace=${this.namespaceActive}&containerName=${this.ws.container}&api_token=${token}`;
                }else{
                    // this.webshelllink = `/fp/pod-webshell?pod=w7panel-k3k-agent-${row.name}&namespace=${this.namespaceActive}&containerName=${this.ws.container}&type=${this.ws.type}`;
                    this.webshelllink = `/fp/pod-webshell?pod=k3k-${row.name}-server-0&namespace=k3k-${row.name}&containerName=k3k-${row.name}-server&type=${this.ws.type}`;
                }
            }
            this.ws.getLink();
        },
        openYaml(name){
            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/' + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        getPermissionPackages(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=permission").then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let permission = i?.data?.menu || '[]';
                    permission = JSON.parse(permission);
                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                    }
                })
                this.permissionPackageList = list;
                if(this.list?.length){
                    this.list.map(i=>{
                        if(!i.permissionPackage){return}
                        i.permissionPackageTitle = this.permissionPackageList?.find(f=>f.name==i.permissionPackage)?.title;
                    })
                }
            })
        },

        getList(){
            let labelSelector = "w7.cc/user-mode";
            if(this.search.clusterStatus){ labelSelector = labelSelector + `,k3k.io/cluster-status=${this.search.clusterStatus}`; }
            // if(this.search.usergroup){ labelSelector = labelSelector + `,k3k.io/policy=${this.search.usergroup}`; }

            k8sproxy.get('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts',{
                params:{
                    // limit: 500,
                    labelSelector: labelSelector,
                },
                noAlert: true
            }).then(res=>{
                let list = res?.data?.items || [];
                list = list.map(i=>{
                    let storageSize = i.metadata.annotations?.['k3k.io/storage-request-size'] || '';
                    let storageSizeDw = 'Mi';
                    if(/Gi$/.test(storageSize)){
                        storageSize = Number(storageSize.replace('Gi',''));
                        storageSizeDw = 'Gi';
                    }else if(/Mi$/.test(storageSize)){
                        storageSize = Number(storageSize.replace('Mi',''));
                        storageSizeDw = 'Mi';
                    }
                    
                    let expiretime = new Date(i.metadata.annotations?.['w7.cc/expiretime']).getTime();
                    let is_expired = !(!i.metadata.annotations?.['w7.cc/expiretime'] || expiretime>Date.now());

                    let permissionPackage = i.metadata.annotations?.['w7.cc/menu-name'] || '';
                    let permissionPackageTitle = '';
                    if(permissionPackage && this.permissionPackageList.length){
                        permissionPackageTitle = this.permissionPackageList?.find(i=>i.name==permissionPackage)?.title;
                    }
                    
                    let clusterStatus = i.metadata?.labels?.['k3k.io/cluster-status'];
                    let clusterStatusTxt = {new:'无资源',ready:'有资源',wait:'待回收',recycle:'回收中',creating:'创建中'}[clusterStatus];


                    let whitelist = i.metadata?.annotations?.['w7.cc/domain-white-list'] || '[]';
                    whitelist = JSON.parse(whitelist);
                    
                    // 费用
                    let costName = i.metadata?.annotations?.['w7.cc/cost-name'] || '';
                    let costTitle = costName;
                    if(costName){
                        let find = this.costList.find(cl=>cl.name == costName);
                        costTitle = find?.title || costName;
                        if(find){
                            try{
                                i.metadata.annotations['w7.cc/cost'] = JSON.stringify(find?.data);
                            }catch{}
                        }
                    }else if(i.metadata?.annotations?.['w7.cc/cost']){
                        costTitle = '自定义'
                    }
                    let cost = i.metadata?.annotations?.['w7.cc/cost'];
                    cost = cost? JSON.parse(cost) : null;
                    if(cost?.buymode){
                        cost.buymodeTxt = {give:'赠送',buy:'购买'}[cost.buymode];
                    }

                    // 配额
                    let ql = JSON.parse(i.metadata?.annotations?.['w7.cc/quota-limit'] || '{}');
                    
                    if(i.metadata?.annotations?.['w7.cc/quota-limit-lock']!=='true' && i?.metadata.annotations?.['w7.cc/cost-name']){
                        let fc = this.costList.find(c=>c.name==i.metadata?.annotations?.['w7.cc/cost-name']);
                        if(fc){
                            let d = null;
                            try{
                                d = JSON.parse(fc.quota);
                            }catch{}
                            if(d){ ql = d; }
                        }
                    }

                    let hard = {
                        ...ql?.hard,
                        cpu: String(ql?.hard?.cpu).replace(/[a-zA-Z]+$/,''),
                        memory: String(ql?.hard?.memory).replace(/[a-zA-Z]+$/,''),
                        'requests.storage': String(ql?.hard?.['requests.storage']).replace(/[a-zA-Z]+$/,''),
                        bandwidth: String(ql?.hard?.bandwidth).replace(/[a-zA-Z]+$/,''),
                    };
                    
                    let createTime = dayjs(i.metadata['creationTimestamp']).valueOf();
                    
                    return {
                        name: i.metadata.name,
                        expiretime: i.metadata.annotations?.['w7.cc/expiretime'],
                        is_expired: is_expired,
                        storageclass: ql?.storageclass || '',
                        'w7.cc/pause': i.metadata.annotations?.['w7.cc/pause'],
                        status: i.metadata.annotations?.['w7.cc/k3k-job-status'],
                        jobname: i.metadata.annotations?.['w7.cc/k3k-job-name'],
                        clustermode: i.metadata.annotations?.['k3k.io/cluster-mode'] || '',
                        policy: i.metadata.annotations?.['k3k.io/policy'] || '',
                        policyTitle: i.metadata.annotations?.['k3k.io/policy-title'] || '',
                        debug: i.metadata.annotations?.['w7.cc/debug'] == 'true',
                        webshell: i.metadata.annotations?.['w7.cc/web-shell'] == 'true',
                        fileeditor: i.metadata.annotations?.['w7.cc/file-editor'] == 'true',
                        demouser: i.metadata.labels?.['w7.cc/demo-user'] == 'true',
                        weihu: i.metadata.labels?.['w7.cc/weihu'] == 'true',
                        createTime: createTime,

                        userMode: i.metadata.labels?.['w7.cc/user-mode'],

                        recycleTime: i.metadata?.annotations?.['w7.cc/pending-recycle-time'] || '',

                        clusterStatus: clusterStatus,
                        clusterStatusTxt: clusterStatusTxt,
                        version: Number(i.metadata.annotations?.['w7.cc/version']) || 0,
                        permissionPackage: permissionPackage,
                        permissionPackageTitle: permissionPackageTitle,
                        permission: JSON.parse(i.metadata.annotations?.['w7.cc/menu'] || '[]'),
                        
                        peie: ql?.hard? (hard.cpu+'核'+'/'+hard.memory+'Gi/'+hard.bandwidth+'Mbps/'+hard['requests.storage'])+'Gi' : '',
                        quotaLimit: ql,

                        cost: cost,
                        costTitle: costTitle,
                        costName: costName,

                        storageSize: storageSize,
                        storageSizeDw: storageSizeDw,
                        password: i.metadata.annotations?.password,
                        whitelist: whitelist,
                        
                        data: i,
                    }
                })
                if(this.search.expiretime){
                    list = list.filter(i=>i.is_expired==(this.search.expiretime=='expired'))
                }
                if(this.search.usergroup){
                    list = list.filter(i=>i.policy==this.search.usergroup)
                }
                if(this.search.username){
                    list = list.filter(i=>new RegExp(this.search.username).test(i.name));
                }
                list.sort((a, b) => b.createTime - a.createTime);
                this.list = list;
                if(this.groupList?.length){
                    this.list.map((i,index)=>{
                        let name = i.policy || '';
                        let title = i.policyTitle;
                        if(name){
                            let find = this.groupList.find(i=>i.name == name);
                            title = find?.title || title;
                        }
                        i.policyTitle = title;
                    })
                }
                if(this.statusList?.length){
                    this.statusList.map(data=>{
                        let findIndex = this.list.findIndex(li=>li.name == data.metadata.name);
                        if(findIndex==-1){return}
                        let find = this.list[findIndex];
                        if(find.userMode!='cluster'){return}
                        if(find.clusterStatus=='new'){return}
                        
                        if(find?.['w7.cc/pause']=='true'){
                            this.list[findIndex].sourceStatus = -1;
                            this.list[findIndex].sourceStatusTxt = '已停机';
                            return;
                        }

                        let status = data?.status?.conditions?.[0]?.status;
                        let phase = data?.status?.phase;
                        
                        let txt = '';
                        let type = '';
                        if(phase == 'Ready' && status == 'True'){
                            txt = '运行中';
                            type = 1;
                        }else if(phase == 'Terminating' && status == 'False'){
                            txt = '回收中';
                            type = 2;
                        }else if((phase == 'Pending' && status == 'False') || (phase == 'Provisioning' && status == 'False')){
                            txt = '配置中';
                            type = 3;
                        }else if(phase == 'Failed' && status == 'False'){
                            txt = '故障中';
                            type = 5;
                        }
                        
                        this.list[findIndex].sourceStatus = type;
                        this.list[findIndex].sourceStatusTxt = txt;
                    })
                }
            })
        },
        getErrorReason(row,index){
            // if(row.sourceStatus!=5){return}
            
            this.list[index].podStatus = {
                loading: true
            }
            k8sproxy.get(`/k8s-proxy/api/v1/namespaces/k3k-${row.name}/pods/k3k-${row.name}-server-0`,{noAlert:true}).then(res=>{
                let data = res?.data?.status?.containerStatuses?.[0]
                data = {
                    name: data?.name || '',
                    state: data?.state || {},
                    lastState: data?.lastState || {},
                    ready: data?.ready,
                    restartCount: data?.restartCount,
                }
                this.list[index].podStatus = {
                    loading: false,
                    data: JSON.stringify(data,false,4),
                }
            }).catch(()=>{
                this.list[index].podStatus = {
                    loading: false,
                    data: '{}',
                }
            })
        },
        async getStatus(){
            
            k8sproxy.get(`/k8s-proxy/apis/k3k.io/v1alpha1/clusters`,{noAlert:true}).then(res=>{
                let items = res?.data?.items || [];
                this.statusList = items;
                items.map(data=>{
                    let findIndex = this.list.findIndex(li=>li.name == data.metadata.name);
                    if(findIndex==-1){return}
                    let find = this.list[findIndex];
                    if(find.userMode!='cluster'){return}
                    if(find.clusterStatus=='new'){return}

                    if(find?.['w7.cc/pause']=='true'){
                        this.list[findIndex].sourceStatus = -1;
                        this.list[findIndex].sourceStatusTxt = '已停机';
                        return;
                    }

                    let status = data?.status?.conditions?.[0]?.status;
                    let phase = data?.status?.phase;
                    
                    let txt = '';
                    let type = '';
                    if(phase == 'Ready' && status == 'True'){
                        txt = '运行中';
                        type = 1;
                    }else if(phase == 'Terminating' && status == 'False'){
                        txt = '回收中';
                        type = 2;
                    }else if((phase == 'Pending' && status == 'False') || (phase == 'Provisioning' && status == 'False')){
                        txt = '配置中';
                        type = 3;
                    }else if(phase == 'Failed' && status == 'False'){
                        txt = '故障中';
                        type = 5;
                    }
                    
                    this.list[findIndex].sourceStatus = type;
                    this.list[findIndex].sourceStatusTxt = txt;
                })

            }).catch(()=>({}));
        },
        getCostList(){
            return k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=cost",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    return {
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        data: i.data,
                        ...i.data,
                    }
                });
                this.costList = list;
                
                // if(this.list?.length){
                //     this.list.map((i,index)=>{
                //         let costName = i.costName || '';
                //         let costTitle = i.costName;
                //         if(costName){
                //             let find = this.costList.find(cl=>cl.name == costName);
                //             costTitle = find?.title || costName;
                            
                //             if(find){
                //                 try{
                                    
                //                     let cost = find.data;
                //                     if(cost?.buymode){
                //                         cost.buymodeTxt = {give:'赠送',buy:'购买'}[cost.buymode];
                //                     }
                                    
                //                     this.list[index].cost = cost;
                //                 }catch{}
                //             }
                //         }else if(i.cost){
                //             costTitle = '自定义'
                //         }
                //         i.costTitle = costTitle;
                //     })
                // }
            })
        },
        // getStorageList(){
        //     k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
        //         let data = res?.data || [];
        //         let list = data.items || [];
        //         list = list.map(item=>{
        //             return item.metadata.name;
        //         })
        //         this.storageLs = list;
        //     });
        // },
        add(){
            this.rules.password[0].required = true;
            this.form = {
                ...this.form,
                isEdit: false,
                show: true,
                forever: false,
                username: '',
                password: '',
                expiretime: '',
                storageclass: '',
                storageSize: '',
                storageSizeDw: 'Gi',
                policy: 'normal',
                clustermode: 'global',
                // debug: false,
                version: 0,
                demouser: false,
                weihu: false,
            };
        },
        edit(row,recycle){
            this.rules.password[0].required = false;
            this.form = {
                ...this.form,
                isEdit: true,
                show: true,
                forever: !row.expiretime,
                username: row.name,
                password: '',
                storageSize: row.storageSize,
                storageSizeDw: row.storageSizeDw,
                old_password: row.password,
                storageclass: row.storageclass || '',
                expiretime: row.expiretime || '',
                policy: row.policy,
                clustermode: row.clustermode || '',
                // debug: row.debug,
                version: row.version || 0,
                clusterStatus: row.clusterStatus,
                waitToReady: recycle || false,
                waitToReadyDisabled: recycle,
                demouser: row.demouser,
                weihu: row.weihu,
            }
            // console.log(this.form)
        },
        submit(){
            let findPolicy = this.groupList.find(i=>i.name==this.form.policy)
            
            if(findPolicy){
                this.form.clustermode = findPolicy.allowedMode;
                
                this.form.menu = findPolicy.menu
                this.form.menuname = findPolicy.menuname;
                this.form.debug = findPolicy.debug;
                this.form.fileeditor = findPolicy.fileeditor;
                this.form.webshell = findPolicy.webshell;
                this.form.whitelist = findPolicy.whitelist;
            }else{
                
                this.form.menu = '';
                this.form.menuname = '';
                this.form.debug = false;
                this.form.fileeditor = false;
                this.form.webshell = false;
                this.form.whitelist = '';
            }
            
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }

                if(this.form.isEdit){
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(this.form.password, salt);
                    let data = this.list.find(i=>i.name==this.form.username).data;
                    if(!data){ this.$message.error('操作失败'); return; }
                    delete data.metadata.resourceVersion;
                    delete data.metadata.creationTimestamp;
                    delete data.metadata.uid;
                    data.metadata.annotations.password = this.form.password? hash : this.form.old_password;
                    
                    data.metadata.annotations['k3k.io/storageclass'] = this.form.storageclass;
                    data.metadata.annotations['k3k.io/cluster-mode'] = this.form.clustermode;
                    data.metadata.annotations['k3k.io/policy'] = this.form.policy;
                    data.metadata.annotations['k3k.io/policy-title'] = findPolicy?.title || '';
                    data.metadata.labels['k3k.io/policy'] = this.form.policy;
                    data.metadata.labels['w7.cc/weihu'] = this.form.weihu? 'true' : 'false';
                    data.metadata.labels['w7.cc/demo-user'] = String(this.form.demouser);
                    data.metadata.labels['w7.cc/role'] = findPolicy?.role || '';
                    
                    data.metadata.annotations['k3k.io/storage-request-size'] = this.form.storageSize!==''? (this.form.storageSize + this.form.storageSizeDw) : '';
                    data.metadata.annotations['w7.cc/debug'] = String(this.form.debug);
                    data.metadata.annotations['w7.cc/web-shell'] = String(this.form.webshell);
                    data.metadata.annotations['w7.cc/file-editor'] = String(this.form.fileeditor);
                    data.metadata.annotations['w7.cc/version'] = String(this.form.version + 1);
                    data.metadata.annotations['w7.cc/cost'] = findPolicy?.cost || '';
                    data.metadata.annotations['w7.cc/cost-name'] = findPolicy?.costName || '';
                    
                    if(findPolicy?.costName && data.metadata.annotations['w7.cc/quota-limit-lock']!=='true'){
                        let cost = this.costList.find(i=>i.name==findPolicy?.costName);
                        data.metadata.annotations['w7.cc/quota-limit'] = cost?.quota || '';
                    }
                    data.metadata.annotations['w7.cc/menu'] = this.form.menu || '',
                    
                    data.metadata.annotations['w7.cc/menu-name'] = this.form.menuname || '';
                    data.metadata.annotations['w7.cc/domain-white-list'] = JSON.stringify(this.form.whitelist||[]);

                    if(this.form.policy=='normal'){
                        data.metadata.labels['w7.cc/user-mode'] = 'normal';
                    }

                    if(this.form.waitToReady){
                        data.metadata.labels['k3k.io/cluster-status'] = 'ready';
                    }
                    if(!this.form.forever){
                        data.metadata.annotations['w7.cc/expiretime'] = this.form.expiretime;
                    }else{
                        delete data.metadata.annotations['w7.cc/expiretime'];
                    }

                    k8sproxy.put('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+this.form.username,data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    })
                    // k8sproxy.patch('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+this.form.username,[{
                    //     op: 'replace',
                    //     path: '/metadata/annotations/password',
                    //     value: hash,
                    // },{
                    //     op: 'replace',
                    //     path: '/metadata/annotations/k3k.io/storageclass',
                    //     value: this.form.storageclass,
                    // },{
                    //     op: 'replace',
                    //     path: '/metadata/annotations/k3k.io/cluster-mode',
                    //     value: this.form.clustermode,
                    // },{
                    //     op: 'replace',
                    //     path: '/metadata/annotations/k3k.io/policy',
                    //     value: this.form.policy,
                    // },{
                    //     op: 'replace',
                    //     path: '/metadata/annotations/k3k.io/policy-title',
                    //     value: findPolicy?.title || '',
                    // },{
                    //     op: this.form.forever? 'remove' : 'replace',
                    //     path: '/metadata/annotations/w7.cc/expiretime',
                    //     ...(this.form.forever? {} : {value: this.form.expiretime}),
                    // }],{
                    //     headers: {'Content-Type': 'application/json-patch+json'},
                    // }).then(res=>{
                    //     this.$message.success('操作成功');
                    //     this.form.show = false;
                    //     this.getList();
                    // })
                }else{
                    let data = JSON.parse(JSON.stringify(dataTemplate));
                    data.metadata.name = this.form.username;
    
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(this.form.password, salt);
                    data.metadata.annotations.password = hash;
                    data.metadata.annotations['k3k.io/storageclass'] = this.form.storageclass;
                    data.metadata.annotations['k3k.io/cluster-mode'] = this.form.clustermode;
                    data.metadata.annotations['k3k.io/policy'] = this.form.policy;
                    data.metadata.annotations['k3k.io/policy-title'] = findPolicy?.title || '';
                    data.metadata.labels['k3k.io/policy'] = this.form.policy;
                    data.metadata.labels['w7.cc/weihu'] = this.form.weihu? 'true' : 'false';
                    data.metadata.labels['w7.cc/demo-user'] = String(this.form.demouser);
                    data.metadata.labels['w7.cc/role'] = findPolicy?.role || '';

                    data.metadata.annotations['k3k.io/storage-request-size'] =  this.form.storageSize!==""? (this.form.storageSize + this.form.storageSizeDw) : '';
                    data.metadata.annotations['w7.cc/debug'] = String(this.form.debug);
                    data.metadata.annotations['w7.cc/web-shell'] = String(this.form.webshell);
                    data.metadata.annotations['w7.cc/file-editor'] = String(this.form.fileeditor);
                    data.metadata.annotations['w7.cc/version'] = '1';
                    data.metadata.annotations['w7.cc/cost'] = findPolicy?.cost || '';
                    data.metadata.annotations['w7.cc/cost-name'] = findPolicy?.costName || '';
                    
                    let cost = this.costList.find(i=>i.name==findPolicy?.costName);
                    data.metadata.annotations['w7.cc/quota-limit'] = cost?.quota || '';

                    data.metadata.annotations['w7.cc/menu'] = this.form.menu || '',
                    data.metadata.annotations['w7.cc/quota-limit-name'] = this.form.limitname || '';
                    data.metadata.annotations['w7.cc/menu-name'] = this.form.menuname || '';
                    data.metadata.annotations['w7.cc/domain-white-list'] = JSON.stringify(this.form.whitelist||[]);
                    
                    if(this.form.policy=='normal'){
                        data.metadata.labels['w7.cc/user-mode'] = 'normal';
                    }

                    data.metadata.namespace = this.namespaceActive;
                    if(!this.form.forever){
                        data.metadata.annotations['w7.cc/expiretime'] = this.form.expiretime;
                    }
                    k8sproxy.post('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts',data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    });
                }
            });
        },
        del(row){
            k8sproxy.delete('/api/v1/namespaces/'+ this.namespaceActive +'/serviceaccounts/'+row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
    },
}
</script>

<style scoped>
.mr-4{margin-right:4px;}
.mr-5{margin-right:5px;}
</style>
<style>
.cptable .hovershow{display:inline-block; margin-left:3px; opacity:0;}
.cptable tr:hover .hovershow{display:inline-block; opacity: 1;}
.user-cptable.cptable .opt-icon{padding:1px; min-width:18px; height:18px;}
.user-cptable.cptable .lh-20{line-height:20px;}
</style>