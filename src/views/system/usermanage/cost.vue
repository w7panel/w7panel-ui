<template>
    <div class="df df-c padding-20" style="height:100%;">
        <route-breadcrumb />
        <div>
            <a-button type="primary" @click="add"><template #icon><icon-plus /></template>添加费用套餐</a-button>
        </div>
        
        <div class="bg-white padding-20 mt-20">
            <a-table class="cptable" :data="list" :pagination="false" :bordered="false">
                <template #columns>
                    <a-table-column title="名称" data-index="title"></a-table-column>
                    <a-table-column title="CPU">
                        <template #cell="{ record }">{{record.cpu}}元/月</template>
                    </a-table-column>
                    <a-table-column title="内存">
                        <template #cell="{ record }">{{record.memory}}元/月</template>
                    </a-table-column>
                    <a-table-column title="存储">
                        <template #cell="{ record }">{{record.storage}}元/月</template>
                    </a-table-column>
                    <a-table-column title="带宽">
                        <template #cell="{ record }">{{record.bandwidth}}元/月</template>
                    </a-table-column>
                    <a-table-column title="全网发布">
                        <template #cell="{ record }">
                            <a-switch v-model="record.showInShop" :disabled="record.showInShopDisabled" @change="changeShowInShop(record)"></a-switch>
                        </template>
                    </a-table-column>
                    <a-table-column title="操作">
                        <template #cell="{ record }">
                            <a-tooltip v-if="debug" content="yaml">
                                <i class="opt-icon" @click="openYaml(record.name)"><icon-code /></i>
                            </a-tooltip>
                            <a-tooltip content="全网发布">
                                <i class="opt-icon" @click="openRelease(record)"><icon-send /></i>
                            </a-tooltip>
                            <a-tooltip content="优惠码">
                                <i class="opt-icon" @click="openPromoCode(record)"><icon-gift /></i>
                            </a-tooltip>
                            <a-tooltip content="修改">
                                <i class="opt-icon" @click="edit(record)"><icon-edit /></i>
                            </a-tooltip>
                            <a-popconfirm :content="'确认要删除吗'" @ok="del(record)" position="lt" class="popconfirm-delete" type="warning" :ok-button-props="{status:'danger'}">
                                <a-tooltip content="删除">
                                    <i class="opt-icon"><icon-delete /></i>
                                </a-tooltip>
                            </a-popconfirm>
                        </template>
                    </a-table-column>
                </template>
            </a-table>
        </div>

        <a-drawer
            :visible="form.show"
            direction="rtl"
            :width="1200"
            title="费用套餐"
            @ok="submit"
            @cancel="form.show=false;"
            :ok-loading="form.loading"
        >
            <a-form :model="form" ref="form" class="label-width-70" auto-label-width>
                <a-form-item label="名称" field="title" :rules="[{required:true,message:'请输入名称', trigger: 'blur' }]">
                    <a-input v-model="form.title" type="text" placeholder="请输入"></a-input>
                </a-form-item>

                <a-form-item label="配额策略">
                    <a-space direction="vertical" style="flex:1;padding:20px;background:var(--color-neutral-1);" fill :size="0">
                        <a-form-item label="存储选择">
                            <div class="df df-c" style="width:100%;">
                                <a-select v-model="form.storageclass" placeholder="请选择">
                                    <a-option v-for="item in storageLs" :key="item" :label="item" :value="item"></a-option>
                                </a-select>
                                <div class="mt-10 c-99 fs-12">为用户分配存储分区时，选择在哪个存储设备上创建</div>
                            </div>
                        </a-form-item>
                        <a-form-item label="最小配置">
                            <div class="df df-c" style="width:100%;">
                                <a-row class="df ai-c mb-10" :gutter="16">
                                    <a-col flex="80px" class="txt-r">CPU</a-col>
                                    <a-col flex="auto">
                                        <a-input v-model="form.hard.cpu" type="number" placeholder="请输入">
                                            <template #append>核</template>
                                        </a-input>
                                    </a-col>
                                </a-row>
                                <a-row class="df ai-c mb-10" :gutter="16">
                                    <a-col flex="80px" class="txt-r">内存</a-col>
                                    <a-col flex="auto">
                                        <a-input v-model="form.hard.memory" type="number" placeholder="请输入">
                                            <template #append>Gi</template>
                                        </a-input>
                                    </a-col>
                                </a-row>
                                <a-row class="df ai-c mb-10" :gutter="16">
                                    <a-col flex="80px" class="txt-r">存储</a-col>
                                    <a-col flex="auto">
                                        <a-input v-model="form.hard['requests.storage']" type="number" placeholder="请输入">
                                            <template #append>Gi</template>
                                        </a-input>
                                    </a-col>
                                </a-row>
                                <a-row class="df ai-c mb-10" :gutter="16">
                                    <a-col flex="80px" class="txt-r">带宽</a-col>
                                    <a-col flex="auto">
                                        <a-input v-model="form.hard.bandwidth" type="number" placeholder="请输入">
                                            <template #append>Mbps</template>
                                        </a-input>
                                    </a-col>
                                </a-row>
                                <div class="c-99 fs-12" style="margin-left:80px;">限制用户购买时选择的各项配额不能低于最小值</div>
                            </div>
                        </a-form-item>
                    </a-space>
                </a-form-item>
                
                <a-form-item label="价格设置">
                    <a-space direction="vertical" style="flex:1;padding:20px;background:var(--color-neutral-1);" fill :size="0">
                        <a-form-item label="CPU价格" field="cpu" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]" @change="getShowList">
                            <a-input v-model="form.cpu" type="number" placeholder="请输入"><template #append>元/核/月</template></a-input>
                        </a-form-item>
                        <a-form-item label="内存价格" field="memory" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]" @change="getShowList">
                            <a-input v-model="form.memory" type="number" placeholder="请输入"><template #append>元/Gi/月</template></a-input>
                        </a-form-item>
                        <a-form-item label="存储价格" field="storage" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]" @change="getShowList">
                            <a-input v-model="form.storage" type="number" placeholder="请输入"><template #append>元/Gi/月</template></a-input>
                        </a-form-item>
                        <a-form-item label="带宽价格" field="bandwidth" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]" @change="getShowList">
                            <a-input v-model="form.bandwidth" type="number" placeholder="请输入"><template #append>元/Mbps/月</template></a-input>
                        </a-form-item>
                    </a-space>
                </a-form-item>

                <a-form-item label="价格清单">
                    <div style="width:100%;margin-top:10px;">
                        <a-space direction="vertical" style="width:100%;" fill :size="0">
                            <a-tabs
                                v-model:active-key="showlistActiveId"
                                type="card-gutter"
                                class="cost-showlist-tabs"
                                @add="addPackageConfig"
                                @delete="v=>{form.packageConfig.splice(v,1);showlistActiveId>=form.packageConfig.length?showlistActiveId--:null}"
                                show-add-button
                                :editable="true"
                            >
                                <a-tab-pane v-for="(item, index) of form.packageConfig" :key="index" :title="item.time + timeUnits[item.timeUnit]">
                                    <div style="padding:0 16px 16px;">
                                        <table class="com-table"><tbody>
                                            <tr>
                                                <td>名称</td>
                                                <td>单价</td>
                                                <td style="width:250px;">新购折扣</td>
                                                <td style="width:250px;">续费折扣</td>
                                            </tr>
                                            <tr><td>CPU</td><td>￥{{item.cpu}}/核/{{item.time + timeUnits[item.timeUnit]}}</td><td>-</td><td>-</td></tr>
                                            <tr><td>内存</td><td>￥{{item.memory}}/Gi/{{item.time + timeUnits[item.timeUnit]}}</td><td>-</td><td>-</td></tr>
                                            <tr><td>存储</td><td>￥{{item.storage}}/Gi/{{item.time + timeUnits[item.timeUnit]}}</td><td>-</td><td>-</td></tr>
                                            <tr><td>带宽</td><td>￥{{item.bandwidth}}/Mbps/{{item.time + timeUnits[item.timeUnit]}}</td><td>-</td><td>-</td></tr>
                                            <tr>
                                                <td>总计</td>
                                                <td>￥{{item.total}}/{{item.time + timeUnits[item.timeUnit]}}</td>
                                                <td>
                                                    <a-switch v-model="item.dc_new_open" @change="v=>v?null:item.discount_new=100"></a-switch>
                                                    <a-input v-if="item.dc_new_open" v-model="item.discount_new" type="number" class="ml-20" style="width:120px;">
                                                        <template #append>%</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-switch v-model="item.dc_renew_open" @change="v=>v?null:item.discount_renew=100"></a-switch>
                                                    <a-input v-if="item.dc_renew_open" v-model="item.discount_renew" type="number" class="ml-20" style="width:120px;">
                                                        <template #append>%</template>
                                                    </a-input>
                                                </td>
                                            </tr>
                                        </tbody></table>

                                        <table v-if="form.packageConfig && form.packageConfig[showlistActiveId]" class="com-table mt-10"><tbody>
                                            <tr>
                                                <td>CPU</td>
                                                <td>内存</td>
                                                <td>带宽</td>
                                                <td>硬盘</td>
                                                <td>新购折扣</td>
                                                <td>续费折扣</td>
                                                <td>价格</td>
                                                <td>操作</td>
                                            </tr>
                                            <tr v-for="(item,index) in form.packageConfig[showlistActiveId].config" :key="index">
                                                <td>
                                                    <a-input v-model="item.c" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>核</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-input v-model="item.m" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>Gi</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-input v-model="item.bw" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>Mbps</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-input v-model="item.s" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>Gi</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-input v-model="item.dc_new" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>%</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <a-input v-model="item.dc_renew" @change="getPackageConfig" placeholder="请输入">
                                                        <template #append>%</template>
                                                    </a-input>
                                                </td>
                                                <td>
                                                    <span style="white-space:nowrap;">{{item.total}}元/{{item.unit}}</span>
                                                </td>
                                                <td style="width:100px;">
                                                    <div class="df df-c">
                                                        <span class="cursor c-blue mr-10" style="white-space:nowrap;" @click="item.give=!item.give">{{ item.give? '取消赠送' : '赠送' }}</span>
                                                        <span class="cursor c-blue" style="white-space:nowrap;" @click="form.packageConfig[showlistActiveId].config.splice(index,1);getPackageConfig();">删除</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="cursor txt-c" colspan="8" @click="form.packageConfig[showlistActiveId].config.push({ c: 0, m: 0, bw: 0, s: 0, total: 0, dc_new:100, dc_renew:100 });getPackageConfig();">
                                                    <span class="c-99">+添加常用配额套餐</span>
                                                </td>
                                            </tr>
                                        </tbody></table>
                                    </div>
                                </a-tab-pane>
                            </a-tabs>
                        </a-space>

                        <!-- <a-space direction="vertical" class="mt-20" style="width:100%;padding:20px;background:var(--color-neutral-1);" fill :size="0">
                        </a-space> -->
                    </div>
                    
                </a-form-item>
            </a-form>
        </a-drawer>

        <yaml-drawer v-if="debug" :show="yamlData.show" :title="yamlData.title" :data="yamlData.data" @submit="yamlData.submit" @cancel="yamlData.show=false;"></yaml-drawer>

        <a-modal v-model:visible="newPackageConfig.show" title="价格清单" @cancel="newPackageConfig.show=false;" @ok="newPackageConfig.submit">
            <div class="df ai-c jc-c">
                <span>时间：</span>
                <a-input v-model="newPackageConfig.time" placeholder="请输入" style="width:360px;">
                    <template #append>
                        <a-select v-model="newPackageConfig.unit">
                            <a-option label="小时" value="hour"></a-option>
                            <a-option label="天" value="day"></a-option>
                            <a-option label="月" value="month"></a-option>
                            <a-option label="年" value="year"></a-option>
                        </a-select>
                    </template>
                </a-input>
            </div>
        </a-modal>
        
        <release-package
            :show="release.show"
            :data="release.data"
            @submit="()=>{getList();release.show=false;}"
            @close="()=>release.show=false"
        />
        
        <promo-code :show="pcdata.show" :data="pcdata.data" @close="pcdata.show=false;"></promo-code>
        
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';

