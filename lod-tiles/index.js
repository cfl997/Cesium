/**
 * Cesium LOD 瓦片加载系统
 * 功能：根据相机高度自动选择 LOD 级别，加载海洋数据瓦片
 * 特点：
 * - 8 个 LOD 级别（Level 0-7），从 2 个瓦片到 32768 个瓦片
 * - 金字塔结构，自动根据相机高度切换级别
 * - 3x3 区域加载，智能清理旧瓦片
 * - 时间轴控制，支持切换年月
 */

// 导入 Cesium 库和样式
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// ==================== Cesium Ion 配置 ====================
// 设置 Cesium ion 访问令牌（如果需要使用 Cesium Ion 的在线资源）
// Cesium.Ion.defaultAccessToken = 'your_token_here';

// ==================== 创建 Cesium 视图器 ====================
// 创建 Cesium Viewer 实例，配置简洁的 UI（隐藏大部分默认控件）
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: undefined,      // 不使用地形数据
  baseLayerPicker: false,          // 隐藏底图选择器
  geocoder: false,                 // 隐藏地理位置搜索
  homeButton: true,                // 显示主页按钮
  sceneModePicker: false,          // 隐藏场景模式选择器
  navigationHelpButton: false,     // 隐藏导航帮助
  animation: false,                // 隐藏动画控件
  timeline: false,                 // 隐藏时间轴
  fullscreenButton: false,         // 隐藏全屏按钮
  vrButton: false,                 // 隐藏 VR 按钮
  infoBox: false,                  // 隐藏信息框
  selectionIndicator: false,       // 隐藏选择指示器
});

// ==================== 底图配置 ====================
// 保留底图显示（注释掉的代码可以移除所有底图）
// viewer.imageryLayers.removeAll();

// ==================== 数据有效范围 ====================
// 数据有效纬度范围（根据实际海洋数据调整，极地区域通常没有数据）
const DATA_LAT_MIN = -75; // 南纬 75° 以北
const DATA_LAT_MAX = 85;  // 北纬 85° 以南

// ==================== 后端 API 配置参数 ====================
// 存储后端 API 请求的默认参数
const config = {
  ncType: 'so',                                    // 数据类型（so = salinity ocean，海洋盐度）
  timeType: 0,                                     // 时间类型
  backendUrl: 'http://localhost:4433/api/tile',   // 后端 API 地址
  depth: 0,                                        // 深度（米）
  level: 0,                                        // 级别
};

// ==================== 时间轴状态 ====================
// 存储当前选择的时间（年月）
const timelineState = {
  currentTime: '202401', // 默认时间 YYYYMM 格式（2024年1月）
};

// ==================== 瓦片存储 ====================
// 存储已加载的瓦片实体，键为 "level_tileX_tileY"，值为瓦片对象
const loadedTiles = new Map();

// ==================== 性能统计 ====================
// 统计瓦片加载性能，用于显示在左侧信息面板
const performanceStats = {
  totalTilesLoaded: 0,    // 累计加载的瓦片数量
  currentLoadTime: 0,     // 当前加载耗时（毫秒）
  lastLoadStart: 0,       // 上次加载开始时间
  isLoading: false,       // 是否正在加载（防止重复加载）
};

// ==================== LOD 级别配置 ====================
/**
 * LOD（Level of Detail）金字塔结构配置
 * 
 * 设计原理：
 * - 等经纬度网格，纬度方向减半避免极地拉伸
 * - 经度方向：360° 均分
 * - 纬度方向：180° 均分，但瓦片数量是经度的一半（保持正方形）
 * 
 * 8 个 LOD 级别：
 * - Level 0: 2×1 = 2 个瓦片（每个 180°×180°）- 全球视图
 * - Level 1: 4×2 = 8 个瓦片（每个 90°×90°）- 大陆视图
 * - Level 2: 8×4 = 32 个瓦片（每个 45°×45°）- 国家视图
 * - Level 3: 16×8 = 128 个瓦片（每个 22.5°×22.5°）- 省份视图
 * - Level 4: 32×16 = 512 个瓦片（每个 11.25°×11.25°）- 城市视图
 * - Level 5: 64×32 = 2048 个瓦片（每个 5.625°×5.625°）- 区县视图
 * - Level 6: 128×64 = 8192 个瓦片（每个 2.8125°×2.8125°）- 街道视图
 * - Level 7: 256×128 = 32768 个瓦片（每个 1.40625°×1.40625°）- 详细视图
 * 
 * maxHeight：相机高度阈值（米），超过此高度使用该级别
 */
