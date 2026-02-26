<template>
    <a-drawer :width="1000" :visible="visible" @ok="submit" @cancel="closeDrawer()" :header="false" :mask-closable="false" unmountOnClose :popup-container="false?'#allmodalbox':'body'">
        <!-- <template #title>{{id?'修改应用':'添加应用'}}</template> -->
        <div >
            <app-form
                ref="appform"
                :id="id"
                :kind="$route.params.kind"
                :groupname="groupname"
                :afterName="afterName"
                @getInfo="getInfo"
                @showTestResource="v=>testResourceDom=v"
            ></app-form>
        </div>
        <template #footer>
            <div v-if="testResourceDom" class="df jc-e" style="margin-bottom:20px;">
                <div>
                    <div class="c-red">
                        <span>POD规格：{{testResourceDom.cpu||'0'}}核 / {{testResourceDom.memory||'0'}}</span>
                        <span style="margin:0 10px;">|</span>
                        <span>实例数量：{{testResourceDom.replica || 0}}</span>
                        <span style="margin:0 10px;">|</span>
                        <span>剩余资源：{{testResourceDom.availableResource.cpu.value + testResourceDom.availableResource.cpu.unit}}核 / {{testResourceDom.availableResource.memory.value + testResourceDom.availableResource.memory.unit}}</span>
                    </div>
                    <div class="mt-10">
                        <a-alert v-if="testResourceDom.availableResource.passed" type="success">检测通过，可正常创建！</a-alert>
                        <a-alert v-else type="error">检测失败，剩余配额不足，无法创建！</a-alert>
                    </div>
                </div>
            </div>
            <div>
                <a-button @click="closeDrawer()">取消</a-button>
                <a-button class="ml-20" type="primary" @click="submit">确定</a-button>
            </div>
        </template>
    </a-drawer>
</template>

<script>
import appForm from '@/components/app-form.vue'
// import { useLoadingStore } from '@/store';
// import { getUserInfo } from '@/utils/auth';

export default {
    props: ['show','id','defaultData','parent','afterName','groupname'],
    data(){
        return {
            visible: false,
            testResourceDom: null,
        }
    },
    created(){
    },
    watch:{
        show(){
            this.visible = this.show;
        },
    },
    components: { appForm },
    methods: {
        getInfo(v){
            if(!v.isSubmit){return}
            setTimeout(()=>{
                this.$emit('submitOk');
                this.closeDrawer();
            },800)
        },
        closeDrawer(refreshList){
            this.visible = false;
            this.$emit('close',refreshList);
        },
        async submit(){
            this.$refs.appform.submit();
        },
    },
}
</script>

<style scoped>
</style>