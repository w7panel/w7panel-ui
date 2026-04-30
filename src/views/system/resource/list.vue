<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white df jc-b">
            <a-form layout="inline" class="padding-20" style="padding-bottom:12px;">
                <a-form-item label="用户名">
                    <a-input v-model="search.name" placeholder="请输入名称" style="min-width:150px;" />
                </a-form-item>
                <a-form-item label="过期状态">
                    <a-select v-model="search.expireStatus" placeholder="请选择" style="min-width:150px;">
                        <a-option label="全部" value=""></a-option>
                        <a-option label="未过期" value="notexpired"></a-option>
                        <a-option label="已过期" value="expired"></a-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="资源回收阶段">
                    <a-select v-model="search.phase" placeholder="请选择" style="min-width:150px;">
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
            <div class="padding-20">
                <a-button v-if="userMode=='founder'" type="primary" @click="openCreate">新建</a-button>
                <a-button v-else type="primary" @click="$router.push('/order-base/index?isNew=true&isCvm=true')">购买</a-button>
            </div>
        </div>
        <div class="bg-white padding-20 mt-20 fc">
            <a-table class="cptable" :data="filterlist" :pagination="false" :bordered="false" :loading="loading" @page-change="pageChange" @page-size-change="pageSizeChange">
                <template #columns>
                    <a-table-column title="名称" data-index="name" />
                    <a-table-column title="资源">
                        <template #cell="{ record }">
                            <div class="df df-c">
                                <div>
                                    <span :class="{'ready':'c-blue','new':'c-99','wait':'c-red','recycle':'c-99','creating':'c-orange'}[record.phase]">[{{record.phaseTxt}}]</span>
                                    <span class="ml-6" :class="{'Terminating':'c-red','Ready':'c-green','Pending':'c-orange','Provisioning':'c-orange','Failed':'c-red','Unknown':'c-99'}[record.clusterPhase]">{{record.clusterPhaseTxt}}</span>
                                    <span class="ml-6 cursor" @click="toUserResource(record)" :class="(record.phase=='new'||record.phase=='recycle'||record.clusterPhase=='Failed')?'c-99':'c-blue'">
                                        <span>{{record.effectiveResource.cpu}}核/</span>
                                        <span>{{record.effectiveResource.memory}}Gi/</span>
                                        <span>{{record.effectiveResource.bandwidth}}Mbps/</span>
                                        <span>{{record.effectiveResource.storage}}Gi</span>
                                    </span>
                                    <a-tooltip v-if="userMode=='founder'" content="设置">
                                        <i @click="editQuota(record)" class="ml-10 opt-icon hovershow"><icon-edit /></i>
                                    </a-tooltip>
                                </div>
                                <div class="fs-12 c-99 df ai-c">
                                    <span class="lh-20">{{record.expireTime? (record.expireTime+' 到期') : '永久'}}</span>
                                    <a-tooltip v-if="userMode=='founder'" content="修改到期时间">
                                        <i class="opt-icon hovershow" @click="editExpiretime(record)"><icon-edit /></i>
                                    </a-tooltip>
                                </div>
                            </div>
                        </template>
                    </a-table-column>
                    <a-table-column title="未生效资源">
                        <template #cell="{ record }">
                            <span v-if="record.capacityCheckState=='success'||!record.pendingPurchasedResource">-</span>
                            <span v-else >
                                <span>{{record.pendingPurchasedResource.cpu}}核/</span>
                                <span>{{record.pendingPurchasedResource.memory}}Gi/</span>
                                <span>{{record.pendingPurchasedResource.bandwidth}}Mbps/</span>
                                <span>{{record.pendingPurchasedResource.storage}}Gi</span>
                                <a-tooltip v-if="record.capacityCheckState!='success'" content="资源检查">
                                    <i @click="requestResource(record)" class="opt-icon ml-10 hovershow"><icon-refresh /></i>
                                </a-tooltip>
                            </span>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="300" fixed="right">
                        <template #cell="{ record }">
                            <!-- <icon-code /> -->
                            <a-tooltip v-if="debug" content="YAML">
                                <span class="c-blue cursor" @click="openYaml(record)">YAML</span>
                            </a-tooltip>
                            <span class="c-blue cursor ml-10" @click="loginPanel(record)">登录面板</span>
                            <span v-if="record.canExpandBuy" class="c-blue cursor ml-10" @click="$router.push('/order-base/index?expand=true&cvmName='+record.name+'&cvmNamespace='+record.namespace+'&expireTime='+record.expireTime)">扩容</span>
                            <span v-if="record.canRenewBuy" class="c-blue cursor ml-10" @click="$router.push('/order-base/index?renew=true&cvmName='+record.name+'&cvmNamespace='+record.namespace)">续费</span>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
        
        <a-modal title="到期时间" :visible="expiretimeModal.show" width="600px" @ok="submitExpiretime" @cancel="expiretimeModal.show=false;">
            <a-form ref="expiretimeModal" :rules="expiretimeModalRules" :model="expiretimeModal" auto-label-width>
                <a-form-item label="到期时间" field="expireTime">
                    <a-date-picker v-if="!expiretimeModal.forever" v-model="expiretimeModal.expireTime" style="width:300px;" showTime class="mr-20" />
                    <a-checkbox v-model="expiretimeModal.forever">永久</a-checkbox>
                </a-form-item>
            </a-form>
        </a-modal>

        
        <a-drawer :width="800" :visible="quotaForm.show" @cancel="quotaForm.show=false;" @ok="submitQuota">
            <template #title>资源设置</template>
            <div>
                <quota-config
                    v-if="quotaForm.show"
                    ref="quotaconfig"
                    :no-min="true"
                    v-model="quotaForm.data"
                ></quota-config>
                
                <table class="com-table mt-20">
                    <tbody>
                        <tr>
                            <td style="width:90px;"></td>
                            <td>CPU</td>
                            <td>内存</td>
                            <td>带宽</td>
                            <td>存储</td>
                        </tr>
                        <tr v-if="quotaForm.purchasedResource">
                            <td>已购</td>
                            <td>{{quotaForm.purchasedResource.cpu || 0}}核</td>
                            <td>{{quotaForm.purchasedResource.memory || 0}}Gi</td>
                            <td>{{quotaForm.purchasedResource.bandwidth || 0}}Mbps</td>
                            <td>{{quotaForm.purchasedResource.storage || 0}}Gi</td>
                        </tr>
                        <tr v-if="quotaForm.data">
                            <td>手动</td>
                            <td>{{quotaForm.data.cpu || 0}}核</td>
                            <td>{{quotaForm.data.memory || 0}}Gi</td>
                            <td>{{quotaForm.data.bandwidth || 0}}Mbps</td>
                            <td>{{quotaForm.data.storage || 0}}Gi</td>
                        </tr>
                        <tr v-if="quotaForm.data&&quotaForm.purchasedResource">
                            <td>合计</td>
                            <td>{{quotaForm.data.cpu+quotaForm.purchasedResource.cpu}}核</td>
                            <td>{{quotaForm.data.memory+quotaForm.purchasedResource.memory}}Gi</td>
                            <td>{{quotaForm.data.bandwidth+quotaForm.purchasedResource.bandwidth}}Mbps</td>
                            <td>{{quotaForm.data.storage+quotaForm.purchasedResource.storage}}Gi</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </a-drawer>

        <a-drawer :width="800" :visible="createForm.show" @cancel="createForm.show=false;" @ok="submitCreate">
            <template #title>新建资源</template>
            <div>
                <a-form ref="createFormRef" :model="createForm" :rules="createFormRules" auto-label-width>
                    <a-form-item label="命名空间" field="namespace">
                        <a-select v-model="createForm.namespace" placeholder="请选择命名空间">
                            <a-option v-for="item in namespaceList" :key="item" :value="item">{{item}}</a-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="资源配置">
                        <quota-config
                            v-if="createForm.show"
                            ref="createQuotaConfig"
                            :no-min="true"
                            v-model="createForm.data"
                        ></quota-config>
                    </a-form-item>
                </a-form>
            </div>
        </a-drawer>
    </div>
