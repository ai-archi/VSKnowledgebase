const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const SENTRY_DSN = process.env.SENTRY_DSN;
const SOURCE_VERSION = process.env.SOURCE_VERSION || process.env.npm_package_gitHead || 'dev';

// 确定输出路径：优先使用 apps/extension/mermaid-editor，否则使用 public（用于开发）
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
            ignore: ['**/.DS_Store']
          }
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

