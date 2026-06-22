import '@/utils/preserve-history-state';
import { createApp } from 'vue';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import globalComponents from '@/components';
import router from './router';
import store from './store';
// import './mock';
import App from './App.vue';
import '@/assets/style/global.less';
import '@/api/interceptor';
import 'highlight.js/styles/atom-one-dark.css'
import '@/assets/tool.js';
// import mavonEditor from 'mavon-editor'
// import 'mavon-editor/dist/css/index.css'

import { bus } from 'wujie';

const windowWithWujieNoop = window as any;
if(!windowWithWujieNoop.__W7_WUJIE_ROUTECHANGE_NOOP__){
    windowWithWujieNoop.__W7_WUJIE_ROUTECHANGE_NOOP__ = () => {};
    bus.$on('routeChange', windowWithWujieNoop.__W7_WUJIE_ROUTECHANGE_NOOP__);
}

const app = createApp(App);

const getPopupContainer = () =>
    ((window as any).__POWERED_BY_WUJIE__ || (window as any).__MICRO_APP_ENVIRONMENT__) ? '#w7panel' : 'body';

app.use(ArcoVue, {});
app.use(ArcoVueIcon);

Object.values((app as any)._context?.components || {}).forEach((component: any) => {
    const popupContainerProp = component?.props?.popupContainer;
    if(popupContainerProp && typeof popupContainerProp === 'object'){
        popupContainerProp.default = getPopupContainer;
    }
});

app.use(router);
app.use(store);
// app.use(mavonEditor);
app.use(globalComponents);

app.config.globalProperties.$popupContainer = getPopupContainer();

app.mount('#w7panel');

app.config.globalProperties.inMicro = (window as any).__POWERED_BY_WUJIE__ || (window as any).__MICRO_APP_ENVIRONMENT__;

// if((window as any).__MICRO_APP_ENVIRONMENT__){
//     let arcoStyleDom = document.createElement('link');
//     arcoStyleDom.setAttribute('rel', 'stylesheet');
//     arcoStyleDom.setAttribute('href', 'https://unpkg.com/@arco-design/web-vue@2.44.7/dist/arco.min.css');
//     document.querySelector('head').appendChild(arcoStyleDom);
// }
// console.log('in micro',(window as any).__MICRO_APP_ENVIRONMENT__)
if((window as any).__POWERED_BY_WUJIE__ || (window as any).__MICRO_APP_ENVIRONMENT__){
    document.body.classList.add('inmicro');
}
