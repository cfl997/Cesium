/**
 * Cesium GLB 模型加载应用
 * 功能：在 Cesium 3D 地球上加载并显示 GLB 格式的地形模型
 */

// 从 Cesium 库中导入所需的类和函数
import {
  Viewer,                      // Cesium 视图器（主要的 3D 地球容器）
  Cartesian3,                  // 3D 笛卡尔坐标系（X, Y, Z）
  Math as CesiumMath,          // Cesium 数学工具（角度转换等）
  Transforms,                  // 坐标变换工具
  HeadingPitchRange,           // 相机朝向参数（航向、俯仰、距离）
  createWorldTerrainAsync,     // 异步创建全球地形
  Model,                       // 3D 模型类
  Matrix4,                     // 4x4 变换矩阵
  Matrix3,                     // 3x3 旋转矩阵
} from 'cesium';
// 导入 Cesium 的 UI 组件样式
import 'cesium/Build/Cesium/Widgets/widgets.css';

// ==================== Cesium Ion 配置 ====================
// 设置 Cesium Ion 访问令牌（如果需要使用 Cesium Ion 的在线资源）
// Ion.defaultAccessToken = 'your_access_token_here';

// ==================== 创建 Cesium 视图器 ====================
// 创建 Cesium Viewer 实例，配置 UI 组件
const viewer = new Viewer('cesiumContainer', {
  animation: false,              // 不显示动画控件
  timeline: false,               // 不显示时间轴
  baseLayerPicker: true,         // 显示底图选择器
  geocoder: true,                // 显示地理位置搜索框
  homeButton: true,              // 显示主页按钮
  sceneModePicker: true,         // 显示场景模式选择器（3D/2D/2.5D）
  navigationHelpButton: false,   // 不显示导航帮助按钮
  fullscreenButton: true,        // 显示全屏按钮
});

// ==================== 加载全球地形 ====================
// 异步加载 Cesium 提供的全球地形数据
createWorldTerrainAsync().then((terrainProvider) => {
  viewer.terrainProvider = terrainProvider;  // 设置地形提供者
});

// ==================== 设置默认相机位置 ====================
// 设置默认位置（中国中心位置，可根据需要调整）
const defaultPosition = Cartesian3.fromDegrees(
  104.0,   // 经度（东经 104°）
  30.0,    // 纬度（北纬 30°）
  1000000  // 高度（1000 公里）
);

// ==================== 加载 GLB 模型函数 ====================
/**
 * 加载 GLB 模型并将其放置在地球表面
 * 模型坐标系统：
 * - 模型内部使用度（degree）作为单位
 * - 模型范围：5度 x 5度（经度 120-125°，纬度 20-25°）
 * - 模型原点：底面中心点（122.5°E, 22.5°N）
 */
