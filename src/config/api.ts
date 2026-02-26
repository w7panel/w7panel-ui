/**
 * API 路径配置
 * 
 * 面板业务: /panel-api/v1/*
 * K8s 代理: /k8s-proxy/*
 */

export const API_BASE_PATH = '/panel-api/v1';
export const K8S_PROXY_BASE_PATH = '/k8s-proxy';

// API 路径映射表
export const API_PATHS = {
  // 认证 API
  AUTH_LOGIN: '/login',
  AUTH_REGISTER: '/register',
  AUTH_REFRESH_TOKEN: '/refresh-token2',
  AUTH_CAPTCHA: '/captcha',
  AUTH_VERIFY_CAPTCHA: '/verify-captcha',
  AUTH_INIT_USER: '/init-user', // POST: 创建初始用户
  AUTH_RESET_PASSWORD: '/reset-password-current',
  
  // K8S 资源 API
  K8S_NAMESPACES: '/namespaces',
  K8S_PODS: '/pods',
  K8S_DEPLOYMENTS: '/deployments',
  K8S_SERVICES: '/services',
  K8S_CONFIGMAPS: '/configmaps',
  K8S_PID: '/pid',
  K8S_YAML: '/yaml',
  K8S_TTY: '/tty',
  K8S_EXEC: '/exec',
  
  // 文件操作 API
  FILES_WEBDAV: '/webdav-agent',
  FILES_COMPRESS: '/compress-agent',
  FILES_EXTRACT: '/compress-agent',
  FILES_CHMOD: '/permission-agent',
  FILES_DOWNLOAD: '/download',
  
  // 应用管理 API
  APPS_HELM_RELEASES: '/helm/releases',
  APPS_ZPK_LIST: '/zpk/list',
  APPS_KCOMPOSE: '/kcompose',
  
  // 集群管理 API
  CLUSTER_NODES: '/cluster/nodes',
  CLUSTER_K3K_INFO: '/k3k/info',
  CLUSTER_K3K_INIT: '/k3k/init',
  CLUSTER_GPU_CONFIG: '/gpu/config',
  CLUSTER_LONGHORN_STATUS: '/longhorn/volumes/status',
  
  // 监控 API
  METRICS_USAGE: '/metrics/usage',
  METRICS_USAGE_DISK: '/metrics/usage/disk',
  METRICS_NODE: '/metrics/node',
  METRICS_POD: '/metrics/pod',
  
  // 工具 API
  UTILS_PINYIN: '/pinyin',
  UTILS_MYIP: '/myip',
  UTILS_DNS_IP: '/dnsip',
  UTILS_DNS_CNAME: '/dns-cname',
  
  // Console API
  CONSOLE_INFO: '/console/info',
  CONSOLE_OAUTH: '/console/oauth',
  CONSOLE_LOGIN: '/console/login',
  CONSOLE_REGISTER: '/console/register-to-console',
  
  // 微应用 API
  MICROAPP_TOP: '/microapp/top',
  MICROAPP_PROXY: '/microapp',
} as const;

// 构建完整 API 路径
export function buildApiPath(pathKey: keyof typeof API_PATHS): string {
  return `${API_BASE_PATH}${API_PATHS[pathKey]}`;
}

export default {
  BASE_PATH: API_BASE_PATH,
  PATHS: API_PATHS,
  buildApiPath,
};
