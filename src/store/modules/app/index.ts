import { defineStore } from 'pinia';
import type { RouteRecordNormalized } from 'vue-router';
import defaultSettings from '@/config/settings.json';
import type { AppState, TopAppMenuItem } from './types';

const MENU_FILTER_KEY = 'w7panel-menu-filter';

const useAppStore = defineStore('app', {
  state: (): AppState => ({
    ...defaultSettings,
    menuFilter: localStorage.getItem(MENU_FILTER_KEY) || 'cloudserver',
    topApps: [],
    topAppsLoaded: false,
    topAppsLoading: false,
  }),

  getters: {
    appCurrentSetting(state: AppState): AppState {
      return { ...state };
    },
    appDevice(state: AppState) {
      return state.device;
    },
    appAsyncMenus(state: AppState): RouteRecordNormalized[] {
      return state.serverMenu as unknown as RouteRecordNormalized[];
    },
  },

  actions: {
    // Update app settings
    updateSettings(partial: Partial<AppState>) {
      // @ts-ignore-next-line
      this.$patch(partial);
    },
    changeMenuFilter(value){
        this.menuFilter = value;
        localStorage.setItem(MENU_FILTER_KEY, value);
    },
    setTopApps(value: TopAppMenuItem[]) {
      this.topApps = value;
      this.topAppsLoaded = true;
    },
    setTopAppsLoading(value: boolean) {
      this.topAppsLoading = value;
    },
    // Change theme color
    toggleTheme(dark: boolean) {
      if (dark) {
        this.theme = 'dark';
        document.body.setAttribute('arco-theme', 'dark');
      } else {
        this.theme = 'light';
        document.body.removeAttribute('arco-theme');
      }
    },
    toggleDevice(device: string) {
      this.device = device;
    },
    toggleMenu(value: boolean) {
      this.hideMenu = value;
    },
    clearServerMenu() {
      this.serverMenu = [];
    },
  },
});

export default useAppStore;
