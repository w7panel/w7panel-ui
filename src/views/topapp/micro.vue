<template>
    <a-layout class="topapp-micro-page">
        <TopappMenu
            v-if="!hideAppMenu && !isSubaccountPage"
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
                    :class="{ 'padding-20': !isSubaccountPage }"
                    style="height:calc(100vh - 62px);box-sizing:border-box;"
                >
                    <micro-container
                        ref="microcontainer"
                        :appgroup="groupName"
                        :menuActive="menuActive"
                        @getinfo="v=>info=v"
                        @getBindings="v=>bindings=v"
                        @subaccount-change="setSubaccountPage"
                    ></micro-container>
                </div>
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>
<script>
import TopappMenu from '@/components/topapp-menu.vue';
import { useNamespaceStore } from '@/store';
import { getK8sinfo } from '@/utils/auth';
import microContainer from './micro-container.vue'

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
            isSubaccountPage: false,
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.groupName = this.group || this.$route.params.group;
        this.menuActive = this.do || this.$route.query.do;
        this.hideAppMenu = this.isHideMenu();
    },
    components: {
        TopappMenu,
        microContainer,
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
        },
        '$route.params.group'(v, oldV){
            this.groupName = this.group || this.$route.params.group;
        },
    },
    methods: {
        setSubaccountPage(v){
            this.isSubaccountPage = !!v;
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
.topapp-micro-page{
    height:100%;
    overflow:auto;
}
</style>
