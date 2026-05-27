<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <Breadcrumb v-if="$route.name=='group-micro'||$route.name=='group-micro2'" :routes="topbc" />
        <route-breadcrumb v-else class="df-s0" :data="{id:title || ($route.params.group || '')}" />
        <a-layout class="fc">
            <a-layout-sider :width="160">
                <div class="df df-c menu-absolute-div" style="position:absolute;inset:0;overflow:auto;">
                    <div v-if="roles.length" style="width:100%;">
                        <div v-for="role in roles" :key="role.name">
                            <!-- <div v-if="roles.length>1" class="c-99 ml-16" style="padding:10px 0;">{{ role.title }}</div> -->
                            <div v-if="roles.length>1 && role.menus && role.menus.length" class="c-aa ml-20" style="padding:10px 0;">
                                <IconUserGroup />
                                <span class="ml-10">{{ role.title }}</span>
                            </div>
                            <a-menu v-if="role.menus && role.menus.length" style="width:100%;" :level-indent="34" v-model:selected-keys="selectMenu" @menu-item-click="handelMicroMenu">
                                <template v-for="(menu,index) in role.menus" :key="menu.do">
                                    <a-menu-item v-if="!menu.children||!menu.children.length" :key="menu.do">
                                        <template #icon>
                                            <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                            <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                            <IconMenu v-else />
                                        </template>
                                        <span>{{menu.title}}</span>
                                    </a-menu-item>
                                    <a-sub-menu v-else :key="index">
                                        <template #icon>
                                            <span v-if="menu.icon_svg" v-html="elementsToSvg(menu.icon_svg)"></span>
                                            <span v-else-if="menu.icon" class="wi" :class="'wi-'+menu.icon"></span>
                                            <IconMenu v-else />
                                        </template>
                                        <template #title>{{menu.title}}</template>
                                        <a-menu-item v-for="submenu in menu.children" :key="submenu.do">{{submenu.title}}</a-menu-item>
                                    </a-sub-menu>
                                </template>
                            </a-menu>
                        </div>
                    </div>
                    <a-menu v-if="menus.length" style="width:100%;" v-model:selected-keys="selectMenu" @menu-item-click="handelMicroMenu">
                        <template v-for="(menu,index) in menus" :key="menu.do">
                            <a-menu-item v-if="!menu.children||!menu.children.length" :key="menu.do">{{menu.title}}{{}}</a-menu-item>
                            <a-sub-menu v-else :key="index">
                                <template #title>{{menu.title}}</template>
                                <a-menu-item v-for="submenu in menu.children" :key="submenu.do">{{submenu.title}}</a-menu-item>
                            </a-sub-menu>
                        </template>
                    </a-menu>
                    
                    <div v-if="$route.name!='group-micro2'">
                        <a-divider v-if="menus.length || roles.length" style="margin:10px;width:auto;min-width:auto;" />
                        <div v-if="$route.name!=''">
                            <a-menu v-if="isHelmPage || (isMicroPage&&isHelmApp)" v-model:selected-keys="selectMenu" style="width:100%;" @menu-item-click="changeKey">
                                <a-menu-item key="group-helm-detail" ><icon-apps />应用详情</a-menu-item>
                                <a-menu-item key="group-helm-domain" ><icon-cloud />域名管理</a-menu-item>
                            </a-menu>
                            <a-menu v-else v-model:selected-keys="selectMenu" style="width:100%;" @menu-item-click="changeKey">
                                <a-menu-item key="app-detail-detail"><icon-apps />应用详情</a-menu-item>
                                <a-menu-item key="app-detail-pod"><icon-nav />容器列表</a-menu-item>
                                 <!-- v-if="permission.includes('app-apps-files')" -->
                                <a-menu-item v-if="fileeditor" key="app-detail-files"><icon-folder />文件管理</a-menu-item>
                                <a-menu-item key="app-detail-domain"><icon-cloud />域名管理</a-menu-item>
                                <a-menu-item key="app-detail-job"><icon-code-square />执行脚本</a-menu-item>
                                <a-menu-item key="app-detail-version"><icon-select-all />历史版本</a-menu-item>
                                <a-menu-item key="app-detail-moniter"><icon-bar-chart />运行状态</a-menu-item>
                            </a-menu>
                        </div>
                    </div>
                </div>
            </a-layout-sider>
            
            <a-layout-content v-if="(isMicroPage && isGpustackPage)" class="ml-6 df df-c">
                <div class="bg-white routerviewbox fc ml-6" >
                    <gpu-stack ref="gpustack" :app="gpustackApp"></gpu-stack>
                </div>
            </a-layout-content>
            <a-layout-content v-else-if="isMicroPage" class="ml-6 df df-c">
                <div class="bg-white routerviewbox fc ml-6" >
                    <div v-show="downOk" id="appmicro" style="height:calc(100vh - 146px);transform:translate(0,0);"></div>
                    <a-spin v-if="!downOk" :loading="!downOk" :size="32" tip="前端下载中..." style="display:block;height:calc(100vh - 146px);">
                        <div style="height:100%;" class="bg-white"></div>
                    </a-spin>
                </div>
            </a-layout-content>
            <a-layout-content v-else class="ml-6 df df-c">
                <a-tabs
                    :active-key="appname"
                    type="card"
                    :editable="permission.includes('app-apps-delete')"
                    @tab-click="tabClick"
                    @add="createApp"
                    @delete="delApp"
                    :show-add-button="$route.params.group!=='w7panel'&&permission.includes('app-apps-add')"
                    hide-content
                    class="appdetail-tabs df-s0"
                >
                    <a-tab-pane v-for="(item,index) in applist" :key="item.key" :title="item.title" :closable="index!==0&&!copying&&$route.params.group!=='w7panel'">
                        <template #title>
                            <a-checkbox v-if="copying&&!item.isHelm" v-model="copyList" :key="item.key" :value="item.key" @click.stop>{{item.title}}</a-checkbox>
                            <div v-else class="df ai-c" style="height:24px;">
                                <div v-if="!item.isHelm" class="point" :class="{red:item.status==2, green:item.status==1}"></div>
                                <div v-else class="point" style="width:0;"></div>
                                <div>{{item.title}}</div>
                            </div>
                        </template>
                    </a-tab-pane>
                    <template #extra>
                        <a-button @click="toCopy" v-if="$route.params.group!=='w7panel'" :type="copying?'primary':'outline'" :status="copying?'warning':''" size="mini">
                            <template #icon>
                                <icon-copy />
                            </template>
                            <span>{{copying?'执行':'复制'}}</span>
                        </a-button>
                    </template>
                </a-tabs>
                <div class="bg-white routerviewbox fc" >
                    <router-view v-if="$route.name=='app-detail-micro'" :url="appLocation" :data="data" @refresh="dataDetail" />
                    <router-view v-else-if="data||isHelmPage" :data="data" :identifie="identifie" :appList="applist" :title="title" @refresh="dataDetail" @editApp="openForm()"/>
                </div>
            </a-layout-content>
        </a-layout>
        
        <form-drawer :show="form.show" :id="form.name" @submitOk="getData" :groupname="$route.params.group" :afterName="form.suffix" @close="closeForm"></form-drawer>
        <!-- <addapp-drawer ref="addappdrawer" :show="form.show&&!form.id" :tabs="form.tabs" :activeName="form.id" @close="closeForm" /> -->
        
        <a-modal width="400px" v-model:visible="checkDelete.show" @ok="checkDelete.ok" @cancel="checkDelete.show=false;" :popup-container="false?'#allmodalbox':'body'">
            <template #title>删除应用</template>
            <div>
                <div class="df ai-c jc-c">
                    <div class="mb-20">确认要删除{{checkDelete.name}}吗？</div>
                </div>
            </div>
        </a-modal>

        <wujie-modals v-if="isMicroPage" />
    </div>
