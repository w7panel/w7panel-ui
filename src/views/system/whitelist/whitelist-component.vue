<template>
    <div>
        <table class="com-table ftable"><tbody>
            <tr class="thead" >
                <td>域名</td>
                <td>随机前缀</td>
                <td>启用</td>
                <td>操作</td>
            </tr>
            <tr><td colspan="4" style=" box-sizing:border-box; cursor:pointer;background:var(--color-neutral-1);" :class="{'disabled-row':disabled}" @click="add">
                <div class="df ai-c jc-c">
                    <icon-plus :size="14" class="c-99" />
                    <span class="c-99 lh-1" style="margin-left:6px;">添加域名</span>
                </div>
            </td></tr>
            <tr v-for="(item,index) in list" :key="index" style="background:var(--color-neutral-1);">
                <td>
                    <a-input v-model="item.domain" :disabled="disabled" placeholder="请输入域名">
                        <template #prefix>{{item.prefix}}</template>
                    </a-input>
                </td>
                <td>
                    <a-switch v-model="item.prefixRandom" :disabled="disabled"></a-switch>
                </td>
                <td>
                    <a-switch v-model="item.disabled" :disabled="disabled" :checked-value="false" :unchecked-value="true"></a-switch>
                </td>
                <td>
                    <span class="c-blue cursor operation" :class="{'disabled-action':disabled}" @click="del(index)">删除</span>
                </td>
            </tr>
        </tbody></table>
    </div>
</template>

<script>
export default {
    props: ['data','disabled'],
    data(){
        return {
            list: [],
            form: {
                show:false,
            },
        }
    },
    created(){
        this.list = this.data?.length? this.data : [];
    },
    watch: {
        data(v){
            this.list = v?.length? v : [];
        }
    },
    methods: {
        add(){
            if(this.disabled){return}
            this.list.push({
                prefix: '*.',
                domain: '',
                prefixRandom: false,
                disabled: false,
            })
        },
        del(index){
            if(this.disabled){return}
            this.list.splice(index,1);
        },
        getList(){
            return this.list.filter(i=>i.domain);
        },
    },
}
</script>

<style>
.disabled-row{cursor:not-allowed!important;}
.disabled-action{color:var(--color-text-3)!important;cursor:not-allowed!important;}
</style>
