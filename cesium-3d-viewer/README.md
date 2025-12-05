# Cesium 3D 模型展示项目

这是一个基于 Cesium 的 3D 模型展示项目，包含弹窗功能和两个 GLB 模型的加载与控制。

## 项目特性

- 🌍 基于 Cesium 的 3D 地球场景
- 📦 加载两个 GLB 模型：
  - `terrain_output.glb` - 地形模型（位于原点）
  - `north.glb` - 指北针模型（位于 Z 轴正上方 100 单位）
- 🎛️ 交互式控制面板
- 🔧 弹窗式模型设置界面
- 📍 实时位置调节功能
- 🎨 现代化 UI 设计

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置 Cesium Ion 访问令牌
在 `index.js` 文件中，将以下行替换为您的 Cesium Ion 访问令牌：
```javascript
Cesium.Ion.defaultAccessToken = 'your_cesium_ion_access_token_here';
```

您可以在 [Cesium Ion](https://cesium.com/ion/) 免费注册并获取访问令牌。

### 3. 启动项目
```bash
npm start
```
或者双击 `start.bat` 文件

### 4. 访问应用
浏览器会自动打开 `http://localhost:8080`

## 功能说明

### 控制面板
- **打开模型设置**: 打开弹窗进行详细设置
- **重置视角**: 恢复到初始视角
- **透明度控制**: 调节两个模型的透明度

### 弹窗设置
- **位置调节**: 实时调整模型的 X、Y、Z 坐标
- **重置位置**: 恢复模型到初始位置

### 键盘快捷键
- `Ctrl + M`: 打开模型设置弹窗
- `Ctrl + R`: 重置视角
- `Esc`: 关闭弹窗

### 鼠标交互
- 点击模型会在控制台输出相关信息
- 支持标准的 Cesium 相机控制（拖拽、缩放、旋转）

## 文件结构

```
cesium/
├── index.html          # 主 HTML 文件
├── index.js            # 主 JavaScript 文件
├── terrain_output.glb  # 地形模型文件
├── north.glb          # 指北针模型文件
├── start.bat          # Windows 启动脚本
├── package.json       # 项目配置
└── webpack.config.js  # Webpack 配置
```

## 模型位置说明

### 地形模型 (terrain_output.glb)
- **初始位置**: 原点 (0, 0, 0)
- **用途**: 主要的地形展示模型
- **可调节**: 支持 X、Y、Z 三轴位置调节

### 指北针模型 (north.glb)
- **初始位置**: Z 轴正上方 100 单位 (0, 0, 100)
- **用途**: 方向指示器
- **可调节**: 支持 X、Y、Z 三轴位置调节

## 技术栈

- **Cesium**: 3D 地球和地理空间可视化
- **Webpack**: 模块打包和开发服务器
- **HTML5/CSS3**: 现代化 UI 界面
- **JavaScript ES6+**: 交互逻辑实现

## 注意事项

1. 确保模型文件 `terrain_output.glb` 和 `north.glb` 位于项目根目录
2. 需要有效的 Cesium Ion 访问令牌才能正常显示地形
3. 建议使用现代浏览器（Chrome、Firefox、Edge 等）
4. 首次加载可能需要一些时间来下载模型文件

## 故障排除

### 模型不显示
- 检查模型文件路径是否正确
- 确认 Cesium Ion 访问令牌是否有效
- 查看浏览器控制台是否有错误信息

### 性能问题
- 大型模型可能影响性能，可以调整模型的 `scale` 属性
- 使用 `minimumPixelSize` 和 `maximumScale` 控制模型的显示细节

## 开发扩展

您可以基于此项目进行以下扩展：
- 添加更多 3D 模型
- 实现模型动画效果
- 添加光照和材质控制
- 集成地理数据可视化
- 添加测量和标注功能
