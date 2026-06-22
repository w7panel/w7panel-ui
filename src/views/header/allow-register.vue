<template>
    <div class="df df-c ai-c bg-white" style="height:100%;">
        <div class="mt-40" style="width:400px;">
            <a-form ref="form" :model="form" :rules="rules" auto-label-width>
                <a-form-item label="用户名" field="username">
                    <a-input v-model="form.username" placeholder="请输入"></a-input>
                </a-form-item>
                <a-form-item label="密码" field="password">
                    <a-input v-model="form.password" placeholder="请输入" type="password"></a-input>
                </a-form-item>
                <a-form-item label="确认密码" field="passwordcheck">
                    <a-input v-model="form.passwordcheck" placeholder="请输入" type="password"></a-input>
                </a-form-item>
                <a-form-item label="">
                    <a-button type="primary" :loading="form.loading" @click="submit">确定</a-button>
                </a-form-item>
            </a-form>
        </div>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';


export default {
    data(){
        return {
            form: {
                loading: false,
                username: '',
                password: '',
            },
            rules: {
                username: [{ required: true, message: '请输入名称', trigger: 'blur' }],
                password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
                passwordcheck: [{ required: true, message: '请输入密码', trigger: 'blur' },{validator:(value,cb)=>{value!==this.form.password?cb('两次密码不一致'):cb()}}],
            }
        }
    },
    created(){

    },
    methods: {
        submit(){
            this.$refs.form.validate((err) => {
                if (err) {
                    this.$refs.form.scrollToField(Object.keys(err)[0])
                    return;
                }
                this.form.loading = true;
                let policyName = this.$route.query.policyName;
                panelApi.post('/auth/register',{
                    policyName,
                    username: this.form.username,
                    password: this.form.password,
                }).then(async (res)=>{
                    if(!res?.data){return;}
                    this.$message.success('操作成功')
                    this.$router.replace('/allow-register/check');
                }).finally(()=>{
                    this.form.loading = false;
                })
            });
        }
    }
}
</script>

<style>

</style>