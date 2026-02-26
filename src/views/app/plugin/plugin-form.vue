<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" unmountOnClose>
        <template #title>{{data?'修改插件':'添加插件'}}</template>
        <a-form ref="newform" :model="newForm" validate-trigger="blur" auto-label-width >
            <a-form-item label="access_key">
                <a-input v-model="newForm.access_key" :spellcheck="false" placeholder="请输入" />
                <template #extra>s3 access_key</template>
            </a-form-item>
            <a-form-item label="secret_key">
                <a-input v-model="newForm.secret_key" :spellcheck="false" placeholder="请输入" />
                <template #extra>s3 secret_key</template>
            </a-form-item>
            <a-form-item label="bucket">
                <a-input v-model="newForm.bucket" :spellcheck="false" placeholder="请输入" />
                <template #extra>s3 bucket</template>
            </a-form-item>
            <a-form-item label="host">
                <a-input v-model="newForm.host" :spellcheck="false" placeholder="请输入" />
                <template #extra>s3的host地址必须为集群应用内网地址</template>
            </a-form-item>
            <a-form-item label="地区">
                <a-input v-model="newForm.region" :spellcheck="false" placeholder="请输入" />
                <template #extra>地区</template>
            </a-form-item>
            <!-- <a-form-item label="缓存header">
                <a-switch v-model="newForm.cache_header" />
                <template #extra>是否缓存header</template>
            </a-form-item>
            <a-form-item label="过期时间">
                <a-input v-model="newForm.cache_ttl" type="number" :spellcheck="false" placeholder="请输入">
                    <template #suffix>秒</template>
                </a-input>
                <template #extra>0为不过期，默认300秒</template>
            </a-form-item> -->
            <!-- <a-form-item v-if="newForm.is_global" label="开启">
                <a-switch v-model="newForm.disabled" :checked-value="false" :unchecked-value="true" />
            </a-form-item> -->
        </a-form>
    </a-drawer>
</template>

<script>
export default {
    props: ['show','data'],
    data(){
        return {
            visible: false,
            newForm: {},
        }
    },
    created(){
        this.getData()
    },
    watch: {
        show(v){
            this.visible = v;
            if(!v){return}
            this.getData();
        },
    },
    methods: {
        getData(){
            let data = this.data || {};
            this.newForm = {
                priority: '',
                access_key: "",
                secret_key: "",
                bucket: "",
                host: "",
                region: "",
                cache_header: false,
                cache_ttl: 300,
                disabled: true,
                rewrite_host: '',
                ...data,
            };
        },
        submit(){
            this.$emit('submit',this.newForm);
        },
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
    },
}
</script>

<style>

</style>