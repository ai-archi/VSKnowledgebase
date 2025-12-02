// Webpack 配置 for PlantUMLEditorApp
// 用于打包 PlantUML 编辑器

const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const SENTRY_DSN = process.env.SENTRY_DSN;
const SOURCE_VERSION = process.env.SOURCE_VERSION || process.env.npm_package_gitHead || 'dev';

// 确定输出路径
const outputPath = process.env.OUTPUT_PATH 
  ? path.resolve(__dirname, process.env.OUTPUT_PATH)
  : path.resolve(__dirname, 'public');

module.exports = {
  entry: {
    'PlantUMLEditorApp': ['./app/PlantUMLEditorApp.js'],
  },
  output: {
    path: outputPath,
    filename: '[name].js',
    chunkFilename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.json'],
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
            ignore: ['**/.DS_Store', '**/PlantUMLEditorApp.js'] // 不复制源文件，使用打包后的
          }
        },
        // 复制 jar 文件（保留 vendor 目录结构）
        {
          from: 'vendor/plantuml-1.2025.10.jar',
          context: '.',
          to: 'vendor/plantuml-1.2025.10.jar',
          noErrorOnMissing: false
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.SENTRY_DSN': JSON.stringify(SENTRY_DSN || null),
      'process.env.SOURCE_VERSION': JSON.stringify(SOURCE_VERSION || null)
    }),
    ...sentryIntegration()
  ],
  mode: 'development',
  devtool: 'source-map',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors-PlantUMLEditorApp',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
};

function sentryIntegration() {
  if (SENTRY_DSN && SOURCE_VERSION) {
    return [
      new SentryWebpackPlugin({
        release: SOURCE_VERSION,
        include: '.',
        ignore: ['node_modules', 'webpack.config.js', '*sentry.js'],
      })
    ];
  }
  return [];
}

