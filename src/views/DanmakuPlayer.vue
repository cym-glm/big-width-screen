<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// 响应式数据
const videoRef = ref(null);
const danmakuContainerRef = ref(null);
const isPlaying = ref(false);
const danmakuCount = ref(100);
const danmakuSpeed = ref('normal');
const danmakuDensity = ref('medium');
const newDanmakuText = ref('');
const newDanmakuColor = ref('#ffffff');
const fps = ref(0);

// 弹幕数据
const danmakuList = ref([]); // 所有弹幕数据（包含未激活的）
const activeDanmaku = ref([]); // 正在屏幕上移动的弹幕
const danmakuPool = ref([]); // DOM 元素池，用于复用
const totalDanmakuCount = ref(0); // 总弹幕数量

// 轨道管理 (5条轨道)
const tracks = ref(Array(5).fill().map(() => ({ 
  lastEndTime: 0, // 轨道上最后一条弹幕离开屏幕的时间（粗略估算）
  lastEndPosition: 0 // 未使用
})));

// 动画控制
let animationId = null;
let lastTime = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

// 计算属性
const activeDanmakuCount = computed(() => activeDanmaku.value.length);
const speedMultiplier = computed(() => {
  switch(danmakuSpeed.value) {
    case 'slow': return 0.7;
    case 'fast': return 1.5;
    default: return 1.0;
  }
});


/**
 * 生成随机弹幕数据
 */
const generateDanmaku = () => {
  const count = Math.min(danmakuCount.value, 10000);
  const newDanmakus = [];
  const duration = videoRef.value?.duration || 60; // 视频总时长

  for (let i = 0; i < count; i++) {
    const time = Math.random() * duration; // 随机时间点
    const colors = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      const avatars = ['头像1', '头像2', '头像3', '头像4', '头像5', '头像6', '头像7', '头像8'];
    
    newDanmakus.push({
      id: totalDanmakuCount.value + i,
      text: `弹幕 ${totalDanmakuCount.value + i + 1}: 这是一条测试弹幕`,
      color: colors[Math.floor(Math.random() * colors.length)],
      time: time, // 弹幕出现时间
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      duration: 8 + Math.random() * 4, // 弹幕移动持续时间
      track: -1,
      position: 0,
      width: 0,
      isActive: false,
      element: null, // DOM 元素引用
      startTime: 0, // 实际开始移动时间
    });
  }
  
  danmakuList.value.push(...newDanmakus);
  totalDanmakuCount.value += count;
};

/**
 * 清除所有弹幕（DOM 和 数据）
 */
const clearAllDanmaku = () => {
  danmakuList.value = [];
  activeDanmaku.value = [];
  totalDanmakuCount.value = 0;
  
  // 清除所有DOM元素并重置弹幕池
  if (danmakuContainerRef.value) {
    danmakuContainerRef.value.innerHTML = '';
    danmakuPool.value = [];
  }
  
  // 重置轨道状态
  tracks.value = Array(5).fill().map(() => ({ 
    lastEndTime: 0, 
    lastEndPosition: 0 
  }));
};

/**
 * 手动发送弹幕
 */
const sendDanmaku = () => {
  if (!newDanmakuText.value.trim()) return;
  
  const currentTime = videoRef.value?.currentTime || 0;
    const avatars = ['头像1', '头像2', '头像3', '头像4', '头像5', '头像6', '头像7', '头像8'];
  
  const newDanmaku = {
    id: totalDanmakuCount.value,
    text: newDanmakuText.value,
    color: newDanmakuColor.value,
    time: currentTime, // 立即发送
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    duration: 8 + Math.random() * 4,
    track: -1,
    position: 0,
    width: 0,
    isActive: false,
    element: null,
    startTime: 0,
  };
  
  danmakuList.value.push(newDanmaku);
  totalDanmakuCount.value++;
  newDanmakuText.value = '';
};

/**
 * 模拟 WebSocket 实时推送一条弹幕
 */
const simulateWebSocket = () => {
  const colors = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  const avatars = ['头像1', '头像2', '头像3', '头像4', '头像5', '头像6', '头像7', '头像8'];
  const currentTime = videoRef.value?.currentTime || 0;
  
  const newDanmaku = {
    id: totalDanmakuCount.value,
    text: `WebSocket弹幕 ${totalDanmakuCount.value + 1}`,
    color: colors[Math.floor(Math.random() * colors.length)],
    time: currentTime,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    duration: 8 + Math.random() * 4,
    track: -1,
    position: 0,
    width: 0,
    isActive: false,
    element: null,
    startTime: 0,
  };
  
  danmakuList.value.push(newDanmaku);
  totalDanmakuCount.value++;
};

