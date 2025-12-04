// Webpack 配置 for ArchimateEditorApp
// 用于打包基于 archimate-js (diagram-js) 的编辑器

const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// 确定输出路径
const outputPath = process.env.OUTPUT_PATH 
  ? path.resolve(__dirname, process.env.OUTPUT_PATH)
  : path.resolve(__dirname, 'public');

module.exports = {
  entry: {
    'ArchimateEditorApp': ['./app/ArchimateEditorApp.js'],
  },
  output: {
    path: outputPath,
    filename: '[name].js',
    chunkFilename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.json', '.css'],
    modules: [
      'node_modules',
      path.resolve(__dirname, '../../vendors/archimate.js/node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    alias: {
      '@vsknowledgebase/archimate-js': path.resolve(__dirname, '../../vendors/archimate.js'),
      // 添加 diagram-js 和 archimate-font 的别名，以便 CSS @import 能够正确解析
      'diagram-js': path.resolve(__dirname, '../../vendors/archimate.js/node_modules/diagram-js'),
      // archimate-font 在 vendors/archimate-js 目录下（不是 archimate.js）
      'archimate-font': path.resolve(__dirname, '../../vendors/archimate-js/archimate-font'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              // 允许 CSS @import 从 node_modules 解析
              url: true,
            },
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: ['file-loader'],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({ 
      patterns: [
        { 
          from: '**/*.{html,css,woff,ttf,eot,svg,woff2,js,ico}', 
          context: 'app/',
          globOptions: {
            ignore: ['**/.DS_Store', '**/ArchimateEditorApp.js', '**/assets/**'] // 不复制源文件，不复制 assets（直接使用 vendors/archimate.js 的）
          }
        },
        // 直接复制 vendors/archimate.js 的整个 assets 目录结构
        // 保持与 archimate-js 完全一致，避免重复维护
        {
          from: '../../vendors/archimate.js/assets/icons',
          to: 'icons', // 图标在根目录（与 archimate-js 保持一致）
          globOptions: {
            ignore: ['**/.DS_Store']
          },
          noErrorOnMissing: true
        },
        {
          from: '../../vendors/archimate.js/assets',
          to: 'assets', // 其他资源在 assets 目录
          globOptions: {
            ignore: ['**/.DS_Store', '**/icons/**'] // 排除 icons，因为已经单独复制到根目录
          },
          noErrorOnMissing: true
        }
      ]
    }),
  ],
  mode: 'development',
  devtool: 'source-map',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors-ArchimateEditorApp',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
};

