<template>
    <a-layout style="height:100%;overflow:auto;">
        <TopappMenu
            v-if="!hideAppMenu"
            :roles="roles"
            :info="info"
            @routeChange="routeChange"
        />
        <!-- :identifie="identifie" -->
        <!-- :identifieList="identifieList"
        @changeIdentifie="changeIdentifie" -->
        <a-layout class="layout-content" :style="paddingStyle">
            <a-layout-content>
                <div class="padding-20" style="height:calc(100vh - 62px);box-sizing:border-box;">
                    <micro-container
                        ref="microcontainer"
                        :appgroup="groupName"
                        :menuActive="menuActive"
                        @getinfo="v=>info=v"
                        @getBindings="v=>bindings=v"
                    ></micro-container>
                </div>
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>
<script>
import TopappMenu from '@/components/topapp-menu.vue';
import { useNamespaceStore,useLoadingStore } from '@/store';
import { getToken,getK8sinfo } from '@/utils/auth';
import microContainer from './micro-container.vue'

const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
    tech: '技术人员',
    normal: '普通用户',
}

export default{
    props: ['hideMenu','group','path'],
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
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.groupName = this.group || this.$route.params.group;
        this.menuActive = this.path || this.$route.query.path;
        this.hideAppMenu = this.hideMenu || this.$route.query.hideMenu;
    },
    components: {
        TopappMenu,
        microContainer,
    },
    computed: {
    },
    watch:{
        path(v){
            v && (this.menuActive = v);
        },
        bindings(v){
            this.getMenu(v)
        },
        group(){
            this.groupName = this.group || this.$route.params.group;
        },
    },
    methods: {
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
            if(this.path || this.$route.query.path){
                this.menuActive = this.path || this.$route.query.path;
            }else{
                this.menuActive = this.roles?.[0]?.menus?.find(i=>i.is_default==2)?.do || this.roles?.[0]?.menus?.[0]?.do || '';
            }

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
</style>