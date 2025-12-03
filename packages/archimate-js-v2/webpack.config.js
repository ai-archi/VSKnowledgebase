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
    extensions: ['.js', '.json'],
    alias: {
      'archimate-js': path.resolve(__dirname, '../../vendors/archimate-js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
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
            ignore: ['**/.DS_Store', '**/ArchimateEditorApp.js'] // 不复制源文件，使用打包后的
          }
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

