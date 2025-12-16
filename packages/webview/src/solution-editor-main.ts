import { createApp } from 'vue';
import SolutionEditorPage from './SolutionEditorPage.vue';
import './styles/vscode-theme.css';

const app = createApp(SolutionEditorPage);
app.mount('#app');

