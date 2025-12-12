import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './', // 使用相对路径，这样在 webview 中可以正确解析资源
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['mermaid', 'codemirror'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0, // 不内联资源，确保所有资源文件都被复制
    commonjsOptions: {
      include: [/mermaid/, /codemirror/, /node_modules/],
    },
    rollupOptions: {
      input: {
        'create-file-dialog': resolve(__dirname, 'create-file-dialog.html'),
        'create-folder-dialog': resolve(__dirname, 'create-folder-dialog.html'),
        'create-design-dialog': resolve(__dirname, 'create-design-dialog.html'),
        'edit-relations-dialog': resolve(__dirname, 'edit-relations-dialog.html'),
        'create-task-dialog': resolve(__dirname, 'create-task-dialog.html'),
        'viewpoint-panel': resolve(__dirname, 'viewpoint-panel.html'),
        'mermaid-editor': resolve(__dirname, 'mermaid-editor.html'),
        'plantuml-editor': resolve(__dirname, 'plantuml-editor.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // 确保使用 ES 模块格式（默认）
        format: 'es',
      },
    },
  },
  server: {
    port: 3000,
  },
});

