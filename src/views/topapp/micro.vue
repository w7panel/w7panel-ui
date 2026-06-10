<template>
    <a-layout class="topapp-micro-page" :class="{ 'is-subaccount-panel': subaccountPanel.show }">
        <TopappMenu
            v-if="!hideAppMenu && !subaccountPanel.show"
            :roles="roles"
            :info="info"
            @routeChange="routeChange"
        />
        <!-- :identifie="identifie" -->
        <!-- :identifieList="identifieList"
        @changeIdentifie="changeIdentifie" -->
        <a-layout class="layout-content" :style="paddingStyle">
            <a-layout-content>
                <div
                    v-if="subaccountPanel.show"
                    class="subaccount-panel-wrap"
                >
                    <subaccount-panel
                        :token="subaccountPanel.token"
                        :refresh-token="subaccountPanel.refreshToken"
                        :path="subaccountPanel.path"
                        @close="closeSubaccountPanel"
                    />
                </div>
                <div v-else class="padding-20" style="height:calc(100vh - 62px);box-sizing:border-box;">
                    <micro-container
                        ref="microcontainer"
                        :appgroup="groupName"
                        :menuActive="menuActive"
                        @getinfo="v=>info=v"
                        @getBindings="v=>bindings=v"
                        @changeLogin="changeLogin"
                    ></micro-container>
                </div>
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>
<script>
import TopappMenu from '@/components/topapp-menu.vue';
import { useNamespaceStore } from '@/store';
import { clearIframeToken, getIframeRefreshToken, getIframeToken, getK8sinfo, getRefreshToken, getToken } from '@/utils/auth';
import microContainer from './micro-container.vue'
import subaccountPanel from '@/components/subaccount-panel.vue';

const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
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

            subaccountPanel: {
                show: false,
                token: '',
                refreshToken: '',
                path: '/cluster/panel',
            },
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.groupName = this.group || this.$route.params.group;
        this.menuActive = this.do || this.$route.query.do;
        this.hideAppMenu = this.isHideMenu();
        this.restoreSubaccountPanel();
    },
    beforeRouteLeave(to, from, next) {
        if (this.subaccountPanel.show) {
            this.resetSubaccountPanel(false);
        }
        next();
    },
    components: {
        TopappMenu,
        microContainer,
        subaccountPanel,
    },
    computed: {
    },
    watch:{
        do(v){
            v && (this.menuActive = v);
        },
        bindings(v){
            this.getMenu(v)
        },
        group(v, oldV){
            this.groupName = this.group || this.$route.params.group;
            if(oldV && v !== oldV){
                this.resetSubaccountPanel(true);
            }
        },
        '$route.params.group'(v, oldV){
            this.groupName = this.group || this.$route.params.group;
            if(oldV && v !== oldV){
                this.resetSubaccountPanel(true);
            }
        },
    },
    methods: {
        changeLogin(data = {}){
            this.subaccountPanel = {
                show: true,
                token: data.token || '',
                refreshToken: data.refreshToken || '',
                path: this.getSubaccountPanelPath(),
            };
            this.syncSubaccountPanelQuery(true);
        },
        closeSubaccountPanel(){
            this.resetSubaccountPanel(true);
        },
        resetSubaccountPanel(syncQuery = true){
            clearIframeToken();
            this.subaccountPanel = {
                show: false,
                token: '',
                refreshToken: '',
                path: '/cluster/panel',
            };
            if(syncQuery){
                this.syncSubaccountPanelQuery(false);
            }
        },
        restoreSubaccountPanel(){
            if(this.$route.query.subaccountPanel !== '1'){ return; }

            const token = getIframeToken() || getToken() || '';
            if(!token){
                this.syncSubaccountPanelQuery(false);
                return;
            }

            this.subaccountPanel = {
                show: true,
                token,
                refreshToken: getIframeRefreshToken() || getRefreshToken() || '',
                path: this.getSubaccountPanelPath(),
            };
        },
        getSubaccountPanelPath(){
            const value = this.$route.query['w7panel-subaccount-panel'];
            const path = Array.isArray(value) ? value[0] : value;
            if(!path){ return '/cluster/panel'; }

            try{
                return decodeURIComponent(path);
            }catch{
                return path;
            }
        },
        syncSubaccountPanelQuery(show){
            const isOpen = this.$route.query.subaccountPanel === '1';
            if(show === isOpen){ return; }

            const query = {
                ...this.$route.query,
            };
            if(show){
                query.subaccountPanel = '1';
            }else{
                delete query.subaccountPanel;
            }

            this.$router.replace({
                path: this.$route.path,
                query,
                hash: this.$route.hash,
            }).catch(()=>{});
        },
        routeChange(v){
            this.$refs?.microcontainer?.routeChange?.(v);
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
            
            if(userRole=='founder'){
                this.roles = roles;
            }else{
                let find = roles.find(i=>i.name==userRole)
                this.roles = find?[find]:[];
            }
            if(this.do || this.$route.query.do){
                this.menuActive = this.do || this.$route.query.do;
            }else{
                this.menuActive = this.roles?.[0]?.menus?.find(i=>i.is_default==1)?.do || this.roles?.[0]?.menus?.[0]?.do || '';
            }

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
.subaccount-panel-wrap{
    height:calc(100vh - 60px);
    background:var(--color-fill-2);
}
.topapp-micro-page{
    height:100%;
    overflow:auto;
}
.topapp-micro-page.is-subaccount-panel{
    overflow:hidden;
}
</style>