const LOD_LEVELS = [
  { maxHeight: 50000000, level: 0, tilesX: 2, tilesY: 1 },     // > 50,000 km
  { maxHeight: 20000000, level: 1, tilesX: 4, tilesY: 2 },     // 20,000-50,000 km
  { maxHeight: 10000000, level: 2, tilesX: 8, tilesY: 4 },     // 10,000-20,000 km
  { maxHeight: 5000000, level: 3, tilesX: 16, tilesY: 8 },     // 5,000-10,000 km
  { maxHeight: 2000000, level: 4, tilesX: 32, tilesY: 16 },    // 2,000-5,000 km
  { maxHeight: 1000000, level: 5, tilesX: 64, tilesY: 32 },    // 1,000-2,000 km
  { maxHeight: 500000, level: 6, tilesX: 128, tilesY: 64 },    // 500-1,000 km
  { maxHeight: 0, level: 7, tilesX: 256, tilesY: 128 },        // < 500 km
];

// ==================== 工具函数：时间处理 ====================
/**
 * 从时间轴状态获取时间信息
 * @returns {Object} 包含 year, month, day, hour 的对象
 */
function getCurrentTimeInfo() {
  const timeStr = timelineState.currentTime;
  const year = parseInt(timeStr.substring(0, 4));
  const month = parseInt(timeStr.substring(4, 6));
  
  return {
    year: year,
    month: month,
    day: 1, // 默认为每月1号
    hour: 0, // 默认为0点
  };
}

// ==================== 工具函数：LOD 级别选择 ====================
/**
 * 根据相机高度获取对应的 LOD 级别配置
 * @param {number} cameraHeight - 相机高度（米）
 * @returns {Object} LOD 级别配置对象
 */
function getLODLevel(cameraHeight) {
  for (const lodConfig of LOD_LEVELS) {
    if (cameraHeight > lodConfig.maxHeight) {
      return lodConfig;
    }
  }
  return LOD_LEVELS[LOD_LEVELS.length - 1];
}

// ==================== 工具函数：坐标转换 ====================
/**
 * 将经纬度坐标转换为瓦片坐标（等经纬度方案）
 * @param {number} lon - 经度（-180 到 180）
 * @param {number} lat - 纬度（-90 到 90）
 * @param {Object} lodConfig - LOD 级别配置
 * @returns {Object} 包含 tileX, tileY, tilesX, tilesY 的对象
 */
function lonLatToTile(lon, lat, lodConfig) {
  const { tilesX, tilesY } = lodConfig;
  
  // 经度：-180~180 -> 0~tilesX
  const x = (lon + 180) / 360;
  const tileX = Math.floor(x * tilesX);
  
  // 纬度：-90~90 -> tilesY~0（注意 Y 轴方向）
  const y = (90 - lat) / 180;
  const tileY = Math.floor(y * tilesY);
  
  return { 
    tileX: Math.max(0, Math.min(tilesX - 1, tileX)), 
    tileY: Math.max(0, Math.min(tilesY - 1, tileY)),
    tilesX,
    tilesY
  };
}

/**
 * 将瓦片坐标转换为经纬度边界（等经纬度方案）
 * @param {number} tileX - 瓦片 X 坐标
 * @param {number} tileY - 瓦片 Y 坐标
 * @param {number} tilesX - X 方向总瓦片数
 * @param {number} tilesY - Y 方向总瓦片数
 * @returns {Object|null} 包含 west, south, east, north 的对象，或 null（极地区域）
 */
function tileToLonLatBounds(tileX, tileY, tilesX, tilesY) {
  // 经度：线性映射
  const tileSizeX = 360 / tilesX;
  const west = tileX * tileSizeX - 180;
  const east = (tileX + 1) * tileSizeX - 180;
  
  // 纬度：线性映射（注意 Y 轴从北到南）
  const tileSizeY = 180 / tilesY;
  let north = 90 - tileY * tileSizeY;
  let south = 90 - (tileY + 1) * tileSizeY;
  
  // 限制在数据有效范围内
  north = Math.min(north, DATA_LAT_MAX);
  south = Math.max(south, DATA_LAT_MIN);
  
  // 如果瓦片完全在有效范围外，返回 null
  if (south >= DATA_LAT_MAX || north <= DATA_LAT_MIN) {
    return null;
  }
  
  return { 
    west: Math.max(-180, Math.min(180, west)),
    south: Math.max(-90, Math.min(90, south)),
    east: Math.max(-180, Math.min(180, east)),
    north: Math.max(-90, Math.min(90, north))
  };
}

