/**
 * Cesium 3D 模型展示项目
 * 功能：在弹窗中加载 terrain_output.glb 和 north.glb 模型，支持位置调节
 */

// 导入 Cesium 库和样式
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// ==================== Cesium 配置 ====================
// 设置 Cesium 基础URL
window.CESIUM_BASE_URL = '/';

// 设置 Cesium ion 访问令牌（如果需要使用 Cesium Ion 的在线资源）
// Cesium.Ion.defaultAccessToken = 'your_token_here';

// 全局变量
let viewer;
let modalViewer = null;
let terrainModel = null;
let compassModel = null;
let modalTerrainModel = null;
let modalCompassModel = null;

// 包围框相关变量
let terrainBoundingBox = null;
let bboxEntities = [];
let vertexAxisEntities = [];

// 点光源相关变量
let pointLightEntity = null;

// 模型切换相关变量
let currentModelType = 'terrain'; // 'terrain', 'fengshan', 或 'dp'

// 初始化 Cesium 场景
function initializeCesium() {
    try {
        console.log('正在初始化Cesium场景...');
        
        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: undefined,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: false,
            infoBox: false,
            selectionIndicator: false
        });

        console.log('Cesium Viewer 创建成功');

        // 设置初始视角
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 200),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_FOUR,
                roll: 0.0
            }
        });

        console.log('初始视角设置完成');

        // 加载模型
        loadModels();
        
    } catch (error) {
        console.error('Cesium初始化失败:', error);
        alert('Cesium初始化失败，请检查控制台错误信息');
    }
}

// 主场景不加载模型，只显示地球
async function loadModels() {
    console.log('主场景初始化完成，模型将在弹窗中显示');
}

// 弹窗控制函数
function openModal() {
    document.getElementById('modelModal').style.display = 'block';
    // 延迟初始化弹窗中的3D视图，确保DOM元素已显示
    setTimeout(() => {
        initializeModalViewer();
    }, 100);
}

function closeModal() {
    document.getElementById('modelModal').style.display = 'none';
    // 清理弹窗视图器
    if (modalViewer) {
        modalViewer.destroy();
        modalViewer = null;
        modalTerrainModel = null;
        modalCompassModel = null;
    }
}

// 初始化弹窗中的3D视图
async function initializeModalViewer() {
    if (modalViewer) return; // 避免重复初始化
    
    try {
        console.log('正在初始化弹窗3D视图...');
        document.getElementById('modelLoadStatus').textContent = '正在初始化3D视图...';
        
        modalViewer = new Cesium.Viewer('modalCesiumContainer', {
            terrainProvider: undefined,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: false,
            infoBox: false,
            selectionIndicator: false,
            creditContainer: document.createElement('div'), // 隐藏版权信息
            skyBox: false, // 不显示天空盒
            skyAtmosphere: false, // 不显示大气效果
            globe: false // 不显示地球
        });

        // 设置深灰色背景
        modalViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#1a1a1a');
        
        // 禁用天体相关的渲染（globe已经在创建时设置为false）
        if (modalViewer.scene.skyBox) {
            modalViewer.scene.skyBox.show = false;
        }
        if (modalViewer.scene.sun) {
            modalViewer.scene.sun.show = false;
        }
        if (modalViewer.scene.moon) {
            modalViewer.scene.moon.show = false;
        }
        
        // 设置相机位置 - 使用本地坐标系
        modalViewer.camera.setView({
            destination: new Cesium.Cartesian3(200, 200, 200),
            orientation: {
                direction: new Cesium.Cartesian3(-200, -200, -200),
                up: Cesium.Cartesian3.UNIT_Z
            }
        });
        
        // 设置相机控制器参数，改善交互体验
        const controller = modalViewer.scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 0.5;
        controller.maximumZoomDistance = 10000.0;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableRotate = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        
        // 提高旋转和移动的灵敏度
        controller.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG;
        controller.translateEventTypes = Cesium.CameraEventType.RIGHT_DRAG;
        controller.zoomEventTypes = Cesium.CameraEventType.WHEEL;
        controller.tiltEventTypes = Cesium.CameraEventType.MIDDLE_DRAG;
        
        // 调整灵敏度参数
        controller.inertiaSpin = 0.9;
        controller.inertiaTranslate = 0.9;
        controller.inertiaZoom = 0.8;
        controller.maximumMovementRatio = 0.1;

        console.log('弹窗3D视图初始化成功');
        
        // 启用HDR和光照以获得更好的材质效果
        modalViewer.scene.highDynamicRange = true;
        
        // 启用基于图像的光照（IBL）以增强材质表现
        if (modalViewer.scene.light) {
            modalViewer.scene.light.intensity = 3.0;
        }
        
        // 添加坐标轴显示
        addCoordinateAxes();
        
        // 添加点光源
        addPointLight();
        
        // 加载模型
        await loadModalModels();
        
    } catch (error) {
        console.error('弹窗3D视图初始化失败:', error);
        document.getElementById('modelLoadStatus').textContent = '3D视图初始化失败';
    }
}

// 添加简单的坐标轴标识
function addCoordinateAxes() {
    if (!modalViewer) return;
    
    const axisDistance = 30;
    
    // 只添加坐标轴标签，不使用polyline
    modalViewer.entities.add({
        name: 'X Label',
        position: new Cesium.Cartesian3(axisDistance, 0, 0),
        point: {
            pixelSize: 12,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        },
        label: {
            text: '+X',
            font: '16pt sans-serif',
            fillColor: Cesium.Color.RED,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(15, 0),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER
        }
    });
    
    modalViewer.entities.add({
        name: 'Y Label',
        position: new Cesium.Cartesian3(0, axisDistance, 0),
        point: {
            pixelSize: 12,
            color: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        },
        label: {
            text: '+Y',
            font: '16pt sans-serif',
            fillColor: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(15, 0),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER
        }
    });
    
    modalViewer.entities.add({
        name: 'Z Label',
        position: new Cesium.Cartesian3(0, 0, axisDistance),
        point: {
            pixelSize: 12,
            color: Cesium.Color.BLUE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        },
        label: {
            text: '+Z',
            font: '16pt sans-serif',
            fillColor: Cesium.Color.BLUE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(15, 0),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER
        }
    });
    
    // 添加原点标识
    modalViewer.entities.add({
        name: 'Origin',
        position: new Cesium.Cartesian3(0, 0, 0),
        point: {
            pixelSize: 10,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        },
        label: {
            text: '原点 (0,0,0)',
            font: '12pt sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.TOP
        }
    });
    
    console.log('坐标轴标识添加完成');
}

// 添加点光源
function addPointLight() {
    if (!modalViewer) return;
    
    // 主光源位置 - 从右上方照射
    const x = 50, y = 30, z = 40;
    
    // 添加一个可视化的点光源标记（黄色球体）
    pointLightEntity = modalViewer.entities.add({
        name: 'Point Light',
        position: new Cesium.Cartesian3(x, y, z),
        point: {
            pixelSize: 15,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
        },
        label: {
            text: '主光源',
            font: '14px sans-serif',
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.TOP
        }
    });
    
    // 使用DirectionalLight（Cesium支持的光源类型）
    // 计算从原点指向光源位置的方向
    const lightPosition = new Cesium.Cartesian3(x, y, z);
    const direction = Cesium.Cartesian3.normalize(lightPosition, new Cesium.Cartesian3());
    
    const light = new Cesium.DirectionalLight({
        direction: Cesium.Cartesian3.negate(direction, new Cesium.Cartesian3()),
        color: Cesium.Color.WHITE,
        intensity: 8.0  // 更强的光照强度
    });
    modalViewer.scene.light = light;
    
    // 启用全局光照设置以改善材质显示
    if (modalViewer.scene.light) {
        console.log('主光源设置完成，强度:', modalViewer.scene.light.intensity);
    }
    
    // 尝试启用环境光遮蔽（AO）以增强深度感
    try {
        if (modalViewer.scene.postProcessStages && modalViewer.scene.postProcessStages.ambientOcclusion) {
            modalViewer.scene.postProcessStages.ambientOcclusion.enabled = true;
            modalViewer.scene.postProcessStages.ambientOcclusion.intensity = 5.0;
            modalViewer.scene.postProcessStages.ambientOcclusion.bias = 0.1;
            modalViewer.scene.postProcessStages.ambientOcclusion.lengthCap = 0.03;
            console.log('✓ 环境光遮蔽已启用');
        }
    } catch (e) {
        console.log('环境光遮蔽不可用:', e.message);
    }
    
    // 启用阴影
    modalViewer.shadows = true;
    modalViewer.shadowMap.enabled = true;
    modalViewer.shadowMap.darkness = 0.3;
    console.log('✓ 阴影已启用');
    
    console.log('点光源添加完成，位置:', lightPosition, '方向:', direction);
}

