import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';
import configCompressPlugin from './plugin/compress';
import configVisualizerPlugin from './plugin/visualizer';
import configArcoResolverPlugin from './plugin/arcoResolver';
import configImageminPlugin from './plugin/imagemin';

export default async () => mergeConfig(
  {
    base: '/',
    mode: 'production',
    plugins: [
    //   configCompressPlugin('gzip'),
      await configVisualizerPlugin(),
      configArcoResolverPlugin(),
      configImageminPlugin(),
    ],
    build: {
      assetsDir: 'assets',  // 所有资源文件放在 assets 子目录
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'arco', test: /node_modules\/@arco-design\/web-vue/ },
              { name: 'chart', test: /node_modules\/(echarts|vue-echarts)/ },
              { name: 'vue', test: /node_modules\/(vue|vue-router|pinia|@vueuse\/core)/ },
            ],
          },
          // 添加内容哈希到文件名，强制浏览器加载新文件
          entryFileNames: 'assets/index.[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
      chunkSizeWarningLimit: 2000,
    },
  },
  baseConfig
);