</template>

<script>
import { panelApi } from '@/utils/api';
import { k8sproxy } from '@/utils/api';
import { useNamespaceStore,useLoadingStore } from '@/store';
import formDrawer from '@/views/app/pages/form-drawer.vue';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";
import gpuStack from '@/views/app/gpustack/index.vue';
import { getPermission,getFileEditor ,getToken,getK8sinfo} from '@/utils/auth';
import wujieModals from '@/components/wujie-modals.vue';

const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
    tech: '技术人员',
    normal: '普通用户',
}

export default {
    data(){
        return {
            topbc: [
                {name:'root'},
                {name: "app", label: "应用管理"},
                {name: "app-detail", label: this.groupTitle || this.$route.params.group},
            ],
            isGpustackPage: false,
            isHelmPage: false,
            isHelmApp: false,
            form: {
                show: false,
                id: '',
                parent: '',
                tabs: [],
            },
            breadcrumbData: null,
            parent: '',
            namespaceActive: '',
            data: null,
            title: '',
            groupTitle: '',
            appname: '',
            applist: [],

            menukey: "",
            appMenu: [],
            appLocation: '',

            copying: false,
            copyList: [],
            checkDelete: {
                show: false,
                name: '',
                ok: ()=>{}
            },

            watchInterval: null,
            identifie: '',

            roles: [],
            menus: [],
            selectMenu: [],
            info: {},
            extra: {},
            gpustackApp: null,

            permission: [],
            fileeditor: '',

            hasThirdpartyCd: false,
            downOk: true,
            
        }
    },
    watch: {
        'selectMenu'(v){
            let title = '';
            if(this.isGpustackPage){
                this.menus.map(i=>{
                    if(i.do==v[0]){title = i.title}
                    if(i.children){
                        i.children.map(c=>{
                            if(c.do==v[0]){title = c.title}
                        })
                    }
                })
            }else{
                this.roles.map(r=>{
                    r.menus.map(i=>{
                        if(i.do==v[0]){title = i.title}
                        if(i.children){
                            i.children.map(c=>{
                                if(c.do==v[0]){title = c.title}
                            })
                        }
                    })
                })
            }
            this.topbc = [
                {name:'root'},
                {name: "app", label: "应用管理"},
                {name: "app-detail", label: this.groupTitle},
                {name: "app-detail", label: title},
            ]
        },
        '$route.name'(v,ov){
            this.getData();
        },
        '$route.params.page'(v){
            let p = this.$route.fullPath.replace('/app/appgroup/'+this.$route.params.group+'/'+this.$route.params.kind+'/'+this.$route.params.id+'/micro/','');
            this.menukey = p || '';
        },
        title(v){
            this.breadcrumbData = {id:v};
        },
    },
    async created(){
        this.permission = getPermission() || [];
        this.fileeditor = getFileEditor() == 'true';
        this.selectMenu = [this.$route.meta.routekey]
        this.namespaceActive = useNamespaceStore().namespace;
        this.groupTitle = this.$route.params.group;
        await this.getData();
        if(!this.isMicroPage && this.hasThirdpartyCd){
            this.getFront();
        }
    },
    computed:{
        isMicroPage(){ return this.$route.name == 'group-micro' || this.$route.name == 'group-micro2'; },
        // isAiappPage(){ return this.$route.name == 'gpustack'; },
    },
    components: {
        formDrawer,
        gpuStack,
        wujieModals,
    },
    beforeUnmount(){
        if(this.watchInterval){
            clearInterval(this.watchInterval);
        }
        try{
            destroyApp('appmicro');
        }catch{}
        try{
            this.extra.setTimeout && clearTimeout(this.extra.setTimeout);
        }catch{}

    },
    methods: {
        async wujieInit(){
            
            try{
                destroyApp('appmicro');
            }catch(e){console.log('destroy err')}

            let is_register = false;
            let thirdparty_cd_token = '';
            await panelApi.get("/static/"+ this.extra.identifie +"/status",{params:{
                version: this.extra.version,
                releaseName: this.extra.name,
            }}).then(res=>{
                this.downOk = res.data?.status !== 'no_download';
            })
            if(!this.downOk){
                panelApi.post(`/static/${this.extra.namespace}/download/${this.extra.name}`)
                this.extra.setTimeout = setTimeout(()=>{
                    this.wujieInit();
                }, 5000)
                return;
            }
            await panelApi.get("/auth/console/info").then(res=>{
                let data = res.data;
                is_register = data?.is_register;
                thirdparty_cd_token = data?.thirdparty_cd_token;
            });
            let props = {
                url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                domain: this.domain,
                isRegister: is_register,
                w7PanelToken: thirdparty_cd_token,
                paneltoken: getToken(),
                ...this.info,
            }
            console.log(props)
            startApp({
                name: "appmicro",
                url: this.info.frontendUrl + (this.menuActive || ''),
// 测试
// url: 'http://172.16.1.162:9090' + this.info.frontendUrl + (this.menuActive || ''),
                el: '#appmicro',
                // alive: true,
                sync: true,
                props: props,
            })
            // startApp({name:'appmicro'});
            
// 测试
// setTimeout(()=>{
//     this.zip({
//         pid: {
//             namespace: 'default',
//             HostIp: '172.16.1.162',
//             containerId: 'containerd://433217e458043e6760b415a791c2a9ad0757b23b66aa4d539c4a1cef7898547e',
//             containerName: 'w7-go',
//             podName: 'w7-go-7dc9bf7cf7-g8p4g',
//         },
//         output: '/home/txt.zip',
//         input: ['/home/aa.txt','/home/bb.txt'],
//     },(v)=>{
//         console.log(v);
//     })
// },3000)
        },
        handelMicroMenu(v){
            this.menuActive = v;
            this.selectMenu = [this.menuActive];
            if(this.isGpustackPage){
                if(this.isMicroPage){
                    this.$refs.gpustack.changeKey(v);
                }else{
                    this.$router.push('/app/appgroup/'+this.$route.params.group+'/micro?gpustackbox='+encodeURIComponent(this.info.frontendUrl + this.menuActive))
                }
            }else if(this.isMicroPage){
                bus.$emit("routeChange", v.replace(/^#/,''));
            }else{
                this.$router.push('/app/appgroup/'+this.$route.params.group+'/micro?appmicro='+encodeURIComponent(this.info.frontendUrl + this.menuActive)).then(res=>{
                    this.$nextTick(()=>{
                        this.wujieInit();
                    })
                })
            }
        },
        getFront(){

            // /apis/microapp.w7.cc/v1alpha1/namespaces/default/microapps/w7-sitemanager-htwgbayk
            // /apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/'+appgroup
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps/'+this.$route.params.group,{noAlert:true}).then(res=>{

                let item  = res?.data;
                if(!item){ return; }
                
                let userRole = getK8sinfo()['w7.cc/role'];
                let roleConfig = item?.spec?.['config-v2']?.props?.roleConfig || {};
                let roleProps = roleConfig?.[userRole] || {};
                if(roleConfig.founder && !roleConfig?.[userRole]){
                    roleProps = roleConfig.founder;
                }
                if(roleProps.frontend_props){
                    roleProps = {
                        ...roleProps,
                        ...roleProps.frontend_props,
                    }
                }

                this.info = {
                    ...this.info,
                    appgroup: this.$route.params.group,
                    frontendUrl: item?.spec?.frontendUrl,
// frontendUrl: 'http://localhost:8001',
                    backendUrl: item?.spec?.backendUrl,
                    appImage: item?.spec?.config?.props?.image,
                    ...item?.spec?.config?.props,
                    ...roleProps,
                }
                this.extra = {
                    identifie: item.metadata?.labels?.['w7.cc/identifie'] || '',
                    version: item.metadata?.labels?.['w7.cc/version'] || '',
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                }

                this.getMenu(item?.spec?.bindings||[]);
                if(this.isMicroPage){
                    let appmicro = this.$route.query?.appmicro;
                    appmicro = appmicro? decodeURIComponent(appmicro) : '';
                    appmicro = appmicro?.replace(this.info.frontendUrl,'');
                    this.menuActive = appmicro || this.roles?.[0]?.menus?.find(i=>i.is_default==1)?.do || this.roles?.[0]?.menus?.[0]?.do || '';
                    this.selectMenu = [appmicro];
                    if(!this.selectMenu[0] && this.menuActive){
                        this.selectMenu = [this.menuActive];
                    }
                    this.$nextTick(()=>{
                        this.wujieInit();
                    })
                }
            }).catch(()=>{
                this.noMicroJump();
            })
        },
        getMenu(bindings){

            let userRole = getK8sinfo()['w7.cc/role'];

            let roles = []
            try{
                let rl = bindings || [];
                rl = rl.filter(i=>i.support == "thirdparty_cd")
                rl.map(i=>{
                    let menus = i.menu || [];
                    menus.sort((a,b)=>b.displayorder-a.displayorder);
                    menus = this.transformMenu(menus)

                    roles.push({
                        title: ROLE_NAME[i.name] || i.name,
                        name: i.name,
                        menus: menus,
                    })
                })
            }catch{}
            roles.sort((a, b) => (b.name === 'founder') - (a.name === 'founder'));
            roles = this.filterMenu(roles);

            if(userRole=='founder'){
                this.roles = roles;
            }else{
                // let find = roles.find(i=>i.name==userRole)
                // this.roles = find?[find]:[];
                this.roles = roles;
            }
            if(!this.roles?.length){
                this.noMicroJump();
            }
            // console.log(bindings,roles,'xxxxxxxxxxx')
        },
        noMicroJump(){
            if(!this.isMicroPage){return}
            if(this.isHelmApp){
                this.$router.push({path:'/app/appgroup/'+ this.$route.params.group+'/helm/detail'}).then(()=>{
                    this.selectMenu = [this.$route.meta.routekey]
                });
                return;
            }
            let app = this.applist.find(i=>!i.isHelm)
            this.$router.push({name:'app-detail',params:{group:this.$route.params.group, id:app?.name, kind:app?.kind}}).then(()=>{
                this.selectMenu = [this.$route.meta.routekey]
            });
        },
        
        filterMenu(roles){
            function filterDuplicateMenus(menuArray) {
                // 用于记录已经出现过的do路径，Set查询效率更高
                const existedPaths = new Set();
                
                // 遍历数组并处理每个元素，返回新数组（不修改原数组）
                return menuArray.map(item => {
                    // 过滤当前元素的menus，只保留未出现过的路径
                    const filteredMenus = item.menus.filter(menu => {
                        // 确保do字段存在，避免报错
                        if (!menu.do) return false;
                        // 如果路径未出现过，则保留并记录
                        if (!existedPaths.has(menu.do)) {
                            existedPaths.add(menu.do);
                            return true;
                        }
                        // 路径已存在，过滤掉
                        return false;
                    });
                    
                    // 返回新的元素对象，保持其他字段不变，仅替换menus
                    return {
                        ...item,
                        menus: filteredMenus
                    };
                });
            }
            return filterDuplicateMenus(roles);
        },

        transformMenu(data) {
            const map = new Map();
            data.forEach(item => map.set(item.do, item));
            return data.filter(item => {
                const node = map.get(item.do);
                if (item.parent && map.has(item.parent)) {
                    const parent = map.get(item.parent);
                    parent.children = [...(parent.children || []), {...node}];
                    return false;
                }
                return true;
            });
        },
        // parseMenu(menu) {
        //     const parentMenu = [];
        //     const menuMap = {};

        //     menu.forEach(item => {
        //         const newItem = {
        //             do: item.do,
        //             location: item.location || '',
        //             icon: item.icon || '',
        //             title: item.title,
        //             children: []
        //         };
        //         menuMap[item.do] = newItem;

        //         const parentPath = item.do.split('/').slice(0, -1).join('/');
        //         if (parentPath && menuMap[parentPath]) {
        //             menuMap[parentPath].children.push(newItem);
        //         } else {
        //             parentMenu.push(newItem);
        //         }
        //         if(!this.selectMenu[0] && this.menuActive){
        //         }
        //     });

        //     return parentMenu;
        // },
        tabClick(v){
            let applistItem = this.applist.find(i=>i.key==v);
            this.isHelmPage = applistItem.isHelm;
            if(this.isHelmPage){
                this.$router.push({
                    name: 'group-helm',
                    params: {
                        ...this.$route.params,
                        group: applistItem.groupName,
                    },
                }).then(()=>{
                    this.appname = 'helm-'+this.$route.params.group;
                    this.selectMenu = [this.$route.meta.routekey]
                });
            }else{
                let item = this.applist.find(i=>i.key==v);
                this.$router.push({
                    name: 'app-detail-detail',
                    params:{
                        ...this.$route.params,
                        group: item.groupName,
                        id: item.name,
                        kind: item.kind,
                    },
                }).then(()=>{
                    this.getData();
                    this.selectMenu = [this.$route.meta.routekey];
                });
            }
        },
        // toMicro(v){
        //     // console.log(v);
        //     this.$router.push('/app/appgroup/'+this.$route.params.group+'/'+ this.$route.params.kind +'/'+ this.$route.params.id +'/micro/'+ v);
        // },
        delApp(key){
            let item = this.applist.find(i=>i.key==key);
            if(!item){return}
            if(item.isHelm){
                k8sproxy.delete('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ item.groupName).then(res=>{
                    this.$message.success('操作成功');
                    if(this.appname=='helm-'+item.groupName){
                        this.$router.push({
                            name: 'group-helm',
                            params: {
                                ...this.$route.params,
                                group: this.applist[0].groupName,
                            },
                        }).then(()=>{
                            this.appname = 'helm-'+this.$route.params.group;
                            this.getData();
                        });
                    }
                });
                return;
            }
            this.checkDelete = {
                show: true,
                name: item.title,
                ok: ()=>{
                    this.checkDelete.show = false;
                    k8sproxy.delete("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ item.kind +"/"+item.name).then(async res=>{
                        if(!res?.data){return}
                        // let rls = this.applist.find(i=>i.name==name);
                        // if(rls?.releaseName){
                        //     k8sproxy.delete("/api/v1/helm/releases/" + rls.releaseName, {params:{
                        //         namespace: rls.namespace,
                        //     },noAlert:true});
                        // }
                        k8sproxy.delete("/api/v1/namespaces/"+ this.namespaceActive +"/services/"+ item.name+'-lb',{noAlert:true}).finally(()=>{
                            this.$message.success('操作成功');
                            if(this.$route.params.id==item.name && this.$route.params.kind==item.kind){
                                this.appname = '';
                                this.$router.push({
                                    params:{
                                        kind: '',
                                        id: '',
                                    }
                                }).then(()=>{
                                    this.getData();
                                });
                            }else{
                                this.getData();
                            }
                        })
                    })
                }
            }
        },
        createApp(){
            this.form.id = '';
            this.form.name = '';
            this.form.show = true;
            this.form.suffix = this.applist?.filter(i=>i.suffix)?.[0]?.suffix;
            if(!this.form.suffix){
                this.form.suffix = this.applist?.filter(i=>i.name)?.[0]?.name?.replace(/^[^-]+\-?/,'');
            }
            // this.form.tabs = this.applist.filter(i=>i.canedit).map(i=>({
            //     name: i.name,
            //     title: i.title,
            //     suffix: i.suffix,
            //     kind: i.kind,
            // }))
            // this.$nextTick(()=>{
            //     setTimeout(()=>{
            //         this.$refs.addappdrawer?.addTab();
            //     },400)
            // })
        },
        openForm(v){
            this.form.id = this.$route.params.kind + this.$route.params.id;
            this.form.name = this.$route.params.id;
            this.form.parent = '';
            this.form.show = true;
            this.form.tabs = this.applist.filter(i=>i.canedit).map(i=>({
                name: i.name,
                title: i.title,
                suffix: i.suffix,
                kind: i.kind,
            }))
        },
        closeForm(v){
            this.form.show = false;
            if(v){ this.getData(); }
        },
        // 只刷新data
        dataDetail(){
            if(this.isHelmPage){ return Promise.resolve({}); }
            if(!this.$route.params.kind || !this.$route.params.id){return Promise.resolve({}); }
            return new Promise((resolve,reject)=>{
                return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+this.$route.params.kind+"/"+this.$route.params.id ).then(res=>{
                    let data = res?.data || {};
                    this.data = data;
                    resolve(res);
                }).catch(()=>{
                    reject();
                })
            })
        },
        watchStatus(){
            let status = 1;
            this.applist.map(i=>{
                if(i.status!=1&&!i.isHelm){status = i.status;}
            })
            if(this.watchInterval){ clearInterval(this.watchInterval); }
            // console.log('watch', status)
            if(status==1){return;}
            this.watchInterval = setInterval(()=>{
                k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group).then(async res=>{
                    let items = res?.data?.status?.items;
                    let status = 1;
                    for(let i in items){
                        let a = this.applist.find(app=>app.name==items[i].name);
                        if(!a){continue;}
                        let is = items[i].isZeroReplicas? 0 : ( items[i].ready?1:2);
                        a.status = is;
                        if(is!=1){status=is;}
                    }
                    if(status==1){
                        clearInterval(this.watchInterval)
                        this.dataDetail();
                    }
                });
            },5000);
        },
        arrangeList(data){
            let helmTab = [];
            let list = [];
            
            let items = data?.status?.items;
            if(data?.spec?.isHelm){
                helmTab.push({
                    title: (data?.metadata?.annotations?.title || data?.metadata?.name || '') + '资源概览',
                    isHelm: true,
                    groupName: data.metadata?.name,
                    key: 'helm-' + data.metadata?.name,
                    suffix: data?.spec?.suffix || '',
                });
            }
            
            for(let i in items){
                let groupItem = items[i];
                let name = groupItem.name;
                let kind = groupItem?.kind?.toLowerCase() + 's';
                list.push({
                    key: kind + name,
                    name: name,
                    kind: kind,
                    title: groupItem.title || name,
                    status: groupItem.isZeroReplicas? 0 : (groupItem.ready?1:2),
                    suffix: data?.spec?.suffix || '', // || data?.metadata?.labels?.['w7.cc/suffix'] || '',
                    groupName: data.metadata?.name,
                    canedit: true,
                })
                if(this.$route.params.id==groupItem.name && this.$route.params.kind==kind){
                    this.title = groupItem.title || groupItem.name;
                }
            }
            
            return {
                helmTab,
                list,
            }
        },
        getGpustack(){
            this.isGpustackPage = true;
            return k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie=gpustack-backend&limit=500').then(res=>{
                if(!res?.data?.items?.[0]){
                    this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/gpustack_backend');
                    return;
                }
                let item  = res?.data?.items?.[0];
                this.title = item.metadata.annotations.title || item.metadata.name;
                this.gpustackApp = item;
                
            });
        },
        async getData(){
            if(this.$route.name=='gpustack'){
                // this.getGpustack();
                this.$router.push('/app/appgroup/gpustack-backend/micro2');
                return;
            }
            useLoadingStore().loading = true;
            // ai应用管理
            if(this.$route.params.group=='gpustack-backend'){
                await this.getGpustack();
            }
            
            this.isHelmPage = /^group\-helm(\-|$)/.test(this.$route.name);
            if(this.isHelmPage){
                this.appname = 'helm-'+this.$route.params.group;
            }else{
                this.appname = this.$route.params.kind + this.$route.params.id;
            }
            await k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {
                noAlert: this.$route.params.group=='gpustack-backend',
            }).then(async res=>{
                this.groupTitle = res?.data?.metadata?.annotations?.title || this.groupTitle;
                let {helmTab,list} = this.arrangeList(res?.data);
                this.identifie = res?.data?.metadata?.annotations?.['w7.cc/identifie'];
                this.isHelmApp = Boolean(helmTab?.length);
                if(res?.data?.metadata?.annotations?.['w7.cc/front-type']){
                    try{
                        let ft = JSON.parse(res?.data?.metadata?.annotations?.['w7.cc/front-type'])
                        if(ft.includes("thirdparty_cd")){this.hasThirdpartyCd = true;}
                    }catch{}
                }

                // ai应用管理
                if(this.identifie == 'gpustack-backend' && this.isMicroPage){
                    useLoadingStore().loading = false;
                    
                    let menus = [];
                    try{
                        menus = JSON.parse(res?.data?.metadata?.annotations?.['w7.cc/bindings'])?.[0]?.menu;
                    }catch{}
                    menus.sort((a,b)=>b.displayorder-a.displayorder);

                    let gpustackbox = this.$route.query?.gpustackbox;
                    gpustackbox = gpustackbox? decodeURIComponent(gpustackbox) : '';
                    gpustackbox = gpustackbox?.match(/^.*(#.*)$/)?.[1] || '';
                    this.menuActive = gpustackbox || menus?.find(i=>i.is_default==1)?.do || this.menus?.[0]?.do || '';
                    this.menus = this.transformMenu(menus)
                    this.selectMenu = [this.menuActive];
                    return Promise.reject();
                }

                if(this.isMicroPage && this.hasThirdpartyCd){
                    this.getFront()
                }
                
                if(res?.data?.metadata?.labels?.['w7.cc/parent']){
                    await k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups?labelSelector=w7.cc/parent='+ res?.data?.metadata?.labels?.['w7.cc/parent']).then(res=>{
                        let items = res.data?.items || [];
                        for(let i in items){
                            if(items[i]?.metadata?.name==this.$route.params.group){continue}
                            if(!items[i]?.spec?.isHelm){continue}
                            let subapp = this.arrangeList(items[i]);
                            helmTab = helmTab.concat(subapp.helmTab);
                            list = list.concat(subapp.list);
                        }
                    })
                    await k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ res?.data?.metadata?.labels?.['w7.cc/parent']).then(res=>{
                        let parentapp = this.arrangeList(res?.data);
                        helmTab = parentapp.helmTab.concat(helmTab);
                        list = parentapp.list.concat(list);
                    })
                }else{
                    await k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups?labelSelector=w7.cc/parent='+ this.$route.params.group).then(res=>{
                        let items = res.data?.items || [];
                        for(let i in items){
                            if(!items[i]?.spec?.isHelm){continue}
                            let subapp = this.arrangeList(items[i]);
                            helmTab = helmTab.concat(subapp.helmTab);
                            list = list.concat(subapp.list);
                        }
                    })
                }

                this.applist = helmTab.concat(list);
                this.watchStatus();
                useLoadingStore().loading = false;
            }).then(()=>{
                new Promise((resolve,reject)=>{
                    if(!this.isMicroPage && !this.appname && (!this.$route.params.kind || !this.$route.params.id)){
                        let app = this.applist.find(i=>i.kind&&i.name);
                        this.appname = app.kind + app.name;
                        this.$router.push({params:{
                            kind: app.kind,
                            id: app.name,
                        }}).then(()=>{
                            resolve();
                        });
                    }else{
                        resolve();
                    }
                }).then(()=>{
                    return this.dataDetail();
                }).then(res=>{
                    // let data = res?.data || {};
                    
                    // if(data?.metadata?.annotations?.['w7.cc/bindings'] && data?.metadata?.annotations?.['w7.cc/static-url']){
                    //     let bindings = data.metadata.annotations['w7.cc/bindings'];
                    //     let location = data.metadata.annotations['w7.cc/static-url'];
                    //     try{
                    //         bindings = JSON.parse(bindings);
                    //     }catch(e){ bindings = []; }
                    //     let menu = bindings?.find(i=>i.name=='founder'&&i.support=='thirdparty_cd');
                    //     if(menu?.menu?.length){
                    //         this.appMenu = menu.menu.map(i=>{
                    //             i.do = i.do.replace(/^\//,'');
                    //             return i;
                    //         });
                    //         this.appLocation = location;
                    //     }else{
                    //         this.appMenu = [];
                    //         this.appLocation = '';
                    //         if(this.$route.name=='app-detail-micro'){
                    //             this.$router.push({name:'app-detail-detail', params: this.$route.params});
                    //         }
                    //     }
                    // } 
                })
            }).catch(()=>{
                useLoadingStore().loading = false;
            });
        },
        changeKey(val){
            this.$router.push({name:val, params: this.$route.params});
        },
        toCopy(){
            if(!this.copying){
                this.copying = true;
                this.copyList = [];
                this.$message.info('请选择要复制应用的标签');
                return;
            }
            if(this.copyList.length==0){
                this.copying = false;
                return;
            }
            Promise.all(this.copyList.map(i=>{
                return this.copyApp(i);
            })).then(()=>{
                this.$message.success('复制成功');
                this.copying = false;
                this.copyList = [];
                this.getData();
            });
        },
        copyApp(key){
            let app = this.applist.find(i=>i.key==key);
            return k8sproxy.get("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind +"/"+ app.name ).then(res=>{
                if(!res?.data){return}
                let data = res?.data;
                let pn = this.applist.find(i=>!i.isHelm && i.name);
                data.metadata.labels.parent = pn?.name;

                let name = 'copy-' + this.createName(4) + '-' + data.metadata.name;
                data.metadata.name = name;
                data.metadata.labels.app = name;
                data?.spec?.selector?.matchLabels && (data.spec.selector.matchLabels.app = name);
                data?.spec?.template?.metadata?.labels && (data.spec.template.metadata.labels.app = name);
                
                delete data.metadata.resourceVersion;
                delete data.metadata.generation;
                delete data.metadata.creationTimestamp;
                delete data.metadata.uid;
                delete data.status;

                return data

            }).then(data=>{
                if(!data){return}
                return k8sproxy.post("/apis/apps/v1/namespaces/"+ this.namespaceActive +"/"+ app.kind, data);
            });
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
        
        elementsToSvg(elementsArray, options = {}){
            try {
                // 校验输入格式（空数组也允许，后续自动创建默认svg）
                if (!Array.isArray(elementsArray)) {
                    throw new Error('输入必须是数组');
                }

                // 1. 查找数组中的svg元素（任意位置）
                const svgElementIndex = elementsArray.findIndex(item => item?.type === 'svg');
                let svgRoot = null;
                
                // 有svg元素则取出并深拷贝，无则创建默认svg根元素
                if (svgElementIndex !== -1) {
                    svgRoot = { ...elementsArray[svgElementIndex] };
                    // 从原数组中移除svg元素（避免后续重复处理）
                    elementsArray = [...elementsArray.slice(0, svgElementIndex), ...elementsArray.slice(svgElementIndex + 1)];
                } else {
                    // 创建默认svg根元素
                    svgRoot = {
                        type: 'svg',
                        xmlns: 'http://www.w3.org/2000/svg', // 默认添加命名空间，保证兼容性
                        viewBox: '0 0 48 48' // 默认视图框，适配多数图标
                    };
                }

                // 2. 应用宽高（优先级：自定义 > svg元素原有值 > 默认24）
                const defaultSize = 16;
                svgRoot.width = options.width ?? svgRoot.width ?? defaultSize;
                svgRoot.height = options.height ?? svgRoot.height ?? defaultSize;

                // 3. 构建SVG根标签的属性字符串
                const svgAttrs = [];
                for (const [key, value] of Object.entries(svgRoot)) {
                    // 跳过type属性（已用于识别标签类型）
                    if (key === 'type') continue;
                    // 属性值转字符串（处理Number类型）
                    svgAttrs.push(`${key}="${String(value)}"`);
                }
                const svgStartTag = `<svg ${svgAttrs.join(' ')}>`;
                const svgEndTag = `</svg>`;

                // 4. 构建所有子元素的标签字符串（剩余所有元素都是子元素）
                const childElementsStr = [];
                for (const element of elementsArray) {
                    // 跳过无效元素（避免空值/非对象导致报错）
                    if (!element || typeof element !== 'object' || !element.type) {
                        console.warn('跳过无效元素：', element);
                        continue;
                    }

                    const { type, content, ...attrs } = element;

                    // 构建子元素属性字符串
                    const elementAttrs = [];
                    for (const [key, value] of Object.entries(attrs)) {
                        elementAttrs.push(`${key}="${String(value)}"`);
                    }

                    // 生成元素标签（区分有文本内容和无文本内容的元素）
                    if (content) {
                        // 有文本内容的元素（如text/title）
                        childElementsStr.push(`  <${type} ${elementAttrs.join(' ')}>${content}</${type}>`);
                    } else {
                        // 无文本内容的自闭合元素（如circle/path）
                        childElementsStr.push(`  <${type} ${elementAttrs.join(' ')} />`);
                    }
                }

                // 5. 拼接完整的SVG字符串（格式化缩进，便于阅读）
                const svgContent = [
                    svgStartTag,
                    ...childElementsStr,
                    svgEndTag
                ].join('\n');

                return svgContent;

            } catch (error) {
                console.error('生成SVG失败:', error);
                // 返回默认的SVG模板（使用自定义宽高或默认值24）
                const defaultWidth = options.width ?? 16;
                const defaultHeight = options.height ?? 16;
                return `<svg width="${defaultWidth}" height="${defaultHeight}" xmlns="http://www.w3.org/2000/svg"></svg>`;
            }
        }


    }
}
</script>