// ==================== 工具函数：URL 构建 ====================
/**
 * 构建后端 API 请求 URL
 * @param {number} tileX - 瓦片 X 坐标
 * @param {number} tileY - 瓦片 Y 坐标
 * @param {number} level - LOD 级别
 * @returns {string} 完整的 API URL
 */
function buildTileUrl(tileX, tileY, level) {
  const timeInfo = getCurrentTimeInfo();
  const backendUrl = document.getElementById('backendUrl').value || config.backendUrl;
  const depth = parseFloat(document.getElementById('depthInput').value) || config.depth;
  
  const params = new URLSearchParams({
    ncType: config.ncType,
    timeType: config.timeType.toString(),
    year: timeInfo.year.toString(),
    month: timeInfo.month.toString(),
    day: timeInfo.day.toString(),
    hour: timeInfo.hour.toString(),
    depth: depth.toString(),
    level: level.toString(),
    tileX: tileX.toString(),
    tileY: tileY.toString(),
  });
  
  return `${backendUrl}?${params.toString()}`;
}

// ==================== 核心函数：瓦片加载 ====================
/**
 * 加载单个瓦片
 * @param {number} tileX - 瓦片 X 坐标
 * @param {number} tileY - 瓦片 Y 坐标
 * @param {number} level - LOD 级别
 * @param {number} tilesX - X 方向总瓦片数
 * @param {number} tilesY - Y 方向总瓦片数
 */
async function loadTile(tileX, tileY, level, tilesX, tilesY) {
  const tileKey = `${level}_${tileX}_${tileY}`;
  
  // 如果已经加载过，跳过
  if (loadedTiles.has(tileKey)) {
    return;
  }
  
  const bounds = tileToLonLatBounds(tileX, tileY, tilesX, tilesY);
  
  // 如果瓦片在极地区域外，跳过
  if (!bounds) {
    console.log(`跳过极地瓦片: ${tileKey}`);
    return;
  }
  
  // 验证边界是否有效
  if (bounds.west >= bounds.east || bounds.south >= bounds.north) {
    console.warn(`跳过无效瓦片: ${tileKey}, bounds:`, bounds);
    return;
  }
  
  // 验证边界是否在有效范围内
  if (bounds.west < -180 || bounds.east > 180 || 
      bounds.south < -90 || bounds.north > 90) {
    console.warn(`瓦片边界超出范围: ${tileKey}, bounds:`, bounds);
    return;
  }
  
  const url = buildTileUrl(tileX, tileY, level);
  
  updateStatus(`加载瓦片: Level ${level}, Tile (${tileX}, ${tileY})`);
  
  try {
    // 预加载图片以检查透明度
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    
    img.onload = () => {
      console.log(`图片加载成功: ${tileKey}, 尺寸: ${img.width}x${img.height}`);
    };
    
    img.onerror = (err) => {
      console.error(`图片加载失败: ${tileKey}`, err);
    };
    
    // 创建矩形实体，将 PNG 图片作为材质贴在地球上
    const entity = viewer.entities.add({
      name: `Tile_${tileKey}`,
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(
          bounds.west,
          bounds.south,
          bounds.east,
          bounds.north
        ),
        material: new Cesium.ImageMaterialProperty({
          image: url,
          transparent: true,
          // 如果后端无法设置透明度，可以尝试色彩键（将特定颜色设为透明）
          // color: Cesium.Color.WHITE.withAlpha(0.8), // 降低整体不透明度
        }),
        height: 0, // 贴在地表
        // 移除 classificationType，使用标准渲染以支持透明度
      },
    });
    
    loadedTiles.set(tileKey, {
      entity,
      level,
      tileX,
      tileY,
      lastAccess: Date.now(),
    });
    
    updateStatus(`成功加载瓦片: Level ${level}, Tile (${tileX}, ${tileY})`);
  } catch (error) {
    console.error(`加载瓦片失败: ${tileKey}`, error);
    updateStatus(`加载失败: ${error.message}`);
  }
}

/**
 * 加载指定点周围的瓦片（3x3 区域）
 * @param {number} lon - 中心点经度
 * @param {number} lat - 中心点纬度
 * @param {number} cameraHeight - 相机高度（米）
 */
