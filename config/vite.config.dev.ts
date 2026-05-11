import { mergeConfig } from 'vite';
// import eslint from 'vite-plugin-eslint';
import baseConfig from './vite.config.base';

// const proxyUrl = 'http://172.16.1.13:8002';
// const proxyUrl =  'http://172.16.1.117:3090';

// const proxyUrl =  'http://118.25.145.25:9090';

// const proxyUrl =  'http://218.23.2.55:9090';

// const proxyUrl = 'http://218.23.2.48:9090';

const proxyUrl = 'http://172.16.1.162:9090';
// const proxyUrl = 'http://218.23.2.48:9090';
// const proxyUrl =  'http://120.209.216.232:9090';
// const proxyUrl = 'https://idc.w7.com';
// const proxyUrl = 'https://k3s.mixi.city';
// const proxyUrl = 'http://150.158.236.182:9090';

// const proxyUrl = 'https://w7.17pc.cn';
// const proxyUrl = 'http://43.142.49.107:9090';

// const proxyUrl = 'http://172.16.1.126:9007';
// let ag8002 = {
//     // target: 'http://172.16.1.117:3090',
//     target: 'http://172.16.1.13:8002',
//     // target: 'http://172.16.1.126:9007',
//     changeOrigin: true,
//     ws: true,
//     configure: (proxy) => {
//         proxy.on('proxyReq', (proxyReq, req, res) => {
//             proxyReq.setHeader('proxy-url', `https://zpk.w7.cc/zpk`)
//         })
//     },
// }

export default mergeConfig(
  {
    mode: 'development',
    server: {
      host: '0.0.0.0',
      open: true,
      port: 8000,
      fs: {
        strict: true,
      },
      proxy: {
        '/k8s/v1/namespaces/longhorn-system/services/longhorn-backend/proxy/v1': {
        //   target: 'http://172.16.1.117:9090',
        //   target: 'http://118.25.145.25:9999',
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/k8s/v1/namespaces/longhorn-system/services/longhorn-backend:9500/proxy/v1': {
        //   target: 'http://172.16.1.117:9090',
        //   target: 'http://118.25.145.25:9999',
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/version': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/apis': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/api/v1/proxy': proxyUrl,
        '/api/v1/zpk': proxyUrl,
        '/api/v1/helm/releases':proxyUrl,
        '/api': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/k8s-proxy': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/panel-api/v1': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/k8s': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/s3bucket': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/respo': {
          target: 'http://zpk.w7.cc',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      // eslint({
      //     cache: false,
      //     include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      //     exclude: ['node_modules'],
      // }),
    ],
  },
  baseConfig
);
