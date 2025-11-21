# Cesium 项目集合

本目录包含两个独立的 Cesium 项目，可以分别启动运行，互不冲突。

## 📁 项目结构

```
cesium/
├── src/                    # 原始项目：GLB 模型加载
│   ├── index.html
│   └── index.js
├── lod-tiles/             # 新项目：LOD 瓦片加载系统
│   ├── index.html
│   └── index.js
├── webpack.config.js      # 原始项目的 webpack 配置
├── webpack.lod.config.js  # LOD 项目的 webpack 配置
└── package.json           # 共享的依赖配置
```

## 🚀 项目 1: GLB 模型加载（原项目）

### 功能
- 加载并显示 GLB 3D 模型
- 将模型放置在地球表面

### 启动命令
```bash
npm start
```
- 运行在端口：`3000`
- 访问地址：`http://localhost:3000`

### 构建命令
```bash
npm run build
```

---

## 🌍 项目 2: LOD 瓦片加载系统（新项目）

### 功能
- **鼠标点击加载瓦片**：点击地球表面任意位置，系统会根据点击位置向后端请求对应的瓦片图片
- **LOD 分层加载**：根据相机高度自动选择合适的 LOD 级别
  - Level 0: 远距离（>1,000,000m），瓦片大小 45°
  - Level 1: 中距离（500,000-1,000,000m），瓦片大小 22.5°
  - Level 2: 近距离（100,000-500,000m），瓦片大小 11.25°
  - Level 3: 很近（50,000-100,000m），瓦片大小 5.625°
  - Level 4: 最近（<50,000m），瓦片大小 2.8125°
- **时间轴控制**：底部时间轴面板，可设置年月（默认 202401），支持上下月切换
- **智能瓦片管理**：自动加载周围 3x3 区域的瓦片，清理旧的不同 LOD 级别的瓦片
- **实时配置**：可在界面上配置后端地址、深度、级别等参数

### 后端 API 参数

系统会向后端发送以下参数请求 PNG 瓦片：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ncType` | string | `"so"` | 数据类型 |
| `timeType` | int | `0` | 时间类型 |
| `year` | int | 从时间轴获取 | 年份（默认 2024） |
| `month` | int | 从时间轴获取 | 月份（默认 01） |
| `day` | int | `1` | 日期（固定为1号） |
| `hour` | int | `0` | 小时（固定为0点） |
| `depth` | double | `0` | 深度（可在界面配置） |
| `level` | int | `0` | 级别（可在界面配置） |
| `tileX` | int | 计算得出 | 瓦片 X 坐标 |
| `tileY` | int | 计算得出 | 瓦片 Y 坐标 |

**示例请求 URL：**
```
http://localhost:4433/api/tile?ncType=so&timeType=0&year=2024&month=1&day=1&hour=0&depth=0&level=2&tileX=5&tileY=3
```

### 启动命令
```bash
npm run start:lod
```
- 运行在端口：`3001`
- 访问地址：`http://localhost:3001`

### 构建命令
```bash
npm run build:lod
```

### 使用说明

1. **启动项目**：运行 `npm run start:lod`
2. **配置后端**：在右侧配置面板中设置后端 API 地址（默认端口 4433）
3. **设置时间**：在底部时间轴面板中：
   - 直接输入 YYYYMM 格式（如 202401）
   - 或使用“上月”“下月”按钮切换
   - 点击“应用”按钮生效
4. **点击地球**：点击地球表面任意位置，系统会自动：
   - 根据相机高度确定 LOD 级别
   - 计算点击位置对应的瓦片坐标
   - 加载中心瓦片及周围 3x3 区域的瓦片
   - 将后端返回的 PNG 图片贴在地球表面对应位置
5. **查看状态**：左侧信息面板会显示加载状态和已加载瓦片数量

### 瓦片坐标系统

- 经度范围：-180° 到 180°
- 纬度范围：-90° 到 90°
- 瓦片坐标从左上角 (0, 0) 开始
- 瓦片大小根据 LOD 级别动态调整

---

## 📦 依赖安装

两个项目共享相同的依赖，只需安装一次：

```bash
npm install
```

## 🔧 后端开发建议

后端需要实现一个 API 端点来返回 PNG 瓦片图片。示例：

```javascript
// Node.js + Express 示例（监听端口 4433）
const express = require('express');
const cors = require('cors');
const app = express();

// 启用 CORS
app.use(cors());

app.get('/api/tile', (req, res) => {
  const { ncType, timeType, year, month, day, hour, depth, level, tileX, tileY } = req.query;
  
  // 根据参数生成或获取对应的 PNG 图片
  const imagePath = generateTileImage(ncType, timeType, year, month, day, hour, depth, level, tileX, tileY);
  
  res.sendFile(imagePath);
});

app.listen(4433, () => {
  console.log('瓦片服务运行在 http://localhost:4433');
});
```

## 🧪 测试后端服务器

项目提供了一个测试后端服务器 `backend-example.js`，可以生成测试瓦片：

### 安装后端依赖
```bash
# 使用提供的 package.json
npm install --prefix . --package-lock-only=false express cors canvas
```

或手动安装：
```bash
npm install express cors canvas
```

### 启动测试后端
```bash
node backend-example.js
```

测试后端会：
- 监听端口 4433
- 根据参数生成彩色测试瓦片
- 在瓦片上显示时间、级别、坐标等信息
- 支持 CORS

## 🎯 同时运行两个项目

可以在不同的终端窗口中同时运行：

**终端 1（测试后端）：**
```bash
node backend-example.js
```

**终端 2（原项目）：**
```bash
npm start
```

**终端 3（LOD 项目）：**
```bash
npm run start:lod
```

然后访问：
- 测试后端：http://localhost:4433/health
- 原项目：http://localhost:3000
- LOD 项目：http://localhost:3001

## 📝 注意事项

1. 确保后端 API 已启动并可访问
2. 后端需要支持 CORS（跨域资源共享）
3. 返回的 PNG 图片应该是透明背景，以便更好地叠加在地球上
4. 可以根据实际需求调整 LOD 级别的阈值和瓦片大小
5. 两个项目使用不同的端口（3000 和 3001），互不冲突

## 🛠️ 自定义配置

### 修改 LOD 级别配置

编辑 `lod-tiles/index.js` 中的 `LOD_LEVELS` 数组：

```javascript
const LOD_LEVELS = [
  { maxHeight: 1000000, level: 0, tileSize: 45 },
  { maxHeight: 500000, level: 1, tileSize: 22.5 },
  // 添加或修改级别...
];
```

### 修改瓦片加载范围

编辑 `lod-tiles/index.js` 中的 `range` 变量：

```javascript
const range = 1; // 1 表示 3x3，2 表示 5x5，以此类推
```

## 📄 许可证

ISC