</template>

<script>
import { k8sproxy, panelApi } from '@/utils/api';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getK8sinfo, getUserInfo, setPermission, setRefreshToken, setToken } from '@/utils/auth';
import { useNamespaceStore } from '@/store';
import quotaConfig from '@/components/quota-config.vue';
import useK3kinfo from '@/hooks/k3k-info';

export default {
    data() {
        return {
            namespaceActive: 'default',
            list: [],
            filterlist: [],
            loading: false,
            // pagination: {
            //     current: 1,
            //     pageSize: 20,
            //     total: 0,
            //     showTotal: true,
            //     showPageSize: true,
            // },
            debug: false,
            yamlData: {
                show: false,
                title: '',
                data: {},
                submit: ()=>{},
            },

            search: {
                name: '',
                expireStatus: '',
                phase: '',
            },

            namespaceList: [],

            userMode: '',

            // 修改到期时间
            expiretimeModal:{ show: false },
            expiretimeModalRules: {
                expireTime: [{required:true, validator: (value, cb) => {
                    if(!value&&!this.expiretimeModal.forever){cb('请选择到期时间'); return}
                    cb();
                }}],
            },

            quotaForm: { show: false },
            createForm: { show: false, namespace: '', data: {} },
            createFormRules: {
                namespace: [{ required: true, message: '请选择命名空间' }],
            },
        };
    },
    created() {
        this.userMode = getK8sinfo()['w7.cc/user-mode'];
        this.namespaceActive = useNamespaceStore().namespace;
        this.namespaceList = useNamespaceStore()?.getNamespaceList || [];
        this.namespaceList = this.namespaceList.filter(i=>/^k3k-/.test(i));
        this.debug = getUserInfo()?.['w7.cc/debug'] == 'true';
        this.getList();
    },
    components: {
        yamlDrawer,
        quotaConfig,
    },
    methods: {
        getList() {
            this.loading = true;
            panelApi.get('/k3k/cvm', {
                // params: {
                //     page: this.pagination.current,
                //     pageSize: this.pagination.pageSize,
                // },
            }).then(res => {
                let list = res?.data?.items || [];
                this.list = list.map(i=>{
                    let pendingPurchasedResource = {
                        cpu: i.spec?.pendingPurchasedResource?.cpu || 0,
                        memory: i.spec?.pendingPurchasedResource?.memory || 0,
                        storage: i.spec?.pendingPurchasedResource?.storage || 0,
                        bandwidth: i.spec?.pendingPurchasedResource?.bandwidth || 0,
                    }
                    if(Object.values(pendingPurchasedResource).every(i=>i==0)){
                        pendingPurchasedResource = null;
                    }
                    
                    return {
                        name: i.metadata.name,
                        namespace: i.metadata.namespace,

                        phase: i?.status?.phase,
                        phaseTxt: {
                            'new':'无资源',
                            'ready':'有资源',
                            'recycle':'待回收',
                            'recycleing':'回收中',
                            'creating':'创建中',
                        }[i?.status?.phase],

                        clusterPhase: i.status?.clusterPhase,
                        clusterPhaseTxt: {
                            'Ready':'运行中',
                            'Pending':'创建中',
                            'Provisioning':'配置中',
                            'Failed':'故障',
                            'Terminating':'回收中',
                            'Unknown': '未知',
                        }[i?.status?.clusterPhase],

                        effectiveResource: {
                            cpu: i.status?.effectiveResource?.cpu || 0,
                            memory: i.status?.effectiveResource?.memory || 0,
                            storage: i.status?.effectiveResource?.storage || 0,
                            bandwidth: i.status?.effectiveResource?.bandwidth || 0,
                        },
                        purchasedResource: {
                            cpu: i.spec?.purchasedResource?.cpu || 0,
                            memory: i.spec?.purchasedResource?.memory || 0,
                            storage: i.spec?.purchasedResource?.storage || 0,
                            bandwidth: i.spec?.purchasedResource?.bandwidth || 0,
                        },
                        userResource: {
                            cpu: i.spec?.userResource?.cpu || 0,
                            memory: i.spec?.userResource?.memory || 0,
                            storage: i.spec?.userResource?.storage || 0,
                            bandwidth: i.spec?.userResource?.bandwidth || 0,
                        },

                        canExpandBuy: i.status?.canExpandBuy,
                        canRenewBuy: i.status?.canRenewBuy,
                        expireTime: i.spec?.expireTime,
                        recycleTime: i.spec?.recycleTime,
                        storageClassName: i.spec?.storageClassName,
                        isExpired: i.status?.isExpired,

                        // 未生效资源
                        capacityCheckState: i.spec?.capacityCheckState,
                        pendingPurchasedResource: pendingPurchasedResource,
                        
                    }
                })
                this.filterlist = this.list.filter(i=>{

                    if(this.search.name && i.namespace.indexOf(this.search.name) == -1){ return false; }
                    if(this.search.expireStatus){
                        if(this.search.expireStatus == 'expired' && !i.isExpired){ return false; }
                        if(this.search.expireStatus == 'notexpired' && i.isExpired){ return false; }
                    }
                    if(this.search.phase && (i.phase != this.search.phase)){ return false; }
                    return true;
                })

                // this.pagination.total = res?.data?.total || this.list.length;
            }).finally(() => {
                this.loading = false;
            });
        },
        pageChange(page) {
            this.pagination.current = page;
            this.getList();
        },
        pageSizeChange(pageSize) {
            this.pagination.pageSize = pageSize;
            this.pagination.current = 1;
            this.getList();
        },
        openYaml(record) {
            
            panelApi.get(`/k3k/cvm/v1/${record.namespace}/info/${record.name}`, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return panelApi.put(`/k3k/cvm/v1/${record.namespace}/info/${data?.metadata?.name}`, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                        })
                    }
                }
            })
        },
        async loginPanel(row){
            await panelApi.post(`/k3k/cvm/${row.namespace}/action/${row.name}/login`).then(res=>{
                setRefreshToken(res?.data?.refreshToken)
                setToken(res?.data?.token);
            })
            setPermission([]);
            await useK3kinfo();
            this.$router.push('/');
        },
        // 跳转到用户资源页面
        toUserResource(row){
            this.$router.push({
                path: '/usermanage/user-resource',
                query: {
                    username: row.name,
                    namespace: row.namespace,
                    status: row.phase,
                    time: row.recycleTime,
                }
            });
        },
        // 请求资源
        requestResource(row){
            panelApi.post(`/k3k/cvm/${row.namespace}/action/${row.name}/check-resource`).then(res=>{
                this.$message.success("操作成功");
                this.getList();
            })
        },

        openCreate(){
            this.createForm = {
                show: true,
                namespace: '',
                data: {
                    cpu: 0,
                    memory: 0,
                    storage: 0,
                    bandwidth: 0,
                    storageclass: '',
                },
            }
        },
        submitCreate(){
            this.$refs.createFormRef.validate((err) => {
                if (err) {
                    this.$refs.createFormRef.scrollToField(Object.keys(err)[0])
                    return;
                }
                let data = this.createForm.data;
                let body = {
                    apiVersion: 'cvm.w7.cc/v1alpha1',
                    kind: 'Cvm',
                    metadata: {
                        name: this.createForm.namespace.replace(/^k3k-/, '') + '-' + Math.random().toString(36).slice(2,7),
                        namespace: this.createForm.namespace,
                    },
                    spec: {
                        userResource: {
                            cpu: data.cpu,
                            memory: data.memory,
                            storage: data.storage,
                            bandwidth: data.bandwidth,
                        },
                        storageClassName: data.storageclass,
                    },
                };
                k8sproxy.post(`/apis/cvm.w7.cc/v1alpha1/namespaces/${this.createForm.namespace}/cvms`, body, {
                    loading: true,
                }).then(()=>{
                    this.$message.success('创建成功');
                    this.createForm.show = false;
                    this.getList();
                });
            });
        },
        
        editQuota(row){
            this.quotaForm = {
                show: true,
                name: row.name,
                namespace: row.namespace,
                purchasedResource: row?.purchasedResource || {},
                data: {
                    ...row.userResource,
                    storageclass: row.storageClassName,
                },
            }
            console.log(row.userResource)
        },
        submitQuota(){
            k8sproxy.patch(`/apis/cvm.w7.cc/v1alpha1/namespaces/${this.quotaForm.namespace}/cvms/${this.quotaForm.name}`,[
                {
                    op: 'replace',
                    path: '/spec/userResource',
                    value: {
                        cpu: this.quotaForm.data.cpu,
                        memory: this.quotaForm.data.memory,
                        storage: this.quotaForm.data.storage,
                        bandwidth: this.quotaForm.data.bandwidth,
                    },
                },{
                    op: 'replace',
                    path: '/spec/storageClassName',
                    value: this.quotaForm.data.storageclass,
                }
            ],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success("修改成功");
                this.quotaForm = {...this.quotaForm, show:false,};
            })
        },

        editExpiretime(row){
            this.expiretimeModal = {
                ...this.expiretimeModal,
                show: true,
                expireTime: row.expireTime,
                name: row.name,
                namespace: row.namespace,
            }
        },
        
        submitExpiretime(){
            this.$refs.expiretimeModal.validate((err) => {
                if (err) {
                    return;
                }
                
                let recycleTime = this.expiretimeModal.forever? [] : [{
                    op: 'replace',
                    path: '/spec/recycleTime',
                    value: '',
                }];
                
                k8sproxy.patch(`/apis/cvm.w7.cc/v1alpha1/namespaces/${this.expiretimeModal.namespace}/cvms/${this.expiretimeModal.name}`,[
                    ...recycleTime,
                    {
                        op: this.expiretimeModal.forever? 'remove' : 'replace',
                        path: '/spec/expireTime',
                        ...(this.expiretimeModal.forever? {} : {value: this.expiretimeModal.expireTime}),
                    }
                ],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                    loading: true,
                }).then(res=>{
                    this.$message.success('操作成功');
                    this.expiretimeModal.show = false;
                    this.getList();
                })
            })
        },
    },
};
</script>
<style>

.cptable .hovershow{display:inline-block; margin-left:3px; opacity:0;}
.cptable tr:hover .hovershow{display:inline-block; opacity: 1;}
</style>
