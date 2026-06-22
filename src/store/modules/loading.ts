import { defineStore } from 'pinia';

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export default defineStore('loading', {
    state: () => ({
        loading: false,
        pendingCount: 0,
    }),
    actions: {
        startLoading() {
            if(hideTimer){
                clearTimeout(hideTimer);
                hideTimer = null;
            }
            this.pendingCount += 1;
            this.loading = true;
        },
        finishLoading() {
            this.pendingCount = Math.max(0, this.pendingCount - 1);
            if(this.pendingCount > 0){
                return;
            }

            if(hideTimer){
                clearTimeout(hideTimer);
            }
            hideTimer = setTimeout(() => {
                if(this.pendingCount === 0){
                    this.loading = false;
                }
                hideTimer = null;
            }, 120);
        },
        setLoading(value:boolean) {
            if(value){
                this.startLoading();
            }else{
                this.finishLoading();
            }
        },
        resetLoading() {
            this.pendingCount = 0;
            if(hideTimer){
                clearTimeout(hideTimer);
                hideTimer = null;
            }
            this.loading = false;
        },
    },
});
