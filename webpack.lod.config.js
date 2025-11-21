const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './lod-tiles/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist-lod'),
    clean: true,
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist-lod'),
      },
      {
        directory: __dirname,
        publicPath: '/',
      },
    ],
    compress: true,
    port: 3001, // 使用不同的端口，避免与原项目冲突
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json|glb|gltf)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'lod-tiles/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'Workers' },
        { from: 'node_modules/cesium/Build/Cesium/ThirdParty', to: 'ThirdParty' },
        { from: 'node_modules/cesium/Build/Cesium/Assets', to: 'Assets' },
        { from: 'node_modules/cesium/Build/Cesium/Widgets', to: 'Widgets' },
      ],
    }),
    new webpack.DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify(''),
    }),
  ],
  resolve: {
    fallback: {
      https: false,
      zlib: false,
      http: false,
      url: false,
    },
    mainFiles: ['index', 'Cesium'],
  },
};
