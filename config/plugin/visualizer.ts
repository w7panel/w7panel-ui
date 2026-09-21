/**
 * Generation packaging analysis
 * 生成打包分析
 */
import { isReportMode } from '../utils';

export default async function configVisualizerPlugin() {
  if (isReportMode()) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    return visualizer({
      filename: './node_modules/.cache/visualizer/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    });
  }
  return [];
}
