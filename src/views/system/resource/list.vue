<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div class="bg-white df jc-b">
            <a-form layout="inline" class="padding-20" style="padding-bottom:12px;">
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
                <a-button type="primary" @click="$router.push('/order-base/index?isNew=true&isCvm=true')">购买</a-button>
            </div>
        </div>
        <div class="bg-white padding-20 mt-20 fc">
            <a-table class="cptable" :data="filterlist" :pagination="false" :bordered="false" :loading="loading" @page-change="pageChange" @page-size-change="pageSizeChange">
                <template #columns>
                    <a-table-column title="名称" data-index="name" />
                    <a-table-column title="资源">
                        <template #cell="{ record }">
                            <span :class="{'ready':'c-blue','new':'c-99','wait':'c-red','recycle':'c-99','creating':'c-orange'}[record.phase]">[{{record.phaseTxt}}]</span>
                            <span class="ml-6" :class="{'Terminating':'c-red','Ready':'c-green','Pending':'c-orange','Provisioning':'c-orange','Failed':'c-red','Unknown':'c-99'}[record.clusterPhase]">{{record.clusterPhaseTxt}}</span>
                            <span class="ml-6" :class="(record.phase=='new'||record.phase=='recycle'||record.clusterPhase=='Failed')?'c-99':'c-blue'">
                                <span>{{record.effectiveResource.cpu}}核/</span>
                                <span>{{record.effectiveResource.memory}}Gi/</span>
                                <span>{{record.effectiveResource.bandwidth}}Mbps/</span>
                                <span>{{record.effectiveResource.storage}}Gi</span>
                            </span>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="200" fixed="right">
                        <template #cell="{ record }">
                            <!-- <icon-code /> -->
                            <a-tooltip v-if="debug" content="YAML">
                                <span class="c-blue cursor" @click="openYaml(record)">YAML</span>
                            </a-tooltip>
                            <span v-if="record.canExpandBuy" class="c-blue cursor ml-10" @click="$router.push('/order-base/index?expand=true&cvmName='+record.name+'&cvmNamespace='+record.namespace+'&expireTime='+record.expireTime)">扩容</span>
                            <span v-if="record.canRenewBuy" class="c-blue cursor ml-10" @click="$router.push('/order-base/index?renew=true&cvmName='+record.name+'&cvmNamespace='+record.namespace)">续费</span>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>
        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import { useNamespaceStore } from '@/store';

export default {
    data() {
        return {
            namespaceActive: 'default',
            list: [],
            filterlist: [],
            loading: false,
            pagination: {
                current: 1,
                pageSize: 20,
                total: 0,
                showTotal: true,
                showPageSize: true,
            },
            debug: false,
            yamlData: {
                show: false,
                title: '',
                data: {},
                submit: ()=>{},
            },

            search: {
                phase: '',
            },
        };
    },
    created() {
        this.namespaceActive = useNamespaceStore().namespace;
        this.debug = getUserInfo()?.['w7.cc/debug'] == 'true';
        this.getList();
    },
    components: {
        yamlDrawer,
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
                    return {
                        name: i.metadata.name,
                        namespace: i.metadata.namespace,

                        phase: i.status.phase,
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

                        effectiveResource: i.status?.effectiveResource || {bandwidth:0, cpu:0, memory:0, storage:0},

                        canExpandBuy: i.status?.canExpandBuy,
                        canRenewBuy: i.status?.canRenewBuy,
                        expireTime: i.spec?.expireTime,

                        
                    }
                })
                this.filterlist = this.list.filter(i=>{

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
    },
};
</script>
