import { createApp } from 'vue';
import PlantUMLEditorPage from './PlantUMLEditorPage.vue';
import './styles/vscode-theme.css';
// 导入 CodeMirror（确保在 Vue 应用初始化前加载）
import 'codemirror';
import 'codemirror/lib/codemirror.css';
// 导入编辑器样式（必须在 CodeMirror CSS 之后加载，以覆盖默认样式）
import './styles/diagram-editor.css';

const app = createApp(PlantUMLEditorPage);
app.mount('#app');

