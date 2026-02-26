<template>
    <a-drawer :width="1200" :visible="visible" @cancel="closeDrawer()" unmountOnClose :mask-closable="false" :popup-container="false?'#allmodalbox':'body'">
        <template #title>{{tabs&&tabs.length?'编辑应用':'创建应用'}}</template>
        <a-tabs
            :active-key="activeIndex"
            type="card"
            :editable="true"
            @tab-click="v=>activeIndex=v"
            @add="v=>addTab(v)"
            @delete="v=>deleteTab(v)"
            show-add-button
            class="addapp-drawer df-s0"
        >
            <a-tab-pane v-for="(item,index) in list" :key="item.key" :title="item.title" :closable="index!==0&&!item.defaultName">
                <app-form
                    :ref="item.key"
                    :id="item.defaultName||''"
                    :kind="item.kind"
                    :parent="index==0?false:list[0].name"
                    :groupname="groupname"
                    :afterName="item.afterName"
                    @getInfo="v=>getItemInfo(v,index)"
                    @showTestResource="v=>showTestResource(v,item.key)"
                />
            </a-tab-pane>
        </a-tabs>
        <template #footer>
            <div v-if="testResourceDom[activeIndex]" class="df jc-e" style="margin-bottom:20px;">
                <div>
                    <div class="c-red">
                        <span>POD规格：{{testResourceDom[activeIndex].cpu||'0'}}核 / {{testResourceDom[activeIndex].memory||'0'}}</span>
                        <span style="margin:0 10px;">|</span>
                        <span>实例数量：{{testResourceDom[activeIndex].replica || 0}}</span>
                        <span style="margin:0 10px;">|</span>
                        <span>剩余资源：{{testResourceDom[activeIndex].availableResource.cpu.value + testResourceDom[activeIndex].availableResource.cpu.unit}}核 / {{testResourceDom[activeIndex].availableResource.memory.value + testResourceDom[activeIndex].availableResource.memory.unit}}</span>
                    </div>
                    <div class="mt-10">
                        <a-alert v-if="testResourceDom[activeIndex].availableResource.passed" type="success">检测通过，可正常创建！</a-alert>
                        <a-alert v-else type="error">检测失败，剩余配额不足，无法创建！</a-alert>
                    </div>
                </div>
            </div>
            <div>
                <a-button @click="closeDrawer">取消</a-button>
                <a-button class="ml-20" type="primary" :loading="submitLoading" @click="createApp">确定</a-button>
            </div>
        </template>
    </a-drawer>
</template>

<script>
import appForm from '@/components/app-form.vue';
import { useLoadingStore } from '@/store';

export default {
    props: ['show', 'tabs', 'activeName', 'groupname'],
    emits: ['close'],
    data(){
        return {
            visible: false,
            activeIndex: '',
            list: [],
            createList: [],
            submitLoading: false,
            possibleChanged: [], // 可能修改过的应用，不提交没修改过的应用
            testResourceDom: {},
        }
    },
    components: {appForm},
    watch:{
        show(v){
            this.visible = v;
            v && this.init();
        },
        activeIndex(v){
            if(!this.possibleChanged.includes(v)){
                this.possibleChanged.push(v);
            }
        },
    },
    created(){
        this.init();  
    },
    methods:{
        showTestResource(data,key){
            this.testResourceDom[key] = {
                availableResource: {
                    cpu: {},
                    memory: {},
                },
                ...data
            };
        },
        init(){
            if(this.tabs?.length){
                this.list = this.tabs.map(i=>({
                    key: i.kind + i.name,
                    defaultName: i.name,
                    name: i.name,
                    title: i.title,
                    suffix: i.suffix,
                    kind: i.kind,
                }));
                this.activeIndex = this.activeName || this.list[0].key;
                this.possibleChanged = [this.activeIndex];
            }else{
                this.list = [{
                    key: 'app'+Date.now(),
                    afterName: this.createName(),
                    title: '新建应用',
                }];
                this.createList = [];
                this.activeIndex = this.list[0].key;
                this.possibleChanged = [this.activeIndex];
            }
        },
        deleteTab(key){
            let index = this.list.findIndex(i=>i.key==key);
            if(this.activeIndex==this.list[index].key){
                this.activeIndex = this.list[index-1].key;
            }
            this.list.splice(index, 1);
        },
        // 添加子应用
        addTab(){
            let afterName = this?.list?.[0]?.suffix || this?.list?.[0]?.afterName || this?.list?.[0]?.name?.replace(/^.*-(\w+)$/,'$1') || this.createName()
            this.list.push({
                key: 'app'+Date.now(),
                afterName:afterName,
                title: '子应用'
            })
            this.activeIndex = this.list[this.list.length-1].key;
        },
        getItemInfo(obj,index){
            this.list[index].name = obj.name || this.list[index].name;
            this.list[index].title = obj.title || this.list[index].name;
            if(obj.isSubmit){
                if(obj.submitStatus){
                    this.createList.push(obj.name)
                    if(this.list.length==this.createList.length){
                        this.$message.success('操作成功');
                        setTimeout(()=>{
                            this.closeDrawer(true);
                        }, 600);
                    }
                }else{
                    this.activeIndex = this.list[index].key;
                }
            }
        },
        // 关闭抽屉
        closeDrawer(v){
            this.visible = false;
            this.$emit('close', v);
        },
        async createApp(){
            this.createList = [];
            this.submitLoading = true;
            let error = false;
            useLoadingStore().loading = true;
            for(let i=0; i<this.possibleChanged.length; i++){
                if(error){break}
                await this.$refs[this.possibleChanged[i]]?.[0]?.submit(true).catch(()=>{
                    this.submitLoading = false;
                    useLoadingStore().loading = false;
                    this.activeIndex = this.possibleChanged[i];
                    error = true;
                });
            }
            if(error){ return; }
            useLoadingStore().loading = false;
            this.$message.success('操作成功');
            this.$emit('close',true);
            setTimeout(()=>{
                this.submitLoading = false;
            },600)
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
    },
}
</script>

<style>
.addapp-drawer .arco-tabs-content{padding:16px;}
</style>