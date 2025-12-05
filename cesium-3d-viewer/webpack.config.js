const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true,
    },
    devServer: {
        static: [
            {
                directory: path.join(__dirname, 'dist'),
            },
            {
                directory: path.join(__dirname, '..'),
                publicPath: '/',
            }
        ],
        compress: true,
        port: 8888,
        open: true,
        hot: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|glb|gltf)$/i,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            title: 'Cesium 3D Model Viewer',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/cesium/Build/Cesium/Workers',
                    to: 'Workers',
                },
                {
                    from: 'node_modules/cesium/Build/Cesium/ThirdParty',
                    to: 'ThirdParty',
                },
                {
                    from: 'node_modules/cesium/Build/Cesium/Assets',
                    to: 'Assets',
                },
                {
                    from: 'node_modules/cesium/Build/Cesium/Widgets',
                    to: 'Widgets',
                },
                {
                    from: '*.glb',
                    to: '[name][ext]',
                    noErrorOnMissing: true,
                },
                {
                    from: '*.png',
                    to: '[name][ext]',
                    noErrorOnMissing: true,
                },
                {
                    from: 'fengshan72',
                    to: 'fengshan72',
                    noErrorOnMissing: true,
                },
            ],
        }),
        new webpack.DefinePlugin({
            CESIUM_BASE_URL: JSON.stringify('/')
        }),
    ],
    resolve: {
        fallback: {
            "https": false,
            "zlib": false,
            "http": false,
            "url": false
        },
        mainFiles: ['index', 'Cesium'],
    },
};
