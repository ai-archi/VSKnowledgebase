import { createApp } from 'vue';
import PlantUMLEditorPage from './PlantUMLEditorPage.vue';
import './styles/vscode-theme.css';
// 导入 CodeMirror（确保在 Vue 应用初始化前加载）
import 'codemirror';
import 'codemirror/lib/codemirror.css';

const app = createApp(PlantUMLEditorPage);
app.mount('#app');