/**
 * 性能测试：生成 10000 条弹幕
 */
const testPerformance = () => {
  danmakuCount.value = 10000;
  generateDanmaku();
};

/**
 * 切换视频播放/暂停状态
 */
const togglePlayPause = () => {
  if (!videoRef.value) return;
  
  if (videoRef.value.paused) {
    videoRef.value.play();
    isPlaying.value = true;
  } else {
    videoRef.value.pause();
    isPlaying.value = false;
  }
};

/**
 * 弹幕轨道分配算法：分配一个可用轨道
 * @param {Object} danmaku - 弹幕对象
 * @param {number} currentTime - 当前视频时间
 * @returns {boolean} - 是否成功分配轨道
 */
const assignTrack = (danmaku, currentTime) => {
  const containerWidth = danmakuContainerRef.value?.clientWidth || 800;
  // 弹幕在屏幕上的速度 (像素/秒)
  const danmakuSpeedPx = (containerWidth / danmaku.duration) * speedMultiplier.value;
  
  // 弹幕从屏幕最右侧进入到完全离开所需的时间 (秒)
  const minTimeGap = (containerWidth + danmaku.width) / danmakuSpeedPx;
  
  let bestTrack = -1;
  let minStartTime = Infinity;
  
  // 遍历所有轨道，寻找最早可用的轨道
  for (let i = 0; i < tracks.value.length; i++) {
    const track = tracks.value[i];
    // 轨道上次弹幕离开的时间
    const lastExitTime = track.lastEndTime; 
    
    // 如果当前时间已经大于或等于上次弹幕离开时间，则该轨道立即可用
    if (currentTime >= lastExitTime) {
      if (0 < minStartTime) {
        minStartTime = 0; // 立即开始
        bestTrack = i;
      }
    } else if (lastExitTime < minStartTime) {
      // 轨道尚未可用，但它是所有不可用轨道中最早可用的
      minStartTime = lastExitTime - currentTime; // 距离可用所需时间
      bestTrack = i;
    }
  }
  
  if (bestTrack !== -1) {
    const actualStartTime = currentTime + minStartTime; // 实际开始移动时间
    
    danmaku.track = bestTrack;
    danmaku.startTime = actualStartTime;
    // 更新轨道状态：本次弹幕将在何时完全离开屏幕
    tracks.value[bestTrack].lastEndTime = actualStartTime + minTimeGap;
    return true;
  }
  
  return false;
};

/**
 * 弹幕动画循环，使用 requestAnimationFrame
 * @param {number} timestamp - 当前时间戳
 */
