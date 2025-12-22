/**
 * Vue 应用配置和初始化
 * 统一管理所有视图的公共配置
 */
import { createApp, type App, type Component } from 'vue';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
// 样式加载顺序：Element Plus -> CodeMirror -> VSCode 主题 -> 图表编辑器样式（最后加载，确保优先级）
import 'element-plus/dist/index.css';
import 'codemirror/lib/codemirror.css';
import '@/styles/vscode-theme.css';
import '@/styles/diagram-editor.css';

/**
 * 创建并配置 Vue 应用
 */
export function createVueApp(component: Component): App {
  const app = createApp(component);

  // 注册 Element Plus
  app.use(ElementPlus);

  // 注册所有图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }

  return app;
}

