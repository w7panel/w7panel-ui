<template>
    <Breadcrumb :routes="routes" />
</template>

<script>

export default {
    props: ['data'],
    data(){
        return {
            arr: [],
            routes: [],
        }
    },
    watch:{
        '$route'(){
            this.arr = this.getArr().arr;
            this.routes = this.getArr().rts;
        },
        'data'(){
            this.arr = this.getArr().arr;
            this.routes = this.getArr().rts;
        },
    },
    created(){
        this.arr = this.getArr().arr;
        this.routes = this.getArr().rts;
    },
    methods:{
        getArr(){
            let route = this.$route;
            let arr = [];
            let rts = [{name:'root'}];
            const appManagementRouteName = route.meta.activeMenu
                || (route.meta.appManifestType ? route.name : '');
            if(route?.matched?.length){
                for(let item in route.matched){
                    const matchedRoute = route.matched[item];
                    const routeName = matchedRoute?.name === 'app' && appManagementRouteName
                        ? appManagementRouteName
                        : matchedRoute?.name;
                    if(typeof route.matched[item]?.meta?.locale =='object'){
                        let key = route.matched[item]?.meta?.locale.key;
                        arr.push(this?.data?.[key] || route.params[key])
                        rts.push({
                            name: routeName,
                            label: this?.data?.[key] || route.params[key],
                            params: route.params,
                        })
                        continue;
                    }
                    arr.push(route.matched[item]?.meta?.locale || '')
                    rts.push({
                        name: routeName,
                        label: route.matched[item]?.meta?.locale || '',
                        params: route.params,
                    })
                }
            }
            return {arr,rts};
        },
        // getArr(route, arr){
        //     arr = arr || [];
        //     arr = JSON.parse(JSON.stringify(arr))
        //     route = route || this.$route;
        //     arr.unshift(route?.meta?.locale || '')

        //     if(route?.matched?.length){
        //         for(let item in route.matched){
        //             let find = route.matched[item]?.children?.find(i=>i.name==route.name)
        //             if(!find){continue}
        //             arr = this.getArr(route.matched[item], arr);
        //         }
        //     }
            
        //     return arr;
        // }
    }
}
</script>

<style>

</style>
