<template>
    <div>
        <a-drawer
            :width="1000"
            :visible="visible"
            @cancel="closeDrawer()"
            @ok="submit"
        >
            <template #title>优惠码</template>
            <div>
                <div class="fs-16">配置列表</div>

                <a-table :data="config" class="mt-10" :scroll="{x:'100%',y:'300px'}" row-key="id" :pagination="false">
                    <template #columns>
                        <a-table-column title="配置">
                            <template #cell="{ record }">{{ `${record.c}核/${record.m}G/${record.s}G/${record.bw}Mbps` }}</template>
                        </a-table-column>
                        <a-table-column title="价格">
                            <template #cell="{ record }">{{ record.price }}元/{{ record.time }}{{ units[record.timeUnit] }}</template>
                        </a-table-column>
                        <a-table-column title="操作">
                            <template #cell="{ record }">
                                <a-button type="outline" size="mini" @click="openCreateCode(record)">
                                    <template #icon><icon-plus /></template>
                                    <span>添加优惠</span>
                                </a-button>
                            </template>
                        </a-table-column>
                    </template>
                </a-table>
                <!-- <table class="com-table"><tbody>
                    <tr>
                        <td>配置</td>
                        <td>价格</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="(item,index) in config" :key="index">
                        <td>{{ `${item.c}核/${item.m}G/${item.s}G/${item.bw}Mbps` }}</td>
                        <td>{{ item.price }}元/{{ item.time }}{{ units[item.timeUnit] }}</td>
                        <td>
                            <span class="c-blue cursor" @click="openCreateCode(item)">添加优惠</span>
                        </td>
                    </tr>
                    <tr v-if="!config || !config.length">
                        <td colspan="3"><a-empty /></td>
                    </tr>
                </tbody></table> -->

                <div class="mt-20 fs-16">优惠码列表</div>
                <table class="com-table mt-10"><tbody>
                    <tr>
                        <td>ID</td>
                        <td>配置</td>
                        <td>价格</td>
                        <td>折扣</td>
                        <!-- <td>优惠码类型</td> -->
                        <td>过期时间</td>
                        <td>剩余个数</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="(item,index) in list">
                        <td>{{ item.id }}</td>
                        <td>{{ `${item.cpu}核/${item.memory}G/${item.storage}G/${item.bandwidth}Mbps` }}</td>
                        <td>{{ item.price }}元/{{ item.timequantity }}{{ units[item.timeunit] }}</td>
                        <td>{{ discountTxt(item.discount) }}</td>
                        <!-- <td>{{ {static:'静态',dynamic:'动态'}[item.type] }}</td> -->
                        <td>{{ item.expire }}</td>
                        <td>
                            <!-- <span style="margin-right:10px;">{{ {static:'静态码',dynamic:'动态码'}[item.type] }}</span> -->
                            <span v-if="item.quantity>=9999">无限</span>
                            <span v-else>{{ item.grant_quantity }}/{{ item.quantity }}</span>
                        </td>
                        <td>
                            <span class="c-blue cursor mr-10" @click="inputCreateNum(item)">生成优惠码</span>
                            <span class="c-blue cursor mr-10" @click="getDetail(item)">查看</span>
                            <span class="c-blue cursor mr-10" @click="stopSwitch(item)">{{ item.open==1?'继续':'停用' }}</span>
                        </td>
                    </tr>
                    <tr v-if="!list || !list.length">
                        <td colspan="8"><a-empty /></td>
                    </tr>
                </tbody></table>
                
                <div class="mt-10 df jc-e">
                    <a-pagination v-model="page" :total="total" hide-on-single-page :page-size="per_page" @change="v=>{page=v;getList()}"/>
                </div>
            </div>
        </a-drawer>
        <a-drawer
            :width="800"
            :visible="form.show"
            @cancel="form.show=false;"
            @ok="submitForm"
        >
            <template #title>添加优惠</template>
            <a-form v-model="form" auto-label-width class="padding-20">
                <a-form-item label="配置">{{ `${form.cpu}核/${form.memory}Gi/${form.storage}Gi/${form.bandwidth}MBps` }}</a-form-item>
                <a-form-item label="价格">￥{{ form.price }}</a-form-item>
                <!-- <a-form-item label="类型">
                    <div class="df df-c mt-6" style="flex:1;">
                        <a-radio-group v-model="form.type" @change="v=>{form.cvt=v=='static'?1:10;form.cvtUnit=v=='static'?'day':'minute'}">
                            <a-radio value="static">静态码</a-radio>
                            <a-radio value="dynamic">动态码</a-radio>
                        </a-radio-group>
                        <span v-if="form.type=='static'" class="c-99 fs-12 mt-10">直接生成发放，管理员可复制给用户使用；</span>
                        <span v-if="form.type=='dynamic'" class="c-99 fs-12 mt-10">需要通过第三方开发者请求接口发放，发放成功后接口返回带有优惠码的购买链接，第三方用户访问使用</span>
                    </div>
                </a-form-item> -->
                <a-form-item label="过期时间">
                    <a-input-number v-model="form.cvt" placeholder="请输入" style="width:400px;">
                        <template #append>
                            <a-select v-model="form.cvtUnit">
                                <a-option label="秒" value="second"></a-option>
                                <a-option label="分钟" value="minute"></a-option>
                                <a-option label="小时" value="hour"></a-option>
                                <a-option label="天" value="day"></a-option>
                            </a-select>
                        </template>
                    </a-input-number>
                </a-form-item>
                <a-form-item label="发放数量">
                    <a-input-number v-if="!form.infinite" v-model="form.quantity" placeholder="请输入" style="width:400px;" />
                    <a-checkbox v-model="form.infinite">无限数量</a-checkbox>
                </a-form-item>
                <a-form-item label="折扣">
                    <div class="df df-c" style="flex:1;">
                        <!-- <a-input-number v-model="form.discount" placeholder="请输入" style="width:400px;" :max="100">
                            <template #append>%</template>
                        </a-input-number> -->
                        <div class="df ai-c">
                            <a-slider
                                v-model="form.discount"
                                :min="0"
                                :max="100"
                                :step="1"
                                style="width:260px;margin-top:10px;"
                                @change="form.minus=100 - form.discount"
                            />
                            
                            <a-input-number v-model="form.discount" :min="0" :max="100" style="width:120px;margin-left:20px;">
                                <template #append>%</template>
                            </a-input-number>
                        </div>
                        <span class="c-99 mt-10">折扣比例{{ form.discount }}%，购买服务器资源减免{{ 100 - form.discount }}%</span>
                    </div>
                </a-form-item>
                <a-form-item label="实付价格">￥{{ (form.price * form.discount / 100).toFixed(2) }}</a-form-item>
            </a-form>
        </a-drawer>
        
        <a-drawer
            :width="800"
            :visible="codes.show"
            @cancel="codes.show=false;"
            @ok="codes.show=false;"
            :footer="false"
        >
            <template #title>详情</template>
            <div class="df df-c" style="height:100%;">
                <a-tabs v-model:active-key="codes.tabActive" class="df-s0" @change="v=>v=='2'?getApis():null">
                    <a-tab-pane key="1" title="优惠码"></a-tab-pane>
                    <a-tab-pane key="2" title="接口示例"></a-tab-pane>
                    <template #extra>
                        <a-button type="outline" size="small" @click="clearExpire()">清理过期码</a-button>
                    </template>
                </a-tabs>
                <div class="fc" style="position:relative;">
                    <div v-if="codes.tabActive=='1'" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:auto;">
                        <table class="com-table"><tbody>
                            <tr>
                                <td>优惠码</td>
                                <td>过期时间</td>
                                <td>状态</td>
                                <td>操作</td>
                            </tr>
                            <tr v-for="(item,index) in codes.list" :key="index">
                                <td>
                                    <span>{{ item.code }}</span>
                                    <a-tooltip content="复制">
                                        <i class="opt-icon ml-10" @click="copy(item.code)"><icon-copy /></i>
                                    </a-tooltip>
                                </td>
                                <td>{{ item.expire_at }}</td>
                                <td>{{ {unused:'未使用', lock:'锁定', used:'已使用'}[item.status] }}</td>
                                <td>
                                    <a-button type="text" :disabled="!item.is_expire || item.status!=='unused'" @click="deleteExpireCode(item)">删除</a-button>
                                </td>
                            </tr>
                            <tr v-if="!codes.list || !codes.list.length">
                                <td colspan="6"><a-empty /></td>
                            </tr>
                        </tbody></table>
                        <div class="mt-10 df jc-e">
                            <a-pagination v-model="codes.page" :total="codes.total" :page-size="codes.per_page" hide-on-single-page @change="v=>{codes.page=v;getDetail(codes)}"/>
                        </div>
                    </div>
                    <div v-if="codes.tabActive=='2'" class="df df-c" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:auto;">
                        <div class="df df-ww df-s0">
                            <a-button v-for="(item,index) in codes.apis" :type="codes.codeActive==item.name?'primary':'outline'" @click="codes.codeActive=item.name" :key="index" size="small" style="margin:0 4px 4px 0;">{{ item.title }}</a-button>
                        </div>
                        <a-textarea v-if="codes.apis && codes.apis.find(i=>i.name==codes.codeActive)" class="mt-10 fc" :model-value="codes.apis.find(i=>i.name==codes.codeActive).code" />
                    </div>
                </div>
            </div>
        </a-drawer>

        <a-modal
            :width="400"
            :visible="createNum.show"
            @cancel="createNum.show=false;"
            @ok="createCode"
        >
            <template #title>生成优惠码</template>
            <div class="df ai-c jc-c">
                <span class="mr-10">数量：</span>
                <a-input-number v-model="createNum.num" :max="createNum.max" style="width:300px;"></a-input-number>
            </div>
        </a-modal>
    </div>
