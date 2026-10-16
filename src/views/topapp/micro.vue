<template>
    <app-detail
        embedded-micro
        :group="group"
        :do="do"
        :show-menu="showMenu"
    />
</template>

<script>
import AppDetail from '@/views/app/apps/detail.vue';

export default {
    props: {
        group: String,
        do: String,
        showMenu: {type: [Boolean, String], default: undefined},
    },
    components: { AppDetail },
};
</script>
