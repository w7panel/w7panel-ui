<template>
    <a-drawer
        :width="1200"
        :visible="visible"
        @cancel="closeDrawer()"
        @ok="submit"
    >
        <template #title>全网发布</template>
        <div class="padding-20">
            <a-form :model="form" auto-label-width>
                <a-form-item label="全网发布">
                    <a-switch v-model="form.showInShop"></a-switch>
                </a-form-item>
                <a-form-item label="名称">
                    <a-input v-model="form.name" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="城市">
                    <a-select v-model="form.province" @change="()=>form.city=''" placeholder="请选择省份">
                        <a-option v-for="value of Object.keys(city)">{{value}}</a-option>
                    </a-select>
                    <a-select :options="form.province?city[form.province] : []" v-model="form.city" class="ml-20" placeholder="请选择城市" />
                </a-form-item>
                <a-form-item label="配额套餐">
                    <table class="com-table"><tbody>
                        <tr>
                            <td>上/下架</td>
                            <td>配额</td>
                            <td>价格</td>
                            <td>标签</td>
                            <td>描述</td>
                        </tr>
                        <template v-for="(pc,index) in form.packageConfig" :key="index">
                            <tr v-for="(c,cindex) in (pc.config||[])">
                                <!-- <td>{{ pc.time + timeUnit[pc.timeUnit] }}</td> -->
                                <td>
                                    <a-switch v-model="c.online" @change="watchOnline"></a-switch>
                                </td>
                                <td>{{ `${c.c}核/${c.m}G/${c.s}G/${c.bw}Mbps` }}</td>
                                <td>
                                    <span>{{ c.price }}元/{{ pc.time + timeUnit[pc.timeUnit] }}{{ c.give? '(赠送)' : c.discountTxt }}</span>
                                </td>
                                <td>
                                    <a-input v-model="c.label" placeholder="请输入标签" style="width:160px;"></a-input>
                                </td>
                                <td>
                                    <a-input-tag v-model="c.description" placeholder="可添加多个描述,按回车键确认" style="width:280px;"></a-input-tag>
                                </td>
                            </tr>
                        </template>
                    </tbody></table>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios';
import { useNamespaceStore } from '@/store';
import city from '@/config/city.json';

export default{
    props: ['show','data'],
    data(){
        return {
            timeUnit: {
                hour: '小时',
                day: '天',
                month: '月',
                year: '年',
            },
            namespaceActive: '',
            visible: false,
            form: {},
            city: {},
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.parseCitys();
    },
    watch: {
        show(){
            this.visible = this.show;
            if(!this.show){return}
            this.init();
        },
    },
    methods: {
        watchOnline(){
            let close = true;
            this.form.packageConfig.map(pc=>{
                pc.config.map(i=>{
                    if(i.online){close = false;}
                })
            })
            if(close){ this.form.showInShop = false; }
        },
        async init(){
            let ann = this.data?.metadata?.annotations || {};
            let name = ann?.['publish-title'] || ann?.title || this.data?.metadata?.name || '';
            let city = ann?.city?.split?.('/') || ['',''];
            let costName = this.data?.metadata?.annotations?.['w7.cc/cost-name'];
            let costPackage = {};
            let packageConfig = [];

            if(costName){
                await k8sproxy.get("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+ costName,{noAlert:true}).then(res=>{
                    costPackage = res?.data?.data;
                    packageConfig = costPackage.packageConfig;
                }).catch(()=>{
                    costName = '';
                    costPackage = JSON.parse(ann?.['w7.cc/cost']);
                    packageConfig = costPackage?.packageConfig;
                })
            }else{
                costPackage = JSON.parse(ann?.['w7.cc/cost']);
                packageConfig = costPackage?.packageConfig;
            }
            if(typeof packageConfig == 'string'){
                packageConfig = JSON.parse(packageConfig)
            }

            this.computedPrice(costPackage,packageConfig);

            this.form = {
                ...this.form,
                showInShop: this.data?.metadata?.labels?.['w7.cc/showInShop']==='true',
                name: name,
                province: city[0],
                city: city[1],
                packageConfig: packageConfig,
                costName: costName,
            }
        },
        submit(){
            let o = [{
                op: 'replace',
                path: '/metadata/annotations/publish-title',
                value: this.form.name,
            },{
                op: 'replace',
                path: '/metadata/annotations/city',
                value: this.form.province + '/' + this.form.city,
            },{
                op: 'replace',
                path: '/metadata/labels/w7.cc~1showInShop',
                value: String(this.form.showInShop),
            }];
            let packageConfig = this.form.packageConfig;
            packageConfig = packageConfig.map(i=>{
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
            })

            let cost = this.data.metadata.annotations['w7.cc/cost'] || '{}'
            cost = JSON.parse(cost);
            cost.packageConfig = packageConfig;
            cost = JSON.stringify(cost);

            o.push({
                op: 'replace',
                path: '/metadata/annotations/w7.cc~1cost',
                value: cost,
            })

            if(this.form.costName){
                k8sproxy.patch("/api/v1/namespaces/"+ this.namespaceActive +"/configmaps/"+ this.form.costName,[{
                    op: 'replace',
                    path: '/data/packageConfig',
                    value: JSON.stringify(packageConfig),
                }],{
                    headers: {'Content-Type': 'application/json-patch+json'},
                });
            }

            k8sproxy.patch('/apis/k3k.io/v1alpha1/virtualclusterpolicies/'+this.data.metadata.name, o,{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功');
                this.$emit('submit');
            })

        },
        computedPrice(cost,packageConfig){
            let pc = Number(cost.cpu);
            let pm = Number(cost.memory);
            let ps = Number(cost.storage);
            let pbw = Number(cost.bandwidth);
            let times = {
                'hour': 1 / 30 / 24,
                'day': 1 / 30,
                'month': 1,
                'year': 12,
            }
            packageConfig?.map?.((i,index)=>{
                i.config.map((config,cid)=>{
                    let dc = 100;
                    if(Number(config.dc_new)>0&&Number(config.dc_new)<100){
                        dc = Number(config.dc_new);
                    }else if(Number(i.discount_new)>0&&Number(i.discount_new)<100){
                        dc = Number(i.discount_new);
                    }
                    let c = config.c * pc * i.time * times[i.timeUnit];
                    let m = config.m * pm * i.time * times[i.timeUnit];
                    let s = config.s * ps * i.time * times[i.timeUnit];
                    let bw = config.bw * pbw * i.time * times[i.timeUnit];
                    let price = (c + m + s + bw) * dc / 100;
                    price = Number(price.toFixed(2));
                    config.price = price;
                    config.discountTxt = this.discountTxt(dc);
                    config.discountTxt = config.discountTxt?`(${config.discountTxt})`:'';
                })
            })
        },
        discountTxt(discount){
            discount = Number(discount);
            if(discount>=100){return ''}
            return Number((discount/10).toFixed(2)) + '折';
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        parseCitys(){
            this.city = {};
            city.map(i=>{
                let arr = i.children.map(i=>i.name);
                this.city[i.name] = arr;
            })
        }
    }
}
</script>
<style scoped>
</style>