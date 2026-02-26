<template>
    <div class="padding-20 df df-c" style="height:100%;">
        <route-breadcrumb class="df-s0" :data="{id:title}" />
        <a-layout class="fc">
            <a-layout-sider :width="160">
                <div class="df df-c" style="position:absolute;inset:0;overflow:auto;">
                    <a-menu v-if="menus.length" v-model:selected-keys="selectMenu" style="width:100%;" @menu-item-click="changeKey">
                        <template v-for="menu in menus" :key="menu.do">
                            <a-menu-item v-if="!menu.children||!menu.children.length" :key="menu.do">{{menu.title}}</a-menu-item>
                            <a-sub-menu v-else :key="menu.do">
                                <template #title>{{menu.title}}</template>
                                <a-menu-item v-for="submenu in menu.children" :key="submenu.do">{{submenu.title}}</a-menu-item>
                            </a-sub-menu>
                        </template>
                    </a-menu>
                    <a-divider style="margin:10px;width:auto;min-width:auto;" />
                    <a-menu v-if="isHelm" style="width:100%;" @menu-item-click="toApp">
                        <a-menu-item key="group-helm-detail" >应用详情</a-menu-item>
                        <a-menu-item key="group-helm-domain" >域名管理</a-menu-item>
                    </a-menu>
                    <a-menu v-else style="width:100%;" @menu-item-click="toApp">
                        <a-menu-item key="app-detail-detail">应用详情</a-menu-item>
                        <a-menu-item key="app-detail-pod">容器列表</a-menu-item>
                        <a-menu-item key="app-detail-files">文件管理</a-menu-item>
                        <a-menu-item key="app-detail-domain">域名管理</a-menu-item>
                        <a-menu-item key="app-detail-job">执行脚本</a-menu-item>
                        <a-menu-item key="app-detail-version">历史版本</a-menu-item>
                        <a-menu-item key="app-detail-moniter">运行状态</a-menu-item>
                    </a-menu>
                </div>
            </a-layout-sider>
            <a-layout-content class="ml-6 df df-c">
                <div class="bg-white routerviewbox fc ml-6" >
                    <div id="appmicro" style="height:calc(100vh - 146px);transform:translate(0,0);"></div>
                </div>
            </a-layout-content>
        </a-layout>
    </div>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import axios from 'axios'
import { useNamespaceStore,useLoadingStore } from '@/store';
import { bus, setupApp, preloadApp, startApp, destroyApp } from "wujie";

export default {
    data(){
        return {
            namespaceActive: '',
            menus: [],
            selectMenu: [],
            menuActive: '',
            domain: '',
            isHelm: false,
            title: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getGroup();
    },
    methods: {
        toApp(v){
            if(this.isHelm){
                this.$router.push({name:v,params:this.$route.params});
            }else{
                let app = this?.childrenApp?.[0];
                this.$router.push({name:v,params:{group:app.group, id:app.name, kind:app.kind}});
            }
        },
        changeKey(v){
            this.menuActive = v;
            bus.$emit("routeChange", v.replace(/^#/,''));
        },
        getGroup(){
            return k8sproxy.get('/apis/appgroup.w7.cc/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ this.$route.params.group, {loading:true}).then(async res=>{
                let data = res?.data;
                this.title = data?.metadata?.annotations?.title || data?.metadata?.name;
                this.isHelm = data?.spec?.isHelm;
                let statusItem = data?.status?.items || [];
                let childrenApp = statusItem.map(si=>({
                    title: si.title||si.name,
                    name: si.name,
                    kind: si.kind.toLowerCase() + 's',
                    ready: si.ready,
                    group: data.metadata.name,
                }));
                this.childrenApp = childrenApp;

                let frontType = [];
                try{ frontType = JSON.parse(data?.metadata?.annotations?.['w7.cc/front-type']); }catch{}
                let identifie = data?.metadata?.annotations?.['w7.cc/identifie'];

                if(!frontType || !frontType?.includes("thirdparty_cd") || !identifie){
                    if(data?.spec?.isHelm){
                        this.$router.push({path:'/app/appgroup/'+ this.$route.params.group +'/helm/detail'});
                        return;
                    }
                    this.$router.push('/app/appgroup/'+ this.$route.params.group);
                    return;
                }

                this.getMenu(data);
                this.getFront(identifie);
            })
        },
        getFront(identifie,data){
            k8sproxy.get('/apis/microapp.w7.cc/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie='+ identifie +'&limit=500').then(res=>{

                let item  = res?.data?.items?.[0];
                if(!item){
                    if(data?.spec?.isHelm){
                        this.$router.push({path:'/app/appgroup/'+ this.$route.params.group +'/helm/detail'});
                        return;
                    }
                    this.$router.push('/app/appgroup/'+ this.$route.params.group);
                }
                this.info = {
                    ...this.info,
                    frontendUrl: item?.spec?.frontendUrl,
                    backendUrl: item?.spec?.backendUrl,
                    username: item?.spec?.config?.props?.username,
                    password: item?.spec?.config?.props?.password,
                    appImage: item?.spec?.config?.props?.image,
                }
                this.wujieInit();
            })
        },
        wujieInit(){
            setupApp({
                name: "appmicro",
                url: this.info.frontendUrl + this.menuActive,
                exec: true,
                el: '#appmicro',
                sync: true,
                props: {
                    url: /^\//.test(this.info.backendUrl)? window.location.origin + this.info.backendUrl : this.info.backendUrl,
                    Authorization: 'Basic '+ btoa(this.info.username+':'+this.info.password),
                    appImage: this.info.appImage,
                    domain: this.domain,
                },
            })
            startApp({name:'appmicro'})
        },
        getMenu(data){
            let menus = [];
            try{ menus = JSON.parse(data?.metadata?.annotations?.['w7.cc/bindings'])?.[0]?.menu; }catch{}
            menus.sort((a,b)=>b.displayorder-a.displayorder);
            this.menuActive = menus?.find(i=>i.is_default==2)?.do || this.menus?.[0]?.do || '';
            this.selectMenu = [decodeURIComponent(this.$route.query?.appmicro || '')?.replace(/^\//,'')];
            if(!this.selectMenu[0] && this.menuActive){
                this.selectMenu = [this.menuActive];
            }
            this.menus = this.parseMenu(menus)
        },
        parseMenu(menu) {
            const parentMenu = [];
            const menuMap = {};

            menu.forEach(item => {
                const newItem = {
                    do: item.do,
                    location: item.location || '',
                    icon: item.icon || '',
                    title: item.title,
                    children: []
                };
                menuMap[item.do] = newItem;

                const parentPath = item.do.split('/').slice(0, -1).join('/');
                if (parentPath && menuMap[parentPath]) {
                    menuMap[parentPath].children.push(newItem);
                } else {
                    parentMenu.push(newItem);
                }
            });

            return parentMenu;
        },
    }
}
</script>

<style>
.app-detailmenu{width:100%;}
.app-detailmenu .arco-tabs-nav{width:100px; padding-top:10px;}
</style>