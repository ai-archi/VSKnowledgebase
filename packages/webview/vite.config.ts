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
    include: ['mermaid', '@mermaid-js/mermaid-zenuml', 'codemirror', '@milkdown/core', '@milkdown/preset-commonmark', '@milkdown/plugin-listener', '@milkdown/theme-nord'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0, // 不内联资源，确保所有资源文件都被复制
    commonjsOptions: {
      include: [/mermaid/, /@mermaid-js/, /codemirror/, /@milkdown/, /node_modules/],
    },
    rollupOptions: {
      // 单入口构建：统一使用 index.html
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // 确保使用 ES 模块格式（默认）
        format: 'es',
        // 共享chunk配置，减少代码重复
        manualChunks: (id) => {
          // 将node_modules中的依赖打包到vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('@vue')) {
              return 'vendor-vue';
            }
            if (id.includes('element-plus')) {
              return 'vendor-element-plus';
            }
            if (id.includes('mermaid')) {
              return 'vendor-mermaid';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});

