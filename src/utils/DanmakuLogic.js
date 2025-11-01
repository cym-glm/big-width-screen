// src/utils/DanmakuLogic.js (修正版本)

// --- 常量定义 (已修正) ---
const VIDEO_DURATION = 600;
const MOVE_DURATION = 15; // 固定的移动时长
const TRACK_COUNT = 5; // 修正为 5 条弹道
// --- 辅助函数 (保持不变) ---
export function generateMockDanmaku(count = 50000) {
    if (count > 50000) count = 50000;
    const texts = ['666', '哈哈', '牛', '高能', '神仙', 'awsl'];
    const colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94'];
    const mockCount = Math.min(count, 50000); 

    const danmakuList = Array.from({ length: mockCount }, (_, i) => ({
        id: 'dm-' + i,
        text: texts[Math.floor(Math.random() * texts.length)],
        time: (i / mockCount) * VIDEO_DURATION, 
        color: colors[Math.floor(Math.random() * colors.length)]
    }));
    
    return danmakuList.sort((a, b) => a.time - b.time);
}

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
}


// --- 核心管理器：DanmakuTrackManager (实现紧密相接) ---

export class DanmakuTrackManager {
    constructor(trackCount, containerWidth) {
        this.containerWidth = containerWidth;
        this.trackCount = trackCount;
        this.tracksExitTime = Array(trackCount).fill(-999);
        this.baseDuration = MOVE_DURATION; 
    }

    /**
     * 为弹幕分配一个轨道和入场时间，保证其与前一个弹幕首尾相接
     */
    assignTrack(danmaku, estimatedWidth) {
        let bestTrack = -1;
        let earliestExitTime = Infinity;

        // 1. 找到最早可以再次入场的轨道 (最早的 Exit Time)
        for (let i = 0; i < this.trackCount; i++) {
            if (this.tracksExitTime[i] < earliestExitTime) {
                earliestExitTime = this.tracksExitTime[i];
                bestTrack = i;
            }
        }

        if (bestTrack === -1) {
            return { track: -1, startTime: danmaku.time };
        }

        // 2. 确定实际开始时间 (StartTime)
        // T_start = Max( 弹幕原始时间, T_前一弹幕退出时间 )
        // **注意：由于移除了安全缓冲，这里精确保证了 B 的入场恰好在 A 的退出时刻**
        const actualStartTime = Math.max(danmaku.time, earliestExitTime);

        // 3. 更新该轨道的退出时间 (ExitTime)
        // T_new_exit = T_start + MOVE_DURATION
        const newExitTime = actualStartTime + this.baseDuration;
        this.tracksExitTime[bestTrack] = newExitTime;

        return { 
            track: bestTrack, 
            startTime: actualStartTime 
        };
    }

    reset() {
        this.tracksExitTime.fill(-999);
    }
}


// --- 弹幕数据管理器：DanmakuManager ---
// 使用修正后的 TRACK_COUNT
export class DanmakuManager {
    constructor(danmakuList, containerWidth) {
        this.allDanmaku = danmakuList;
        this.danmakuPositions = new Map();
        this.trackManager = new DanmakuTrackManager(TRACK_COUNT, containerWidth);
        this.currentIndex = 0; 
    }

    _estimateWidth(text) {
        return text.length * 28 + 60; 
    }

    getVisibleDanmaku(currentTime, timeWindow = 2) {
        // ... (逻辑与之前版本保持一致)
        const targetTime = currentTime + timeWindow;

        while (
            this.currentIndex < this.allDanmaku.length &&
            this.allDanmaku[this.currentIndex].time <= targetTime
        ) {
            const danmaku = this.allDanmaku[this.currentIndex];
            
            if (!this.danmakuPositions.has(danmaku.id)) {
                const width = this._estimateWidth(danmaku.text);
                const { track, startTime } = this.trackManager.assignTrack(danmaku, width);

                this.danmakuPositions.set(danmaku.id, {
                    id: danmaku.id,
                    text: danmaku.text,
                    color: danmaku.color,
                    track: track,
                    width: width,
                    startTime: startTime 
                });
            }
            this.currentIndex++;
        }

        const visibleDanmaku = [];
        const containerWidth = this.trackManager.containerWidth;

        this.danmakuPositions.forEach(posInfo => {
            const elapsed = currentTime - posInfo.startTime;
            
            if (elapsed < 0) return; 

            if (elapsed > MOVE_DURATION) {
                this.danmakuPositions.delete(posInfo.id);
                return;
            }

            const progress = elapsed / MOVE_DURATION;
            const startX = containerWidth;
            const endX = -posInfo.width;
            const translateX = startX + (endX - startX) * progress;

            visibleDanmaku.push({
                id: posInfo.id,
                text: posInfo.text,
                color: posInfo.color,
                track: posInfo.track,
                translateX: translateX,
                opacity: 1
            });
        });

        return visibleDanmaku;
    }

    seek(time) {
        this.trackManager.reset();
        this.danmakuPositions.clear();
        this.currentIndex = this.allDanmaku.findIndex(d => d.time >= time - 1);
        if (this.currentIndex === -1) this.currentIndex = this.allDanmaku.length;
        if (this.currentIndex < 0) this.currentIndex = 0;
    }

    getCacheSize() {
        return this.danmakuPositions.size;
    }
}