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

import hljs from 'highlight.js/lib/common'

import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';
import createEmojiPlugin from '@kangc/v-md-editor/lib/plugins/emoji/index';
import '@kangc/v-md-editor/lib/plugins/emoji/emoji.css';
// GoCaptcha
import "go-captcha-vue/dist/style.css"
import GoCaptcha from "go-captcha-vue"

VMdPreview.use(githubTheme, {
    Hljs: hljs,
}).use(createEmojiPlugin());

const app = createApp(App);

app.use(ArcoVue, {});
app.use(ArcoVueIcon);
app.use(VMdPreview);

app.use(router);
app.use(store);
// app.use(mavonEditor);
app.use(globalComponents);
app.use(GoCaptcha);

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
