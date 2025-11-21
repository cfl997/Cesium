import {
  Viewer,
  Cartesian3,
  Math as CesiumMath,
  Transforms,
  HeadingPitchRange,
  createWorldTerrainAsync,
  Model,
  Matrix4,
  Matrix3,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// 设置 Cesium Ion 访问令牌（如果需要）
// Ion.defaultAccessToken = 'your_access_token_here';

// 创建 Cesium Viewer
const viewer = new Viewer('cesiumContainer', {
  animation: false,
  timeline: false,
  baseLayerPicker: true,
  geocoder: true,
  homeButton: true,
  sceneModePicker: true,
  navigationHelpButton: false,
  fullscreenButton: true,
});

// 异步加载地形
createWorldTerrainAsync().then((terrainProvider) => {
  viewer.terrainProvider = terrainProvider;
});

// 设置默认位置（中国中心位置，可根据需要调整）
const defaultPosition = Cartesian3.fromDegrees(
  104.0, // 经度
  30.0,  // 纬度
  1000000 // 高度（米）
);

// 加载 GLB 模型
async function loadGLBModel() {
  try {
    // 模型覆盖区域：经度 120-125°，纬度 20-25°
    const minLon = 120.0;
    const maxLon = 125.0;
    const minLat = 20.0;
    const maxLat = 25.0;
    
    console.log('=== 模型配置 ===');
    console.log('目标区域: 经度', minLon, '-', maxLon, '纬度', minLat, '-', maxLat);
    console.log('模型单位: 度（0-5范围）');
    console.log('模型原点: 底面中心点');
    
    // 模型原点在底面中心点（122.5°E, 22.5°N），范围是 5度x5度
    // 在中心点创建ENU坐标系
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const originPosition = Cartesian3.fromDegrees(centerLon, centerLat, 0);
    
    // 创建变换矩阵：从模型坐标系到地球坐标系
    // 1. 在原点创建东-北-上坐标系
    const enuMatrix = Transforms.eastNorthUpToFixedFrame(originPosition);
    
    // 2. 计算缩放因子：将度转换为米
    const avgLat = (minLat + maxLat) / 2;
    const degreesToMetersLon = 111320 * Math.cos(avgLat * Math.PI / 180);
    const degreesToMetersLat = 111320;
    
    console.log('1度经度 ≈', (degreesToMetersLon / 1000).toFixed(2), 'km');
    console.log('1度纬度 ≈', (degreesToMetersLat / 1000).toFixed(2), 'km');
    
    // 3. 创建缩放矩阵
    // 模型原点在底面中心点，模型内部坐标范围是 -2.5 到 +2.5 度
    const scaleMatrix = Matrix4.fromScale(
      new Cartesian3(degreesToMetersLon, -degreesToMetersLat, degreesToMetersLat)
    );
    
    // 4. 组合变换矩阵
    const modelMatrix = Matrix4.multiply(
      enuMatrix,
      scaleMatrix,
      new Matrix4()
    );
    
    // 添加 GLB 模型
    const model = await Model.fromGltfAsync({
      url: './terrain_output.glb',
      modelMatrix: modelMatrix,
    });
    
    viewer.scene.primitives.add(model);

    console.log('模型加载成功');
    console.log('================');

    // 飞到模型区域中心
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centerLon, centerLat, 800000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-45),
        roll: 0.0,
      },
      duration: 2.0,
    });

    // 启用深度测试以正确显示模型
    viewer.scene.globe.depthTestAgainstTerrain = true;

  } catch (error) {
    console.error('加载 GLB 模型时出错:', error);
    alert('加载模型失败，请检查控制台错误信息');
  }
}

// 加载模型
loadGLBModel();

// 设置初始相机位置
viewer.camera.setView({
  destination: defaultPosition,
  orientation: {
    heading: CesiumMath.toRadians(0),
    pitch: CesiumMath.toRadians(-45),
    roll: 0.0,
  },
});

console.log('Cesium 应用已启动');
