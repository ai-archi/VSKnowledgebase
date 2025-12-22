/**
 * 统一入口文件
 * 根据 URL 参数或路径加载不同的视图
 */
import { createVueApp } from '@/app';
import { getView, getDefaultView } from '@/views';

/**
 * 从多种来源获取视图名称
 * 支持以下方式（按优先级）：
 * 1. window.initialData.view（后端注入，优先级最高）
 * 2. URL 参数: ?view=viewpoint-panel
 * 3. URL 路径: /viewpoint-panel.html（从文件名提取）
 * 4. Hash: #viewpoint-panel
 */
function getViewNameFromUrl(): string | null {
  // 方式1: window.initialData.view（后端注入，优先级最高）
  if (window.initialData?.view) {
    return window.initialData.view;
  }

  // 方式2: URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  if (viewParam) {
    return viewParam;
  }

  // 方式3: URL 路径（从文件名提取）
  const pathname = window.location.pathname;
  const match = pathname.match(/([^/]+)\.html$/);
  if (match && match[1]) {
    return match[1];
  }

  // 方式4: Hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    return hash;
  }

  return null;
}

/**
 * 初始化应用
 */
function initApp() {
  // 获取视图名称
  const viewName = getViewNameFromUrl();
  
  // 获取视图配置
  const viewConfig = viewName ? getView(viewName) : getDefaultView();
  
  if (!viewConfig) {
    console.error(`View not found: ${viewName}`);
    // 使用默认视图
    const defaultView = getDefaultView();
    const app = createVueApp(defaultView.component);
    app.mount('#app');
    return;
  }

  // 设置页面标题
  if (viewConfig.title) {
    document.title = viewConfig.title;
  }

  // 创建并挂载应用
  const app = createVueApp(viewConfig.component);
  app.mount('#app');

  console.log(`View loaded: ${viewConfig.name}`);
}

// 等待 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

