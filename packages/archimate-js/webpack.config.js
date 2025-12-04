const webpack = require('webpack');
const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const SENTRY_DSN = process.env.SENTRY_DSN;
const SOURCE_VERSION = process.env.SOURCE_VERSION || process.env.npm_package_gitHead || 'dev';

// 确定输出路径：优先使用 apps/extension/archimate-js，否则使用 public（用于开发）
// webpack 需要绝对路径
const outputPath = process.env.OUTPUT_PATH 
  ? path.resolve(__dirname, process.env.OUTPUT_PATH)
  : path.resolve(__dirname, 'public');

module.exports = {
  entry: {
    bundle: ['./app/app.js'],
  },
  output: {
    path: outputPath,
    filename: 'app.js',
  },
  resolve: {
    extensions: ['.js', '.json'],
    modules: ['node_modules', path.resolve(__dirname, 'src')]
  },
  module: {
    rules: [
      {
        test: /\.xml$/,
        use: 'raw-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: ['file-loader'],
      },
      {
        test: /\.less$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      }
    ],
  },
  plugins: [
    new CopyWebpackPlugin({ 
      patterns: [
        // 复制 HTML、CSS、字体等文件，但排除 vendor 目录（单独处理）
        { 
          from: '**/*.{html,css,woff,ttf,eot,svg,woff2,js}', 
          context: 'app/',
          globOptions: {
            ignore: ['**/vendor/**']
          }
        },
        // 复制 vendor 目录（Bootstrap、Font Awesome 等）到 public/vendor
        { 
          from: 'vendor',
          context: 'app/',
          to: 'vendor',
          globOptions: {
            ignore: ['**/.DS_Store']
          },
          noErrorOnMissing: true
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