</template>
<script>
import { panelApi } from '@/utils/api';
import axios from 'axios';

export default{
    props: ['show','data'],
    data(){
        return {
            visible: false,
            units: {
                '':'月',
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            config: [],
            page: 1,
            total: 0,
            per_page: 15,
            list: [],
            form: {
                show: false,
            },
            codes: {
                show: false,
                page: 1,
                id: '',
                list: [],
                total: 0,
                per_page: 10,
                apis: [],
            },
            createNum: {
                show: false,
                num: 10,
            },
        }
    },
    created(){

    },
    watch: {
        'form.time'(v){console.log(v)},
        show(){
            this.visible = this.show;
            if(!this.show){return}
            this.init();
        },
    },
    methods: {
        init(){
            this.getConfig();
            this.getList();
        },
        clearExpire(){
            panelApi.delete(`/panel-api/v1/auth/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion/${this.codes.id}/coupon`).then(res=>{
                this.$message.success('操作成功');
                this.getDetail({id:this.codes.id});
            })
        },
        deleteExpireCode(item){
            panelApi.delete(`/panel-api/v1/auth/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion/${this.codes.id}/coupon`,{params:{
                code: item.code
            }}).then(res=>{
                this.$message.success('操作成功');
                this.getDetail({id:this.codes.id});
            })
        },
        getApis(){
            k8sproxy.get(`/k8s-proxy/api/v1/configmaps?labelSelector=${encodeURIComponent('type=code')}`,{loading:true}).then(res=>{
                let arr = [];
                res.data?.items?.map?.(i=>{
                    let o = {
                        title: i.metadata?.annotations?.title || i.metadata?.name,
                        name: i.metadata?.name,
                        code: i?.data?.code || '',
                    }
                    arr.push(o);
                })
                this.codes.apis = arr;
                this.codes.codeActive = arr?.[0]?.name || '';
            })
        },
        getDetail(row){
            panelApi.get(`/panel-api/v1/auth/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion/${row.id}/coupon?page=${this.codes.page}`,{loading:true}).then(res=>{
                let list = res.data?.data || [];
                list = list.map(i=>{
                    i.is_expire = new Date(i.expire_at).getTime() < Date.now();
                    return i;
                })
                this.codes = {
                    tabActive: '1',
                    show: true,
                    id: row.id,
                    page: this.codes.page,
                    list: list,
                    total: res.data?.total,
                    per_page: res.data?.per_page,
                    apis: [],
                }
            })
        },
        inputCreateNum(row){
            this.createNum = {
                show: true,
                num:  Math.min(row.quantity - row.grant_quantity,10),
                max: row.quantity - row.grant_quantity,
                id: row.id
            }
        },
        createCode(){
            this.createNum.show = false;
            const formStr = new URLSearchParams({quantity: this.createNum.num}).toString();
            panelApi.post(`/panel-api/v1/auth/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion/${this.createNum.id}/coupon`,formStr).then(res=>{
                this.$message.success('操作成功');
                this.getList();
            })
        },
        openCreateCode(item){
            this.form = {
                ...this.form,
                type: 'static',
                show: true,
                cpu: item.c,
                memory: item.m,
                storage: item.s,
                bandwidth: item.bw,
                timeunit: item.timeUnit,
                timequantity: item.time,
                price: item.price,
                discount: 50,
                minus: 50,
                quantity: '',
                cvt: 1,
                cvtUnit: 'day',
                infinite: false,
            };
        },
        submitForm(){
            console.log(this.form);
            let f = this.form;
            let units = {
                second: 1,
                minute: 60,
                hour: 3600,
                day: 24 * 3600,
            }
            const dataObj = {
                groupname: this.data.name,
                type: f.type,
                coupon_valid_time: f.cvt * units[f.cvtUnit],
                cpu: f.cpu,
                memory: f.memory,
                storage: f.storage,
                bandwidth: f.bandwidth,
                timeunit: f.timeunit,
                timequantity: f.timequantity,
                discount: f.discount,
                quantity: f.infinite? 9999 : Number(f.quantity),
            };
            
            const formStr = new URLSearchParams(dataObj).toString();

            panelApi.post('/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion',formStr).then(res=>{
                this.$message.success('操作成功');
                this.form.show = false;
                this.getList();
            }).catch(()=>{})
        },
        getConfig(){
            let cost = this.data?.cost || {cpu:0,memory:0,storage:0,bandwidth:0};

            let priceTimes = {
                '': 1,
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            }
            
            let packageConfig = this.data?.cost?.packageConfig || '[]';
            packageConfig = JSON.parse(packageConfig);
            let config = [];
            packageConfig.map(i=>{
                i.config.map(c=>{
                    let price = {
                        cpu: Number((cost.cpu * i.time * priceTimes[i.timeUnit] * Number(c.c)).toFixed(2)),
                        memory: Number((cost.memory * i.time * priceTimes[i.timeUnit] * Number(c.m)).toFixed(2)),
                        storage: Number((cost.storage * i.time * priceTimes[i.timeUnit] * Number(c.s)).toFixed(2)),
                        bandwidth: Number((cost.bandwidth * i.time * priceTimes[i.timeUnit] * Number(c.bw)).toFixed(2)),
                    }
                    let total = Number((price.cpu + price.memory + price.storage + price.bandwidth).toFixed(2))
                    config.push({
                        ...c,
                        ...i,
                        price: total,
                    })
                })
            })
            this.config = config;
        },
        getList(){
            let cost = this.data?.cost || {cpu:0,memory:0,storage:0,bandwidth:0};
            let priceTimes = {
                '': 1,
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            }
            panelApi.get('/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion',{params:{
                groupname: this.data.name,
                page: this.page,
            }}).then(res=>{
                let list = res.data?.data || [];
                
                let units = {
                    second: 1,
                    minute: 60,
                    hour: 3600,
                    day: 24 * 3600,
                }
                list.map(i=>{
                    let expire = '';
                    if(i.coupon_valid_time % units.day==0){
                        expire = (i.coupon_valid_time / units.day) + '天';
                    }else if(i.coupon_valid_time % units.hour==0){
                        expire = (i.coupon_valid_time / units.hour) + '小时';
                    }else if(i.coupon_valid_time % units.minute==0){
                        expire = (i.coupon_valid_time / units.minute) + '分钟';
                    }else{
                        expire = i.coupon_valid_time + '秒';
                    }
                    let price = {
                        cpu: Number((cost.cpu * i.timequantity * priceTimes[i.timeunit] * Number(i.cpu)).toFixed(2)),
                        memory: Number((cost.memory * i.timequantity * priceTimes[i.timeunit] * Number(i.memory)).toFixed(2)),
                        storage: Number((cost.storage * i.timequantity * priceTimes[i.timeunit] * Number(i.storage)).toFixed(2)),
                        bandwidth: Number((cost.bandwidth * i.timequantity * priceTimes[i.timeunit] * Number(i.bandwidth)).toFixed(2)),
                    }
                    i.price = Number((price.cpu + price.memory + price.storage + price.bandwidth).toFixed(2))
                    i.expire = expire;
                })
                this.list = list;
                this.total = res.data.total;
                this.per_page = res.data.per_page;
            })
        },
        stopSwitch(row){
            let o = {open: row.open==1?2:1};
            let data = new URLSearchParams(o).toString()
            panelApi.put(`/panel-api/v1/auth/console/proxy/api/thirdparty-cd/k8s-offline/sdk/promotion/${row.id}`,data).then(res=>{
                this.getList();
            });
        },
        submit(){
            this.closeDrawer();
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        discountTxt(discount){
            discount = Number(discount);
            if(discount>=100){return ''}
            return Number((discount/10).toFixed(2)) + '折';
        },
        async copy(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.$message.success('复制成功')
            } catch (err) {
                const input = document.createElement('input');
                input.value = text;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                this.$message.success('复制成功')
            }
        }
    }
}
</script>
<style scoped>
</style>