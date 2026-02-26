<template>
    <a-drawer :width="1200" title="配置" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose>
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
                    <a-input v-model="errpage.content" placeholder="请输入"></a-input>
                </a-form-item>
            </a-form>
        </div>
    </a-drawer>
</template>
<script>
import psl from 'psl';

export default{
    props: ['show','data'],
    data(){
        return {
            visible: false,
            tab: '1',
            list: [],
            errpage: {
                code: '404',
                content: '',
            },
        }
    },
    created(){},
    watch:{
        show(v){
            this.visible = v;
            if(!v){return}
            this.init();
        },
    },
    methods: {
        init(){
            this.list = this.data?.list || [];
            this.errpage = this.data?.errpage || {
                code: '404',
                content: '',
            }
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
            this.$emit('submit',{
                list: this.list.filter(i=>i.domain),
                errpage: this.errpage,
            })
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    }
}
</script>
<style scoped>
</style>