async function loadTilesAroundPoint(lon, lat, cameraHeight) {
  if (performanceStats.isLoading) return; // 防止重复加载
  
  performanceStats.isLoading = true;
  performanceStats.lastLoadStart = Date.now();
  
  const lodConfig = getLODLevel(cameraHeight);
  const { level, tilesX, tilesY } = lodConfig;
  
  const centerTile = lonLatToTile(lon, lat, lodConfig);
  const { tileX: centerX, tileY: centerY } = centerTile;
  
  // 加载中心瓦片及周围 3x3 区域的瓦片
  const range = 4; // 可以调整加载范围
  const loadPromises = [];
  let newTilesCount = 0;
  
  console.log(`LOD Level ${level}: ${tilesX}×${tilesY} = ${tilesX * tilesY} 个瓦片`);
  console.log(`中心瓦片: (${centerX}, ${centerY}), 瓦片大小: ${(360/tilesX).toFixed(2)}° × ${(180/tilesY).toFixed(2)}°`);
  
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const tileX = centerX + dx;
      const tileY = centerY + dy;
      
      // 确保瓦片坐标在有效范围内
      if (tileX >= 0 && tileX < tilesX && tileY >= 0 && tileY < tilesY) {
        const tileKey = `${level}_${tileX}_${tileY}`;
        if (!loadedTiles.has(tileKey)) {
          newTilesCount++;
        }
        loadPromises.push(loadTile(tileX, tileY, level, tilesX, tilesY));
      }
    }
  }
  
  await Promise.all(loadPromises);
  
  // 清理旧的、不同 LOD 级别的瓦片
  cleanupOldTiles(level);
  
  // 更新性能统计
  performanceStats.currentLoadTime = Date.now() - performanceStats.lastLoadStart;
  performanceStats.totalTilesLoaded += newTilesCount;
  performanceStats.isLoading = false;
  
  updateStatus(`LOD Level ${level}, 加载 ${newTilesCount} 个新瓦片`);
}

/**
 * 清理旧瓦片（保留当前 LOD 级别的瓦片）
 * @param {number} currentLevel - 当前 LOD 级别
 */
function cleanupOldTiles(currentLevel) {
  const now = Date.now();
  const maxAge = 60000; // 60秒
  
  for (const [key, tile] of loadedTiles.entries()) {
    // 移除不同 LOD 级别的旧瓦片
    if (tile.level !== currentLevel || (now - tile.lastAccess > maxAge)) {
      viewer.entities.remove(tile.entity);
      loadedTiles.delete(key);
    }
  }
}

// ==================== UI 更新函数 ====================
/**
 * 更新左侧信息面板的状态显示
 * @param {string} message - 状态消息
 */
function updateStatus(message) {
  const statusElement = document.getElementById('statusInfo');
  if (statusElement) {
    const timestamp = new Date().toLocaleTimeString();
    statusElement.innerHTML = `
      <strong>${timestamp}</strong><br>
      ${message}<br>
      <strong>已加载瓦片:</strong> ${loadedTiles.size} 个<br>
      <strong>加载耗时:</strong> ${performanceStats.currentLoadTime}ms<br>
      <strong>累计加载:</strong> ${performanceStats.totalTilesLoaded} 个
    `;
  }
}

// ==================== 事件监听器：相机移动 ====================
// 相机移动结束事件：自动加载瓦片
let lastCameraUpdate = 0;  // 上次更新时间（用于节流）
viewer.camera.moveEnd.addEventListener(() => {
  const now = Date.now();
  if (now - lastCameraUpdate < 300) return; // 节流 300ms
  lastCameraUpdate = now;
  
  const center = viewer.camera.positionCartographic;
  const lon = Cesium.Math.toDegrees(center.longitude);
  const lat = Cesium.Math.toDegrees(center.latitude);
  const height = center.height;
  
  console.log(`相机位置: 经度=${lon.toFixed(4)}, 纬度=${lat.toFixed(4)}, 高度=${height.toFixed(0)}m`);
  
  // 自动加载当前视野中心的瓦片
  loadTilesAroundPoint(lon, lat, height);
});

// 相机移动中事件：平滑加载瓦片
viewer.camera.changed.addEventListener(() => {
  const now = Date.now();
  if (now - lastCameraUpdate < 1000) return; // 节流 1s
  lastCameraUpdate = now;
  
  const center = viewer.camera.positionCartographic;
  const lon = Cesium.Math.toDegrees(center.longitude);
  const lat = Cesium.Math.toDegrees(center.latitude);
  const height = center.height;
  
  loadTilesAroundPoint(lon, lat, height);
});

// ==================== 初始化：相机位置 ====================
// 设置初始相机位置（北京上空 10,000 公里）
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 10000000), // 经度, 纬度, 高度（米）
});

