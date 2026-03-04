<template>
    <a-layout class="layout">
        <a-layout-header>
            <NavBar />
        </a-layout-header>
        <a-layout-content class="layout-content " >
            <router-view />
        </a-layout-content>
        <contact-us></contact-us>
    </a-layout>
</template>

<script lang="ts" setup>
import { ref, computed, watch, provide, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppStore, useUserStore } from '@/store';
import NavBar from '@/components/navbar/index.vue';
import usePermission from '@/hooks/permission';
import contactUs from '@/components/contact-us.vue';
  
    const userStore = useUserStore();
    const permission = usePermission();
    const router = useRouter();
    const route = useRoute();
    
    watch(
        () => userStore.role,
        (roleValue) => {
            if (roleValue && !permission.accessRouter(route))
            router.push({ name: 'notFound' });
        }
    );
</script>

<style scoped lang="less">
@nav-size-height: 60px;
@layout-max-width: 1100px;

.layout {
    width: 100%;
    height: 100vh;
}
.layout-content {
    height: 100%;
    overflow-y: hidden;
    background-color: var(--color-fill-2);
    transition: padding 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);
}
</style>