// 更新点光源位置
function updatePointLightPosition() {
    if (!pointLightEntity || !modalViewer) return;
    
    const x = parseFloat(document.getElementById('lightX').value) || 20;
    const y = parseFloat(document.getElementById('lightY').value) || 20;
    const z = parseFloat(document.getElementById('lightZ').value) || 20;
    
    const newPosition = new Cesium.Cartesian3(x, y, z);
    pointLightEntity.position = newPosition;
    
    // 更新场景光源方向（DirectionalLight使用方向而非位置）
    if (modalViewer.scene.light instanceof Cesium.DirectionalLight) {
        const direction = Cesium.Cartesian3.normalize(newPosition, new Cesium.Cartesian3());
        modalViewer.scene.light.direction = Cesium.Cartesian3.negate(direction, new Cesium.Cartesian3());
    }
    
    console.log(`点光源位置更新: X=${x}, Y=${y}, Z=${z}`);
}

// 更新点光源强度
function updatePointLightIntensity(value) {
    if (!modalViewer) return;
    
    const intensity = parseFloat(value);
    
    if (modalViewer.scene.light instanceof Cesium.DirectionalLight) {
        modalViewer.scene.light.intensity = intensity;
    }
    
    document.getElementById('lightIntensityValue').textContent = intensity.toFixed(1);
    console.log('点光源强度更新为:', intensity);
}

// 更新点光源范围（DirectionalLight没有range属性，此函数保留用于UI兼容性）
function updatePointLightRange(value) {
    if (!modalViewer) return;
    
    const range = parseFloat(value);
    
    // DirectionalLight是平行光，没有range属性
    // 这里只更新UI显示，不影响实际光照
    
    document.getElementById('lightRangeValue').textContent = range.toFixed(0);
    console.log('点光源范围（仅显示）:', range);
}

// 切换点光源显示
function togglePointLight(show) {
    if (pointLightEntity) {
        pointLightEntity.show = show;
        console.log('点光源显示:', show);
    }
}

// 计算地形模型的包围框
function calculateTerrainBoundingBox() {
    if (!modalTerrainModel || !modalViewer) {
        console.log('模型或视图器未准备好');
        return;
    }
    
    try {
        console.log('开始计算地形模型包围框');
        const modelPosition = modalTerrainModel.position.getValue(modalViewer.clock.currentTime);
        console.log('模型位置:', modelPosition);
        
        // 检查模型是否有readyPromise
        const modelGraphics = modalTerrainModel.model;
        
        if (modelGraphics && modelGraphics.readyPromise) {
            console.log('模型有readyPromise，等待加载完成');
            // 等待模型加载完成
            modelGraphics.readyPromise.then(() => {
                console.log('模型readyPromise完成，开始计算精确包围框');
                calculateAccurateBoundingBox(modelPosition);
            }).catch(error => {
                console.error('模型readyPromise失败:', error);
                console.log('直接尝试计算包围框');
                calculateAccurateBoundingBox(modelPosition);
            });
        } else {
            console.log('模型没有readyPromise或已经准备好，直接计算包围框');
            // 直接计算包围框
            calculateAccurateBoundingBox(modelPosition);
        }
        
    } catch (error) {
        console.error('计算包围框时出错:', error);
        // 即使出错也尝试计算
        const modelPosition = modalTerrainModel.position.getValue(modalViewer.clock.currentTime);
        calculateAccurateBoundingBox(modelPosition);
    }
}