<style>
.app-detailmenu{width:100%;}
.app-detailmenu .arco-tabs-nav{width:100px; padding-top:10px;}

.appdetail-tabs .arco-drawer-body{padding:0;}
.appdetail-tabs .arco-tabs-tab.arco-tabs-tab-active{
    background:var(--color-bg-2);
    /* border-bottom-color: var(--color-neutral-3); */
}
/* .appdetail-tabs .arco-tabs-nav::before{display:none;} */

</style>
<style scoped>
.point{width:8px; height:8px; border-radius:50%; background:#999; margin-right:6px;}
.point.red{background:#D00805;}
.point.green{background:#00A870;}

.routerviewbox{border:1px solid var(--color-neutral-3);border-top:0;}
.content{height:100%;}
/* .appheader{height:50px; background:var(--color-bg-2); border-bottom:1px solid var(--color-border-1); padding:0 20px;} */
.appheader .apps{background: var(--color-fill-2); height: 36px; padding: 0 8px; border-radius: 20px;}
.appheader .apps .item{height:26px; line-height:26px; cursor:pointer; border-radius:16px; padding:0 12px; position: relative;}
.appheader .apps .item .close{display:none; background:var(--color-bg-1); border-radius:50%; position:absolute; top:-8px; right:-8px;}
.appheader .apps .item:hover{background:var(--color-bg-2);}
.appheader .apps .item:hover .close{display:block;}
.appheader .apps .item+.item{margin-left:8px;}
.appheader .apps .item.active{background:var(--color-bg-1);}

/* .menu-absolute-div::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.menu-absolute-div::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.menu-absolute-div::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.menu-absolute-div::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.menu-absolute-div::-webkit-scrollbar-thumb:active {
  background: #909090;
} */
</style>