import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';
import configVisualizerPlugin from './plugin/visualizer';
import configArcoResolverPlugin from './plugin/arcoResolver';
import configImageminPlugin from './plugin/imagemin';

export default mergeConfig(
  {
    base: '/',
    mode: 'production',
    plugins: [
      configVisualizerPlugin(),
      configArcoResolverPlugin(),
      configImageminPlugin(),
    ],
    build: {
      assetsDir: 'assets',  // 所有资源文件放在 assets 子目录
      rollupOptions: {
        output: {
          manualChunks: {
            arco: ['@arco-design/web-vue'],
            chart: ['echarts', 'vue-echarts'],
            vue: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
          },
          // 添加内容哈希到文件名，强制浏览器加载新文件
          entryFileNames: 'assets/index.[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
      esbuild: {
        pure: ['console.log', 'console.debug'],
        drop: ['debugger'],
      },
      chunkSizeWarningLimit: 2000,
    },
  },
  baseConfig
);
