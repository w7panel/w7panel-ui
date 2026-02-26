<template>
    <a-breadcrumb :routes="routes" class="container-breadcrumb">
        <!-- <a-breadcrumb-item><icon-apps /></a-breadcrumb-item> -->
        <template #item-render="{route}">
            <span class="cursor" @click="$router.push({name:route.name, params:route.params})">
                <icon-apps v-if="route.name=='root'" />
                <span v-else >{{route.label}}</span>
            </span>
        </template>
    </a-breadcrumb>
    <!-- <a-breadcrumb class="container-breadcrumb">
        <a-breadcrumb-item><icon-apps /></a-breadcrumb-item>
        <a-breadcrumb-item v-for="item in items" :key="item">{{ $t(item) }}</a-breadcrumb-item>
    </a-breadcrumb> -->
</template>

<script setup>
  defineProps({
    items: {
      default() {
        return [];
      },
    },
    routes: {},
  });
</script>

<style scoped lang="less">
  .container-breadcrumb {
    margin: 0 0 20px;
    :deep(.arco-breadcrumb-item) {
      color: rgb(var(--gray-6));
      &:last-child {
        color: rgb(var(--gray-8));
      }
    }
  }
</style>
