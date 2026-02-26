import { defineStore } from 'pinia';

export default defineStore('dark', {
    state: () => ({
        isDark: false,
    }),
    actions: {
        setDark(value:boolean) {
            this.isDark = value;
        },
    },
});