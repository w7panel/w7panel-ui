<template>
    <router-view v-slot="{ Component, route }" style="background-color: var(--color-fill-2);">
        <transition name="fade" mode="out-in" appear>
            <component :is="Component" :key="route.fullPath" />
        </transition>
    </router-view>
    <contact-us></contact-us>
</template>

<script lang="ts" setup>
  import contactUs from '@/components/contact-us.vue';
</script>

<style scoped lang="less"></style>
