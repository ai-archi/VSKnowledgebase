import { createApp } from 'vue';
import MermaidEditorPage from './MermaidEditorPage.vue';
import './styles/vscode-theme.css';

const app = createApp(MermaidEditorPage);
app.mount('#app');