// 计算基于顶点数据的精确包围框
function calculateAccurateBoundingBox(modelPosition) {
    try {
        console.log('尝试获取模型顶点数据...');
        
        // 方法1: 尝试从模型的primitive获取几何体数据
        const primitives = modalViewer.scene.primitives;
        let foundVertexData = false;
        
        for (let i = 0; i < primitives.length; i++) {
            const primitive = primitives.get(i);
            
            // 检查是否是模型primitive
            if (primitive && primitive._modelMatrix && primitive._ready) {
                console.log('找到模型primitive，尝试获取几何体数据');
                
                // 尝试获取几何体实例
                if (primitive._geometryInstances) {
                    const instances = primitive._geometryInstances;
                    console.log('几何体实例数量:', instances.length);
                    
                    let allVertices = [];
                    
                    for (let j = 0; j < instances.length; j++) {
                        const instance = instances[j];
                        if (instance.geometry && instance.geometry.attributes) {
                            const positions = instance.geometry.attributes.position;
                            if (positions && positions.values) {
                                console.log('找到顶点位置数据，顶点数量:', positions.values.length / 3);
                                
                                // 提取顶点坐标
                                for (let k = 0; k < positions.values.length; k += 3) {
                                    allVertices.push({
                                        x: positions.values[k],
                                        y: positions.values[k + 1],
                                        z: positions.values[k + 2]
                                    });
                                }
                            }
                        }
                    }
                    
                    if (allVertices.length > 0) {
                        calculateBoundingBoxFromVertices(allVertices, modelPosition);
                        foundVertexData = true;
                        break;
                    }
                }
                
                // 方法2: 尝试从primitive的boundingVolume获取更详细信息
                if (!foundVertexData && primitive.boundingVolume) {
                    console.log('尝试从boundingVolume获取详细边界信息');
                    const boundingVolume = primitive.boundingVolume;
                    
                    if (boundingVolume.boundingSphere) {
                        const sphere = boundingVolume.boundingSphere;
                        console.log('包围球中心:', sphere.center, '半径:', sphere.radius);
                        
                        // 如果有orientedBoundingBox，使用它
                        if (boundingVolume.orientedBoundingBox) {
                            const obb = boundingVolume.orientedBoundingBox;
                            console.log('找到有向包围框(OBB)');
                            calculateBoundingBoxFromOBB(obb, modelPosition);
                            foundVertexData = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // 方法3: 尝试从模型实体获取更多信息
        if (!foundVertexData) {
            console.log('从primitive未找到顶点数据，尝试直接解析GLB文件');
            attemptModelEntityAnalysis(modelPosition);
        } else {
            console.log('已从primitive获取到顶点数据，跳过GLB解析');
        }
        
    } catch (error) {
        console.error('获取顶点数据失败:', error);
        useReasonableBounds();
    }
}

// 从顶点数据计算精确包围框
function calculateBoundingBoxFromVertices(vertices, modelPosition) {
    console.log('基于', vertices.length, '个顶点计算精确包围框');
    console.log('模型位置:', modelPosition);
    
    if (vertices.length === 0) {
        console.log('没有顶点数据，使用合理估算');
        useReasonableBounds();
        return;
    }
    
    // 先检查顶点数据的范围
    console.log('前10个顶点样本:', vertices.slice(0, 10));
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    // 遍历所有顶点找到最小最大值（先不加模型位置偏移）
    vertices.forEach((vertex, index) => {
        if (index < 5) {
            console.log(`顶点${index}:`, vertex);
        }
        
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxY = Math.max(maxY, vertex.y);
        minZ = Math.min(minZ, vertex.z);
        maxZ = Math.max(maxZ, vertex.z);
    });
    
    console.log('模型本地包围框:', {
        x: `${minX.toFixed(2)} ~ ${maxX.toFixed(2)}`,
        y: `${minY.toFixed(2)} ~ ${maxY.toFixed(2)}`,
        z: `${minZ.toFixed(2)} ~ ${maxZ.toFixed(2)}`
    });
    
    // 检查包围框是否合理
    const width = maxX - minX;
    const depth = maxY - minY;
    const height = maxZ - minZ;
    
    console.log('包围框尺寸:', { width: width.toFixed(2), depth: depth.toFixed(2), height: height.toFixed(2) });
    
    // 如果包围框太大或太小，可能数据有问题
    if (width > 10000 || depth > 10000 || height > 10000 || width < 0.1 || depth < 0.1 || height < 0.1) {
        console.log('包围框尺寸异常，可能顶点数据有问题，使用合理估算');
        useReasonableBounds();
        return;
    }
    
    // 应用模型位置偏移到世界坐标
    const worldMinX = minX + modelPosition.x;
    const worldMaxX = maxX + modelPosition.x;
    const worldMinY = minY + modelPosition.y;
    const worldMaxY = maxY + modelPosition.y;
    const worldMinZ = minZ + modelPosition.z;
    const worldMaxZ = maxZ + modelPosition.z;
    
    console.log('世界坐标包围框:', {
        x: `${worldMinX.toFixed(2)} ~ ${worldMaxX.toFixed(2)}`,
        y: `${worldMinY.toFixed(2)} ~ ${worldMaxY.toFixed(2)}`,
        z: `${worldMinZ.toFixed(2)} ~ ${worldMaxZ.toFixed(2)}`
    });
    
    createBoundingBoxFromBounds(worldMinX, worldMaxX, worldMinY, worldMaxY, worldMinZ, worldMaxZ);
}

// 从有向包围框计算
function calculateBoundingBoxFromOBB(obb, modelPosition) {
    console.log('基于有向包围框(OBB)计算精确包围框');
    
    const center = obb.center;
    const halfAxes = obb.halfAxes;
    
    // 计算OBB的8个顶点
    const vertices = [];
    for (let i = 0; i < 8; i++) {
        const x = center.x + (i & 1 ? 1 : -1) * halfAxes[0] + 
                             (i & 2 ? 1 : -1) * halfAxes[3] + 
                             (i & 4 ? 1 : -1) * halfAxes[6];
        const y = center.y + (i & 1 ? 1 : -1) * halfAxes[1] + 
                             (i & 2 ? 1 : -1) * halfAxes[4] + 
                             (i & 4 ? 1 : -1) * halfAxes[7];
        const z = center.z + (i & 1 ? 1 : -1) * halfAxes[2] + 
                             (i & 2 ? 1 : -1) * halfAxes[5] + 
                             (i & 4 ? 1 : -1) * halfAxes[8];
        vertices.push({ x, y, z });
    }
    
    calculateBoundingBoxFromVertices(vertices, { x: 0, y: 0, z: 0 });
}

// 尝试从模型实体分析
function attemptModelEntityAnalysis(modelPosition) {
    console.log('分析模型实体以获取几何信息');
    
    // 方法4: 尝试直接从GLB文件获取顶点数据
    let modelUri = null;
    
    try {
        if (modalTerrainModel && modalTerrainModel.model) {
            if (modalTerrainModel.model.uri) {
                modelUri = modalTerrainModel.model.uri.getValue ? 
                          modalTerrainModel.model.uri.getValue() : 
                          modalTerrainModel.model.uri;
            }
        }
        
        // 如果没有获取到URI，尝试使用默认的模型文件
        if (!modelUri) {
            modelUri = './terrain_output.glb';
            console.log('使用默认模型URI:', modelUri);
        } else {
            console.log('获取到模型URI:', modelUri);
        }
        
        // 加载GLB文件并解析顶点数据
        loadGLBVertexData(modelUri, modelPosition);
        
    } catch (error) {
        console.error('获取模型URI时出错:', error);
        console.log('尝试使用默认模型文件');
        loadGLBVertexData('./terrain_output.glb', modelPosition);
    }
}

// 从GLB或GLTF文件加载顶点数据
async function loadGLBVertexData(modelUri, modelPosition) {
    try {
        console.log('开始加载模型文件:', modelUri);
        
        // 判断是GLB还是GLTF
        const isGLTF = modelUri.toLowerCase().endsWith('.gltf');
        
        if (isGLTF) {
            // 处理GLTF文件
            await loadGLTFVertexData(modelUri, modelPosition);
            return;
        }
        
        // 处理GLB文件
        const response = await fetch(modelUri);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('GLB文件大小:', arrayBuffer.byteLength, 'bytes');
        
        // 解析GLB文件头
        const dataView = new DataView(arrayBuffer);
        const magic = dataView.getUint32(0, true);
        const version = dataView.getUint32(4, true);
        const length = dataView.getUint32(8, true);
        
        console.log('GLB文件信息:', { magic: magic.toString(16), version, length });
        
        if (magic !== 0x46546C67) { // "glTF" in little endian
            throw new Error('不是有效的GLB文件');
        }
        
        // 解析JSON chunk
        const jsonChunkLength = dataView.getUint32(12, true);
        const jsonChunkType = dataView.getUint32(16, true);
        
        console.log('JSON chunk信息:', { length: jsonChunkLength, type: jsonChunkType.toString(16) });
        
        if (jsonChunkType !== 0x4E4F534A) { // "JSON" in little endian
            throw new Error('GLB文件格式错误');
        }
        
        const jsonData = new TextDecoder().decode(
            new Uint8Array(arrayBuffer, 20, jsonChunkLength)
        );
        const gltf = JSON.parse(jsonData);
        
        console.log('GLTF数据解析成功');
        console.log('GLTFJson:', gltf);
        console.log('网格数量:', gltf.meshes ? gltf.meshes.length : 0);
        console.log('访问器数量:', gltf.accessors ? gltf.accessors.length : 0);
        console.log('缓冲区视图数量:', gltf.bufferViews ? gltf.bufferViews.length : 0);
        
        // 检查二进制数据块
        const binaryDataOffset = 20 + jsonChunkLength;
        if (binaryDataOffset < arrayBuffer.byteLength) {
            const binaryChunkLength = dataView.getUint32(binaryDataOffset, true);
            const binaryChunkType = dataView.getUint32(binaryDataOffset + 4, true);
            console.log('Binary chunk信息:', { 
                offset: binaryDataOffset, 
                length: binaryChunkLength, 
                type: binaryChunkType.toString(16) 
            });
        }
        
        // 直接从accessor的min/max创建包围框（更高效）
        if (gltf.accessors && gltf.accessors.length > 0) {
            const positionAccessor = gltf.accessors[0]; // POSITION通常是第一个accessor
            
            if (positionAccessor.min && positionAccessor.max) {
                console.log('从accessor读取包围框信息(GLB)');
                console.log('Min:', positionAccessor.min);
                console.log('Max:', positionAccessor.max);
                
                // GLTF坐标系转换: X右, Y上, Z前 -> Cesium: X右, Y前, Z上
                // 交换Y和Z
                const minX = positionAccessor.min[0];
                const minY = positionAccessor.min[2];  // GLTF的Z -> Cesium的Y
                const minZ = positionAccessor.min[1];  // GLTF的Y -> Cesium的Z
                const maxX = positionAccessor.max[0];
                const maxY = positionAccessor.max[2];  // GLTF的Z -> Cesium的Y
                const maxZ = positionAccessor.max[1];  // GLTF的Y -> Cesium的Z
                
                console.log('转换后的包围框:', { minX, minY, minZ, maxX, maxY, maxZ });
                
                // 应用模型位置偏移
                createBoundingBoxFromBounds(
                    minX + modelPosition.x, maxX + modelPosition.x,
                    minY + modelPosition.y, maxY + modelPosition.y,
                    minZ + modelPosition.z, maxZ + modelPosition.z
                );
            } else {
                console.log('Accessor中没有min/max信息，回退到顶点遍历');
                const vertices = extractVerticesFromGLTF(gltf, arrayBuffer, binaryDataOffset);
                if (vertices.length > 0) {
                    calculateBoundingBoxFromVertices(vertices, modelPosition);
                } else {
                    useReasonableBounds();
                }
            }
        } else {
            console.log('GLB文件中未找到accessor，使用合理估算');
            useReasonableBounds();
        }
        
    } catch (error) {
        console.error('加载模型文件失败:', error);
        console.log('回退到合理估算');
        useReasonableBounds();
    }
}

// 从GLTF文件加载顶点数据
async function loadGLTFVertexData(modelUri, modelPosition) {
    try {
        console.log('开始加载GLTF文件:', modelUri);
        
        // 加载GLTF JSON文件
        const response = await fetch(modelUri);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gltf = await response.json();
        console.log('GLTF数据解析成功');
        console.log('网格数量:', gltf.meshes ? gltf.meshes.length : 0);
        console.log('访问器数量:', gltf.accessors ? gltf.accessors.length : 0);
        console.log('缓冲区数量:', gltf.buffers ? gltf.buffers.length : 0);
        console.log('节点数量:', gltf.nodes ? gltf.nodes.length : 0);
        
        // 检查节点中的缩放信息
        if (gltf.nodes) {
            gltf.nodes.forEach((node, index) => {
                if (node.scale) {
                    console.log(`节点 ${index} 缩放:`, node.scale);
                }
                if (node.matrix) {
                    console.log(`节点 ${index} 变换矩阵:`, node.matrix);
                }
            });
        }
        
        // 加载.bin文件
        if (!gltf.buffers || gltf.buffers.length === 0) {
            throw new Error('GLTF文件中没有缓冲区数据');
        }
        
        const buffer = gltf.buffers[0];
        const binUri = buffer.uri;
        
        // 构建.bin文件的完整路径
        const baseUri = modelUri.substring(0, modelUri.lastIndexOf('/') + 1);
        const binUrl = baseUri + binUri;
        
        console.log('加载BIN文件:', binUrl);
        const binResponse = await fetch(binUrl);
        if (!binResponse.ok) {
            throw new Error(`无法加载BIN文件: ${binResponse.status}`);
        }
        
        const arrayBuffer = await binResponse.arrayBuffer();
        console.log('BIN文件大小:', arrayBuffer.byteLength, 'bytes');
        
        // 直接从accessor的min/max创建包围框（更高效）
        if (gltf.accessors && gltf.accessors.length > 0) {
            const positionAccessor = gltf.accessors[0]; // POSITION通常是第一个accessor
            
            if (positionAccessor.min && positionAccessor.max) {
                console.log('从accessor读取包围框信息(GLTF)');
                console.log('Min:', positionAccessor.min);
                console.log('Max:', positionAccessor.max);
                
                // GLTF坐标系转换: X右, Y上, Z前 -> Cesium: X右, Y前, Z上
                // 交换Y和Z
                const minX = positionAccessor.min[0];
                const minY = positionAccessor.min[2];  // GLTF的Z -> Cesium的Y
                const minZ = positionAccessor.min[1];  // GLTF的Y -> Cesium的Z
                const maxX = positionAccessor.max[0];
                const maxY = positionAccessor.max[2];  // GLTF的Z -> Cesium的Y
                const maxZ = positionAccessor.max[1];  // GLTF的Y -> Cesium的Z
                
                console.log('转换后的包围框:', { minX, minY, minZ, maxX, maxY, maxZ });
                
                // 应用模型位置偏移
                createBoundingBoxFromBounds(
                    minX + modelPosition.x, maxX + modelPosition.x,
                    minY + modelPosition.y, maxY + modelPosition.y,
                    minZ + modelPosition.z, maxZ + modelPosition.z
                );
            } else {
                console.log('Accessor中没有min/max信息，回退到顶点遍历');
                const vertices = extractVerticesFromGLTF(gltf, arrayBuffer, 0);
                if (vertices.length > 0) {
                    calculateBoundingBoxFromVertices(vertices, modelPosition);
                } else {
                    useReasonableBounds();
                }
            }
        } else {
            console.log('GLTF文件中未找到accessor，使用合理估算');
            useReasonableBounds();
        }
        
    } catch (error) {
        console.error('加载GLTF文件失败:', error);
        console.log('回退到合理估算');
        useReasonableBounds();
    }
}

// 从GLTF数据中提取顶点
function extractVerticesFromGLTF(gltf, arrayBuffer, binaryDataOffset) {
    const vertices = [];
    
    try {
        if (!gltf.meshes || !gltf.accessors || !gltf.bufferViews) {
            console.log('GLTF数据缺少必要的网格信息');
            return vertices;
        }
        
        // 遍历所有网格
        gltf.meshes.forEach((mesh, meshIndex) => {
            console.log(`处理网格 ${meshIndex}:`, mesh.name || 'unnamed');
            
            mesh.primitives.forEach((primitive, primIndex) => {
                if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
                    const positionAccessorIndex = primitive.attributes.POSITION;
                    const accessor = gltf.accessors[positionAccessorIndex];
                    const bufferView = gltf.bufferViews[accessor.bufferView];
                    
                    console.log(`网格 ${meshIndex} 图元 ${primIndex} 顶点数量:`, accessor.count);
                    console.log('访问器信息:', accessor);
                    console.log('缓冲区视图信息:', bufferView);
                    
                    // 计算数据在二进制块中的位置
                    // 对于GLTF文件，binaryDataOffset为0，不需要加GLB的8字节头
                    // 对于GLB文件，binaryDataOffset指向二进制块，需要加8字节
                    const headerOffset = binaryDataOffset > 0 ? 8 : 0;
                    const dataStart = binaryDataOffset + headerOffset + bufferView.byteOffset + (accessor.byteOffset || 0);
                    console.log('顶点数据起始位置:', dataStart, '二进制偏移:', binaryDataOffset, '头偏移:', headerOffset);
                    
                    if (dataStart + accessor.count * 12 > arrayBuffer.byteLength) {
                        console.error('数据超出文件范围');
                        return vertices;
                    }
                    
                    const dataView = new DataView(arrayBuffer, dataStart);
                    
                    // 提取顶点位置数据
                    for (let i = 0; i < accessor.count; i++) {
                        const offset = i * 12; // 3 floats * 4 bytes each
                        
                        try {
                            const x = dataView.getFloat32(offset, true);
                            const y = dataView.getFloat32(offset + 4, true);
                            const z = dataView.getFloat32(offset + 8, true);
                            
                            // 检查数据是否合理
                            if (isFinite(x) && isFinite(y) && isFinite(z)) {
                                // 使用原始GLTF坐标，不做转换
                                // GLTF标准: X右, Y上, Z前
                                vertices.push({ 
                                    x: x,
                                    y: y,
                                    z: z
                                });
                                
                                // 输出前几个顶点用于调试
                                if (i < 5) {
                                    console.log(`顶点 ${i}:`, { x: x.toFixed(3), y: y.toFixed(3), z: z.toFixed(3) });
                                }
                            } else {
                                console.warn(`顶点 ${i} 数据异常:`, { x, y, z });
                            }
                        } catch (error) {
                            console.error(`读取顶点 ${i} 时出错:`, error);
                            break;
                        }
                    }
                }
            });
        });
        
        console.log('总共提取顶点数量:', vertices.length);
        
    } catch (error) {
        console.error('提取顶点数据时出错:', error);
    }
    
    return vertices;
}

// 从primitive计算包围框
function calculateFromPrimitive() {
    try {
        const modelPosition = modalTerrainModel.position.getValue(modalViewer.clock.currentTime);
        
        // 尝试从场景中的primitive获取包围框信息
        const primitives = modalViewer.scene.primitives;
        let modelPrimitive = null;
        
        for (let i = 0; i < primitives.length; i++) {
            const primitive = primitives.get(i);
            if (primitive && primitive.boundingSphere) {
                modelPrimitive = primitive;
                break;
            }
        }
        
        if (modelPrimitive && modelPrimitive.boundingSphere) {
            const boundingSphere = modelPrimitive.boundingSphere;
            const radius = boundingSphere.radius;
            console.log('从primitive获取包围球半径:', radius);
            
            const minX = modelPosition.x - radius;
            const maxX = modelPosition.x + radius;
            const minY = modelPosition.y - radius;
            const maxY = modelPosition.y + radius;
            const minZ = modelPosition.z - radius;
            const maxZ = modelPosition.z + radius;
            
            createBoundingBoxFromBounds(minX, maxX, minY, maxY, minZ, maxZ);
        } else {
            console.log('无法从primitive获取包围框，使用合理尺寸');
            useReasonableBounds();
        }
    } catch (error) {
        console.error('从primitive计算包围框失败:', error);
        useReasonableBounds();
    }
}

// 使用合理的地形模型包围框尺寸
function useReasonableBounds() {
    const modelPosition = modalTerrainModel.position.getValue(modalViewer.clock.currentTime);
    
    // 基于地形模型特点的合理尺寸
    // 地形通常是扁平的，宽度和深度较大，高度相对较小
    const width = 30;   // 宽度
    const depth = 30;   // 深度  
    const height = 12;  // 高度（相对较小）
    
    const minX = modelPosition.x - width;
    const maxX = modelPosition.x + width;
    const minY = modelPosition.y - depth;
    const maxY = modelPosition.y + depth;
    const minZ = modelPosition.z - height * 0.3; // 地形底部较浅
    const maxZ = modelPosition.z + height * 0.7; // 地形顶部较高
    
    console.log('使用地形模型的合理包围框尺寸');
    createBoundingBoxFromBounds(minX, maxX, minY, maxY, minZ, maxZ);
}

// 根据边界创建包围框
function createBoundingBoxFromBounds(minX, maxX, minY, maxY, minZ, maxZ) {
    // 顶点坐标已经在extractVerticesFromGLTF中转换过了
    // 这里直接使用转换后的坐标：Y=前后深度, Z=上下高度
    terrainBoundingBox = {
        min: new Cesium.Cartesian3(minX, minY, minZ),
        max: new Cesium.Cartesian3(maxX, maxY, maxZ),
        vertices: [
            new Cesium.Cartesian3(minX, minY, minZ), // 0: 最小点
            new Cesium.Cartesian3(maxX, minY, minZ), // 1
            new Cesium.Cartesian3(maxX, maxY, minZ), // 2
            new Cesium.Cartesian3(minX, maxY, minZ), // 3
            new Cesium.Cartesian3(minX, minY, maxZ), // 4
            new Cesium.Cartesian3(maxX, minY, maxZ), // 5
            new Cesium.Cartesian3(maxX, maxY, maxZ), // 6
            new Cesium.Cartesian3(minX, maxY, maxZ)  // 7: 最大点
        ]
    };
    
    // 计算包围框尺寸
    const width = maxX - minX;
    const depth = maxY - minY;   // Y=深度（前后）
    const height = maxZ - minZ;  // Z=高度（上下）
    
    // 更新包围框信息显示
    document.getElementById('bboxInfo').innerHTML = `
        <strong>精确包围框 (基于顶点数据):</strong><br>
        <small>GLTF原始坐标系: X=宽度, Y=高度, Z=深度</small><br>
        X: ${minX.toFixed(1)} ~ ${maxX.toFixed(1)} (宽度: ${width.toFixed(1)})<br>
        Y: ${minY.toFixed(1)} ~ ${maxY.toFixed(1)} (高度: ${depth.toFixed(1)})<br>
        Z: ${minZ.toFixed(1)} ~ ${maxZ.toFixed(1)} (深度: ${height.toFixed(1)})
    `;
    
    console.log('地形模型实际包围框计算完成:', {
        width: width.toFixed(1),
        height: height.toFixed(1),
        depth: depth.toFixed(1), 
        boundingBox: terrainBoundingBox
    });
}

// 切换地形模型显示
function toggleTerrainModel(show) {
    if (modalTerrainModel) {
        modalTerrainModel.show = show;
        console.log('地形模型显示:', show);
    }
}

// 切换包围框显示
function toggleTerrainBbox(show) {
    if (!terrainBoundingBox) {
        alert('请等待模型加载完成后再显示包围框');
        document.getElementById('terrainBboxToggle').checked = false;
        return;
    }
    
    if (show) {
        createBoundingBoxEntities();
        document.getElementById('bboxVertexControls').style.display = 'block';
    } else {
        removeBoundingBoxEntities();
        document.getElementById('bboxVertexControls').style.display = 'none';
        // 同时隐藏所有顶点坐标轴
        for (let i = 0; i < 8; i++) {
            document.getElementById(`vertex${i}`).checked = false;
            toggleVertexAxis(i, false);
        }
    }
}

// 创建包围框实体
function createBoundingBoxEntities() {
    if (!terrainBoundingBox || !modalViewer) return;
    
    // 清除之前的包围框
    removeBoundingBoxEntities();
    
    const vertices = terrainBoundingBox.vertices;
    
    // 包围框的12条边
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // 底面
        [4, 5], [5, 6], [6, 7], [7, 4], // 顶面
        [0, 4], [1, 5], [2, 6], [3, 7]  // 垂直边
    ];
    
    // 创建包围框边线（使用点而不是线条避免几何体错误）
    edges.forEach((edge, index) => {
        const start = vertices[edge[0]];
        const end = vertices[edge[1]];
        
        // 在边的中点添加一个小点表示边
        const midPoint = new Cesium.Cartesian3(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2,
            (start.z + end.z) / 2
        );
        
        const entity = modalViewer.entities.add({
            name: `BBox Edge ${index}`,
            position: midPoint,
            point: {
                pixelSize: 3,
                color: Cesium.Color.CYAN,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 1
            }
        });
        
        bboxEntities.push(entity);
    });
    
    // 在8个顶点添加标识点
    vertices.forEach((vertex, index) => {
        const entity = modalViewer.entities.add({
            name: `BBox Vertex ${index}`,
            position: vertex,
            point: {
                pixelSize: 6,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
            },
            label: {
                text: `V${index}`,
                font: '10pt sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -15),
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.TOP
            }
        });
        
        bboxEntities.push(entity);
    });
    
    console.log('包围框实体创建完成');
}

// 移除包围框实体
function removeBoundingBoxEntities() {
    bboxEntities.forEach(entity => {
        modalViewer.entities.remove(entity);
    });
    bboxEntities = [];
}

// 切换顶点坐标轴显示
function toggleVertexAxis(vertexIndex, show) {
    if (!terrainBoundingBox || !modalViewer) return;
    
    // 移除该顶点的现有坐标轴
    if (vertexAxisEntities[vertexIndex]) {
        vertexAxisEntities[vertexIndex].forEach(entity => {
            modalViewer.entities.remove(entity);
        });
        vertexAxisEntities[vertexIndex] = [];
    }
    
    if (show) {
        const vertex = terrainBoundingBox.vertices[vertexIndex];
        const axisLength = 10; // 缩短轴长度
        const entities = [];
        
        console.log(`创建顶点${vertexIndex}的坐标轴，位置:`, vertex);
        
        // 创建从顶点出发的坐标轴实线（使用polyline）
        
        try {
            // X轴线 - 红色带箭头
            const xEndPoint = new Cesium.Cartesian3(vertex.x + axisLength, vertex.y, vertex.z);
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} X Axis Line`,
                polyline: {
                    positions: [vertex, xEndPoint],
                    width: 8,
                    material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED),
                    clampToGround: false,
                    followSurface: false
                }
            }));
            
            // X轴标签
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} X Label`,
                position: new Cesium.Cartesian3(vertex.x + axisLength + 3, vertex.y, vertex.z),
                label: {
                    text: '+X',
                    font: '10pt sans-serif',
                    fillColor: Cesium.Color.RED,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER
                }
            }));
            
            // Y轴线 - 绿色带箭头
            const yEndPoint = new Cesium.Cartesian3(vertex.x, vertex.y + axisLength, vertex.z);
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} Y Axis Line`,
                polyline: {
                    positions: [vertex, yEndPoint],
                    width: 8,
                    material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.GREEN),
                    clampToGround: false,
                    followSurface: false
                }
            }));
            
            // Y轴标签
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} Y Label`,
                position: new Cesium.Cartesian3(vertex.x, vertex.y + axisLength + 3, vertex.z),
                label: {
                    text: '+Y',
                    font: '10pt sans-serif',
                    fillColor: Cesium.Color.GREEN,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER
                }
            }));
            
            // Z轴线 - 蓝色（使用X轴和Y轴叉乘计算Z轴方向）
            const zAxisLength = axisLength * 0.8; // Z轴长度
            
            // 定义X轴和Y轴方向向量
            const xAxisDirection = new Cesium.Cartesian3(1, 0, 0); // X轴方向
            const yAxisDirection = new Cesium.Cartesian3(0, 1, 0); // Y轴方向
            
            // 计算Z轴方向：X轴 × Y轴 = Z轴
            const zAxisDirection = new Cesium.Cartesian3();
            Cesium.Cartesian3.cross(xAxisDirection, yAxisDirection, zAxisDirection);
            Cesium.Cartesian3.normalize(zAxisDirection, zAxisDirection);
            
            // 计算Z轴终点
            const zAxisVector = Cesium.Cartesian3.multiplyByScalar(zAxisDirection, zAxisLength, new Cesium.Cartesian3());
            const zEndPoint = Cesium.Cartesian3.add(vertex, zAxisVector, new Cesium.Cartesian3());
            
            console.log(`顶点${vertexIndex} Z轴方向向量:`, zAxisDirection);
            console.log(`顶点${vertexIndex} Z轴: 起点(${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}, ${vertex.z.toFixed(2)}) -> 终点(${zEndPoint.x.toFixed(2)}, ${zEndPoint.y.toFixed(2)}, ${zEndPoint.z.toFixed(2)})`);
            
            // 使用polyline创建Z轴线
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} Z Axis Line`,
                polyline: {
                    positions: [vertex, zEndPoint],
                    width: 8,
                    material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.BLUE),
                    clampToGround: false,
                    followSurface: false,
                    arcType: Cesium.ArcType.NONE,
                    granularity: 0.0
                }
            }));
            
            // Z轴标签
            const zLabelOffset = Cesium.Cartesian3.multiplyByScalar(zAxisDirection, 2, new Cesium.Cartesian3());
            const zLabelPosition = Cesium.Cartesian3.add(zEndPoint, zLabelOffset, new Cesium.Cartesian3());
            
            entities.push(modalViewer.entities.add({
                name: `Vertex${vertexIndex} Z Label`,
                position: zLabelPosition,
                label: {
                    text: '+Z',
                    font: '10pt sans-serif',
                    fillColor: Cesium.Color.BLUE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER
                }
            }));
            
        } catch (error) {
            console.error(`创建顶点${vertexIndex}坐标轴时出错:`, error);
            // 如果polyline失败，回退到点的方式
            console.log('回退到点模拟线条方式');
            // 这里可以添加点模拟的代码作为后备方案
        }
        
        // 在顶点位置添加一个原点标识
        entities.push(modalViewer.entities.add({
            name: `Vertex${vertexIndex} Origin`,
            position: vertex,
            point: {
                pixelSize: 10,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
            },
            label: {
                text: `V${vertexIndex}`,
                font: '10pt sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.TOP
            }
        }));
        
        // 确保数组被正确初始化
        if (!vertexAxisEntities[vertexIndex]) {
            vertexAxisEntities[vertexIndex] = [];
        }
        vertexAxisEntities[vertexIndex] = entities;
        console.log(`顶点${vertexIndex}坐标轴创建完成，共${entities.length}个实体，位置:`, vertex);
    }
}

// 切换地形模型类型
async function switchTerrainModel() {
    if (!modalViewer) return;
    
    // 循环切换模型类型: terrain -> dp -> fengshan -> terrain
    if (currentModelType === 'terrain') {
        currentModelType = 'dp';
    } else if (currentModelType === 'dp') {
        currentModelType = 'fengshan';
    } else {
        currentModelType = 'terrain';
    }
    
    // 移除现有模型
    if (modalTerrainModel) {
        modalViewer.entities.remove(modalTerrainModel);
        modalTerrainModel = null;
    }
    
    // 清除包围框
    terrainBoundingBox = null;
    removeBoundingBoxEntities();
    document.getElementById('terrainBboxToggle').checked = false;
    document.getElementById('bboxVertexControls').style.display = 'none';
    
    // 加载新模型
    await loadModalModels(currentModelType);
    
    // 更新按钮文本
    let btnText = '';
    if (currentModelType === 'terrain') {
        btnText = '切换到DP模型';
    } else if (currentModelType === 'dp') {
        btnText = '切换到凤山模型';
    } else {
        btnText = '切换到地形模型';
    }
    document.getElementById('switchModelBtn').textContent = btnText;
    
    console.log('已切换到模型:', currentModelType);
}

// 在弹窗中加载3D模型
async function loadModalModels(modelType = 'terrain') {
    try {
        document.getElementById('modelLoadStatus').textContent = '正在加载模型...';
        
        // 根据模型类型选择URI
        let modelUri = '';
        let modelName = '';
        
        if (modelType === 'terrain') {
            modelUri = './terrain_output.glb';
            modelName = 'Terrain Model (terrain_output.glb)';
        } else if (modelType === 'dp') {
            // dp.glb 使用外部纹理 top.png，需要确保路径正确
            // 添加时间戳避免缓存问题
            modelUri = './dp.glb?t=' + Date.now();
            modelName = 'DP Model (dp.glb)';
        } else {
            modelUri = './fengshan72/fengshan72.gltf';
            modelName = 'Fengshan Model (fengshan72.gltf)';
        }
        
        // 加载地形模型到原点位置 - 使用本地坐标系
        const modelConfig = {
            uri: modelUri,
            minimumPixelSize: 32,
            maximumScale: 20000,
            scale: 1.0
        };
        
        // 对于带纹理的模型（dp.glb），添加 PBR 光照以增强材质效果
        if (modelType === 'dp') {
            console.log('DP模型配置：启用 PBR 光照增强材质效果');
            // 启用基于图像的光照（IBL）以获得更真实的材质效果
            modelConfig.imageBasedLightingFactor = new Cesium.Cartesian2(1.0, 1.0);
            modelConfig.luminanceAtZenith = 0.2; // 环境光亮度
            // 不设置 color 和 colorBlendMode，让模型使用自己的纹理
        } else {
            console.log('顶点颜色模型配置');
        }
        
        modalTerrainModel = await modalViewer.entities.add({
            name: modelName,
            position: new Cesium.Cartesian3(0, 0, 0), // 本地坐标系原点
            model: modelConfig
        });
        
        // 等待模型加载完成并检查纹理
        if (modalTerrainModel.model.readyPromise) {
            modalTerrainModel.model.readyPromise.then((model) => {
                console.log('=== 模型加载完成 ===');
                console.log('模型URI:', modelUri);
                console.log('模型类型:', modelType);
                console.log('模型对象:', model);
                
                // 检查模型的材质和纹理
                if (model._model) {
                    console.log('内部模型对象:', model._model);
                }
                
                // 检查是否有纹理
                console.log('Color:', modalTerrainModel.model.color);
                console.log('ColorBlendMode:', modalTerrainModel.model.colorBlendMode);
                console.log('ColorBlendAmount:', modalTerrainModel.model.colorBlendAmount);
                
                // 对于dp模型，增强材质效果
                if (modelType === 'dp') {
                    console.log('DP模型：增强材质渲染效果');
                    
                    // 等待模型完全加载后修改材质
                    setTimeout(() => {
                        if (modalTerrainModel && modalTerrainModel.model) {
                            // 增强光照效果
                            modalTerrainModel.model.imageBasedLightingFactor = new Cesium.Cartesian2(1.0, 1.0);
                            modalTerrainModel.model.luminanceAtZenith = 0.5;
                            
                            // 启用阴影（如果场景支持）
                            modalTerrainModel.model.shadows = Cesium.ShadowMode.ENABLED;
                            
                            console.log('✓ DP模型材质增强完成');
                        }
                    }, 500);
                    
                    // 检查模型内部结构
                    if (model._model) {
                        console.log('模型内部结构:', model._model);
                        if (model._model._runtime) {
                            console.log('运行时信息:', model._model._runtime);
                            if (model._model._runtime.materialsByName) {
                                console.log('材质列表:', model._model._runtime.materialsByName);
                            }
                        }
                        if (model._model._loader) {
                            console.log('加载器信息:', model._model._loader);
                        }
                        if (model._model._texturesByteLength) {
                            console.log('纹理字节大小:', model._model._texturesByteLength);
                        }
                    }
                    
                    // 尝试访问 gltf 数据
                    console.log('尝试获取 GLTF 数据...');
                    if (model._model && model._model._gltf) {
                        const gltf = model._model._gltf;
                        console.log('GLTF 材质数量:', gltf.materials ? gltf.materials.length : 0);
                        console.log('GLTF 纹理数量:', gltf.textures ? gltf.textures.length : 0);
                        console.log('GLTF 图像数量:', gltf.images ? gltf.images.length : 0);
                        if (gltf.materials && gltf.materials.length > 0) {
                            console.log('第一个材质:', gltf.materials[0]);
                        }
                        if (gltf.images && gltf.images.length > 0) {
                            console.log('图像列表:', gltf.images);
                            // 检查 top.png 是否能加载
                            gltf.images.forEach((img, idx) => {
                                if (img.uri) {
                                    console.log(`图像 ${idx} URI: ${img.uri}`);
                                    // 尝试加载纹理以验证路径
                                    const testUrl = new URL(img.uri, window.location.href).href;
                                    console.log(`完整URL: ${testUrl}`);
                                    fetch(testUrl)
                                        .then(res => {
                                            if (res.ok) {
                                                console.log(`✓ 纹理 ${img.uri} 加载成功 (${res.status})`);
                                                return res.blob();
                                            } else {
                                                console.error(`✗ 纹理 ${img.uri} 加载失败: ${res.status}`);
                                            }
                                        })
                                        .then(blob => {
                                            if (blob) {
                                                console.log(`纹理大小: ${blob.size} bytes, 类型: ${blob.type}`);
                                            }
                                        })
                                        .catch(err => {
                                            console.error(`✗ 纹理 ${img.uri} 加载错误:`, err);
                                        });
                                }
                            });
                        }
                    }
                    
                    // 强制刷新材质设置
                    setTimeout(() => {
                        if (modalTerrainModel && modalTerrainModel.model) {
                            // 尝试移除所有颜色覆盖
                            modalTerrainModel.model.color = undefined;
                            modalTerrainModel.model.colorBlendMode = Cesium.ColorBlendMode.HIGHLIGHT;
                            modalTerrainModel.model.colorBlendAmount = 0.0;
                            
                            // 尝试设置为使用模型自带材质
                            if (modalTerrainModel.model.imageBasedLightingFactor) {
                                modalTerrainModel.model.imageBasedLightingFactor = new Cesium.Cartesian2(1.0, 1.0);
                            }
                            
                            console.log('DP模型材质已刷新');
                            console.log('当前color:', modalTerrainModel.model.color);
                            console.log('当前colorBlendMode:', modalTerrainModel.model.colorBlendMode);
                            console.log('当前colorBlendAmount:', modalTerrainModel.model.colorBlendAmount);
                        }
                    }, 100);
                }
                
                console.log('===================');
            }).catch((error) => {
                console.error('模型加载失败:', error);
                document.getElementById('modelLoadStatus').textContent = '模型加载失败: ' + error.message;
            });
        }

        // 加载指北针模型到 Z 轴正上方 10 单位位置 - 使用本地坐标系
        modalCompassModel = await modalViewer.entities.add({
            name: 'North Compass',
            position: new Cesium.Cartesian3(0, 0, 10), // 本地坐标系Z轴上10单位
            model: {
                uri: './north.glb',
                minimumPixelSize: 16,
                maximumScale: 10000,
                scale: 1.0,
                color: Cesium.Color.WHITE.withAlpha(1.0)
            }
        });

        console.log('弹窗模型加载成功:', modelName);
        document.getElementById('modelLoadStatus').textContent = '模型加载完成: ' + modelName;
        
        // 隐藏加载状态
        setTimeout(() => {
            document.getElementById('modelLoadStatus').textContent = '';
        }, 2000);
        
        // 计算地形模型的包围框
        setTimeout(() => {
            calculateTerrainBoundingBox();
        }, 1000);
        
        // 设置固定的观察位置，不使用zoomTo避免持续重置
        setTimeout(() => {
            modalViewer.camera.setView({
                destination: new Cesium.Cartesian3(30, 30, 30),
                orientation: {
                    direction: new Cesium.Cartesian3(-30, -30, -30),
                    up: Cesium.Cartesian3.UNIT_Z
                }
            });
        }, 500);
        
    } catch (error) {
        console.error('弹窗模型加载失败:', error);
        document.getElementById('modelLoadStatus').textContent = '模型加载失败';
    }
}

// 点击弹窗外部关闭弹窗
window.onclick = function(event) {
    const modal = document.getElementById('modelModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// 主场景模型控制（保留原有功能）
function updateTerrainOpacity(value) {
    if (terrainModel) {
        terrainModel.model.color = Cesium.Color.WHITE.withAlpha(parseFloat(value));
    }
    document.getElementById('terrainOpacityValue').textContent = Math.round(value * 100) + '%';
}

function updateCompassOpacity(value) {
    if (compassModel) {
        compassModel.model.color = Cesium.Color.WHITE.withAlpha(parseFloat(value));
    }
    document.getElementById('compassOpacityValue').textContent = Math.round(value * 100) + '%';
}

// 弹窗模型控制函数
function switchTab(tabName) {
    // 切换标签页
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function updateModalTerrainOpacity(value) {
    if (modalTerrainModel && modalTerrainModel.model) {
        const alpha = parseFloat(value);
        // 对于有纹理的模型，只在需要时设置透明度
        if (alpha < 1.0) {
            modalTerrainModel.model.color = Cesium.Color.WHITE.withAlpha(alpha);
        } else {
            // 完全不透明时，移除 color 属性，让纹理正常显示
            modalTerrainModel.model.color = undefined;
        }
    }
    document.getElementById('terrainOpacityModal').textContent = Math.round(value * 100) + '%';
}

function updateModalTerrainScale(value) {
    if (modalTerrainModel) {
        modalTerrainModel.model.scale = parseFloat(value);
    }
    document.getElementById('terrainScaleModal').textContent = value;
    console.log('地形模型缩放更新为:', value);
}

function updateModalCompassOpacity(value) {
    if (modalCompassModel) {
        modalCompassModel.model.color = Cesium.Color.WHITE.withAlpha(parseFloat(value));
    }
    document.getElementById('compassOpacityModal').textContent = Math.round(value * 100) + '%';
}

function updateModalTerrainPosition() {
    if (!modalTerrainModel) return;
    
    const x = parseFloat(document.getElementById('terrainX').value) || 0;
    const y = parseFloat(document.getElementById('terrainY').value) || 0;
    const z = parseFloat(document.getElementById('terrainZ').value) || 0;
    
    // 使用本地坐标系直接设置位置
    const newPosition = new Cesium.Cartesian3(x, y, z);
    modalTerrainModel.position = newPosition;
    
    console.log(`弹窗地形模型位置更新: X=${x}, Y=${y}, Z=${z}`);
}

function updateModalCompassPosition() {
    if (!modalCompassModel) return;
    
    const x = parseFloat(document.getElementById('compassX').value) || 0;
    const y = parseFloat(document.getElementById('compassY').value) || 0;
    const z = parseFloat(document.getElementById('compassZ').value) || 10;
    
    // 使用本地坐标系直接设置位置
    const newPosition = new Cesium.Cartesian3(x, y, z);
    modalCompassModel.position = newPosition;
    
    console.log(`弹窗指北针位置更新: X=${x}, Y=${y}, Z=${z}`);
}

// 更新地形模型位置
function updateTerrainPosition() {
    if (!terrainModel) return;
    
    const x = parseFloat(document.getElementById('terrainX').value) || 0;
    const y = parseFloat(document.getElementById('terrainY').value) || 0;
    const z = parseFloat(document.getElementById('terrainZ').value) || 0;
    
    const newPosition = Cesium.Cartesian3.fromDegrees(x, y, z);
    terrainModel.position = newPosition;
    
    console.log(`地形模型位置更新: X=${x}, Y=${y}, Z=${z}`);
}

// 更新指北针位置
function updateCompassPosition() {
    if (!compassModel) return;
    
    const x = parseFloat(document.getElementById('compassX').value) || 0;
    const y = parseFloat(document.getElementById('compassY').value) || 0;
    const z = parseFloat(document.getElementById('compassZ').value) || 10;
    
    const newPosition = Cesium.Cartesian3.fromDegrees(x, y, z);
    compassModel.position = newPosition;
    
    console.log(`指北针位置更新: X=${x}, Y=${y}, Z=${z}`);
}

// 重置模型位置
function resetPositions() {
    // 重置弹窗中的模型位置
    document.getElementById('terrainX').value = 0;
    document.getElementById('terrainY').value = 0;
    document.getElementById('terrainZ').value = 0;
    updateModalTerrainPosition();
    
    document.getElementById('compassX').value = 0;
    document.getElementById('compassY').value = 0;
    document.getElementById('compassZ').value = 10;
    updateModalCompassPosition();
    
    // 重置透明度
    document.getElementById('terrainOpacitySlider').value = 1;
    document.getElementById('compassOpacitySlider').value = 1;
    updateModalTerrainOpacity(1);
    updateModalCompassOpacity(1);
    
    console.log('弹窗模型位置已重置');
}

// 更新相机视角
function updateCameraView() {
    if (!modalViewer) return;
    
    const heading = parseFloat(document.getElementById('cameraHeading').value) || 45;
    const pitch = parseFloat(document.getElementById('cameraPitch').value) || -20;
    const distance = parseFloat(document.getElementById('cameraDistance').value) || 50;
    
    // 更新显示值
    document.getElementById('headingValue').textContent = heading + '°';
    document.getElementById('pitchValue').textContent = pitch + '°';
    document.getElementById('distanceValue').textContent = distance;
    
    // 计算相机位置
    const headingRad = Cesium.Math.toRadians(heading);
    const pitchRad = Cesium.Math.toRadians(pitch);
    
    const x = distance * Math.cos(pitchRad) * Math.cos(headingRad);
    const y = distance * Math.cos(pitchRad) * Math.sin(headingRad);
    const z = distance * Math.sin(pitchRad);
    
    modalViewer.camera.setView({
        destination: new Cesium.Cartesian3(x, y, z),
        orientation: {
            direction: new Cesium.Cartesian3(-x, -y, -z),
            up: Cesium.Cartesian3.UNIT_Z
        }
    });
    
    console.log(`相机视角更新: 水平=${heading}°, 俯仰=${pitch}°, 距离=${distance}`);
}

// 重置弹窗视角
function resetModalView() {
    if (modalViewer) {
        // 重置滑块值
        document.getElementById('cameraHeading').value = 45;
        document.getElementById('cameraPitch').value = -20;
        document.getElementById('cameraDistance').value = 50;
        
        // 更新相机视角
        updateCameraView();
        console.log('弹窗视角已重置');
    }
}

// 重置视角
function resetView() {
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 0, 200),
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_FOUR,
            roll: 0.0
        }
    });
}

// 键盘快捷键
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Escape':
            closeModal();
            break;
        case 'm':
        case 'M':
            if (event.ctrlKey) {
                event.preventDefault();
                openModal();
            }
            break;
        case 'r':
        case 'R':
            if (event.ctrlKey) {
                event.preventDefault();
                resetView();
            }
            break;
    }
});

// 鼠标交互增强
viewer?.cesiumWidget.screenSpaceEventHandler.setInputAction(function onLeftClick(event) {
    const pickedObject = viewer.scene.pick(event.position);
    if (Cesium.defined(pickedObject)) {
        const entity = pickedObject.id;
        if (entity === terrainModel) {
            console.log('点击了地形模型');
        } else if (entity === compassModel) {
            console.log('点击了指北针模型');
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeCesium();
});

// 窗口大小改变时调整视图
window.addEventListener('resize', function() {
    if (viewer) {
        viewer.resize();
    }
});

// 导出函数供全局使用
window.openModal = openModal;
window.closeModal = closeModal;
window.updateTerrainOpacity = updateTerrainOpacity;
window.updateCompassOpacity = updateCompassOpacity;
window.updateTerrainPosition = updateTerrainPosition;
window.updateCompassPosition = updateCompassPosition;
window.resetPositions = resetPositions;
window.resetView = resetView;

// 导出弹窗控制函数
window.switchTab = switchTab;
window.updateModalTerrainOpacity = updateModalTerrainOpacity;
window.updateModalTerrainScale = updateModalTerrainScale;
window.updateModalCompassOpacity = updateModalCompassOpacity;
window.updateModalTerrainPosition = updateModalTerrainPosition;
window.updateModalCompassPosition = updateModalCompassPosition;
window.resetModalView = resetModalView;
window.updateCameraView = updateCameraView;

// 导出包围框控制函数
window.toggleTerrainModel = toggleTerrainModel;
window.toggleTerrainBbox = toggleTerrainBbox;
window.toggleVertexAxis = toggleVertexAxis;
window.switchTerrainModel = switchTerrainModel;

// 导出点光源控制函数
window.updatePointLightPosition = updatePointLightPosition;
window.updatePointLightIntensity = updatePointLightIntensity;
window.updatePointLightRange = updatePointLightRange;
window.togglePointLight = togglePointLight;
