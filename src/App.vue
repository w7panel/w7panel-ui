<template>
    <a-config-provider :locale="locale">
        <a-spin :loading="loading" :size="32" tip="加载中..." class="page-spin">
            <router-view />
        </a-spin>
    </a-config-provider>
</template>

<script lang="ts" setup>
    import { computed } from 'vue';
    import enUS from '@arco-design/web-vue/es/locale/lang/en-us';
    import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
    import useLocale from '@/hooks/locale'
    import { useNamespaceStore, useLoadingStore, useDarkStore, useAppStore } from '@/store';
    import { useDark } from '@vueuse/core';

    const appStore = useAppStore();
    (function(){
        let v = false;
        let theme = localStorage.getItem('arco-theme');
        if((window as any).$wujie?.props?.theme){
            theme = (window as any).$wujie.props.theme;
        }
        if(theme=='light'){
            v = false;
        }
        else if(theme=='dark'){
            v = true;
        }
        else {
            v = useDark().value
        }
        appStore.toggleTheme(v);
        useDarkStore().setDark(v);
    })()
    let loading = computed(()=>useLoadingStore().loading)
  
    // vuex 获取sessionStorage
    if (sessionStorage.getItem('w7panel_store')) {
        useNamespaceStore().$patch(JSON.parse(sessionStorage.getItem('w7panel_store')));
    }
    //在页面刷新时将vuex里的信息保存到sessionStorage里
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('w7panel_store', JSON.stringify(useNamespaceStore().$state));
    });

    if((window as any).__POWERED_BY_WUJIE__){
        (window as any).$wujie?.bus.$on("changeTheme", (v)=>{
            appStore.toggleTheme(v);
            useDarkStore().setDark(v);
        });
    }
    
    const { currentLocale } = useLocale();
    const locale = computed(() => {
        switch (currentLocale.value) {
            case 'zh-CN': return zhCN;
            case 'en-US': return enUS;
            default: return enUS;
        }
    });
</script>
<style>
.arco-spin.page-spin{display:block!important;}
.page-spin .arco-spin-mask{z-index:9999;}
</style>
