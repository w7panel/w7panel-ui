<template>
    <div class="padding-20">
        <route-breadcrumb />
        <div class="bg-white padding-20">
            <a-tabs v-model:active-key="tabAct">
                <a-tab-pane key="1" title="已购买云端应用">
                    <div>
                        <a-input-search v-model="searchTitle" placeholder="请输入应用名称" class="mb-10" style="width:300px" @search="getAppList" @press-enter="e=>{getAppList();e.stopPropagation()}" search-button />
                    </div>
                    <div class="df df-ww mt-20">
                        <store-item v-for="item in list" :key="item" @install="testItem" :data="item" class="item" />
                        <a-empty v-if="!list || !list.length" class="mt-40" />
                    </div>
                </a-tab-pane>
                <a-tab-pane key="2" title="云端免费应用">
                    <div>
                        <a-input-search v-model="searchTitle" placeholder="请输入应用名称" class="mb-10" style="width:300px" @search="getAppList" @press-enter="e=>{getAppList();e.stopPropagation()}" search-button />
                    </div>
                    <div class="df df-ww mt-20">
                        <store-item v-for="item in freeList" :key="item" @install="testItem" :data="item" class="item" />
                        <a-empty v-if="!freeList || !freeList.length" class="mt-40" />
                    </div>
                </a-tab-pane>
                <!-- <a-tab-pane key="3" title="云端测试应用">
                    <div class="df df-ww mt-0">
                        <store-item v-for="item in testList" :key="item" @install="testItem" :data="item" class="item" />
                        <a-empty v-if="!testList || !testList.length" class="mt-40" />
                    </div>
                </a-tab-pane> -->
            </a-tabs>
        </div>
        
        <a-modal :visible="adminItem.dialog" width="640px">
            <template #title>选择版本</template>
            <a-form ref="selectverson" :model="adminData" auto-label-width>
                <a-form-item label="item" field="item_id" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-select v-model="adminData.item_id" placeholder="请选择" style="width:500px;">
                        <el-option v-for="item in adminItem.list" :key="item.id" :label="item.outer_order_id" :value="item.id"></el-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="版本号" field="version" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-input v-model="adminData.version" placeholder="请输入版本号" style="width:500px;"></a-input>
                </a-form-item>
                <a-form-item label="版本类型" field="is_test" :rules="[{required:true,message:'内容不能为空'}]">
                    <a-select v-model="adminData.is_test" placeholder="请选择" style="width:500px;">
                        <a-option label="在线版本" :value="1"></a-option>
                        <a-option label="测试版本" :value="2"></a-option>
                        <a-option label="未审核版本" :value="3"></a-option>
                    </a-select>
                </a-form-item>
            </a-form>
            <template #footer>
                <a-button @click="adminItem.dialog=false;nextStep(adminItem);">跳过</a-button>
                <a-button type="primary" @click="selectVerson">确定</a-button>
            </template>
        </a-modal>
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import axios from 'axios'
import storeItem from './store-item.vue'
import { getUserInfo } from '@/utils/auth';

export default {
    data() {
        return {
            searchTitle: '',
            tabAct: '1',
            list: [],
            freeList: [],
            testList: [],

            adminItem: {
                dialog: false,
                list: [],
                item: null,
                ok: false,
            },
            adminData: {
                ok: false,
                item_id: '',
                version: '',
                is_test: '',
            },
            activeApp: {},
            clusterId: '',
            tpcdtoken: '',
        }
    },
    components: { storeItem },
    async created() {
        await panelApi.get("/auth/console/info").then(res=>{
            this.clusterId = res?.data?.cluster_id;
            this.tpcdtoken = res?.data?.thirdparty_cd_token;
        });
        if(!this.tpcdtoken){return;}
        this.getAppList()
    },
    watch: {
        tabAct(v){
            this.getAppList()
        }
    },
    methods: {
        testItem(item){
            // console.log(item);return;
            this.adminData.ok = false;
            this.adminItem.item = item;
            if(!item.admin_item_list?.length){
                this.nextStep(item);
                return;
            }
            this.adminItem.list = item.admin_item_list;
            this.adminItem.dialog = true;
        },
        // 选择版本
        selectVerson(){
            this.$refs.selectverson.validate((err) => {
                if(err) {return}
                axios.post("https://console.w7.cc/api/deploy/thirdparty-cd/choose-version",{...this.adminData},{customToken: this.tpcdtoken}).then(res=>{
                    if(!res?.data){return}
                    this.adminData.ok = true;
                    this.adminItem.ialog = false;
                    this.nextStep(this.adminItem);
                })
            });
        },
        async nextStep(item) {
            if(item.is_need_create_deploy) {
                if(this.tabAct == '2') {
                    await axios.post('https://console.w7.cc/api/deploy/thirdparty-cd/create-free', {
                        module_name: item.module_name
                    },{
                        customToken: this.tpcdtoken,
                        loading: true,
                    }).then(res => {
                        item.id = res.data.deploy_id;
                        item.item_id = res.data.item_id;
                    })
                } else if (this.tabAct == '3') {
                    // this.is_test_default = 2;
                    // await this.createdTest(item)
                    
                    await axios.post('https://console.w7.cc/api/deploy/thirdparty-cd/create-test', {
                        module_name: item.module_name,
                        module_version: item.version
                    }, {
                        customToken: this.tpcdtoken,
                        loading: true,
                    }).then(res => {
                        item.id = res.data.deploy_id
                        item.item_id = res.data.item_id;
                        return item
                    })
                }
            }

            axios.get(`https://console.w7.cc/api/deploy/thirdparty-cd/${item.id}/config`, {
                params: {
                    item_id: item.item_id || (this.adminData.ok? this.adminData.item_id : '')
                },
                customToken: this.tpcdtoken,
                loading: true,
            }).then(res => {
                this.activeApp = Object.assign({}, item, res.data)

                if(this.activeApp.has_backend){
                    let deployid = this.activeApp.id;
                    let item_id = item.item_id || (this.adminData.ok? this.adminData.item_id : (this.$route.query.item_id? this.$route.query.item_id : ''));
                    let path = 'deploy://console/'+deployid+'/'+item_id;
                    this.$router.push('/app/store-install?path=' + encodeURIComponent(path) +'&insClusterId='+ this.clusterId + '&thirdpartyCDToken=' + this.tpcdtoken);
                    return;
                }else{
                    this.$message.warning('暂不支持轻应用安装');
                }
            })
        },
        
        getAppList(){
            if(!this.tpcdtoken){return;}
            if(this.tabAct=='1'){
                this.getList();
            }else if(this.tabAct=='2'){
                this.getFreeList();
            }else if(this.tabAct=='3'){
                this.getTestList();
            }
        },
        getTestList(){
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/test-list',{customToken: this.tpcdtoken}).then(res=>{
                this.testList = res.data;
            })
        },
        getFreeList(){
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/free-list?has_backend=2&key_words='+this.searchTitle,{customToken: this.tpcdtoken}).then(res=>{
                this.freeList = res.data;
            })
        },
        getList(){
            let userInfo = getUserInfo();
            let is_demo = userInfo?.['w7.cc/demo-user'] === 'true';
            axios.get('https://console.w7.cc/api/deploy/thirdparty-cd/list?not_app=1&page=1&per_page=999&is_demo='+is_demo+'&title='+this.searchTitle,{loading:true,customToken: this.tpcdtoken}).then(res=>{
                this.list = res.data.data; //.filter(i=>i.can_install)
            })
        }
    },
}
</script>

<style scoped>
.item{margin-right:20px; margin-bottom:20px;}
</style>