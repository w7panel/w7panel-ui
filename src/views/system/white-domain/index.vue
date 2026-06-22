<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <div class="mb-20 df ai-c">
                <span>开启：</span>
                <a-switch v-model="configDisable" :checked-value="false" :unchecked-value="true"></a-switch>
            </div>
            <a-tabs v-model:active-key="tab">
                <a-tab-pane key="1" title="白名单配置"></a-tab-pane>
                <a-tab-pane key="2" title="错误页配置"></a-tab-pane>
            </a-tabs>
            <div v-if="tab=='1'">
                <table class="com-table mt-10" ><tbody>
                    <tr class="thead">
                        <td>域名</td>
                        <td>开启</td>
                        <td>操作</td>
                    </tr>
                    <tr v-for="(item,index) in list" :key="index" style="background:var(--color-neutral-1);">
                        <td>
                            <a-input v-model="item.domain" placeholder="请输入域名"></a-input>
                        </td>
                        <td>
                            <a-switch v-model="item.enable"></a-switch>
                        </td>
                        <td>
                            <span class="c-blue cursor" @click="list.splice(index,1);">删除</span>
                        </td>
                    </tr>
                    <tr style="background:var(--color-neutral-1);">
                        <td colspan="3" class="cursor" @click="list.push({domain:'',enable:false})">
                            <div class="df ai-c jc-c">
                                <icon-plus :size="14" class="c-99" />
                                <span class="c-99 lh-1" style="margin-left:6px;">添加</span>
                            </div>
                        </td>
                    </tr>
                </tbody></table>
            </div>
            <div v-if="tab=='2'">
                <a-form ref="errpage" :model="errpage" validate-trigger="blur" auto-label-width >
                    <a-form-item label="错误码">
                        <a-input v-model="errpage.code" type="number" placeholder="请输入"></a-input>
                    </a-form-item>
                    <a-form-item label="内容">
                        <a-textarea v-model="errpage.content" placeholder="请输入内容" style="height:240px;" />
                    </a-form-item>
                </a-form>
            </div>
            <div class="mt-40 df jc-e">
                <a-button type="primary" @click="submit">确定</a-button>
            </div>
        </div>
    </div>
</template>
<script>
import { k8sproxy } from '@/utils/api';
import psl from 'psl';

export default{
    data(){
        return {
            data: null,
            tab: '1',

            configDisable: true,
            list: [],
            errpage: {
                code: '404',
                content: 'not found',
            },
        }
    },
    created(){
        this.init();
    },
    methods: {
        init(){
            k8sproxy.get('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins?labelSelector=higress.io/wasm-plugin-name=w7-white-domain',{
                noAlert: true,
            }).then(res=>{
                let data = res?.data?.items?.[0];
                if(!data){return}

                this.data = data;
                this.configDisable = data?.spec?.defaultConfigDisable,
                this.list = data?.spec?.defaultConfig?.white_domains || [];
                this.errpage = {
                    code: data?.spec?.defaultConfig?.response_code,
                    content: data?.spec?.defaultConfig?.response_content,
                }
            })
        },
        submit(){
            let valid = true;
            this.list.map(i=>{
                if(psl && i.domain && !psl?.isValid(i.domain)){
                    this.$message.error('“' + i.domain + '”包含无效的公共后缀')
                    valid = false;
                }
            })
            if(!valid){return}
            
            k8sproxy.patch('/apis/extensions.higress.io/v1alpha1/namespaces/higress-system/wasmplugins/'+this.data?.metadata?.name, [{
                op: 'replace',
                path: '/spec/defaultConfigDisable',
                value: this.configDisable,
            },{
                op: 'replace',
                path: '/spec/defaultConfig',
                value: {
                    response_code: this.errpage.code,
                    response_content: this.errpage.content,
                    white_domains: this.list,
                }
            }],{
                headers: {'Content-Type': 'application/json-patch+json'},
            }).then(res=>{
                this.$message.success('操作成功')
                this.init();
            })
        },
    }
}
</script>
<style scoped>
</style>
