<template>
    <a-layout class="topapp-micro-page">
        <TopappMenu
            v-if="!hideAppMenu"
            :roles="roles"
            :info="info"
            :menuActive="menuActive"
            @routeChange="routeChange"
        />
        <!-- :identifie="identifie" -->
        <!-- :identifieList="identifieList"
        @changeIdentifie="changeIdentifie" -->
        <a-layout class="layout-content" :style="paddingStyle">
            <a-layout-content>
                <div
                    :class="{ 'padding-20': !hideAppMenu }"
                    style="height:calc(100vh - 62px);box-sizing:border-box;"
                >
                    <micro-container
                        v-show="!isAppDirectPage"
                        ref="microcontainer"
                        :appgroup="groupName"
                        :menuActive="microMenuActive"
                        @getinfo="v=>info=v"
                        @getBindings="v=>bindings=v"
                        @changeAppMenu="changeAppMenu"
                    ></micro-container>
                    <app-direct
                        v-if="isAppDirectPage"
                        :roles="roles"
                        :info="info"
                        @open="routeChange"
                    />
                </div>
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>
<script>
import TopappMenu from '@/components/topapp-menu.vue';
import { useNamespaceStore } from '@/store';
import { getK8sinfo } from '@/utils/auth';
import { getWujieRoutePrefix, normalizeWujieSyncRoute } from '@/utils/wujie-route';
import microContainer from './micro-container.vue'
import appDirect from './app-direct.vue'

const APP_DIRECT_DO = '__topapp_app_direct__';

const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
    tech: '技术人员',
    normal: '普通用户',
}

export default{
    props: ['showMenu','group','do'],
    data(){
        return {
            namespaceActive: '',
            roles: [],
            identifie: '',
            menuActive: '',
            identifieList: [],
            info: {},
            bindings: [],
            groupName: '',
            hideAppMenu: false,
            currentMicroMenuActive: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.initPage();
    },
    components: {
        TopappMenu,
        microContainer,
        appDirect,
    },
    computed: {
        isAppDirectPage(){
            return this.menuActive === APP_DIRECT_DO;
        },
        microMenuActive(){
            return this.isAppDirectPage ? this.currentMicroMenuActive : this.menuActive;
        },
    },
    watch:{
        do(v){
            this.menuActive = v || this.$route.query.do || '';
            if(!this.isAppDirectPage){
                this.currentMicroMenuActive = this.menuActive;
            }
        },
        bindings(v){
            this.getMenu(v)
        },
        group(v, oldV){
            this.initPage();
        },
        '$route.params.group'(v, oldV){
            this.initPage();
        },
        '$route.query.showMenu'(){
            this.hideAppMenu = this.isHideMenu();
        },
        '$route.query.do'(){
            this.syncQueryDoMenu();
        },
        '$route.query.appmicro'(){
            this.syncAppmicroMenu();
        },
    },
    methods: {
        initPage(){
            this.roles = [];
            this.identifie = '';
            this.identifieList = [];
            this.info = {};
            this.bindings = [];
            this.menuActive = this.do || this.$route.query.do || '';
            this.currentMicroMenuActive = this.menuActive === APP_DIRECT_DO ? '' : this.menuActive;
            this.hideAppMenu = this.isHideMenu();
            this.groupName = this.group || this.$route.params.group;
        },
        changeAppMenu(v){
            this.hideAppMenu = (v === false)? true : this.isHideMenu();
        },
        getAppmicroMenu(){
            return normalizeWujieSyncRoute(this.$route.query?.appmicro, getWujieRoutePrefix(this.info.frontendUrl));
        },
        getRouteDo(){
            const routeDo = this.$route.query?.do;
            return Array.isArray(routeDo) ? routeDo[0] : routeDo;
        },
        syncQueryDoMenu(){
            const routeDo = this.getRouteDo();
            if(routeDo){
                this.menuActive = routeDo;
                if(!this.isAppDirectPage){
                    this.currentMicroMenuActive = routeDo;
                }
                return;
            }
            this.syncAppmicroMenu();
        },
        syncAppmicroMenu(){
            if(this.isAppDirectPage){ return; }
            const appmicro = this.getAppmicroMenu();
            if(!appmicro){ return; }
            this.menuActive = appmicro;
            this.currentMicroMenuActive = appmicro;
        },
        routeChange(v){
            const oldMicroMenuActive = this.currentMicroMenuActive;
            const wasAppDirectPage = this.isAppDirectPage;
            this.menuActive = v || '';
            if(this.menuActive === APP_DIRECT_DO){
                return;
            }
            this.currentMicroMenuActive = this.menuActive;
            if(wasAppDirectPage && oldMicroMenuActive === this.menuActive){
                this.$refs?.microcontainer?.routeChange?.(v);
                this.$nextTick(()=>{
                    window.dispatchEvent(new Event('resize'));
                });
            }
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
            
            roles = this.injectAppDirectMenu(roles);
            roles.sort((a, b) => (b.name === 'founder') - (a.name === 'founder'));
            
            if(userRole=='founder'){
                this.roles = roles;
            }else{
                let find = roles.find(i=>i.name==userRole)
                this.roles = find?[find]:[];
            }
            if(this.do || this.$route.query.do){
                this.menuActive = this.do || this.$route.query.do;
            }else{
                this.menuActive = this.getAppmicroMenu() || this.roles?.[0]?.menus?.find(i=>i.is_default==1)?.do || this.roles?.[0]?.menus?.[0]?.do || '';
            }
            if(!this.isAppDirectPage){
                this.currentMicroMenuActive = this.menuActive;
            }

        },
        injectAppDirectMenu(roles){
            const founder = roles.find(i=>i.name === 'founder');
            if(!founder || founder.menus?.some(i=>i.do === APP_DIRECT_DO)){
                return roles;
            }
            founder.menus = [
                ...(founder.menus || []),
                {
                    title: '应用直达',
                    do: APP_DIRECT_DO,
                    displayorder: -1,
                    isLocalPage: true,
                },
            ];
            return roles;
        },
        isHideMenu(){
            const showMenu = this.showMenu ?? this.$route.query.showMenu;
            return showMenu === false || showMenu === 'false';
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
    }
}
</script>
<style scoped>

</style>
<style>
.micro-iframe-modal .arco-modal-body{padding:0;}
.topapp-micro-page{
    height:100%;
    overflow:auto;
}
</style>
