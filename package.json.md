# package.json 配置说明

本文件详细说明了 `package.json` 中各个字段的含义和用途。

## 基本信息

```json
{
  "name": "cesium",                    // 项目名称
  "version": "1.0.0",                  // 项目版本号
  "main": "index.js",                  // 项目入口文件
  "description": "基于 Cesium 的 Web 3D 地球可视化项目，包含 GLB 模型加载和 LOD 瓦片系统",
  "author": "cfl997",                  // 项目作者
  "license": "ISC",                    // 开源许可证类型
  "keywords": [                        // 项目关键词，用于 npm 搜索
    "cesium",                          // Cesium 3D 地球引擎
    "3d",                              // 3D 可视化
    "webgl",                           // WebGL 技术
    "lod",                             // LOD (Level of Detail) 细节层次
    "tiles",                           // 瓦片系统
    "geospatial"                       // 地理空间数据
  ]
}
```

## NPM 脚本命令

```json
{
  "scripts": {
    // GLB 模型加载项目（src 文件夹）
    "start": "webpack serve --mode development --open",
    // 启动开发服务器，运行在 http://localhost:3000
    // --mode development: 开发模式，包含源码映射和热更新
    // --open: 自动打开浏览器
    
    "build": "webpack --mode production",
    // 构建生产版本，输出到 dist 文件夹
    // --mode production: 生产模式，代码压缩和优化
    
    // LOD 瓦片系统（lod-tiles 文件夹）
    "start:lod": "webpack serve --config webpack.lod.config.js --mode development --open",
    // 启动 LOD 项目开发服务器，运行在 http://localhost:3001
    // --config webpack.lod.config.js: 使用 LOD 项目的 webpack 配置
    
    "build:lod": "webpack --config webpack.lod.config.js --mode production"
    // 构建 LOD 项目生产版本，输出到 dist-lod 文件夹
  }
}
```

## 生产依赖 (dependencies)

项目运行时必需的依赖包：

```json
{
  "dependencies": {
    "cesium": "^1.135.0"
    // Cesium 3D 地球引擎库
    // ^1.135.0 表示兼容 1.135.0 及以上的 1.x 版本
    // 用于渲染 3D 地球、加载模型、显示瓦片等功能
  }
}
```

## 开发依赖 (devDependencies)

仅在开发和构建时需要的依赖包：

```json
{
  "devDependencies": {
    "copy-webpack-plugin": "^13.0.1",
    // Webpack 插件：复制静态资源文件
    // 用于复制 Cesium 的静态资源（Workers、Assets 等）到输出目录
    
    "css-loader": "^7.1.2",
    // Webpack loader：解析 CSS 文件
    // 将 CSS 文件转换为 JavaScript 模块
    
    "html-webpack-plugin": "^5.6.4",
    // Webpack 插件：生成 HTML 文件
    // 自动生成 HTML 并注入打包后的 JS 和 CSS
    
    "style-loader": "^4.0.0",
    // Webpack loader：将 CSS 注入到 DOM
    // 将 CSS 代码插入到 HTML 的 <style> 标签中
    
    "webpack": "^5.102.1",
    // Webpack 核心库：模块打包工具
    // 将多个 JS、CSS 文件打包成少量优化后的文件
    
    "webpack-cli": "^6.0.1",
    // Webpack 命令行工具
    // 提供 webpack 命令行接口
    
    "webpack-dev-server": "^5.2.2"
    // Webpack 开发服务器
    // 提供热更新、实时预览等开发功能
  }
}
```

## 使用说明

### 安装依赖
```bash
npm install
```
这会安装 `dependencies` 和 `devDependencies` 中的所有包。

### 运行项目
```bash
# GLB 模型加载项目
npm start          # 开发模式
npm run build      # 生产构建

# LOD 瓦片系统
npm run start:lod  # 开发模式
npm run build:lod  # 生产构建
```

### 版本号说明
- `^1.135.0`：兼容 1.135.0 及以上的 1.x 版本（不包括 2.0.0）
- `~1.135.0`：兼容 1.135.x 版本（不包括 1.136.0）
- `1.135.0`：固定版本，只安装 1.135.0

### 更新依赖
```bash
# 检查过时的包
npm outdated

# 更新所有包到最新兼容版本
npm update

# 更新特定包
npm update cesium
```