const animateDanmaku = (timestamp) => {
  if (!lastTime) lastTime = timestamp;
  // const deltaTime = timestamp - lastTime; // 帧间隔时间 (ms)
  lastTime = timestamp;
  
  // FPS 计算
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    fps.value = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }
  
  if (!videoRef.value || !danmakuContainerRef.value) {
    animationId = requestAnimationFrame(animateDanmaku);
    return;
  }
  
  const currentTime = videoRef.value.currentTime;
  const containerWidth = danmakuContainerRef.value.clientWidth;
  const containerHeight = danmakuContainerRef.value.clientHeight;
  const trackHeight = containerHeight / tracks.value.length;
  
  // --- 激活新的弹幕 ---
  
  // 激活当前时间附近（例如提前 0.5 秒）的弹幕
  const activationTime = 0.5; 
  
  for (let i = danmakuList.value.length - 1; i >= 0; i--) {
    const danmaku = danmakuList.value[i];
    
    // 如果弹幕已激活，或尚未到激活时间，则跳过
    if (danmaku.isActive || danmaku.time > currentTime + activationTime) {
      continue;
    }
    
    // 1. 获取 DOM 元素 (从池中获取或创建新的)
    let danmakuEl = danmakuPool.value.pop();
    if (!danmakuEl) {
      danmakuEl = document.createElement('div');
      danmakuEl.className = 'danmaku-item';
      danmakuContainerRef.value.appendChild(danmakuEl);
    }
    
    // 2. 设置弹幕内容和样式
    danmakuEl.innerHTML = `
      <div class="avatar">${danmaku.avatar}</div>
      <span>${danmaku.text}</span>
    `;
    danmakuEl.style.color = danmaku.color;
    danmakuEl.style.fontSize = '16px'; // 可以根据需要动态设置
    
    // 3. 计算弹幕宽度 (用于轨道分配)
    // 确保元素可见才能正确计算宽度
    danmakuEl.style.display = 'flex'; 
    danmakuEl.style.transform = 'none'; // 移除 transform 影响测量
    danmaku.width = danmakuEl.offsetWidth;
    
    // 4. 分配轨道
    if (assignTrack(danmaku, currentTime)) {
      // 成功分配
      danmaku.isActive = true;
      danmaku.element = danmakuEl;
      activeDanmaku.value.push(danmaku);
      
      // 设置初始位置和轨道
      const startX = containerWidth;
      const startY = danmaku.track * trackHeight + trackHeight / 2 - danmakuEl.offsetHeight / 2;
      
      danmakuEl.style.top = `${startY}px`;
      danmakuEl.style.transform = `translateX(${startX}px)`; // 初始在屏幕右侧外
    } else {
      // 无法分配轨道，将元素放回池中并隐藏
      danmakuEl.style.display = 'none';
      danmakuPool.value.push(danmakuEl);
    }
  }
  
  // --- 更新活跃弹幕位置 ---
  
  for (let i = activeDanmaku.value.length - 1; i >= 0; i--) {
    const danmaku = activeDanmaku.value[i];
    
    if (!danmaku.element || !videoRef.value) {
      // 元素丢失，从活跃列表中移除
      activeDanmaku.value.splice(i, 1);
      continue;
    }
    
    // 弹幕已在屏幕上停留的时间
    const elapsed = currentTime - danmaku.startTime; 
    
    // 弹幕在屏幕上的速度 (像素/秒)
    const danmakuSpeedPx = (containerWidth / danmaku.duration) * speedMultiplier.value;
    
    // 弹幕移动的距离 (像素)
    const distance = elapsed * danmakuSpeedPx;
    
    // 弹幕的当前 X 坐标 (屏幕最右侧为 containerWidth)
    const position = containerWidth - distance;
    
    // 更新弹幕位置 (使用 transform: translateX 开启 GPU 加速)
    danmaku.element.style.transform = `translateX(${position}px)`;
    
    // 如果弹幕已经完全离开屏幕左侧，回收它
    if (position < -danmaku.width) {
      danmaku.isActive = false;
      danmaku.element.style.display = 'none';
      danmakuPool.value.push(danmaku.element);
      activeDanmaku.value.splice(i, 1);
      
      // 注意: 轨道状态的更新在 assignTrack 中完成，此处无需再次更新。
    }
  }
  
  animationId = requestAnimationFrame(animateDanmaku);
};

/**
 * 设置视频事件监听器
 */
const setupVideoListeners = () => {
  if (!videoRef.value) return;
  
  videoRef.value.addEventListener('play', () => {
    isPlaying.value = true;
  });
  
  videoRef.value.addEventListener('pause', () => {
    isPlaying.value = false;
  });
  
  videoRef.value.addEventListener('seeked', () => {
    // 快进/快退后，清除所有活跃弹幕，避免位置错乱
    for (const danmaku of activeDanmaku.value) {
      if (danmaku.element) {
        danmaku.element.style.display = 'none';
        danmakuPool.value.push(danmaku.element);
      }
      danmaku.isActive = false;
    }
    activeDanmaku.value = [];
    
    // 重置轨道状态
    tracks.value = Array(5).fill().map(() => ({ 
      lastEndTime: 0, 
      lastEndPosition: 0 
    }));
  });
};

// --- 生命周期钩子 ---

