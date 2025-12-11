//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  ignoreWarnings: [
    /test/,
    /\.test\./
  ],
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    clean: true // clean the output directory before emit
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    'better-sqlite3': 'commonjs better-sqlite3', // Native module, must be external
    'knex': 'commonjs knex', // Query builder, should be external
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules|\.test\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'esnext' // Use ESNext modules for better tree shaking
              },
              // 确保所有导入的模块都被包含
              onlyCompileBundledFiles: false,
              transpileOnly: false
            }
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  optimization: {
    minimize: false // Disable minification in development mode
    // 注意：sideEffects 配置应该在 package.json 中设置
    // webpack 会自动读取 package.json 的 sideEffects 字段
  },
  node: {
    __dirname: false,
    __filename: false
  }
};
module.exports = [extensionConfig];
