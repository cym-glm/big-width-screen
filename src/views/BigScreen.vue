<template>
  <div class="dashboard">
    <div class="bg-decoration">
      <div class="bg-circle-1"></div>
      <div class="bg-circle-2"></div>
    </div>

    <div class="main-container">
      <div class="header">
        <div class="header-left">
          <div class="logo">📊</div>
          <h1 class="title">立体空间感知监测</h1>
        </div>
        <div class="datetime">{{ currentTime }}</div>
      </div>

      <div class="content">
        <div class="left-panel">
          <div class="panel">
            <div class="panel-title">
              <span class="icon">📡</span>
              感知数据概览
            </div>
            <div class="sensor-grid">
              <div v-for="sensor in sensorData" :key="sensor.name" class="sensor-card">
                <div class="sensor-label">{{ sensor.name }}</div>
                <div class="sensor-value">{{ sensor.value }}</div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">
              <span class="icon">📈</span>
              工作进度
            </div>
            <div class="progress-item">
              <span class="progress-label">总数</span>
              <span class="progress-value">{{ workProgress.total }}</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">已完成</span>
              <span class="progress-value" style="color: #22c55e;">{{ workProgress.completed }}</span>
            </div>
            <div class="progress-item" style="margin-bottom: 8px;">
              <span class="progress-label">完成率</span>
              <span class="progress-percentage">{{ workProgress.percentage }}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: workProgress.percentage + '%' }"></div>
            </div>

            <div class="data-list">
              <div class="data-list-title">最近数据</div>
              <div v-for="item in recentData" :key="item.name" class="data-item">
                <div class="data-item-header">
                  <span class="data-item-name">{{ item.name }}</span>
                  <span class="status-badge" :class="item.status === '正常' ? 'status-normal' : 'status-warning'">
                    {{ item.status }}
                  </span>
                </div>
                <div class="data-item-footer">
                  <span class="data-item-value">{{ item.value }}</span>
                  <span class="data-item-time">{{ item.time }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="center-panel panel">
          <div class="tabs">
            <div 
              v-for="tab in tabs" 
              :key="tab"
              class="tab"
              :class="{ active: activeTab === tab }"
              @click="switchTab(tab)"
            >
              {{ tab }}
            </div>
          </div>
          <div class="view-content">
            <div v-show="activeTab === '环境监测'" class="map-container">
              <button v-if="currentLevel === 'city'" class="back-button" @click="backToProvince">
                ← 返回省级
              </button>
              <div ref="mapChartRef" class="map-chart"></div>
              <div class="map-legend">
                <div class="legend-title">污染程度</div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #1e40af;"></div>
                  <span class="legend-label">1-9个</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #3b82f6;"></div>
                  <span class="legend-label">10-49个</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #06b6d4;"></div>
                  <span class="legend-label">200-599个</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #0891b2;"></div>
                  <span class="legend-label">600-999个</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #0e7490;"></div>
                  <span class="legend-label">1000个以上</span>
                </div>
              </div>
            </div>

            <div v-show="activeTab === '实时分析'" class="ecg-container">
              <div ref="ecgChartRef" class="ecg-chart"></div>
            </div>

            <div v-show="activeTab === '历史数据'" class="history-container">
              <div ref="historyChartRef" class="history-chart"></div>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <div class="panel">
            <div class="panel-title">
              <span class="icon">👁️</span>
              风险等级解析
            </div>
            <div class="chart-container" ref="pieChartRef"></div>
            <div class="risk-list">
              <div v-for="risk in riskStats" :key="risk.label" class="risk-item">
                <div class="risk-label-group">
                  <div class="risk-color" :style="{ background: risk.color }"></div>
                  <span class="risk-label">{{ risk.label }}</span>
                </div>
                <span class="risk-value">{{ risk.value }}</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">AI动态评估</div>
            <div class="ai-card ai-card-success">
              <div class="ai-card-title">环境质量良好</div>
              <div class="ai-card-desc">各项指标正常运行</div>
            </div>
            <div class="ai-card ai-card-warning">
              <div class="ai-card-title">湿度偏高预警</div>
              <div class="ai-card-desc">建议加强通风</div>
            </div>
            <div class="ai-card ai-card-info">
              <div class="ai-card-title">系统运行稳定</div>
              <div class="ai-card-desc">所有传感器在线</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts'; // 导入 ECharts
// 假设 'china.js' 和省份地图数据已在项目中以某种方式全局注册或导入
// 在实际项目中，您可能需要：
// import 'echarts/map/js/china.js';
// 或使用异步加载/按需注册地图，这里为保持原逻辑，假设已可用。

// --- 地图GeoJson动态注册 ---
const loadChinaMap = async () => {
  if (echarts.getMap('china')) return;
  const url = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
  const geoJson = await fetch(url).then(r => r.json());
  echarts.registerMap('china', geoJson);
};

// 动态加载省份geojson修复
const loadProvinceMap = async (province) => {
  // 若ECharts已注册直接返回
  if (echarts.getMap(province)) return;
  const provCodeMap = { '北京':'110000_full', '天津':'120000_full', '河北':'130000_full', '山西':'140000_full', '内蒙古':'150000_full', '辽宁':'210000_full', '吉林':'220000_full', '黑龙江':'230000_full', '上海':'310000_full', '江苏':'320000_full', '浙江':'330000_full', '安徽':'340000_full', '福建':'350000_full', '江西':'360000_full', '山东':'370000_full', '河南':'410000_full', '湖北':'420000_full', '湖南':'430000_full', '广东':'440000_full', '广西':'450000_full', '海南':'460000_full', '重庆':'500000_full', '四川':'510000_full', '贵州':'520000_full', '云南':'530000_full', '西藏':'540000_full', '陕西':'610000_full', '甘肃':'620000_full', '青海':'630000_full', '宁夏':'640000_full', '新疆':'650000_full'}
  const regionNameAlias = {
    '新疆维吾尔自治区':'新疆', '广西壮族自治区':'广西', '宁夏回族自治区':'宁夏', '内蒙古自治区':'内蒙古', '西藏自治区':'西藏',
    '北京':'北京', '天津':'天津', '上海':'上海', '重庆':'重庆' // 直辖市也防止地区后缀问题
  };
  let cleanName = province;
  // 优先用别名，否则去行政区后缀
  if(regionNameAlias[province]) cleanName = regionNameAlias[province];
  else cleanName = province.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区/g,'');
  const code = provCodeMap[cleanName];
  if (!code) return;
  // 一定注册为行政区全名（比如新疆维吾尔自治区），保证ECharts用省全名渲染
  const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}.json`;
  const geoJson = await fetch(url).then(r=>r.json());
  echarts.registerMap(province, geoJson);
}

// --- 模拟数据 (保持不变) ---
const provinceData = [
  { name: '北京', value: 1200 }, { name: '天津', value: 450 }, { name: '河北', value: 850 },
  { name: '山西', value: 320 }, { name: '内蒙古', value: 280 }, { name: '辽宁', value: 1150 },
  { name: '吉林', value: 420 }, { name: '黑龙江', value: 380 }, { name: '上海', value: 980 },
  { name: '江苏', value: 1350 }, { name: '浙江', value: 920 }, { name: '安徽', value: 670 },
  { name: '福建', value: 580 }, { name: '江西', value: 450 }, { name: '山东', value: 1100 },
  { name: '河南', value: 890 }, { name: '湖北', value: 720 }, { name: '湖南', value: 650 },
  { name: '广东', value: 1450 }, { name: '广西', value: 480 }, { name: '海南', value: 180 },
  { name: '重庆', value: 550 }, { name: '四川', value: 820 }, { name: '贵州', value: 390 },
  { name: '云南', value: 520 }, { name: '西藏', value: 45 }, { name: '陕西', value: 620 },
  { name: '甘肃', value: 280 }, { name: '青海', value: 120 }, { name: '宁夏', value: 180 },
  { name: '新疆', value: 350 }
];

const cityDataMap = {
  '江苏': [{ name: '南京市', value: 280 }, { name: '苏州市', value: 320 }, { name: '无锡市', value: 180 }, { name: '常州市', value: 150 }, { name: '南通市', value: 140 }, { name: '徐州市', value: 120 }, { name: '扬州市', value: 80 }, { name: '镇江市', value: 70 }, { name: '泰州市', value: 60 }, { name: '盐城市', value: 50 }, { name: '连云港市', value: 45 }, { name: '淮安市', value: 40 }, { name: '宿迁市', value: 35 }],
  '广东': [{ name: '广州市', value: 350 }, { name: '深圳市', value: 420 }, { name: '东莞市', value: 180 }, { name: '佛山市', value: 160 }, { name: '珠海市', value: 90 }, { name: '中山市', value: 85 }, { name: '惠州市', value: 75 }],
  '北京': [{ name: '东城区', value: 150 }, { name: '西城区', value: 140 }, { name: '朝阳区', value: 200 }, { name: '海淀区', value: 180 }, { name: '丰台区', value: 160 }, { name: '石景山区', value: 120 }, { name: '通州区', value: 130 }]
};

const sensorData = [
  { name: '传感器A', value: 230 }, { name: '传感器B', value: 230 }, { name: '传感器C', value: 324 },
  { name: '温湿度', value: 230 }, { name: '风力', value: 230 }, { name: '噪音检测', value: 230 }
];

const workProgress = {
  total: 3691,
  completed: 2691,
  percentage: 73
};

const recentData = [
  { name: '数据点1', value: '89PPM', time: '2024-04-01 08:30', status: '正常' },
  { name: '数据点2', value: '75PPM', time: '2024-04-01 08:30', status: '正常' },
  { name: '数据点3', value: '92PPM', time: '2024-04-01 08:30', status: '警告' }
];

const riskStats = [
  { label: '高风险', value: 12, color: '#ff4444' },
  { label: '中风险', value: 28, color: '#ffaa00' },
  { label: '低风险', value: 45, color: '#44ff44' },
  { label: '安全', value: 145, color: '#00aaff' }
];

// --- 响应式状态和引用 ---
const currentTime = ref('');
const activeTab = ref('环境监测');
const currentLevel = ref('province'); // 'province' 或 'city'
const selectedProvince = ref('');
const tabs = ['环境监测', '实时分析', '历史数据'];

// 模板引用，用于获取 DOM 元素
const mapChartRef = ref(null);
const ecgChartRef = ref(null);
const pieChartRef = ref(null);
const historyChartRef = ref(null);

// ECharts 实例
let mapChart = null;
let ecgChart = null;
let pieChart = null;
let historyChart = null;

// 定时器
let timer = null;
let ecgTimer = null;

// 放到 setup 顶部，使全文件可用
const defaultCityNames = ["市辖区", "县辖区", "开发区", "新区", "高新区", "工业区", "城区", "郊区"];

// --- 方法 ---

// 1. 时间更新
const updateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 2. ECharts 初始化/更新 - 地图
const getMapOption = (mapName, data, visualMax) => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}<br/>污染源: {c}个',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    textStyle: { color: '#fff' }
  },
  visualMap: mapName === 'china' ? {
    min: 0,
    max: visualMax || 1500,
    text: ['高', '低'],
    realtime: false,
    calculable: true,
    inRange: { color: ['#30db29', '#fff000', '#ffc600', '#ff8300', '#ff1e00'] }, //绿黄橙红
    textStyle: { color: '#06b6d4' },
    left: 'right',
    top: 'bottom'
  } : null,
  series: [
    {
      name: '污染程度',
      type: 'map',
      map: mapName, // 'china' 或 省份名称
      roam: true,
      emphasis: {
        label: { show: true, color: '#fff' },
        itemStyle: { areaColor: '#0891b2', borderColor: '#06b6d4', borderWidth: 2 }
      },
      itemStyle: { areaColor: '#1e3a8a', borderColor: '#334155', borderWidth: 1 },
      label: { show: true, color: '#94a3b8', fontSize: 10 },
      data: data
    }
  ]
});

const initMap = async () => {
  await nextTick();
  await loadChinaMap();
  if (!mapChartRef.value) return;
  if (!mapChart) {
    mapChart = echarts.init(mapChartRef.value);
    mapChart.on('click', async (params) => {
      // 省级下钻到市
      if (params.componentType === 'series' && currentLevel.value === 'province') {
        const provinceName = params.name;
        selectedProvince.value = provinceName;
        currentLevel.value = 'city';
        await loadProvinceMap(provinceName);
        showCityMap(provinceName);
      }
    });
    window.addEventListener('resize', resizeCharts);
  }
  // 若是city模式切回省
  if (currentLevel.value === 'province') {
    const option = getMapOption('china', provinceData);
    mapChart.setOption(option, true);
  } else if (currentLevel.value === 'city') {
    // 回到市区图
    await loadProvinceMap(selectedProvince.value);
    showCityMap(selectedProvince.value);
  }
};

// 显示城市（散点图模拟，因为没有城市地图 JSON）
const showCityMap = (provinceName) => {
  if (!mapChart) return;
  // 若没city数据 自动生成模拟污染数据，新：保证为非空数组
  let citys = cityDataMap[provinceName];
  if (!Array.isArray(citys) || citys.length === 0) {
    citys = genSimulateCityData(provinceName);
  }
  if (!Array.isArray(citys) || citys.length === 0) {
    mapChart.clear();
    mapChart.setOption({title:{text:provinceName+' 暂无市区数据',left:'center',top:'center',textStyle:{color:'#ff1e00',fontSize:18}}});
    return;
  }
  const maxValue = Math.max(...citys.map(i=>i.value), 100);
  const option = getMapOption(provinceName, citys, maxValue+100);
  mapChart.setOption(option, true);
}

// 新增工具: 省份生成随机市区数据
function genSimulateCityData(provinceName) {
  // 随机数个数、名字生成
  const n = Math.floor(Math.random() * 7) + 6;
  const arr = [];
  for(let i=0;i<n;i++){
    arr.push({ name: provinceName + defaultCityNames[i % defaultCityNames.length] + (i+1), value: Math.round(Math.random()*1000+100)})
  }
  return arr;
}

// 3. ECharts 初始化/更新 - 心电图
const initECG = async () => {
  await nextTick();
  if (!ecgChartRef.value) return;

  if (!ecgChart) {
    ecgChart = echarts.init(ecgChartRef.value);
  }
  
  const data = [];
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    data.push({
      name: now - (100 - i) * 1000,
      value: [now - (100 - i) * 1000, Math.random() * 100 + 50]
    });
  }

  const option = {
    title: { text: '实时环境数据监测', left: 'center', top: 20, textStyle: { color: '#06b6d4', fontSize: 20 } },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const date = new Date(params[0].value[0]);
        return date.toLocaleTimeString() + '<br/>' + params[0].seriesName + ': ' + params[0].value[1].toFixed(2);
      },
      backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: 'rgba(6, 182, 212, 0.5)', textStyle: { color: '#fff' }
    },
    grid: { left: '8%', right: '5%', top: '20%', bottom: '15%' },
    xAxis: {
      type: 'time',
      splitLine: { show: true, lineStyle: { color: 'rgba(6, 182, 212, 0.1)' } },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      name: '数值',
      nameTextStyle: { color: '#94a3b8' },
      boundaryGap: [0, '100%'],
      splitLine: { show: true, lineStyle: { color: 'rgba(6, 182, 212, 0.1)' } },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [
      {
        name: '实时数据',
        type: 'line',
        showSymbol: false,
        data: data,
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 2, shadowBlur: 10, shadowColor: 'rgba(6, 182, 212, 0.8)' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.5)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0)' }
          ])
        }
      }
    ]
  };
  ecgChart.setOption(option, true);
  startECGUpdate(); // 启动数据更新
};

// 心电图数据实时更新逻辑
const startECGUpdate = () => {
  if (ecgTimer) clearInterval(ecgTimer);
  const data = ecgChart.getOption().series[0].data;

  ecgTimer = setInterval(() => {
    const now = Date.now();
    const value = Math.random() * 100 + 50;
    
    // 移除最旧数据
    data.shift(); 
    // 加入最新数据
    data.push({
      name: now,
      value: [now, value]
    });

    // 更新图表
    ecgChart.setOption({
      series: [{ data: data }]
    });
  }, 1000);
};

// 4. ECharts 初始化/更新 - 饼图
const initPieChart = async () => {
  await nextTick();
  if (!pieChartRef.value) return;

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value);
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      borderColor: 'rgba(6, 182, 212, 0.5)',
      textStyle: { color: '#fff' }
    },
    series: [
      {
        name: '风险等级',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        data: riskStats.map(item => ({
          value: item.value,
          name: item.label,
          itemStyle: { color: item.color }
        })),
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          color: '#cbd5e1'
        },
        labelLine: { show: true, lineStyle: { color: '#334155' } },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };
  pieChart.setOption(option, true);
};

// 5. 切换 Tab
const switchTab = (tab) => {
  activeTab.value = tab;
  if (ecgTimer) clearInterval(ecgTimer);
  // 切换Tab时销毁对应老图表
  if (tab === '环境监测') {
    disposeCharts('ecg')
  } else if (tab === '实时分析') {
    disposeCharts('map')
  }
  nextTick(() => {
    if (tab === '环境监测') {
      if (currentLevel.value === 'province') {
        initMap();
      } else {
        backToProvince();
      }
    } else if (tab === '实时分析') {
      initECG();
    }
    if(tab==='历史数据') { initHistoryChart(); }
  });
};

// 6. 返回省级地图
const backToProvince = () => {
  currentLevel.value = 'province';
  selectedProvince.value = '';
  // 回中国视图
  initMap();
};

// 7. 响应式调整大小
const resizeCharts = () => {
  mapChart && mapChart.resize();
  ecgChart && ecgChart.resize();
  pieChart && pieChart.resize();
  historyChart && historyChart.resize();
};

// 新增 dispose util
function disposeCharts(type) {
  if(type==='map' && mapChart) { mapChart.dispose(); mapChart = null; }
  if(type==='ecg' && ecgChart) { ecgChart.dispose(); ecgChart = null; }
}

// 2.5 初始化历史堆叠区图：
const initHistoryChart = async () => {
  await nextTick();
  if (!historyChartRef.value) return;
  if (historyChart) { historyChart.dispose(); historyChart = null; }
  historyChart = echarts.init(historyChartRef.value);
  // 构造模拟历史天
  const days = Array.from({length:14}, (_,i)=>`Day${i+1}`)
  // 模拟三组污染类型
  const groups = ['PM2.5', 'AQI', 'O3'];
  const data = groups.map(()=>days.map(()=>Math.round(Math.random()*900+100)));
  const option = {
    title:{text:'历史环境数据（堆叠图）',left:'center',textStyle:{color:'#3b82f6'}},
    tooltip:{trigger:'axis'},
    legend:{data:groups,top:30,textStyle:{color:'#fff'}},
    grid:{left:'6%',right:'6%',bottom:'8%',top:'20%'},
    xAxis:{type:'category',data:days, axisLine:{lineStyle:{color:'#3b82f6'}}, axisLabel:{color:'#eee'}},
    yAxis:{type:'value',axisLine:{lineStyle:{color:'#3b82f6'}},axisLabel:{color:'#eee'},splitLine:{lineStyle:{color:'#223'}}},
    series:[
      {name:groups[0],type:'line',stack:'total',showSymbol:false,areaStyle:{},emphasis:{focus:'series'}, data:data[0]},
      {name:groups[1],type:'line',stack:'total',showSymbol:false,areaStyle:{},emphasis:{focus:'series'}, data:data[1]},
      {name:groups[2],type:'line',stack:'total',showSymbol:false,areaStyle:{},emphasis:{focus:'series'}, data:data[2]},
    ]
  };
  historyChart.setOption(option);
};

// --- 生命周期钩子 ---
onMounted(() => {
  // 初始化时间
  updateTime();
  timer = setInterval(updateTime, 1000);

  // 初始化图表（仅初始化可见的图表）
  initMap();
  initPieChart();
  
  // 监听页面缩放
  window.addEventListener('resize', resizeCharts);
});

onUnmounted(() => {
  // 清理定时器和 ECharts 实例
  if (timer) clearInterval(timer);
  if (ecgTimer) clearInterval(ecgTimer);
  
  mapChart && mapChart.dispose();
  ecgChart && ecgChart.dispose();
  pieChart && pieChart.dispose();
  historyChart && historyChart.dispose();
  
  window.removeEventListener('resize', resizeCharts);
});

// 监听 tab 切换，在 switchTab 中处理了，但为了健壮性，这里保留 resize
watch(activeTab, () => {
    resizeCharts();
});

</script>

<style>
/* 样式内容与原代码中的 <style> 标签内完全一致 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.dashboard {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  pointer-events: none;
}

.bg-circle-1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  filter: blur(80px);
}

.bg-circle-2 {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
  filter: blur(80px);
}

.main-container {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

/* 头部样式 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.title {
  font-size: 36px;
  font-weight: bold;
  background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.datetime {
  color: #06b6d4;
  font-size: 20px;
  font-family: 'Courier New', monospace;
}

/* 内容区域 */
.content {
  flex: 1;
  display: grid;
  grid-template-columns: 3fr 6fr 3fr;
  gap: 24px;
  overflow: hidden;
}

/* 面板样式 */
.panel {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(6, 182, 212, 0.2);
  overflow: auto;
}

.panel::-webkit-scrollbar {
  width: 6px;
}

.panel::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.3);
  border-radius: 3px;
}

.panel::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.5);
  border-radius: 3px;
}

.panel-title {
  color: #06b6d4;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  width: 20px;
  height: 20px;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.sensor-card {
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s;
}

.sensor-card:hover {
  border-color: rgba(6, 182, 212, 0.5);
  transform: translateY(-2px);
}

.sensor-label {
  color: #94a3b8;
  font-size: 12px;
  margin-bottom: 4px;
}

.sensor-value {
  color: #06b6d4;
  font-size: 24px;
  font-weight: bold;
}

/* 进度条 */
.progress-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 12px;
}

.progress-label {
  color: #94a3b8;
}

.progress-value {
  color: #06b6d4;
  font-weight: 600;
}

.progress-bar-container {
  width: 100%;
  height: 12px;
  background: rgba(51, 65, 85, 0.8);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
  border-radius: 6px;
  transition: width 1s ease;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
}

.progress-percentage {
  color: #06b6d4;
  font-size: 28px;
  font-weight: bold;
}

/* 数据列表 */
.data-list {
  margin-top: 24px;
}

.data-list-title {
  color: #94a3b8;
  font-size: 12px;
  margin-bottom: 12px;
}

.data-item {
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.data-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.data-item-name {
  color: #06b6d4;
  font-size: 13px;
  font-weight: 600;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-normal {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-warning {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.data-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.data-item-value {
  color: white;
  font-weight: bold;
}

.data-item-time {
  color: #64748b;
}

/* 中间面板 */
.center-panel {
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(6, 182, 212, 0.3);
  background: rgba(15, 23, 42, 0.5);
  border-radius: 12px 12px 0 0;
}

.tab {
  padding: 12px 24px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab:hover {
  color: #06b6d4;
}

.tab.active {
  color: #06b6d4;
  border-bottom-color: #06b6d4;
  background: rgba(30, 41, 59, 0.5);
}

.view-content {
  flex: 1;
  position: relative;
  padding: 24px;
  background: rgba(15, 23, 42, 0.3);
  border-radius: 0 0 12px 12px;
}

/* 地图容器 */
.map-container {
  position: absolute;
  inset: 24px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
}

.map-chart {
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  bottom: 40px;
  left: 40px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 8px;
  padding: 16px;
  z-index: 10;
}

.legend-title {
  color: #06b6d4;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 600;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.legend-color {
  width: 20px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  color: #cbd5e1;
}

/* 心电图容器 */
.ecg-container {
  position: absolute;
  inset: 24px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
}

.ecg-chart {
  width: 100%;
  height: 100%;
}

/* 历史数据容器 */
.history-container {
  position: absolute;
  inset: 24px;
  background: linear-gradient(to bottom, rgba(30, 58, 138, 0.3) 0%, rgba(30, 41, 59, 0.3) 50%, rgba(15, 23, 42, 0.5) 100%);
  border-radius: 8px;
  overflow: hidden;
}

.mountains {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 66%;
  background: linear-gradient(to top, rgba(30, 41, 59, 0.6) 0%, transparent 100%);
}

.trees {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 50%;
  opacity: 0.4;
}

.tree {
  position: absolute;
  bottom: 0;
  background: #0f172a;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.data-points {
  position: absolute;
  inset: 0;
}

.data-point {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  animation: pulse 2s infinite;
  cursor: pointer;
}

.data-point-1 {
  top: 33%;
  left: 25%;
  background: #06b6d4;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.8);
}

.data-point-2 {
  top: 50%;
  right: 33%;
  background: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
}

.data-point-3 {
  bottom: 33%;
  left: 50%;
  background: #eab308;
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.8);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.monitor-card {
  position: absolute;
  top: 25%;
  right: 48px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(6, 182, 212, 0.5);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.monitor-title {
  color: #06b6d4;
  font-size: 13px;
  margin-bottom: 8px;
}

.monitor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.monitor-value {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-container {
  width: 100%;
  height: 200px;
  margin-bottom: 16px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: rgba(51, 65, 85, 0.3);
  border-radius: 6px;
  transition: all 0.3s;
}

.risk-item:hover {
  background: rgba(51, 65, 85, 0.5);
}

.risk-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.risk-label {
  color: #cbd5e1;
  font-size: 13px;
}

.risk-value {
  color: white;
  font-weight: 600;
}

.ai-card {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  border-left: 4px solid;
}

.ai-card-success {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, transparent 100%);
  border-left-color: #22c55e;
}

.ai-card-warning {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.2) 0%, transparent 100%);
  border-left-color: #eab308;
}

.ai-card-info {
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.2) 0%, transparent 100%);
  border-left-color: #06b6d4;
}

.ai-card-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.ai-card-success .ai-card-title {
  color: #22c55e;
}

.ai-card-warning .ai-card-title {
  color: #eab308;
}

.ai-card-info .ai-card-title {
  color: #06b6d4;
}

.ai-card-desc {
  color: #94a3b8;
  font-size: 11px;
}

/* 返回按钮 */
.back-button {
  position: absolute;
  top: 40px;
  left: 40px;
  padding: 8px 16px;
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid rgba(6, 182, 212, 0.5);
  border-radius: 6px;
  color: #06b6d4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 20;
}

.back-button:hover {
  background: rgba(6, 182, 212, 0.3);
  transform: translateX(-2px);
}

.history-chart { width:100%; height:100%;}
</style>