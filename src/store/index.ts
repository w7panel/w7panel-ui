import { createPinia } from 'pinia';
import useAppStore from './modules/app';
import useUserStore from './modules/user';
import useTabBarStore from './modules/tab-bar';
import useNamespaceStore from './modules/namespace';
import useLoadingStore from './modules/loading';
import useDarkStore from './modules/dark'

const pinia = createPinia();

export { useAppStore, useUserStore, useTabBarStore, useNamespaceStore, useLoadingStore,useDarkStore };
export default pinia;
