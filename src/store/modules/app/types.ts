import type { RouteRecordNormalized } from 'vue-router';

export interface TopAppMenuItem {
  title: string;
  name: string;
  roles: string[];
}

export interface AppState {
  theme: string;
  colorWeak: boolean;
  navbar: boolean;
  menu: boolean;
  topMenu: boolean;
  hideMenu: boolean;
  menuCollapse: boolean;
  footer: boolean;
  themeColor: string;
  menuWidth: number;
  globalSettings: boolean;
  device: string;
  menuFromServer: boolean;
  serverMenu: RouteRecordNormalized[];
  topApps: TopAppMenuItem[];
  topAppsLoaded: boolean;
  topAppsLoading: boolean;
  [key: string]: unknown;
}
