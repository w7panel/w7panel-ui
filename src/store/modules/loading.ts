import { defineStore } from 'pinia';

export default defineStore('loading', {
    state: () => ({
        loading: false,
    }),
    actions: {
        setLoading(value:boolean) {
            this.loading = value;
        },
    },
});