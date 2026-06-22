import { App } from 'vue';
import Breadcrumb from './breadcrumb/index.vue';
import RouteBreadcrumb from './route-breadcrumb.vue';

export default {
  install(Vue: App) {
    Vue.component('Breadcrumb', Breadcrumb);
    Vue.component('RouteBreadcrumb', RouteBreadcrumb);
  },
};
