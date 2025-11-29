import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
// 先导入 VSCode 主题样式，覆盖 Element Plus 的 CSS 变量
import './styles/vscode-theme.css';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import CreateDesignDialogPage from './CreateDesignDialogPage.vue';

const app = createApp(CreateDesignDialogPage);
const pinia = createPinia();

// 注册 Element Plus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(pinia);
app.mount('#app');

