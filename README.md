# Cesium 项目

基于 Cesium 的 Web 3D 地球可视化项目，包含 GLB 模型加载和 LOD 瓦片系统两个独立应用。

## 📁 项目结构

```
cesium/
├── src/                    # GLB 模型加载项目
│   ├── index.html
│   └── index.js
├── lod-tiles/             # LOD 瓦片加载系统
│   ├── index.html
│   └── index.js
├── webpack.config.js      # src 项目的 webpack 配置
├── webpack.lod.config.js  # lod-tiles 项目的 webpack 配置
└── package.json           # 依赖配置
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动项目

**GLB 模型加载项目：**
```bash
npm start
```
访问：http://localhost:3000

**LOD 瓦片系统：**
```bash
npm run start:lod
```
访问：http://localhost:3001

### 构建生产版本
```bash
npm run build        # 构建 GLB 项目
npm run build:lod    # 构建 LOD 项目
```

## 🌍 LOD 瓦片系统

### 核心功能

- **LOD 分层加载**：根据相机高度自动选择 8 个 LOD 级别（Level 0-7）
- **金字塔瓦片结构**：从 Level 0 的 4 个瓦片到 Level 7 的 512 个瓦片
- **点击加载**：点击地球表面加载对应位置的瓦片及周围 3x3 区域
- **时间轴控制**：支持设置年月，可上下月切换
- **实时配置**：可配置后端地址、深度、级别等参数

### LOD 级别说明

| Level | 瓦片数 | 瓦片大小 | 相机高度范围 |
|-------|-------|---------|-------------|
| 0 | 4 | 180°×90° | > 50,000 km |
| 1 | 8 | 90°×90° | 20,000-50,000 km |
| 2 | 16 | 90°×45° | 10,000-20,000 km |
| 3 | 32 | 45°×45° | 5,000-10,000 km |
| 4 | 64 | 45°×22.5° | 2,000-5,000 km |
| 5 | 128 | 22.5°×22.5° | 1,000-2,000 km |
| 6 | 256 | 22.5°×11.25° | 500-1,000 km |
| 7 | 512 | 11.25°×11.25° | < 500 km |

### 后端 API

系统向后端请求 PNG 瓦片时发送以下参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `ncType` | string | 数据类型（默认 "so"） |
| `timeType` | int | 时间类型（默认 0） |
| `year` | int | 年份 |
| `month` | int | 月份 |
| `day` | int | 日期（固定为 1） |
| `hour` | int | 小时（固定为 0） |
| `depth` | double | 深度 |
| `level` | int | LOD 级别 |
| `tileX` | int | 瓦片 X 坐标 |
| `tileY` | int | 瓦片 Y 坐标 |

**示例请求：**
```
http://localhost:4433/api/tile?ncType=so&timeType=0&year=2024&month=1&day=1&hour=0&depth=0&level=2&tileX=5&tileY=3
```

### 使用说明

1. 启动项目：`npm run start:lod`
2. 配置后端 API 地址（默认端口 4433）
3. 设置时间（YYYYMM 格式，如 202401）
4. 点击地球表面加载瓦片
5. 系统自动根据相机高度选择 LOD 级别并加载周围瓦片

##  后端开发

后端需要实现 `/api/tile` 端点返回 PNG 瓦片图片，并支持 CORS。

**Node.js + Express 示例：**

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/api/tile', (req, res) => {
  const { ncType, timeType, year, month, day, hour, depth, level, tileX, tileY } = req.query;
  
  // 根据参数生成或获取 PNG 图片
  const imagePath = generateTileImage(ncType, timeType, year, month, day, hour, depth, level, tileX, tileY);
  
  res.sendFile(imagePath);
});

app.listen(4433, () => {
  console.log('瓦片服务运行在 http://localhost:4433');
});
```

## 📝 注意事项

1. 后端需支持 CORS
2. PNG 图片建议使用透明背景
3. 两个项目使用不同端口（3000 和 3001），可同时运行
4. 大文件（如 terrain_output.glb）建议使用 Git LFS 管理

## 📄 许可证

ISC
