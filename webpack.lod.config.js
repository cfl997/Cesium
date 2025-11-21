/**
 * Webpack 配置文件 - LOD 瓦片加载系统
 * 用于打包和运行 lod-tiles 文件夹中的 LOD 瓦片加载应用
 */

// 引入 Node.js 路径模块
const path = require('path');
// 引入 HTML 生成插件
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 引入文件复制插件
const CopyWebpackPlugin = require('copy-webpack-plugin');
// 引入 Webpack 核心模块
const webpack = require('webpack');

module.exports = {
  // 入口文件：LOD 瓦片系统的起始点
  entry: './lod-tiles/index.js',
  
  // 输出配置
  output: {
    filename: 'bundle.js',                        // 打包后的文件名
    path: path.resolve(__dirname, 'dist-lod'),    // 输出目录（使用独立的 dist-lod 目录）
    clean: true,                                  // 每次构建前清空输出目录
  },
  
  // 开发服务器配置
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist-lod'),  // LOD 项目的静态文件目录
      },
      {
        directory: __dirname,                         // 项目根目录
        publicPath: '/',                              // 公共路径
      },
    ],
    compress: true,                                   // 启用 gzip 压缩
    port: 3001,                                       // 使用端口 3001，避免与 GLB 项目（3000）冲突
  },
  
  // 模块加载规则
  module: {
    rules: [
      {
        // CSS 文件处理规则
        test: /\.css$/,                               // 匹配所有 .css 文件
        use: ['style-loader', 'css-loader'],          // 使用 style-loader 和 css-loader 处理
      },
      {
        // 资源文件处理规则
        test: /\.(png|gif|jpg|jpeg|svg|xml|json|glb|gltf)$/,  // 匹配图片、模型等资源文件
        type: 'asset/resource',                       // 作为资源文件处理
      },
    ],
  },
  
  // 插件配置
  plugins: [
    // HTML 生成插件：自动生成 HTML 文件并注入打包后的 JS
    new HtmlWebpackPlugin({
      template: 'lod-tiles/index.html',               // LOD 项目的 HTML 模板文件路径
    }),
    
    // 文件复制插件：复制 Cesium 静态资源到输出目录
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'Workers' },         // Web Workers 文件
        { from: 'node_modules/cesium/Build/Cesium/ThirdParty', to: 'ThirdParty' },   // 第三方库
        { from: 'node_modules/cesium/Build/Cesium/Assets', to: 'Assets' },           // 资源文件（图标、纹理等）
        { from: 'node_modules/cesium/Build/Cesium/Widgets', to: 'Widgets' },         // UI 组件样式
        // 注意：LOD 项目不需要复制 terrain_output.glb 文件
      ],
    }),
    
    // 定义全局常量：设置 Cesium 基础路径
    new webpack.DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify(''),            // Cesium 资源基础 URL（空字符串表示相对路径）
    }),
  ],
  
  // 模块解析配置
  resolve: {
    // 禁用 Node.js 核心模块的 polyfill（减小打包体积）
    fallback: {
      https: false,                                   // 不使用 https 模块
      zlib: false,                                    // 不使用 zlib 模块
      http: false,                                    // 不使用 http 模块
      url: false,                                     // 不使用 url 模块
    },
    // 默认解析的文件名
    mainFiles: ['index', 'Cesium'],                   // 优先查找 index 和 Cesium 文件
  },
};