// ==================== 初始化：首次加载 ====================
// 延迟 500ms 后加载初始视野的瓦片
setTimeout(() => {
  const center = viewer.camera.positionCartographic;
  const lon = Cesium.Math.toDegrees(center.longitude);
  const lat = Cesium.Math.toDegrees(center.latitude);
  const height = center.height;
  loadTilesAroundPoint(lon, lat, height);
}, 500);

// ==================== 时间轴控制函数 ====================
/**
 * 更新底部时间轴的时间显示
 */
function updateTimeDisplay() {
  const timeStr = timelineState.currentTime;
  const year = timeStr.substring(0, 4);
  const month = timeStr.substring(4, 6);
  const displayElement = document.getElementById('timeDisplay');
  if (displayElement) {
    displayElement.textContent = `当前时间: ${year}年${month}月`;
  }
}

/**
 * 解析时间字符串为 Date 对象
 * @param {string} timeStr - YYYYMM 格式的时间字符串
 * @returns {Date} Date 对象
 */
function parseTimeString(timeStr) {
  const year = parseInt(timeStr.substring(0, 4));
  const month = parseInt(timeStr.substring(4, 6)) - 1; // JavaScript 月份从 0 开始
  return new Date(year, month, 1);
}

/**
 * 格式化 Date 对象为时间字符串
 * @param {Date} date - Date 对象
 * @returns {string} YYYYMM 格式的时间字符串
 */
function formatTimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * 切换到上一个月
 */
function previousMonth() {
  const currentDate = parseTimeString(timelineState.currentTime);
  currentDate.setMonth(currentDate.getMonth() - 1);
  timelineState.currentTime = formatTimeString(currentDate);
  document.getElementById('timeInput').value = timelineState.currentTime;
  updateTimeDisplay();
  clearAllTiles();
  updateStatus(`时间已更改为: ${timelineState.currentTime}`);
}

/**
 * 切换到下一个月
 */
function nextMonth() {
  const currentDate = parseTimeString(timelineState.currentTime);
  currentDate.setMonth(currentDate.getMonth() + 1);
  timelineState.currentTime = formatTimeString(currentDate);
  document.getElementById('timeInput').value = timelineState.currentTime;
  updateTimeDisplay();
  clearAllTiles();
  updateStatus(`时间已更改为: ${timelineState.currentTime}`);
}

/**
 * 应用用户输入的时间
 * 验证格式和有效性
 */
function applyTime() {
  const inputValue = document.getElementById('timeInput').value;
  
  // 验证输入格式 YYYYMM
  if (!/^\d{6}$/.test(inputValue)) {
    alert('请输入正确的时间格式: YYYYMM (例如: 202401)');
    return;
  }
  
  const year = parseInt(inputValue.substring(0, 4));
  const month = parseInt(inputValue.substring(4, 6));
  
  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    alert('请输入有效的年份和月份');
    return;
  }
  
  timelineState.currentTime = inputValue;
  updateTimeDisplay();
  clearAllTiles();
  updateStatus(`时间已应用: ${timelineState.currentTime}`);
}

/**
 * 清除所有已加载的瓦片
 * 并在 100ms 后自动重新加载当前视野的瓦片
 */
function clearAllTiles() {
  for (const [key, tile] of loadedTiles.entries()) {
    viewer.entities.remove(tile.entity);
    loadedTiles.delete(key);
  }
  updateStatus('已清除所有瓦片，自动重新加载中...');
  
  // 自动重新加载当前视野的瓦片
  setTimeout(() => {
    const center = viewer.camera.positionCartographic;
    const lon = Cesium.Math.toDegrees(center.longitude);
    const lat = Cesium.Math.toDegrees(center.latitude);
    const height = center.height;
    loadTilesAroundPoint(lon, lat, height);
  }, 100);
}

// ==================== 事件监听器：时间轴按钮 ====================
// 绑定时间轴控制按钮的点击事件
document.getElementById('prevMonth').addEventListener('click', previousMonth);  // 上月按钮
document.getElementById('nextMonth').addEventListener('click', nextMonth);      // 下月按钮
document.getElementById('applyTime').addEventListener('click', applyTime);      // 应用按钮

// 时间输入框回车事件：按回车键应用时间
document.getElementById('timeInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    applyTime();
  }
});

// ==================== 初始化：时间显示 ====================
// 初始化时间显示
updateTimeDisplay();

// ==================== 启动完成 ====================
// 输出启动信息到控制台
console.log('Cesium LOD 瓦片加载系统已启动');
// 更新状态面板
updateStatus('系统已就绪，自动加载中...');