async function loadGLBModel() {
  try {
    // 定义模型覆盖的地理区域（单位：度）
    const minLon = 120.0;  // 最小经度（东经 120°）
    const maxLon = 125.0;  // 最大经度（东经 125°）
    const minLat = 20.0;   // 最小纬度（北纬 20°）
    const maxLat = 25.0;   // 最大纬度（北纬 25°）
    
    // 输出模型配置信息到控制台
    console.log('=== 模型配置 ===');
    console.log('目标区域: 经度', minLon, '-', maxLon, '纬度', minLat, '-', maxLat);
    console.log('模型单位: 度（0-5范围）');
    console.log('模型原点: 底面中心点');
    
    // ========== 步骤 1：计算模型中心点 ==========
    // 模型原点在底面中心点（122.5°E, 22.5°N），范围是 5度x5度
    const centerLon = (minLon + maxLon) / 2;  // 中心经度
    const centerLat = (minLat + maxLat) / 2;  // 中心纬度
    // 将经纬度转换为笛卡尔坐标（地球表面，高度为 0）
    const originPosition = Cartesian3.fromDegrees(centerLon, centerLat, 0);
    
    // ========== 步骤 2：创建 ENU 坐标系 ==========
    // 创建变换矩阵：从模型坐标系到地球坐标系
    // ENU = East-North-Up（东-北-上）局部坐标系
    const enuMatrix = Transforms.eastNorthUpToFixedFrame(originPosition);
    
    // ========== 步骤 3：计算缩放因子 ==========
    // 将度（degree）转换为米（meter）
    const avgLat = (minLat + maxLat) / 2;  // 平均纬度
    // 经度 1 度的米数（随纬度变化，赤道最大，两极为 0）
    const degreesToMetersLon = 111320 * Math.cos(avgLat * Math.PI / 180);
    // 纬度 1 度的米数（约为 111.32 公里，全球基本一致）
    const degreesToMetersLat = 111320;
    
    // 输出转换系数到控制台
    console.log('1度经度 ≈', (degreesToMetersLon / 1000).toFixed(2), 'km');
    console.log('1度纬度 ≈', (degreesToMetersLat / 1000).toFixed(2), 'km');
    
    // ========== 步骤 4：创建缩放矩阵 ==========
    // 模型原点在底面中心点，模型内部坐标范围是 -2.5 到 +2.5 度
    // X 轴：经度方向（向东为正）
    // Y 轴：纬度方向（向北为正，但模型 Y 轴向南，所以取负）
    // Z 轴：高度方向（向上为正）
    const scaleMatrix = Matrix4.fromScale(
      new Cartesian3(degreesToMetersLon, -degreesToMetersLat, degreesToMetersLat)
    );
    
    // ========== 步骤 5：组合变换矩阵 ==========
    // 将 ENU 坐标系矩阵和缩放矩阵相乘，得到最终的模型变换矩阵
    const modelMatrix = Matrix4.multiply(
      enuMatrix,      // ENU 坐标系变换
      scaleMatrix,    // 缩放变换
      new Matrix4()   // 结果矩阵
    );
    
    // ========== 步骤 6：加载 GLB 模型 ==========
    // 从 GLB 文件异步加载模型
    const model = await Model.fromGltfAsync({
      url: './terrain_output.glb',  // GLB 文件路径
      modelMatrix: modelMatrix,     // 应用变换矩阵
    });
    
    // 将模型添加到场景中
    viewer.scene.primitives.add(model);

    console.log('模型加载成功');
    console.log('================');

    // ========== 步骤 7：相机飞行到模型区域 ==========
    // 将相机飞行到模型区域中心上方
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centerLon, centerLat, 800000),  // 目标位置（高度 800km）
      orientation: {
        heading: CesiumMath.toRadians(0),      // 航向角：0°（正北）
        pitch: CesiumMath.toRadians(-45),      // 俯仰角：-45°（向下看）
        roll: 0.0,                             // 翻滚角：0°（不倾斜）
      },
      duration: 2.0,  // 飞行持续时间（秒）
    });

    // ========== 步骤 8：启用深度测试 ==========
    // 启用深度测试以正确显示模型（防止模型被地形遮挡）
    viewer.scene.globe.depthTestAgainstTerrain = true;

  } catch (error) {
    // 捕获并处理加载错误
    console.error('加载 GLB 模型时出错:', error);
    alert('加载模型失败，请检查控制台错误信息');
  }
}

// ==================== 执行模型加载 ====================
// 调用函数加载 GLB 模型
loadGLBModel();

// ==================== 设置初始相机位置 ====================
// 设置相机的初始视角（在模型加载前）
viewer.camera.setView({
  destination: defaultPosition,  // 目标位置（中国中心上空）
  orientation: {
    heading: CesiumMath.toRadians(0),      // 航向角：0°（正北）
    pitch: CesiumMath.toRadians(-45),      // 俯仰角：-45°（向下看）
    roll: 0.0,                             // 翻滚角：0°（不倾斜）
  },
});

// 输出启动信息
console.log('Cesium 应用已启动');
