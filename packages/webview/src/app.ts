/**
 * Vue 应用配置和初始化
 * 统一管理所有视图的公共配置
 */
import { createApp, type App, type Component } from 'vue';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
// 样式加载顺序：Element Plus -> Element Plus 深色主题
// 注意：CodeMirror 和 diagram-editor 样式在 EditorPage.vue 中按需加载
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'; // Element Plus 深色主题

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

