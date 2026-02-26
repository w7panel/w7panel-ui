<template>
    <router-view v-slot="{ Component, route }" style="background-color: var(--color-fill-2);">
        <transition name="fade" mode="out-in" appear>
            <component :is="Component" :key="route.fullPath" />
            <!-- <component
                :is="Component"
                v-if="0 && route.meta.ignoreCache"
                :key="route.fullPath"
            />
            <keep-alive v-else :include="cacheList">
                <component :is="Component" :key="route.fullPath" />
            </keep-alive> -->
        </transition>
    </router-view>
</template>

<script lang="ts" setup>
    import { computed } from 'vue';
    import { useTabBarStore } from '@/store';

    const tabBarStore = useTabBarStore();

    const cacheList = computed(() => tabBarStore.getCacheList);
</script>

<style scoped lang="less"></style>