onMounted(() => {
  setupVideoListeners();
  animationId = requestAnimationFrame(animateDanmaku);
  generateDanmaku(); // 初始生成一批弹幕
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

</script>

<template>
  <div class="container">
    <header>
      <h1>高性能视频弹幕组件</h1>
      <p class="subtitle">支持上万条弹幕同时渲染不卡顿</p>
    </header>
    
    <div class="video-container">
      <video ref="videoRef" controls>
        <source src="/oceans.mp4" type="video/mp4">
        您的浏览器不支持 HTML5 视频标签。
      </video>
      <div class="danmaku-container" ref="danmakuContainerRef">

      </div>
    </div>
    
    <div class="control-panel">
      <div class="control-row">
        <div class="input-group">
          <label>弹幕数量：</label>
          <input type="number" v-model="danmakuCount" min="1" max="10000">
          <button class="btn" @click="generateDanmaku">生成弹幕</button>
        </div>
        
        <div class="input-group">
          <label>弹幕速度：</label>
          <select v-model="danmakuSpeed">
            <option value="slow">慢速</option>
            <option value="normal">正常</option>
            <option value="fast">快速</option>
          </select>
        </div>
        
        <div class="input-group">
          <label>弹幕密度：</label>
          <select v-model="danmakuDensity">
            <option value="low">稀疏</option>
            <option value="medium">中等</option>
            <option value="high">密集</option>
          </select>
        </div>
      </div>
      
      <div class="control-row">
        <button class="btn" @click="togglePlayPause">
          {{ isPlaying ? '暂停' : '播放' }}
        </button>
        <button class="btn btn-danger" @click="clearAllDanmaku">清除所有弹幕</button>
        <button class="btn btn-success" @click="simulateWebSocket">模拟WebSocket推送</button>
      </div>
      
      <div class="send-danmaku">
        <input 
          type="text" 
          v-model="newDanmakuText" 
          placeholder="输入弹幕内容..." 
          @keyup.enter="sendDanmaku"
        >
        <select v-model="newDanmakuColor">
          <option value="#ffffff">白色</option>
          <option value="#ff0000">红色</option>
          <option value="#00ff00">绿色</option>
          <option value="#0000ff">蓝色</option>
          <option value="#ffff00">黄色</option>
        </select>
        <button class="btn" @click="sendDanmaku">发送弹幕</button>
      </div>
      
      <div class="stats">
        <div>当前活跃弹幕数量: {{ activeDanmakuCount }}</div>
        <div>总弹幕数量: {{ totalDanmakuCount }}</div>
        <div>FPS: {{ fps }}</div>
      </div>
    </div>
    
    <!-- <div class="features">
      <div class="feature-card">
        <h3>性能优化</h3>
        <p>• 虚拟弹幕池（DOM循环复用）</p>
        <p>• requestAnimationFrame 控制动画帧</p>
        <p>• transform: translateX + will-change GPU加速</p>
        <p>• 弹幕轨道动态分配算法</p>
      </div>
      
      <div class="feature-card">
        <h3>功能特性</h3>
        <p>• 支持顶部固定弹幕 (需实现)</p>
        <p>• 5个弹道动态分配</p>
        <p>• 视频播放状态同步</p>
        <p>• WebSocket实时推送</p>
        <p>• 自定义颜色和字体大小</p>
      </div>
      
      <div class="feature-card">
        <h3>技术栈</h3>
        <p>• Vue 3 + Composition API</p>
        <p>• &lt;script setup&gt; 语法</p>
        <p>• 单文件组件 (.vue)</p>
        <p>• 模块化设计</p>
      </div>
    </div> -->
    
    <div class="performance">
      <h2>性能测试</h2>
      <p>尝试生成10000条弹幕，体验高性能渲染效果</p>
      <button class="btn" @click="testPerformance">性能测试 (10000条弹幕)</button>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* body 样式需要移动到项目全局样式中，但为了保持功能一致性，在此处使用一个通用容器 */
.container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
  color: #fff;
  min-height: 100vh;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-y: auto;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto 30px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

video {
  width: 100%;
  height: auto;
  display: block;
  background: #000;
}

.danmaku-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.danmaku-item {
  position: absolute;
  white-space: nowrap;
  pointer-events: none;
  /* 性能优化：使用 will-change 告诉浏览器该属性将要变化 */
  will-change: transform; 
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
}

.control-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.control-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #4a90e2;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  background: #3a7bc8;
  transform: translateY(-2px);
}

.btn-danger {
  background: #e74c3c;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-success {
  background: #2ecc71;
}

.btn-success:hover {
  background: #27ae60;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

input, select {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.send-danmaku {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.send-danmaku input {
  flex: 1;
}

.stats {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.feature-card h3 {
  margin-bottom: 10px;
  color: #4a90e2;
}

.performance {
  margin-top: 30px;
  text-align: center;
}

.performance h2 {
  margin-bottom: 15px;
  color: #4a90e2;
}

@media (max-width: 768px) {
  .control-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .input-group {
    width: 100%;
  }
}
</style>