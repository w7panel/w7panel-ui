import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';

const proxyUrl = 'http://localhost:8000';

export default mergeConfig(
  {
    mode: 'development',
    server: {
      open: false,
      port: 3000,
      fs: {
        strict: true,
      },
      proxy: {
        '/k8s': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/api': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
        '/apis': {
          target: proxyUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  },
  baseConfig
);
