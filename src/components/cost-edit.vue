<template>
    <a-drawer :width="onlypackage?600:1200" :visible="visible" @cancel="closeDrawer()" @ok="submit">
        <template #title>费用管理</template>
        <div>
            
            <a-form :model="form" ref="form" class="label-width-100" auto-label-width>
                <a-form-item label="费用套餐">
                    <a-select v-model="form.package" @change="changePackage">
                        <a-option v-if="!onlypackage" value="" label="自定义"></a-option>
                        <a-option v-for="item in list" :key="item.name" :value="item.name" :label="item.title"></a-option>
                    </a-select>
                </a-form-item>
                <div v-if="!onlypackage">

                    <a-form-item label="价格设置">
                        <a-space direction="vertical" style="flex:1;padding:20px;background:var(--color-neutral-1);" fill :size="0">
                            <a-form-item label="CPU价格" field="cpu" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]">
                                <a-input v-model="form.cpu" @change="form.package='';getShowList()" type="number" placeholder="请输入"><template #append>元/核/月</template></a-input>
                            </a-form-item>
                            <a-form-item label="内存价格" field="memory" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]">
                                <a-input v-model="form.memory" @change="form.package='';getShowList()" type="number" placeholder="请输入"><template #append>元/Gi/月</template></a-input>
                            </a-form-item>
                            <a-form-item label="存储价格" field="storage" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]">
                                <a-input v-model="form.storage" @change="form.package='';getShowList()" type="number" placeholder="请输入"><template #append>元/Gi/月</template></a-input>
                            </a-form-item>
                            <a-form-item label="带宽价格" field="bandwidth" :rules="[{required:true,message:'请输入价格', trigger: 'blur' }]">
                                <a-input v-model="form.bandwidth" @change="form.package='';getShowList()" type="number" placeholder="请输入"><template #append>元/Mbps/月</template></a-input>
                            </a-form-item>
                        </a-space>
                    </a-form-item>
    
                    <a-form-item label="价格清单">
                        <div style="flex:1;width:100%;padding:10px;background:var(--color-neutral-1);">
                            <a-space direction="vertical" style="width:100%;" fill :size="0">
                                <a-tabs
                                    v-model:active-key="showlistActiveId"
                                    type="card-gutter"
                                    class="cost-showlist-tabs"
                                    @add="addPackageConfig"
                                    @delete="v=>{form.package='';form.packageConfig.splice(v,1);showlistActiveId>=form.packageConfig.length?showlistActiveId--:null}"
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
                                                        <a-switch v-model="item.dc_new_open" @change="v=>{item.discount_new=v?item.discount_new:100;form.package='';}"></a-switch>
                                                        <a-input v-if="item.dc_new_open" v-model="item.discount_new" @change="form.package='';getShowList()" type="number" class="ml-20" style="width:120px;">
                                                            <template #append>%</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-switch v-model="item.dc_renew_open" @change="v=>v?null:item.discount_renew=100"></a-switch>
                                                        <a-input v-if="item.dc_renew_open" v-model="item.discount_renew" @change="form.package='';getShowList()" type="number" class="ml-20" style="width:120px;">
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
                                                        <a-input v-model="item.c" @change="form.package='';getPackageConfig();" placeholder="请输入">
                                                            <template #append>核</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-input v-model="item.m" @change="form.package='';getPackageConfig();" placeholder="请输入">
                                                            <template #append>Gi</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-input v-model="item.bw" @change="form.package='';getPackageConfig();" placeholder="请输入">
                                                            <template #append>Mbps</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-input v-model="item.s" @change="form.package='';getPackageConfig();" placeholder="请输入">
                                                            <template #append>Gi</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-input v-model="item.dc_new" @change="form.package='';getPackageConfig();" placeholder="请输入">
                                                            <template #append>%</template>
                                                        </a-input>
                                                    </td>
                                                    <td>
                                                        <a-input v-model="item.dc_renew" @change="form.package='';getPackageConfig();" placeholder="请输入">
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
                        </div>
                    </a-form-item>
                </div>

            </a-form>
        </div>
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
    </a-drawer>
