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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0, // 不内联资源，确保所有资源文件都被复制
    rollupOptions: {
      input: {
        'create-file-dialog': resolve(__dirname, 'create-file-dialog.html'),
        'create-folder-dialog': resolve(__dirname, 'create-folder-dialog.html'),
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

