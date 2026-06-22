import { createPinia } from 'pinia';
import useAppStore from './modules/app';
import useUserStore from './modules/user';
import useNamespaceStore from './modules/namespace';
import useLoadingStore from './modules/loading';
import useDarkStore from './modules/dark'

const pinia = createPinia();

export { useAppStore, useUserStore, useNamespaceStore, useLoadingStore,useDarkStore };
export default pinia;
