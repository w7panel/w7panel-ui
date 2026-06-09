<template>
    <default-layout>
    </default-layout>
</template>

<script>
import { k8sproxy } from '@/utils/api';
import defaultLayout from '@/components/default-layout.vue'
import { useNamespaceStore } from '@/store';
import axios from 'axios';
import { getK8sinfo } from '@/utils/auth';
const ROLE_NAME = {
    founder: '创始人',
    found: '创始人',
    super: '管理员',
    tech: '技术人员',
    normal: '普通用户',
}

export default {
    components: {
        defaultLayout,
    },
    data(){
        return {
            useNamespaceStore: '',
        }
    },
    created(){
        this.namespaceActive = useNamespaceStore().namespace;
        this.getZpk();
    },
    methods:{
        getZpk(){
            k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+this.namespaceActive+'/microapps?labelSelector=w7.cc/identifie=w7-sitemanager&limit=500').then(async res=>{
                if(!res?.data?.items?.[0]){
                    this.$router.push('/app/store-install?path=https://zpk.w7.cc/zpk/respo/info/w7_sitemanager');
                    return;
                }
                let group = res?.data?.items?.[0]?.metadata?.annotations?.['meta.helm.sh/release-name'];
                // let {data} = await k8sproxy.get('/apis/w7panel.w7.com/v1alpha1/namespaces/'+ this.namespaceActive +'/appgroups/'+ group,{loading:true})
                // let menuActive = this.getMenu(data);
                // let url = res.data.items[0]?.spec?.frontendUrl + menuActive;
                
                this.$router.push('/app/appgroup/'+group+'/micro2');
            });
        },
        
        // getMenu(data){
        //     let userRole = getK8sinfo()['w7.cc/role'];
        //     let roles = []
        //     try{
        //         let rl = JSON.parse(data?.metadata?.annotations?.['w7.cc/bindings']) || [];
        //         rl = rl.filter(i=>i.support == "thirdparty_cd")
        //         rl.map(i=>{
        //             let menus = i.menu || [];
        //             menus.sort((a,b)=>b.displayorder-a.displayorder);
        //             menus = this.transformMenu(menus)

        //             roles.push({
        //                 title: ROLE_NAME[i.name] || i.name,
        //                 name: i.name,
        //                 menus: menus,
        //             })
        //         })
        //     }catch{}
        //     roles.sort((a, b) => (b.name === 'founder') - (a.name === 'founder'));
        //     roles = this.filterMenu(roles);
            
        //     if(userRole=='founder'){
        //         roles = roles;
        //     }else{
        //         let find = roles.find(i=>i.name==userRole)
        //         roles = find?[find]:[];
        //     }
        //     return roles?.[0]?.menus?.[0]?.do || ''
        // },
        // transformMenu(data) {
        //     const map = new Map();
        //     data.forEach(item => map.set(item.do, item));
        //     return data.filter(item => {
        //         const node = map.get(item.do);
        //         if (item.parent && map.has(item.parent)) {
        //             const parent = map.get(item.parent);
        //             parent.children = [...(parent.children || []), {...node}];
        //             return false;
        //         }
        //         return true;
        //     });
        // },
        // filterMenu(roles){
        //     function filterDuplicateMenus(menuArray) {
        //         // 用于记录已经出现过的do路径，Set查询效率更高
        //         const existedPaths = new Set();
                
        //         // 遍历数组并处理每个元素，返回新数组（不修改原数组）
        //         return menuArray.map(item => {
        //             // 过滤当前元素的menus，只保留未出现过的路径
        //             const filteredMenus = item.menus.filter(menu => {
        //                 // 确保do字段存在，避免报错
        //                 if (!menu.do) return false;
        //                 // 如果路径未出现过，则保留并记录
        //                 if (!existedPaths.has(menu.do)) {
        //                     existedPaths.add(menu.do);
        //                     return true;
        //                 }
        //                 // 路径已存在，过滤掉
        //                 return false;
        //             });
                    
        //             // 返回新的元素对象，保持其他字段不变，仅替换menus
        //             return {
        //                 ...item,
        //                 menus: filteredMenus
        //             };
        //         });
        //     }
        //     return filterDuplicateMenus(roles);
        // },
    }
}
</script>

<style>

</style>