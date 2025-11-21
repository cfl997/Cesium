import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// 设置 Cesium ion 访问令牌（如果需要）
// Cesium.Ion.defaultAccessToken = 'your_token_here';

// 创建 Cesium Viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: undefined,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: true,
  sceneModePicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  vrButton: false,
  infoBox: false,
  selectionIndicator: false,
});

// 保留底图显示
// viewer.imageryLayers.removeAll();

// 数据有效纬度范围（根据实际海洋数据调整）
const DATA_LAT_MIN = -75; // 南纬 75° 以北
const DATA_LAT_MAX = 85;  // 北纬 85° 以南

// 配置参数
const config = {
  ncType: 'so',
  timeType: 0,
  backendUrl: 'http://localhost:4433/api/tile',
  depth: 0,
  level: 0,
};

// 时间轴状态
const timelineState = {
  currentTime: '202401', // 默认时间 YYYYMM
};

// 存储已加载的瓦片实体
const loadedTiles = new Map();

// 性能统计
const performanceStats = {
  totalTilesLoaded: 0,
  currentLoadTime: 0,
  lastLoadStart: 0,
  isLoading: false,
};

// LOD 配置：等经纬度网格，纬度方向减半避免极地拉伸
// 经度方向：360° 均分
// 纬度方向：180° 均分，但瓦片数量是经度的一半（保持正方形）
// Level 0: 2×1 = 2 个瓦片（每个 180°×180°）
// Level 1: 4×2 = 8 个瓦片（每个 90°×90°）
// Level 2: 8×4 = 32 个瓦片（每个 45°×45°）
// Level 3: 16×8 = 128 个瓦片（每个 22.5°×22.5°）
// Level 4: 32×16 = 512 个瓦片（每个 11.25°×11.25°）

const LOD_LEVELS = [
  { maxHeight: 50000000, level: 0, tilesX: 2, tilesY: 1 },     // 2×1 = 2 个瓦片
  { maxHeight: 20000000, level: 1, tilesX: 4, tilesY: 2 },     // 4×2 = 8 个瓦片
  { maxHeight: 10000000, level: 2, tilesX: 8, tilesY: 4 },     // 8×4 = 32 个瓦片
  { maxHeight: 5000000, level: 3, tilesX: 16, tilesY: 8 },     // 16×8 = 128 个瓦片
  { maxHeight: 2000000, level: 4, tilesX: 32, tilesY: 16 },    // 32×16 = 512 个瓦片
  { maxHeight: 1000000, level: 5, tilesX: 64, tilesY: 32 },    // 64×32 = 2048 个瓦片
  { maxHeight: 500000, level: 6, tilesX: 128, tilesY: 64 },    // 128×64 = 8192 个瓦片
  { maxHeight: 0, level: 7, tilesX: 256, tilesY: 128 },        // 256×128 = 32768 个瓦片
];

// 从时间轴获取时间信息
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

// 根据相机高度获取 LOD 级别
function getLODLevel(cameraHeight) {
  for (const lodConfig of LOD_LEVELS) {
    if (cameraHeight > lodConfig.maxHeight) {
      return lodConfig;
    }
  }
  return LOD_LEVELS[LOD_LEVELS.length - 1];
}

// 经纬度转换为瓦片坐标（等经纬度方案）
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

// 瓦片坐标转换为经纬度范围（等经纬度方案）
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

// 构建后端请求 URL
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

// 加载单个瓦片
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

// 加载周围的瓦片（LOD 分层加载）
async function loadTilesAroundPoint(lon, lat, cameraHeight) {
  if (performanceStats.isLoading) return; // 防止重复加载
  
  performanceStats.isLoading = true;
  performanceStats.lastLoadStart = Date.now();
  
  const lodConfig = getLODLevel(cameraHeight);
  const { level, tilesX, tilesY } = lodConfig;
  
  const centerTile = lonLatToTile(lon, lat, lodConfig);
  const { tileX: centerX, tileY: centerY } = centerTile;
  
  // 加载中心瓦片及周围 3x3 区域的瓦片
  const range = 1; // 可以调整加载范围
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

// 清理旧瓦片（保留当前 LOD 级别的瓦片）
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

// 更新状态信息
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

// 相机移动事件处理：自动加载瓦片
let lastCameraUpdate = 0;
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

// 相机移动中实时更新（可选，用于平滑加载）
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

// 初始化相机位置
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 10000000), // 北京上空
});

// 初始加载
setTimeout(() => {
  const center = viewer.camera.positionCartographic;
  const lon = Cesium.Math.toDegrees(center.longitude);
  const lat = Cesium.Math.toDegrees(center.latitude);
  const height = center.height;
  loadTilesAroundPoint(lon, lat, height);
}, 500);

// ==================== 时间轴控制 ====================

// 更新时间显示
function updateTimeDisplay() {
  const timeStr = timelineState.currentTime;
  const year = timeStr.substring(0, 4);
  const month = timeStr.substring(4, 6);
  const displayElement = document.getElementById('timeDisplay');
  if (displayElement) {
    displayElement.textContent = `当前时间: ${year}年${month}月`;
  }
}

// 解析时间字符串为 Date 对象
function parseTimeString(timeStr) {
  const year = parseInt(timeStr.substring(0, 4));
  const month = parseInt(timeStr.substring(4, 6)) - 1; // JavaScript 月份从 0 开始
  return new Date(year, month, 1);
}

// 格式化 Date 对象为时间字符串
function formatTimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

// 上一个月
function previousMonth() {
  const currentDate = parseTimeString(timelineState.currentTime);
  currentDate.setMonth(currentDate.getMonth() - 1);
  timelineState.currentTime = formatTimeString(currentDate);
  document.getElementById('timeInput').value = timelineState.currentTime;
  updateTimeDisplay();
  clearAllTiles();
  updateStatus(`时间已更改为: ${timelineState.currentTime}`);
}

// 下一个月
function nextMonth() {
  const currentDate = parseTimeString(timelineState.currentTime);
  currentDate.setMonth(currentDate.getMonth() + 1);
  timelineState.currentTime = formatTimeString(currentDate);
  document.getElementById('timeInput').value = timelineState.currentTime;
  updateTimeDisplay();
  clearAllTiles();
  updateStatus(`时间已更改为: ${timelineState.currentTime}`);
}

// 应用时间
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

// 清除所有瓦片
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

// 时间轴事件监听器
document.getElementById('prevMonth').addEventListener('click', previousMonth);
document.getElementById('nextMonth').addEventListener('click', nextMonth);
document.getElementById('applyTime').addEventListener('click', applyTime);

// 时间输入框回车事件
document.getElementById('timeInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    applyTime();
  }
});

// 初始化时间显示
updateTimeDisplay();

console.log('Cesium LOD 瓦片加载系统已启动');
updateStatus('系统已就绪，自动加载中...');