</template>

<script>
export default {
    props: ['show', 'data', 'name','list','onlypackage'],
    data(){
        return {
            timeUnits: {
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            visible: false,
            form: {
                package: '',
                cpu: '',
                memory: '',
                storage: '',
                bandwidth: '',
                
                packageConfig: [],
            },
            showlist: [],
            showlistActiveId: 0,
            newPackageConfig: {},
        }
    },
    created(){

    },
    watch:{
        show(){
            this.visible = this.show;
            if(!this.show){return}
            this.init();
        },
    },
    methods: {
        init(){
            this.showlistActiveId = 0;
            this.form = {
                ...this.form,
                ...this.data,
            }
            this.form.packageConfig = this.form.packageConfig || [];
            if(typeof this.form.packageConfig=='string'){
                this.form.packageConfig = JSON.parse(this.form.packageConfig)
            }
            if(this.form.package){
                let find = this.list?.find(i=>i.name==this.form.package);
                this.form.limit = find.quota;
            }
            this.getShowList();
        },
        submit(){
            this.$emit('submit',{
                ...this.form,
                packageConfig: this.form.packageConfig.map(i=>{
                    let config = i?.config?.map(c=>({
                        c: Number(c.c),
                        m: Number(c.m),
                        s: Number(c.s),
                        bw: Number(c.bw),
                        dc_new: Number(c.dc_new),
                        dc_renew: Number(c.dc_renew),
                        give: c.give,
                        online: Boolean(c.online),
                        label: c.label,
                        description: c.description,
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
                }),
            });
        },
        changePackage(v){
            let find = this.list.find(i=>i.name==v);
            if(!find){return}
            this.form.buymode = find?.buymode;
            this.form.cpu = find?.cpu;
            this.form.memory = find?.memory;
            this.form.storage = find?.storage;
            this.form.bandwidth = find?.bandwidth;
            this.form.packageConfig = find?.packageConfig || [];
            this.form.limit = find.quota;

            if(typeof this.form.packageConfig == 'string'){
                this.form.packageConfig = JSON.parse(this.form.packageConfig)
            }
            this.getShowList();
        },
        addPackageConfig(){
            let df = [
                {c:2,m:2,s:5,bw:50,dc_new:100,dc_renew:100,},
                {c:2,m:4,s:5,bw:50,dc_new:100,dc_renew:100,},
                {c:2,m:8,s:5,bw:50,dc_new:100,dc_renew:100,},
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
                        dc_new_open: false,
                        discount_new: 100,
                        dc_renew_open: false,
                        discount_renew: 100,
                        config: JSON.parse(JSON.stringify(df))
                    })
                    this.showlistActiveId = this.form.packageConfig.length-1;
                    this.form.package = '';
                    this.getShowList();
                }
            }
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
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
        getPackageConfig(){
            if(!this.form.packageConfig?.length){return}
            
            let unitTime = {
                hour: 1 / 30 / 24,
                day: 1 / 30,
                month: 1,
                year: 12,
            }

            let f = this.form;
            for(let i in f?.packageConfig){
                let p = f.packageConfig[i];
                let c = p?.config;
                let time = p.time * unitTime[p.timeUnit]

                c?.map(i=>{
                    let dc = 100;
                    i.unit = p.time + this.timeUnits[p.timeUnit];
                    i.total = (i.c * time * f.cpu) + (i.m * time * f.memory) + (i.s * time * f.storage) + (i.bw * time * f.bandwidth);
                    i.total = i.total * (dc / 100);
                    i.total = Number(i.total.toFixed(2));
                })
            }
        },
    },
}
</script>

<style scoped>
.com-table td{background-color:var(--color-neutral-1);}
</style>
<style>

.cost-showlist-tabs .arco-tabs-tab.arco-tabs-tab-active{background-color:var(--color-bg-3);}
.cost-showlist-tabs .arco-tabs-content{background-color:var(--color-bg-3);}
.cost-showlist-tabs .arco-form-item{margin-bottom:10px;}
</style>