import { useNamespaceStore } from '@/store';
import yamlDrawer from '@/components/yaml-drawer.vue';
import { getUserInfo } from '@/utils/auth';
import releasePackage from '@/views/system/usergroup/release-package.vue';
import promoCode from '@/views/system/usergroup/promo-code.vue';

const dataTemplate = {
    "kind": "ConfigMap",
    "apiVersion": "v1",
    "metadata": {
        "name": "k3k.quota",
        "namespace": "default",
        "labels": {
            "type": "cost",
        },
        "annotations": {},
    },
    "data": {}
}
export default {
    data(){
        return {
            timeUnits: {
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            list: [],
            form: {
                show: false,
                title: '',
                hard: {},
            },
            yamlData: {
                show: false,
                data: {},
                title: "",
                submit: ()=>{},
            },
            showlist: [],
            showlistActiveId: 2,
            debug: false,

            newPackageConfig: {},
            storageLs: [],

            release: {
                show: false,
                data: null,
            },
            
            pcdata: {
                show: false,
                data: null,
            },
        }
    },
    created(){
        this.debug = getUserInfo()?.['w7.cc/debug']=='true';
        this.namespaceActive = useNamespaceStore().namespace;
        this.getList();
        this.getStorageList();
    },
    components: {
        yamlDrawer,
        releasePackage,
        promoCode,
    },
    watch: {},
    methods:{
        
        openPromoCode(row){
            this.pcdata = {
                show: true,
                data: {
                    name: row.name,
                    cost: row.data.data,
                },
            }
        },
        
        changeShowInShop(row){
            k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+row.name,[{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1showInShop',
                value: String(row.showInShop),
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        openRelease(row){
            this.release = {
                show: true,
                data: row.data,
            }
        },

        getStorageList(){
            k8sproxy.get('/apis/storage.k8s.io/v1/storageclasses').then(res=>{
                let data = res?.data || [];
                let list = data.items || [];
                list = list.map(item=>{
                    return item.metadata.name;
                })
                list = list.filter(i=>!/longhorn/i.test(i))
                this.storageLs = list;
            });
        },
        getList(){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps?labelSelector=type=cost",{noAlert:true}).then(res=>{
                let list = res?.data?.items;
                list = list.map(i=>{
                    let configData = i.data;
                    let packageConfig = JSON.parse(configData?.packageConfig || '[]');
                    let quota = JSON.parse(configData?.quota || '{}');
                    
                    let showInShopDisabled = true;
                    packageConfig?.map?.(p=>{
                        p?.config?.map?.(i=>{
                            if(i.online){showInShopDisabled = false;}
                        })
                    })

                    return {
                        data: i,
                        title: i.metadata?.annotations?.title || i.metadata.name,
                        name: i.metadata.name,
                        created: window.formatDate(i.metadata.creationTimestamp),
                        ...configData,
                        packageConfig: packageConfig,
                        storageclass: quota?.storageclass || '',
                        hard: quota?.hard || {cpu:'',memory:'',bandwidth:'','requests.storage':''},
                        
                        showInShop: i.metadata?.labels?.['w7.cc/showInShop'] == 'true',
                        showInShopDisabled: showInShopDisabled,
                    }
                });
                this.list = list;
            })
        },
        // 添加价格清单 tab
        addPackageConfig(){
            let df = [
                {c:2, m:2, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
                {c:2, m:4, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
                {c:2, m:8, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
            ]
            this.newPackageConfig = {
                show: true,
                time: 1,
                unit: 'year',
                submit: ()=>{
                    this.newPackageConfig.show = false;
                    this.form.packageConfig.push({
                        time: this.newPackageConfig.time,
                        timeUnit: this.newPackageConfig.unit,
                        discount_new: 100,
                        discount_renew: 100,
                        config: JSON.parse(JSON.stringify(df)),
                    })
                    this.showlistActiveId = this.form.packageConfig.length - 1;
                    this.getShowList();
                }
            }
        },
        // 计算价格清单
        getShowList(){
            let cpu = Number(this.form?.cpu) || 0;
            let memory = Number(this.form?.memory) || 0;
            let bandwidth = Number(this.form?.bandwidth) || 0;
            let storage = Number(this.form?.storage) || 0;
            let unitTime = {
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            }
            this.form?.packageConfig?.map(i=>{
                let dc = 100 / 100;
                i.cpu = Number((cpu * i.time * unitTime[i.timeUnit] * dc).toFixed(i.timeUnit=='hour'?4:2));
                i.memory = Number((memory * i.time * unitTime[i.timeUnit] * dc).toFixed(i.timeUnit=='hour'?4:2));
                i.bandwidth = Number((bandwidth * i.time * unitTime[i.timeUnit] * dc).toFixed(i.timeUnit=='hour'?4:2));
                i.storage = Number((storage * i.time * unitTime[i.timeUnit] * dc).toFixed(i.timeUnit=='hour'?4:2));
                i.total = Number(i.cpu + i.memory + i.bandwidth + i.storage).toFixed(i.timeUnit=='hour'?4:2);
            });
            this.getPackageConfig();
        },
        // 计算价格清单 table
        getPackageConfig(){
            if(!this.form.packageConfig?.length){return}
            
            let unitTime = {
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            }

            let f = this.form;
            for(let i in f.packageConfig){
                let p = f.packageConfig[i];
                let c = p?.config;
                let time = p.time * unitTime[p.timeUnit];
                c?.map(i=>{
                    let dc = 100;
                    i.unit = p.time + this.timeUnits[p.timeUnit];
                    i.total = (i.c * time * f.cpu) + (i.m * time * f.memory) + (i.s * time * f.storage) + (i.bw * time * f.bandwidth);
                    i.total = i.total * (dc / 100);
                    i.total = Number(i.total.toFixed(2));
                })
            }
        },
        // 添加费用套餐
        add(){
            this.showlistActiveId = 0;
            let df = [
                {c:2, m:2, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
                {c:2, m:4, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
                {c:2, m:8, s:5, bw:50, dc_new:100, dc_renew:100, give:false, },
            ]
            let packageConfig =  [];
            ['month','year'].map(item=>{
                packageConfig.push({
                    time: 1,
                    timeUnit: item,
                    dc_new_open: false,
                    discount_new: 100,
                    dc_renew_open: false,
                    discount_renew: 100,
                    config: JSON.parse(JSON.stringify(df))
                })
            })
            this.form = {
                ...this.form,
                show: true,
                title: '',
                name: '',
                cpu: '',
                memory: '',
                storage: '',
                bandwidth: '',
                packageConfig: packageConfig,
                storageclass: this.storageLs?.[0] || '',
                hard: {
                    cpu: 2,
                    memory: 2,
                    'requests.storage': 5,
                    bandwidth: 50,
                },
                loading: false,
            }
            this.getShowList();
        },
        // 修改套餐
        edit(row){
            this.showlistActiveId = 0;
            this.form = {
                ...this.form,
                show: true,
                title: row.title,
                name: row.name,
                cpu: row.cpu || '',
                memory: row.memory || '',
                storage: row.storage || '',
                bandwidth: row.bandwidth || '',
                packageConfig: row.packageConfig?.length? row.packageConfig : [],
                storageclass: row.storageclass || this.storageLs?.[0] || '',
                hard: row.hard,
                loading: false,
            }
            this.getShowList();
        },
        // 提交
        submit(){
            this.$refs.form.validate((err) => {
                if (err) { this.$refs.form.scrollToField(Object.keys(err)[0]); return; }

                let configData =  {
                    cpu: String(this.form.cpu),
                    memory: String(this.form.memory),
                    storage: String(this.form.storage),
                    bandwidth: String(this.form.bandwidth),
                    packageConfig: JSON.stringify(this.form.packageConfig.map(i=>{
                        let config = i?.config?.map(c=>({
                            c: Number(c.c),
                            m: Number(c.m),
                            s: Number(c.s),
                            bw: Number(c.bw),
                            dc_new: Number(c.dc_new),
                            dc_renew: Number(c.dc_renew),
                            give: c.give,
                        })) || []
                        return {
                            time: i.time,
                            timeUnit: i.timeUnit,
                            dc_new_open: i.dc_new_open,
                            discount_new: Number(i.discount_new || 100),
                            dc_renew_open: i.dc_renew_open,
                            discount_renew: Number(i.discount_renew || 100),
                            config: config,
                        };
                    })),
                    quota: JSON.stringify({
                        storageclass: this.form.storageclass,
                        hard: this.form.hard,
                    })
                }
                
                this.form.loading = true;

                if(!this.form.name){
                    let data = JSON.parse(JSON.stringify(dataTemplate));
                    data.metadata.name = 'k3k.'+this.createName();
                    data.metadata.annotations.title = this.form.title;
                    data.data = configData;
                    k8sproxy.post("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps",data).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    }).finally(()=>{
                        this.form.loading = false;
                    });
                }else{
                    k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+this.form.name,[{
                        op: 'replace',
                        path: '/metadata/annotations/title',
                        value: this.form.title,
                    },{
                        op: 'replace',
                        path: '/data',
                        value: configData,
                    }],{
                        headers: {'Content-Type': 'application/json-patch+json'},
                    }).then(res=>{
                        this.$message.success('操作成功');
                        this.form.show = false;
                        this.getList();
                    }).finally(()=>{
                        this.form.loading = false;
                    });
                }
            })
        },
        openYaml(name){
            k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + name, {loading:true}).then(res=>{
                if(!res?.data){return}
                this.yamlData = {
                    show: true,
                    data: res?.data,
                    title: res?.data?.metadata?.annotations?.title || res?.data?.metadata?.name,
                    submit: (data)=>{
                        return k8sproxy.put("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + data?.metadata?.name, data).then(res=>{
                            this.$message.success("修改成功");
                            this.yamlData = {...this.yamlData, show:false,};
                            this.getList();
                        })
                    }
                }
            })
        },
        del(row){
            k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/" + row.name).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            });
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
    }
}
</script>

<style scoped>
.m-lr6{margin-left:6px; margin-right:6px;}
.com-table td{background-color:var(--color-neutral-1);}
</style>
<style>
.cost-showlist-tabs .arco-tabs-tab.arco-tabs-tab-active{background-color:var(--color-bg-3);}
.cost-showlist-tabs .arco-tabs-content{background-color:var(--color-bg-3);}
.cost-showlist-tabs .arco-form-item{margin-bottom:10px;}
</style>